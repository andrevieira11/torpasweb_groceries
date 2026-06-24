#!/usr/bin/env pwsh
# Full release: build+push the image from this PC, then make the server pull and
# recreate (server only ever pulls — never builds). Override the target with
# MRLIST_SSH / MRLIST_DIR env vars.
$ErrorActionPreference = "Stop"

$SshTarget = if ($env:MRLIST_SSH) { $env:MRLIST_SSH } else { "drewst@torpasweb" }
$RemoteDir = if ($env:MRLIST_DIR) { $env:MRLIST_DIR } else { "/software/Mrlist" }

& "$PSScriptRoot/deploy.ps1"
if ($LASTEXITCODE -ne 0) { throw "deploy failed" }

Write-Host "Releasing on $SshTarget ($RemoteDir)"
ssh $SshTarget "cd '$RemoteDir' && docker compose pull && docker compose up -d"
if ($LASTEXITCODE -ne 0) { throw "remote release failed" }

Write-Host "Released."
