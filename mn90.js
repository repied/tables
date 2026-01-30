/**
 * MN90 Dive Tables (Marine Nationale 1990)
 * 
 * Structure:
 * Each key represents the maximum depth of the dive in meters.
 * The value is an array of dive profiles sorted by bottom time.
 * Each profile object contains:
 * - time: Bottom time in minutes.
 * - stops: An object mapping stop depth (meters) to duration (minutes).
 * - group: (Optional) Successive dive group letter.
 * 
 * Rules:
 * - Ascent speed: 15 to 17 meters per minute.
 * - If the exact depth is not in the table, use the next greater depth.
 * - If the exact time is not in the table, use the next greater time.
 */

const MN90 = {
    12: [
        { time: 120, stops: {}, group: 'I' },
        { time: 125, stops: { 3: 1 }, group: 'I' },
        { time: 130, stops: { 3: 2 }, group: 'J' },
        { time: 140, stops: { 3: 4 }, group: 'K' },
        { time: 150, stops: { 3: 6 }, group: 'L' },
        { time: 160, stops: { 3: 8 }, group: 'M' },
        { time: 170, stops: { 3: 10 }, group: 'N' },
        { time: 180, stops: { 3: 12 }, group: 'O' },
        { time: 190, stops: { 3: 14 }, group: 'P' },
        { time: 200, stops: { 3: 16 }, group: 'P' },
        { time: 210, stops: { 3: 19 }, group: 'P' },
        { time: 220, stops: { 3: 21 }, group: 'P' },
        { time: 230, stops: { 3: 24 }, group: 'P' },
        { time: 240, stops: { 3: 26 }, group: 'P' }
    ],
    15: [
        { time: 75, stops: {}, group: 'I' },
        { time: 80, stops: { 3: 2 }, group: 'J' },
        { time: 85, stops: { 3: 3 }, group: 'K' },
        { time: 90, stops: { 3: 4 }, group: 'K' },
        { time: 100, stops: { 3: 8 }, group: 'M' },
        { time: 110, stops: { 3: 12 }, group: 'N' },
        { time: 120, stops: { 3: 17 }, group: 'O' },
        { time: 130, stops: { 3: 22 }, group: 'P' },
        { time: 140, stops: { 3: 27 }, group: 'P' },
        { time: 150, stops: { 3: 31 }, group: 'P' },
        { time: 160, stops: { 3: 36 }, group: 'P' }
    ],
    18: [
        { time: 50, stops: {}, group: 'H' },
        { time: 55, stops: { 3: 1 }, group: 'I' },
        { time: 60, stops: { 3: 3 }, group: 'J' },
        { time: 65, stops: { 3: 5 }, group: 'K' },
        { time: 70, stops: { 3: 7 }, group: 'K' },
        { time: 75, stops: { 3: 9 }, group: 'L' },
        { time: 80, stops: { 3: 12 }, group: 'M' },
        { time: 85, stops: { 3: 15 }, group: 'N' },
        { time: 90, stops: { 3: 18 }, group: 'N' },
        { time: 95, stops: { 3: 21 }, group: 'O' },
        { time: 100, stops: { 3: 24 }, group: 'P' },
        { time: 110, stops: { 3: 29 }, group: 'P' }
    ],
    20: [
        { time: 40, stops: {}, group: 'G' },
        { time: 45, stops: { 3: 2 }, group: 'H' },
        { time: 50, stops: { 3: 4 }, group: 'I' },
        { time: 55, stops: { 3: 7 }, group: 'J' },
        { time: 60, stops: { 3: 10 }, group: 'K' },
        { time: 65, stops: { 3: 14 }, group: 'L' },
        { time: 70, stops: { 3: 17 }, group: 'M' },
        { time: 75, stops: { 3: 21 }, group: 'N' },
        { time: 80, stops: { 3: 25 }, group: 'N' },
        { time: 85, stops: { 3: 28 }, group: 'O' },
        { time: 90, stops: { 3: 32 }, group: 'P' },
        { time: 95, stops: { 3: 36 }, group: 'P' },
        { time: 100, stops: { 3: 40 }, group: 'P' }
    ],
    22: [
        { time: 30, stops: {}, group: 'F' },
        { time: 35, stops: { 3: 2 }, group: 'G' },
        { time: 40, stops: { 3: 5 }, group: 'H' },
        { time: 45, stops: { 3: 8 }, group: 'I' },
        { time: 50, stops: { 3: 12 }, group: 'J' },
        { time: 55, stops: { 3: 16 }, group: 'K' },
        { time: 60, stops: { 3: 20 }, group: 'L' },
        { time: 65, stops: { 3: 25 }, group: 'M' },
        { time: 70, stops: { 3: 30 }, group: 'N' },
        { time: 75, stops: { 3: 35 }, group: 'O' }
    ],
    25: [
        { time: 20, stops: {}, group: 'E' },
        { time: 25, stops: { 3: 2 }, group: 'F' },
        { time: 30, stops: { 3: 4 }, group: 'G' },
        { time: 35, stops: { 3: 8 }, group: 'H' },
        { time: 40, stops: { 3: 12 }, group: 'I' },
        { time: 45, stops: { 3: 17 }, group: 'J' },
        { time: 50, stops: { 3: 22 }, group: 'K' },
        { time: 55, stops: { 3: 27 }, group: 'L' },
        { time: 60, stops: { 3: 32 }, group: 'M' },
        { time: 65, stops: { 3: 38 }, group: 'N' }
    ],
    28: [
        { time: 15, stops: {}, group: 'D' },
        { time: 20, stops: { 3: 2 }, group: 'E' },
        { time: 25, stops: { 3: 5 }, group: 'F' },
        { time: 30, stops: { 3: 9 }, group: 'G' },
        { time: 35, stops: { 3: 14 }, group: 'I' },
        { time: 40, stops: { 3: 19 }, group: 'J' },
        { time: 45, stops: { 3: 24 }, group: 'K' },
        { time: 50, stops: { 3: 29 }, group: 'L' },
        { time: 55, stops: { 3: 35 }, group: 'M' },
        { time: 60, stops: { 3: 41 }, group: 'N' }
    ],
    30: [
        { time: 10, stops: {}, group: 'B' },
        { time: 15, stops: { 3: 1 }, group: 'D' },
        { time: 20, stops: { 3: 4 }, group: 'E' },
        { time: 25, stops: { 3: 8 }, group: 'G' },
        { time: 30, stops: { 3: 12 }, group: 'H' },
        { time: 35, stops: { 3: 18 }, group: 'I' },
        { time: 40, stops: { 3: 24 }, group: 'J' },
        { time: 45, stops: { 3: 30 }, group: 'K' },
        { time: 50, stops: { 3: 36 }, group: 'L' },
        { time: 55, stops: { 3: 42 }, group: 'N' },
        { time: 60, stops: { 3: 48 }, group: 'O' }
    ],
    32: [
        { time: 10, stops: {}, group: 'B' },
        { time: 15, stops: { 3: 3 }, group: 'D' },
        { time: 20, stops: { 3: 6 }, group: 'F' },
        { time: 25, stops: { 3: 11 }, group: 'G' },
        { time: 30, stops: { 3: 16 }, group: 'H' },
        { time: 35, stops: { 3: 22 }, group: 'J' },
        { time: 40, stops: { 3: 28 }, group: 'K' },
        { time: 45, stops: { 3: 35 }, group: 'L' },
        { time: 50, stops: { 3: 41 }, group: 'M' },
        { time: 55, stops: { 3: 48 }, group: 'N' }
    ],
    35: [
        { time: 10, stops: {}, group: 'B' },
        { time: 15, stops: { 3: 4 }, group: 'E' },
        { time: 20, stops: { 3: 9 }, group: 'F' },
        { time: 25, stops: { 3: 15 }, group: 'H' },
        { time: 30, stops: { 3: 21 }, group: 'I' },
        { time: 35, stops: { 3: 28 }, group: 'J' },
        { time: 40, stops: { 3: 35 }, group: 'K' },
        { time: 45, stops: { 3: 42 }, group: 'M' },
        { time: 50, stops: { 3: 50 }, group: 'N' }
    ],
    38: [
        { time: 5, stops: {}, group: 'A' },
        { time: 10, stops: { 3: 1 }, group: 'C' },
        { time: 15, stops: { 3: 6 }, group: 'E' },
        { time: 20, stops: { 3: 12 }, group: 'G' },
        { time: 25, stops: { 3: 18 }, group: 'H' },
        { time: 30, stops: { 3: 25 }, group: 'J' },
        { time: 35, stops: { 3: 32 }, group: 'K' },
        { time: 40, stops: { 3: 40 }, group: 'L' },
        { time: 45, stops: { 6: 2, 3: 46 }, group: 'N' }
    ],
    40: [
        { time: 5, stops: {}, group: 'A' },
        { time: 10, stops: { 3: 2 }, group: 'C' },
        { time: 15, stops: { 3: 7 }, group: 'E' },
        { time: 20, stops: { 3: 15 }, group: 'G' },
        { time: 25, stops: { 3: 22 }, group: 'H' },
        { time: 30, stops: { 3: 29 }, group: 'J' },
        { time: 35, stops: { 3: 37 }, group: 'K' },
        { time: 40, stops: { 3: 45 }, group: 'M' },
        { time: 45, stops: { 6: 2, 3: 53 }, group: 'N' },
        { time: 50, stops: { 6: 6, 3: 60 }, group: 'P' }
    ],
    42: [
        { time: 5, stops: {}, group: 'A' },
        { time: 10, stops: { 3: 3 }, group: 'C' },
        { time: 15, stops: { 3: 9 }, group: 'E' },
        { time: 20, stops: { 3: 18 }, group: 'G' },
        { time: 25, stops: { 3: 26 }, group: 'I' },
        { time: 30, stops: { 3: 34 }, group: 'J' },
        { time: 35, stops: { 6: 2, 3: 42 }, group: 'L' },
        { time: 40, stops: { 6: 7, 3: 49 }, group: 'M' },
        { time: 45, stops: { 6: 12, 3: 56 }, group: 'O' }
    ],
    45: [
        { time: 5, stops: {}, group: 'A' },
        { time: 10, stops: { 3: 4 }, group: 'C' },
        { time: 15, stops: { 3: 13 }, group: 'F' },
        { time: 20, stops: { 3: 22 }, group: 'H' },
        { time: 25, stops: { 3: 31 }, group: 'I' },
        { time: 30, stops: { 3: 40 }, group: 'K' },
        { time: 35, stops: { 6: 4, 3: 47 }, group: 'L' },
        { time: 40, stops: { 6: 10, 3: 54 }, group: 'N' }
    ],
    48: [
        { time: 5, stops: {}, group: 'A' },
        { time: 10, stops: { 3: 6 }, group: 'D' },
        { time: 15, stops: { 3: 17 }, group: 'F' },
        { time: 20, stops: { 3: 27 }, group: 'H' },
        { time: 25, stops: { 3: 37 }, group: 'J' },
        { time: 30, stops: { 6: 3, 3: 45 }, group: 'K' },
        { time: 35, stops: { 6: 9, 3: 53 }, group: 'M' },
        { time: 40, stops: { 9: 1, 6: 16, 3: 59 }, group: 'O' }
    ],
    50: [
        { time: 5, stops: { 3: 1 }, group: 'B' },
        { time: 10, stops: { 3: 7 }, group: 'D' },
        { time: 15, stops: { 3: 20 }, group: 'G' },
        { time: 20, stops: { 3: 31 }, group: 'I' },
        { time: 25, stops: { 6: 2, 3: 42 }, group: 'J' },
        { time: 30, stops: { 6: 7, 3: 50 }, group: 'L' },
        { time: 35, stops: { 6: 14, 3: 58 }, group: 'N' },
        { time: 40, stops: { 9: 4, 6: 21, 3: 63 }, group: 'P' }
    ],
    52: [
        { time: 5, stops: { 3: 2 }, group: 'B' },
        { time: 10, stops: { 3: 9 }, group: 'E' },
        { time: 15, stops: { 3: 24 }, group: 'G' },
        { time: 20, stops: { 3: 36 }, group: 'I' },
        { time: 25, stops: { 6: 5, 3: 46 }, group: 'K' },
        { time: 30, stops: { 9: 1, 6: 11, 3: 54 }, group: 'M' },
        { time: 35, stops: { 9: 4, 6: 19, 3: 62 }, group: 'O' }
    ],
    55: [
        { time: 5, stops: { 3: 3 }, group: 'B' },
        { time: 10, stops: { 3: 12 }, group: 'E' },
        { time: 15, stops: { 3: 29 }, group: 'H' },
        { time: 20, stops: { 6: 1, 3: 40 }, group: 'J' },
        { time: 25, stops: { 6: 9, 3: 51 }, group: 'L' },
        { time: 30, stops: { 9: 3, 6: 16, 3: 58 }, group: 'N' }
    ],
    58: [
        { time: 5, stops: { 3: 4 }, group: 'C' },
        { time: 10, stops: { 3: 16 }, group: 'F' },
        { time: 15, stops: { 3: 35 }, group: 'H' },
        { time: 20, stops: { 6: 5, 3: 44 }, group: 'J' },
        { time: 25, stops: { 9: 1, 6: 13, 3: 55 }, group: 'M' },
        { time: 30, stops: { 9: 6, 6: 21, 3: 62 }, group: 'P' }
    ],
    60: [
        { time: 5, stops: { 3: 5 }, group: 'C' },
        { time: 10, stops: { 3: 19 }, group: 'F' },
        { time: 15, stops: { 3: 40 }, group: 'I' },
        { time: 20, stops: { 6: 8, 3: 48 }, group: 'K' },
        { time: 25, stops: { 9: 4, 6: 17, 3: 58 }, group: 'M' }
    ],
    62: [
        { time: 5, stops: { 3: 6 }, group: 'C' },
        { time: 10, stops: { 3: 22 }, group: 'F' },
        { time: 15, stops: { 6: 2, 3: 44 }, group: 'I' },
        { time: 20, stops: { 9: 1, 6: 12, 3: 52 }, group: 'K' },
        { time: 25, stops: { 9: 7, 6: 21, 3: 62 }, group: 'N' }
    ],
    65: [
        { time: 5, stops: { 3: 8 }, group: 'C' },
        { time: 10, stops: { 3: 26 }, group: 'G' },
        { time: 15, stops: { 6: 5, 3: 48 }, group: 'J' },
        { time: 20, stops: { 9: 3, 6: 15, 3: 55 }, group: 'L' }
    ]
};

if (typeof module !== 'undefined') module.exports = MN90;
