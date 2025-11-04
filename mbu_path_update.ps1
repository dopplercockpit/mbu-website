# MBU path fixer — updates local asset refs to CDN + corrects css/js paths
param(
  [string]$Root = ".",
  [string]$CdnBase = "https://mbu-assets.vercel.app"
)

Write-Host "Scanning $Root ..." -ForegroundColor Cyan

# File globs to process
$files = Get-ChildItem -Path $Root -Recurse -Include *.html,*.js -File

$replacements = @(
  @{ Pattern = 'href="assets/css/style\.css"'; Replacement = 'href="css/style.css"'; Note="Local CSS path"; },
  @{ Pattern = 'src="assets/js/carousel\.js"'; Replacement = 'src="js/carousel.js"'; Note="Local JS path"; },
  @{ Pattern = 'src="assets/js/site\.js"'; Replacement = 'src="js/site.js"'; Note="Local JS path"; },

  # Images to CDN
  @{ Pattern = 'src="assets/img/'; Replacement = 'src="' + $CdnBase + '/img/'; Note="Image to CDN"; },
  @{ Pattern = "url\(['""]?assets/img/"; Replacement = "url('" + $CdnBase + "/img/"; Note="CSS url() images to CDN"; },

  # Carousel JSONs to CDN
  @{ Pattern = 'assets/img/([A-Za-z0-9_\-\/]+)/images\.json'; Replacement = $CdnBase + '/img/$1/images.json'; Note="Carousel JSON to CDN"; }
)

$changes = @()

foreach ($f in $files) {
  $text = Get-Content -Raw -Path $f.FullName
  $orig = $text
  foreach ($r in $replacements) {
    $newText = [regex]::Replace($text, $r.Pattern, $r.Replacement)
    if ($newText -ne $text) {
      $changes += [PSCustomObject]@{
        File = $f.FullName
        Pattern = $r.Pattern
        Replacement = $r.Replacement
      }
      $text = $newText
    }
  }
  if ($text -ne $orig) {
    Set-Content -Path $f.FullName -Value $text -Encoding UTF8
    Write-Host "Updated: $($f.FullName)" -ForegroundColor Green
  }
}

$report = Join-Path $Root "mbu_path_fixes_report.csv"
$changes | Sort-Object File | Export-Csv -Path $report -NoTypeInformation -Encoding UTF8
Write-Host "Done. Report written to $report" -ForegroundColor Cyan
