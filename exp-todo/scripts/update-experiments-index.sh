#!/bin/bash
set -e

OUTPUT_FILE="exp.html"

# Write HTML header
echo "<!DOCTYPE html>
<html lang=\"en\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>Experiments</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
        h1 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 0.5rem; }
        ul { list-style-type: none; padding: 0; }
        li { margin: 0.5rem 0; padding: 0.5rem; background: #f9f9f9; border-radius: 4px; }
        a { text-decoration: none; color: #0066cc; font-size: 1.2rem; display: block; }
        a:hover { text-decoration: underline; color: #004499; }
        .timestamp { color: #666; font-size: 0.9rem; margin-top: 2rem; border-top: 1px solid #eee; padding-top: 1rem; }
    </style>
</head>
<body>
    <h1>Deployed Experiments</h1>
    <ul>" > "$OUTPUT_FILE"

# Fetch list of successful experiment branches
# This uses gh CLI to list runs of the deploy workflow
# Filters for successful runs on branches starting with 'exp-'
experiments=$(gh run list --workflow deploy.yml --limit 500 --json headBranch,conclusion --jq '.[] | select(.conclusion=="success" and (.headBranch | startswith("exp-"))) | .headBranch' | sort | uniq)

if [ -z "$experiments" ]; then
    echo "        <li>No active experiments found.</li>" >> "$OUTPUT_FILE"
else
    # Loop through each experiment branch and create a list item
    for exp in $experiments; do
        # Use simple string substitution if needed, but here simply printing works
        echo "        <li><a href=\"https://repied.github.io/tables/$exp/\">$exp</a></li>" >> "$OUTPUT_FILE"
    done
fi

# Write HTML footer
echo "    </ul>
    <p class=\"timestamp\">Last updated: $(date -u +"%Y-%m-%d %H:%M UTC")</p>
</body>
</html>" >> "$OUTPUT_FILE"

echo "Generated $OUTPUT_FILE with experiments:"
echo "$experiments"
