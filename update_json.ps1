# update_json.ps1 — Portable image JSON builder for MBU
# Run from repo root (same folder as this script)

$ErrorActionPreference = "Stop"

# Repo root is the folder where this script lives
$repoRoot = $PSScriptRoot
$imgRoot  = Join-Path $repoRoot "assets\img"

# 1) Standard sections => write assets/img/<section>/images.json
$sections = @('books','clothing','songs','woodworking','story')

foreach ($section in $sections) {
    $path = Join-Path $imgRoot $section
    if (Test-Path $path) {
        Write-Host "Updating $section ..."
        $files = Get-ChildItem -Path $path -File -Recurse | Where-Object {
            $_.Extension -match '(?i)\.(jpe?g|png|webp|gif)$'
        } | Sort-Object Name | Select-Object -ExpandProperty Name
        $json  = $files | ConvertTo-Json -Compress
        $out   = Join-Path $path "images.json"
        $json | Out-File -FilePath $out -Encoding utf8
        Write-Host "  -> $($files.Count) entries → $out"
    } else {
        Write-Host "Skip missing section: $section"
    }
}

# 2) Lucy 5 Lakes => write assets/img/lucy/signs.json and lakes.json
$lakeOrder = @('superior','michigan','huron','erie','ontario')

$lucyBase    = Join-Path $imgRoot "lucy"
$signsDir    = Join-Path $lucyBase "signs"
$lakesParent = Join-Path $lucyBase "lakes"

if (Test-Path $lucyBase) {
    Write-Host "Updating Lucy 5 Lakes ..."

    # signs.json
    if (Test-Path $signsDir) {
        $signs = Get-ChildItem -Path $signsDir -File | Where-Object {
            $_.Extension -match '(?i)\.(jpe?g|png|webp|gif)$'
        } | Sort-Object Name | Select-Object -ExpandProperty Name
        $signs | ConvertTo-Json -Compress | Out-File (Join-Path $lucyBase "signs.json") -Encoding utf8
        Write-Host "  -> signs.json ($($signs.Count))"
    } else {
        Write-Host "  ! Missing signs directory: $signsDir"
    }

    # lakes.json (array of arrays)
    $lakesArray = @()
    foreach ($lake in $lakeOrder) {
        $lakeDir = Join-Path $lakesParent $lake
        if (Test-Path $lakeDir) {
            $imgs = Get-ChildItem -Path $lakeDir -File | Where-Object {
                $_.Extension -match '(?i)\.(jpe?g|png|webp|gif)$'
            } | Sort-Object Name | Select-Object -ExpandProperty Name
            $lakesArray += ,$imgs
            Write-Host "  -> $lake ($($imgs.Count))"
        } else {
            $lakesArray += ,@()
            Write-Host "  -> $lake (0) [missing]"
        }
    }
    $lakesArray | ConvertTo-Json -Compress | Out-File (Join-Path $lucyBase "lakes.json") -Encoding utf8
    Write-Host "  -> lakes.json"
} else {
    Write-Host "Skip Lucy: $lucyBase not found."
}

Write-Host "All done."
