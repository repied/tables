FROM mcr.microsoft.com/devcontainers/javascript-node:20-bookworm

# Install Playwright OS dependencies during build
# We use npx to run install-deps without needing the package.json yet
# This ensures the container has all libraries needed to run the browsers
RUN npx -y playwright@1.40.0 install-deps
