#!/usr/bin/env bash
set -euo pipefail

REMOTE="git@github.com:msriram/folsom-fireflies.git"

if ! command -v git >/dev/null 2>&1; then
  echo "Git is required." >&2
  exit 1
fi

if [ ! -d .git ]; then
  git init
fi

git add .
if ! git diff --cached --quiet; then
  git commit -m "Update Habitat Builders team site"
fi

git branch -M main
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE"
else
  git remote add origin "$REMOTE"
fi

git push -u origin main

echo
printf 'Pushed. In GitHub, open Settings → Pages and select GitHub Actions.\n'
