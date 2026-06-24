#!/usr/bin/env bash
# Full release: build+push the image from this PC, then make the server pull and
# recreate (server only ever pulls — never builds). Override the target with
# MRLIST_SSH / MRLIST_DIR env vars.
set -euo pipefail

SSH_TARGET="${MRLIST_SSH:-drewst@torpasweb}"
REMOTE_DIR="${MRLIST_DIR:-/software/Mrlist}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"${HERE}/deploy.sh"

echo "Releasing on ${SSH_TARGET} (${REMOTE_DIR})"
ssh "${SSH_TARGET}" "cd '${REMOTE_DIR}' && docker compose pull && docker compose up -d"

echo "Released."
