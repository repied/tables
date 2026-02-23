(function (window) {

    // Dive parameters
    const SURFACE_DEPTH = 0; // meters (not really useful to use a variable as it’s always 0)
    const SURFACE_PRESSURE = 1.01325; // bar at sea level could be adjusted for altitude
    const WATER_VAPOR_PRESSURE = 0.0627; // bar, partial pressure of water vapor in lungs at 37°C
    const FRESHWATER_DENSITY = 1000; // kg/m^3  unused in the app currently
    const SEAWATER_DENSITY = 1025; // kg/m^3
    const WATER_DENSITY = SEAWATER_DENSITY; // default to seawater, can be changed if needed
    const GRAVITY = 9.80665; // m/s^2
    const AIR_FN2 = 0.79; // fraction of N2 in AIR, ie 79% of the air is N2
    const SURFACE_AIR_ALV_PPN2 = AIR_FN2 * (SURFACE_PRESSURE - WATER_VAPOR_PRESSURE); // alveolar partial pressure of N2 at surface (bar)
    const DESCENT_RATE = 20; // m/min 20m/min is recommended
    const ASCENT_RATE = 15; // m/min  15m/min is recommended
    const ASCENT_RATE_FROM_FIRST_STOP = 6; // m/min 6m/min is recommended
    const MAX_SURFACE_INTERVAL = 12 * 60; // minutes, 12h is a MN90 threshold for "no residual nitrogen"


    // --- BUEHLMANN ALGORITHM ---
    const BUEHLMANN_stopInterval = 3; // meters
    const BUEHLMANN_lastStopDepth = 3; // meters
    const BUEHLMANN_timeStep = 10 / 60; // minutes: 10 seconds is good

    const BUEHLMANN = [ // from Wikipedia and Subsurface https://github.com/torvalds/subsurface-for-dirk/blob/724527bc3b660a9d54aab8e4dff50430450f1643/core/deco.c#L84
        { t12: 5.0, A: 1.1696, B: 0.5578 },
        { t12: 8.0, A: 1.0, B: 0.6514 },
        { t12: 12.5, A: 0.8618, B: 0.7222 },
        { t12: 18.5, A: 0.7562, B: 0.7825 },
        { t12: 27.0, A: 0.62, B: 0.8126 },
        { t12: 38.3, A: 0.5043, B: 0.8434 },
        { t12: 54.3, A: 0.441, B: 0.8693 },
        { t12: 77.0, A: 0.4, B: 0.891 },
        { t12: 109.0, A: 0.375, B: 0.9092 },
        { t12: 146.0, A: 0.35, B: 0.9222 },
        { t12: 187.0, A: 0.3295, B: 0.9319 },
        { t12: 239.0, A: 0.3065, B: 0.9403 },
        { t12: 305.0, A: 0.2835, B: 0.9477 },
        { t12: 390.0, A: 0.261, B: 0.9544 },
        { t12: 498.0, A: 0.248, B: 0.9602 },
        { t12: 635.0, A: 0.2327, B: 0.9653 },
    ];

    const N_COMPARTMENTS = BUEHLMANN.length;
    const HALF_LIVES = BUEHLMANN.map(c => c.t12);
    const MAX_STOP_TIME_BEFORE_INFTY = 720;

    function depthToPressure(depth, surfacePressure) {
        return surfacePressure + depth * WATER_DENSITY * GRAVITY / 100_000; // convert Pa to bar
    }

    function depthToPalvN2(depth, surfacePressure, fN2) {
        return (depthToPressure(depth, surfacePressure) - WATER_VAPOR_PRESSURE) * fN2;
    }

    function updateTension(t0, pn2, t, compartment_t12) {
        const k = Math.log(2) / compartment_t12;
        return pn2 + (t0 - pn2) * Math.exp(-k * t);
    }

    function updateAllTensions(tensions, PN2, t) {
        return HALF_LIVES.map((t12, i) => updateTension(tensions[i], PN2, t, t12));
    }

    function getMValue(A, B, pressure) {
        return A + pressure / B;
    }

    function getModifiedMValue(A, B, pressure, GF) {
        const M_orig = getMValue(A, B, pressure);
        return M_orig * GF + pressure * (1 - GF);
    }

    function getInterpolatedGF(depth, firstStopDepth, gfLow, gfHigh) {
        if (depth <= 0) {
            return gfHigh;
        }
        if (firstStopDepth === null) {
            return gfLow;
        }
        if (depth >= firstStopDepth) {
            return gfLow;
        }
        const deepRatio = depth / firstStopDepth;
        return gfLow * deepRatio + gfHigh * (1 - deepRatio);
    }

    function simulAtDepth(depth, tensions, firstStopDepth, gfLow, gfHigh, surfacePressure) {
        // simulate tensions at depth with given GF and check if any compartment exceeds its M-value
        const gf = getInterpolatedGF(depth, firstStopDepth, gfLow, gfHigh);
        const p = depthToPressure(depth, surfacePressure);
        let isSafe = true;
        let satsCompIdx = [];
        for (let i = 0; i < N_COMPARTMENTS; i++) {
            const M_mod = getModifiedMValue(BUEHLMANN[i].A, BUEHLMANN[i].B, p, gf);
            if (tensions[i] > M_mod) {
                isSafe = false;
                satsCompIdx.push(i);
            }
        }
        return { isSafe, satsCompIdx };
    }

    function calculateBuhlmannPlan(diveParams) {
        const {
            bottomTime,
            maxDepth,
            gfLow,
            gfHigh,
            surfacePressure = SURFACE_PRESSURE,
            stopInterval = BUEHLMANN_stopInterval,
            lastStopDepth = BUEHLMANN_lastStopDepth,
            timeStep = BUEHLMANN_timeStep,
            fN2: gaz_fN2,
            initialTensions,
            ascentRate = ASCENT_RATE,
            descentRate = DESCENT_RATE
        } = diveParams;
        const surfaceTensions = Array(N_COMPARTMENTS).fill(SURFACE_AIR_ALV_PPN2)

        if (bottomTime <= 0 || maxDepth <= 0) {
            return { profile: { stops: {} }, finalTensions: initialTensions || surfaceTensions, dtr: 0 };
        }
        // Initial tensions are at equilibrium with Air (PN2 = 0.79 * surfacePressure)
        let tensions = initialTensions ? [...initialTensions] : [...surfaceTensions]; // deep copy

        // Convert gfLow/High to 0-1 if passed as 0-100
        const _gfLow = gfLow > 1 ? gfLow / 100 : gfLow;
        const _gfHigh = gfHigh > 1 ? gfHigh / 100 : gfHigh;

        let firstStopDepth = null;
        let hasCompletedFirstStop = false;

        let stopsArr = [];
        let dtr_Buhlmann = 0; // will be a float, not ceiled, and will depend on simulation step
        let t_dive_total = 0;

        // 1. Descent
        let currentDepth = 0;
        let nextDepth = currentDepth + descentRate * timeStep;
        while (nextDepth < maxDepth) {
            t_dive_total += timeStep;
            const depthStep = (currentDepth + nextDepth) / 2;
            const PN2Step = depthToPalvN2(depthStep, surfacePressure, gaz_fN2);
            tensions = updateAllTensions(tensions, PN2Step, timeStep);
            currentDepth = nextDepth;
            nextDepth = currentDepth + descentRate * timeStep;
        }
        // Last bit
        let t_last = (maxDepth - currentDepth) / descentRate;
        if (t_last > 0) {
            t_dive_total += t_last;
            const depthLast = (currentDepth + maxDepth) / 2;
            tensions = updateAllTensions(tensions, depthToPalvN2(depthLast, surfacePressure, gaz_fN2), t_last);
            currentDepth = maxDepth;
        }

        // 2. Bottom
        // bottomTime includes descent time
        const t_descent = t_dive_total;
        const t_at_bottom = Math.max(0, bottomTime - t_descent);

        let t_elapsed_bottom = 0;
        while (t_elapsed_bottom < t_at_bottom) {
            let step = Math.min(timeStep, t_at_bottom - t_elapsed_bottom);
            tensions = updateAllTensions(tensions, depthToPalvN2(currentDepth, surfacePressure, gaz_fN2), step);
            t_dive_total += step;
            t_elapsed_bottom += step;
        }

        // 3. Ascent
        while (currentDepth >= lastStopDepth) {
            const remaining_to_laststop = currentDepth - lastStopDepth;
            const n_full_intervals = Math.floor((remaining_to_laststop - 0.00001) / stopInterval);
            let nextDepth = lastStopDepth + stopInterval * n_full_intervals;
            if (currentDepth == lastStopDepth) {
                nextDepth = SURFACE_DEPTH;
            }

            // Use slower ascent rate only after completing the first stop
            // Ascent to first stop uses normal rate, ascent from first stop uses slower rate
            const currentAscentRate = hasCompletedFirstStop ? ASCENT_RATE_FROM_FIRST_STOP : ascentRate;
            const t_ascend = (currentDepth - nextDepth) / currentAscentRate;
            const depth_ascend = (nextDepth + currentDepth) / 2;
            const PN2_ascend = depthToPalvN2(depth_ascend, surfacePressure, gaz_fN2);

            let tensions_next = updateAllTensions(tensions, PN2_ascend, t_ascend);

            let { isSafe } = simulAtDepth(nextDepth, tensions_next, firstStopDepth, _gfLow, _gfHigh, surfacePressure);

            if (!isSafe) {
                if (firstStopDepth === null) firstStopDepth = currentDepth;

                let stopTime = 0;
                const PN2_stop = depthToPalvN2(currentDepth, surfacePressure, gaz_fN2);

                while (!isSafe) {
                    stopTime += timeStep;
                    dtr_Buhlmann += timeStep;
                    t_dive_total += timeStep;
                    tensions = updateAllTensions(tensions, PN2_stop, timeStep);

                    // Check if nextDepth is safe now
                    tensions_next = updateAllTensions(tensions, PN2_ascend, t_ascend);
                    ({ isSafe } = simulAtDepth(nextDepth, tensions_next, firstStopDepth, _gfLow, _gfHigh, surfacePressure));

                    if (stopTime > MAX_STOP_TIME_BEFORE_INFTY) break;
                }
                stopsArr.push({ depth: currentDepth, time: stopTime });
                // Mark that we've completed the first stop
                if (!hasCompletedFirstStop && firstStopDepth === currentDepth) {
                    hasCompletedFirstStop = true;
                }
            }

            // Ascend
            currentDepth = nextDepth;
            tensions = updateAllTensions(tensions, PN2_ascend, t_ascend);
            dtr_Buhlmann += t_ascend;
            t_dive_total += t_ascend;
        }

        // Final ascent to surface from last stop or if no stops
        if (currentDepth > 0) {
            // Use slower ascent rate if we've completed stops
            const finalAscentRate = hasCompletedFirstStop ? ASCENT_RATE_FROM_FIRST_STOP : ascentRate;
            const t_final = currentDepth / finalAscentRate;
            const depth_final = currentDepth / 2;
            tensions = updateAllTensions(tensions, depthToPalvN2(depth_final, surfacePressure, gaz_fN2), t_final);
            dtr_Buhlmann += t_final;
            currentDepth = 0;
        }

        // Convert stops to object
        let stopsObj = {};
        stopsArr.forEach(s => {
            const d = Math.round(s.depth);
            const t = Math.ceil(s.time);
            if (stopsObj[d]) stopsObj[d] += t;
            else stopsObj[d] = t;
        });
        // format output for the app
        return { profile: { stops: stopsObj }, finalTensions: tensions, dtr: dtr_Buhlmann };
    }
    // --- END BUEHLMANN ---

    // Calculation Logic
    function getMN90Profile(depth, time) {
        const MN90 = window.dataManager.getMN90();
        const tableDepths = Object.keys(MN90).map(Number).sort((a, b) => a - b);
        let targetDepth = tableDepths.find(d => d >= depth);

        if (!targetDepth && depth > 0) {
            // Check if deeper than max table depth
            if (depth > tableDepths[tableDepths.length - 1]) {
                return { is_out_of_table: true };
            }
            // If here, depth is within range but maybe not found? Should not happen with logic above.
            console.log("WEIRD: Depth is within range but maybe not found?", depth, tableDepths);
        }

        if (depth <= 0) return { stops: {}, is_surface_dive: true };
        if (!targetDepth) return { is_out_of_table: true };

        const profiles = MN90[targetDepth];

        // Find profile with time >= time
        let profile = profiles.find(p => p.time >= time);

        if (!profile) {
            return { is_out_of_table: true };
        }

        return {
            tableDepth: targetDepth,
            profile: profile
        };
    }

    function calculateGasConsumptionLiters(depth, time, profile, sac) {
        if (depth <= 0) return { total: 0, breakdown: { descent: 0, bottom: 0, ascent: 0, stops: {} } };

        // Helper to get pressure at depth
        const getP = (d) => depthToPressure(d, SURFACE_PRESSURE);

        const breakdown = {
            descent: 0,
            bottom: 0,
            ascent: 0, // travel time
            stops: {}  // individual stops
        };

        // 1. Bottom Gas (split into descent and time at bottom)
        const t_descent = depth / DESCENT_RATE;
        const avg_p_descent = (getP(SURFACE_DEPTH) + getP(depth)) / 2;
        breakdown.descent = t_descent * avg_p_descent * sac;

        const t_at_depth = Math.max(0, time - t_descent);
        breakdown.bottom = t_at_depth * getP(depth) * sac;

        // 2. Ascent Gas
        const stops = profile ? profile.stops : {};
        const stopDepths = Object.keys(stops).map(Number).sort((a, b) => b - a);
        const firstTargetDepth = stopDepths.length > 0 ? stopDepths[0] : 0;

        // Ascent from bottom to first target
        if (depth > firstTargetDepth) {
            const travelTime = (depth - firstTargetDepth) / ASCENT_RATE;
            const avgPressure = (getP(depth) + getP(firstTargetDepth)) / 2;
            breakdown.ascent += travelTime * avgPressure * sac;
        }

        stopDepths.forEach((d, i) => {
            const stopDuration = stops[d];
            const gasAtStop = stopDuration * getP(d) * sac;
            breakdown.stops[d] = (breakdown.stops[d] || 0) + gasAtStop;

            const nextTarget = (i + 1 < stopDepths.length) ? stopDepths[i + 1] : SURFACE_DEPTH;

            const travelTime = (d - nextTarget) / ASCENT_RATE_FROM_FIRST_STOP;
            const avgPressure = (getP(d) + getP(nextTarget)) / 2;
            breakdown.ascent += travelTime * avgPressure * sac;
        });

        const totalGas = breakdown.descent + breakdown.bottom + breakdown.ascent +
            Object.values(breakdown.stops).reduce((a, b) => a + b, 0);

        return {
            total: Math.ceil(totalGas),
            breakdown: breakdown
        };
    }

    function calculateDTR(depth, stops) { // Use ceiling for stops and ascent times (safer)
        let dtr_ceil = 0;
        const stopDepths = Object.keys(stops).map(Number).sort((a, b) => b - a);
        let hasStops = stopDepths.length > 0;
        let totalStopTime = 0;
        for (let d in stops) totalStopTime += Math.ceil(stops[d]);

        if (!hasStops) {
            const ascentTime = depth / ASCENT_RATE;
            dtr_ceil = Math.ceil(ascentTime);
        } else {
            const firstStopDepth = stopDepths[0];
            const ascentToFirst = (depth - firstStopDepth) / ASCENT_RATE;
            const ascentFromFirst = firstStopDepth / ASCENT_RATE_FROM_FIRST_STOP;
            // dtr_ceil = Math.ceil(ascentToFirst) + totalStopTime + Math.ceil(ascentFromFirst);
            dtr_ceil = Math.ceil(ascentToFirst + totalStopTime + ascentFromFirst);
        }
        return dtr_ceil;
    }

    // Nitrox Helpers
    function calculateEquivalentAirDepth(depth, o2) {
        if (o2 <= 21) return depth;
        const fN2 = (100 - o2) / 100;
        // Generalized EAD Formula:
        // EAD = [ ( (P_surf + P_hydro) * fN2 / 0.79 ) - P_surf ] * 10^5 / (density * g)
        const pAmb = depthToPressure(depth, SURFACE_PRESSURE);
        const pN2 = pAmb * fN2;
        const pAmbEquiv = pN2 / 0.79;
        const ead = (pAmbEquiv - SURFACE_PRESSURE) * 100_000 / (WATER_DENSITY * GRAVITY);
        return Math.max(0, ead);
    }

    function calculatePPO2(depth, o2) {
        return depthToPressure(depth, SURFACE_PRESSURE) * (o2 / 100);
    }

    // Logic for Successive Dive
    function calculateSuccessive(prevGroup, interval, depth) {
        if (!prevGroup || !interval || !depth) return { error: "Missing parameters" };

        // Access Tables via dataManager
        const Table2_N2 = window.dataManager.getTable2();
        const Table3_Maj = window.dataManager.getTable3();

        if (!Table2_N2 || !Table3_Maj) return { error: "Data not loaded" };

        // 1. Get Residual Nitrogen (Coeff)
        // Find Interval Column: Largest interval in table <= actual interval
        // Standard MN90: If interval > max table interval (12h), N2 is 0.8 (or reset).
        // Actually, usually >12h means new dive (no residual).

        if (interval > MAX_SURFACE_INTERVAL) {
            return { majoration: 0, n2: 0 };
        }

        const row = Table2_N2.data[prevGroup];
        if (!row) return { error: "Invalid Group" };

        // Find index
        // Table intervals are e.g. 15, 30, 45.
        // Logic: If I wait 20 min, I use 15 min column.
        // If I wait 10 min, it's < 15. Consecutive logic applies (not handled here).
        // We assume input > 15 min.

        let intervalIndex = -1;
        for (let i = Table2_N2.intervals.length - 1; i >= 0; i--) {
            if (interval >= Table2_N2.intervals[i]) {
                intervalIndex = i;
                break;
            }
        }

        if (intervalIndex === -1) {
            // Interval < 15 mins.
            return { error: "Interval too short (<15min)" };
        }

        const n2Coeff = row[intervalIndex];
        if (!n2Coeff || isNaN(n2Coeff)) {
            // If empty, usually means coefficient is back to baseline or specific rule.
            return { majoration: 0, n2: "min" };
        }

        // 2. Get Majoration
        // Find N2 Row: Smallest N2 in table >= actual N2
        const majTable = Table3_Maj.data;
        const targetN2Row = majTable.find(r => r.n2 >= n2Coeff);

        if (!targetN2Row) {
            // N2 too high? Should not happen if tables align.
            return { error: "N2 out of range" };
        }

        // Find Depth Column: Smallest depth in table >= actual depth
        // Depths: 12, 15...
        const majDepths = Table3_Maj.depths;
        const depthIndex = majDepths.findIndex(d => d >= depth);

        if (depthIndex === -1) {
            // Too deep (beyond 60m?)
            return { error: "Too deep for table" };
        }

        const majoration = targetN2Row.majorations[depthIndex];

        return {
            majoration: majoration || 0,
            n2: n2Coeff
        };
    }

    // Expose Planning API
    window.Planning = {
        SURFACE_AIR_ALV_PPN2,
        getMN90Profile,
        calculateGasConsumptionLiters,
        calculateDTR,
        calculateEquivalentAirDepth,
        calculatePPO2,
        calculateSuccessive,
        calculateBuhlmannPlan,
        updateAllTensions
    };

})(window);
