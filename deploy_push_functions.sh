#!/usr/bin/env bash
# Deploy FCM Cloud Functions for TNIT push notifications.
# Requires: Firebase Blaze plan, firebase-tools login, Node 20+.
set -euo pipefail
cd "$(dirname "$0")"
cd functions
npm install
cd ..
npx --yes firebase-tools@13 deploy --only functions --project tnit-6c48d
echo "Done. Also publish firestore.rules (push_tokens + config/push) if not yet deployed."
