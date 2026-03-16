$ErrorActionPreference = "Stop"

# Edge logout reset for current Windows user (no admin required)
$ForceCloseEdge = $true
$DryRun = $false
$Domains = @("lowes.com", "vendorgateway.lowes.com")

function Write-Log {
    param([string]$Message)
    Write-Host "[edge-reauth] $Message"
}

function Remove-PathSafe {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    if ($DryRun) {
        Write-Log "[dry-run] Remove $Path"
        return
    }

    try {
        Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
    }
    catch {
        Write-Log "Failed to remove: $Path"
    }
}

function Remove-DomainMatches {
    param([string]$Root)

    if (-not (Test-Path -LiteralPath $Root)) {
        return
    }

    foreach ($domain in $Domains) {
        $matches = Get-ChildItem -LiteralPath $Root -Recurse -Force -ErrorAction SilentlyContinue |
            Where-Object {
                $_.Name -like "*$domain*" -or $_.FullName -like "*$domain*"
            } |
            Sort-Object FullName -Descending -Unique

        foreach ($item in $matches) {
            if ($DryRun) {
                Write-Log "[dry-run] Remove $($item.FullName)"
            }
            else {
                try {
                    Remove-Item -LiteralPath $item.FullName -Recurse -Force -ErrorAction Stop
                }
                catch {
                    Write-Log "Failed to remove: $($item.FullName)"
                }
            }
        }
    }
}

function Close-Edge {
    $edgeProcesses = Get-Process -Name "msedge" -ErrorAction SilentlyContinue

    if (-not $edgeProcesses) {
        return
    }

    if (-not $ForceCloseEdge) {
        throw "Microsoft Edge is running. Set `$ForceCloseEdge = `$true to close it automatically."
    }

    Write-Log "Closing Microsoft Edge..."

    foreach ($proc in $edgeProcesses) {
        try {
            $null = $proc.CloseMainWindow()
        }
        catch {
        }
    }

    Start-Sleep -Seconds 5

    $remaining = Get-Process -Name "msedge" -ErrorAction SilentlyContinue
    if ($remaining) {
        foreach ($proc in $remaining) {
            try {
                Stop-Process -Id $proc.Id -Force -ErrorAction Stop
            }
            catch {
            }
        }
    }

    Start-Sleep -Seconds 2
}

$edgeUserData = Join-Path $env:LOCALAPPDATA "Microsoft\Edge\User Data"

if (-not (Test-Path -LiteralPath $edgeUserData)) {
    Write-Log "Edge user data not found."
    exit 0
}

Close-Edge

$profiles = Get-ChildItem -LiteralPath $edgeUserData -Directory -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Name -eq "Default" -or $_.Name -like "Profile *"
    }

if (-not $profiles) {
    Write-Log "No Edge profiles found."
    exit 0
}

foreach ($profile in $profiles) {
    $profilePath = $profile.FullName
    Write-Log "Processing profile: $profilePath"

    Remove-PathSafe (Join-Path $profilePath "Network")

    Remove-DomainMatches (Join-Path $profilePath "Local Storage")
    Remove-DomainMatches (Join-Path $profilePath "Session Storage")
    Remove-DomainMatches (Join-Path $profilePath "IndexedDB")
    Remove-DomainMatches (Join-Path $profilePath "blob_storage")
    Remove-DomainMatches (Join-Path $profilePath "Storage")
    Remove-DomainMatches (Join-Path $profilePath "databases")
    Remove-DomainMatches (Join-Path $profilePath "File System")

    Remove-PathSafe (Join-Path $profilePath "Service Worker")
    Remove-PathSafe (Join-Path $profilePath "Code Cache")
    Remove-PathSafe (Join-Path $profilePath "Cache")
    Remove-PathSafe (Join-Path $profilePath "GPUCache")
}

Write-Log "Done."
exit 0
