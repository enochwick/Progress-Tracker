#!/bin/bash
# Quick push to GitHub repo
# Usage: bash push.sh

set -e

REPO_URL="https://github.com/enochwick/Progress-Tracker.git"

echo "→ Initializing git..."
git init -b main

echo "→ Adding files..."
git add .

echo "→ Creating first commit..."
git commit -m "Initial commit — 30-Day Reset blueprint tracker"

echo "→ Adding remote..."
git remote add origin "$REPO_URL"

echo "→ Pushing to GitHub..."
echo "  (You'll be prompted for your GitHub username + a personal access token)"
git push -u origin main

echo ""
echo "✓ Done. Repo pushed to: $REPO_URL"
echo ""
echo "Next steps:"
echo "  1. Go to https://vercel.com/new"
echo "  2. Import this repo"
echo "  3. Click Deploy (no config needed)"
