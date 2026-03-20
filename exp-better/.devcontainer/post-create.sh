#!/bin/bash
set -e

# Fix permissions for worktrees
sudo chown node:node /workspaces
sudo mkdir -p /workspaces/tables.worktrees
sudo chown node:node /workspaces/tables.worktrees

# Install Node.js dependencies
npm install

# Download Playwright browsers (Chromium, Firefox, WebKit)
# (OS-level dependencies are already installed in the Dockerfile)
npx playwright install
