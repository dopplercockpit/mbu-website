param(
  [string]$CodeRoot = ".",
  [string]$AssetsRepoRoot = "../mbu-assets",           # adjust if needed
  [string]$CdnBase = "https://mbu-assets.vercel.app",  # your CDN base
  [string]$ImgRootRel = "assets/img",                  # where images are (code repo)
  [switch]$ForceDeleteAfterCopy                        # delete even before CDN deploy
)

$ErrorActionPreference = "Stop"

# Extensions considered "assets"
$exts = @("*.png","*.jpg","*.jpeg","*.webp","*.gif","*.svg","*.ico","*.mp4","*.webm")

# Output logs
$logDir = Join-Path $CodeRoot "tools_logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$reportCsv = Join-Path $logDir "code_asset_cleanup_report.csv"

# Collect files under the code repo assets/img
$imgDir = Join-Path $CodeRoot $ImgRootRel
if (!(Test-Path $imgDir)) {
  Write-Host "No $ImgRootRel directory found in code repo. Nothing to do."
  exit 0
}

$files = @()
foreach ($e in $exts) {
  $files += Get-ChildItem -Path $imgDir -Recurse -File -Filter $e
}

if ($files.Count -eq 0) {
  Write-Host "No image/video assets found under $ImgRootRel."
  exit 0
}

# Prepare CSV header
"action,file,cdn_url,status,notes" | Out-File -FilePath $reportCsv -Encoding utf8

foreach ($f in $files) {
  # Compute CDN path by mirroring everything *after* assets/img/
  $rel = $f.FullName.Substring( (Resolve-Path $imgDir).Path.Length ).TrimStart('\','/')
  $cdnUrl = "$CdnBase/img/$rel".Replace("\","/")

  $status = ""
  $notes = ""

  try {
    # HEAD check on CDN
    $resp = Invoke-WebRequest -Uri $cdnUrl -Method Head -UseBasicParsing -ErrorAction SilentlyContinue
    $existsOnCdn = $resp -and ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400)
  } catch {
    $existsOnCdn = $false
  }

  if ($existsOnCdn) {
    # Already on CDN → delete from code repo
    try {
      Remove-Item -LiteralPath $f.FullName -Force
      $status = "deleted_from_code"
      $notes  = "CDN 200; removed from code repo"
    } catch {
      $status = "error_delete"
      $notes  = $_.Exception.Message
    }
    "delete,$($f.FullName),$cdnUrl,$status,$notes" | Out-File -FilePath $reportCsv -Append -Encoding utf8
  } else {
    # Not on CDN → copy to assets repo under /img/<rel>
    $dest = Join-Path (Join-Path $AssetsRepoRoot "img") $rel
    $destDir = Split-Path $dest -Parent
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null

    try {
      Copy-Item -LiteralPath $f.FullName -Destination $dest -Force
      if ($ForceDeleteAfterCopy) {
        Remove-Item -LiteralPath $f.FullName -Force
        $status = "copied_to_assets_and_deleted_from_code"
      } else {
        $status = "copied_to_assets_keep_in_code_until_deploy"
      }
      $notes = "Copied to assets repo: $dest"
    } catch {
      $status = "error_copy"
      $notes  = $_.Exception.Message
    }
    "copy,$($f.FullName),$cdnUrl,$status,$notes" | Out-File -FilePath $reportCsv -Append -Encoding utf8
  }
}

Write-Host "Done. Report: $reportCsv"
Write-Host "Next:"
Write-Host "  1) In `${AssetsRepoRoot}`: git add . && git commit -m 'Add missing images' && git push"
Write-Host "  2) After Vercel deploy completes, re-run this script with -ForceDeleteAfterCopy to remove remaining files from code."

