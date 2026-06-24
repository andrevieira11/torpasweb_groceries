#!/usr/bin/env pwsh
# Build the MrList image on THIS machine (PC) and push :latest + the git
# short-SHA to GHCR. The server NEVER builds (VM 100 freezes) — it only pulls.
# Prereq: docker login ghcr.io -u andrevieira11 (PAT with write:packages).
$ErrorActionPreference = "Stop"

$Image = "ghcr.io/andrevieira11/torpasweb_groceries"
$Sha = (git rev-parse --short HEAD).Trim()

Write-Host "Building ${Image}:latest and ${Image}:$Sha"
docker build -t "${Image}:latest" -t "${Image}:$Sha" .
if ($LASTEXITCODE -ne 0) { throw "docker build failed" }

docker push "${Image}:latest"; if ($LASTEXITCODE -ne 0) { throw "push :latest failed" }
docker push "${Image}:$Sha";   if ($LASTEXITCODE -ne 0) { throw "push :$Sha failed" }

Write-Host "Pushed ${Image}:latest and :$Sha"
