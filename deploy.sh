#!/usr/bin/env bash
# Build the MrList image on THIS machine (PC/CI) and push :latest + the git
# short-SHA to GHCR. The server NEVER builds (VM 100 freezes) — it only pulls.
# Prereq: docker login ghcr.io -u andrevieira11 (PAT with write:packages).
set -euo pipefail

IMAGE="ghcr.io/andrevieira11/torpasweb_groceries"
SHA="$(git rev-parse --short HEAD)"

echo "Building ${IMAGE}:latest and ${IMAGE}:${SHA}"
docker build -t "${IMAGE}:latest" -t "${IMAGE}:${SHA}" .

docker push "${IMAGE}:latest"
docker push "${IMAGE}:${SHA}"

echo "Pushed ${IMAGE}:latest and :${SHA}"
