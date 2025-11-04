param(
  [string]$Root = "."
)

$ErrorActionPreference = "Stop"

function Dedup-ScriptInclude {
  param([string]$FilePath, [string]$Pattern)
  $text = Get-Content $FilePath -Raw -Encoding UTF8
  $matches = [regex]::Matches($text, $Pattern, 'IgnoreCase')
  if ($matches.Count -gt 1) {
    # Keep the first occurrence, remove subsequent ones
    $firstIndex = $matches[0].Index
    $firstLength = $matches[0].Length
    $count = 0
    $new = [System.Text.StringBuilder]::new()
    $i = 0
    while ($i -lt $text.Length) {
      $m = [regex]::Match($text.Substring($i), $Pattern, 'IgnoreCase')
      if ($m.Success) {
        if ($i + $m.Index -eq $firstIndex) {
          # write the first match
          $new.Append($text.Substring($i, $m.Index + $m.Length)) | Out-Null
          $i += ($m.Index + $m.Length)
          # break loop and then append rest normally
          break
        } else {
          # skip this duplicate
          $new.Append($text.Substring($i, $m.Index)) | Out-Null
          $i += ($m.Index + $m.Length)
        }
      } else {
        $new.Append($text.Substring($i)) | Out-Null
        $i = $text.Length
      }
    }
    if ($i -lt $text.Length) {
      $new.Append($text.Substring($i)) | Out-Null
    }
    Set-Content -Path $FilePath -Value $new.ToString() -Encoding UTF8
    return $true
  }
  return $false
}

$report = @()

function Fix-File {
  param([string]$FilePath)

  $orig = Get-Content $FilePath -Raw -Encoding UTF8
  $text = $orig
  $changed = $false

  # 1) Remove placeholder carousel JSON block lines (assets/img/<section>/images.json)
  $text2 = $text -replace "jsonPath\s*:\s*'assets/img/<section>/images\.json'\s*,?", ""
  if ($text2 -ne $text) { $changed = $true; $text = $text2; $report += "Removed placeholder jsonPath in $FilePath" }

  # 2) Fix Lucy base path
  $text2 = $text -replace "base:\s*'assets/img/lucy/?'", "base: 'https://mbu-assets.vercel.app/img/lucy'"
  if ($text2 -ne $text) { $changed = $true; $text = $text2; $report += "Lucy base -> CDN in $FilePath" }

  # 3) Remove stray references like assets/img/findbruno/v1/ or assets/img/lucy/
  $text2 = $text -replace "assets/img/findbruno/v1/", "https://mbu-assets.vercel.app/img/findbruno/v1/"
  if ($text2 -ne $text) { $changed = $true; $text = $text2; $report += "fbttd-v1 stray base -> CDN in $FilePath" }
  $text2 = $text -replace "assets/img/lucy/", "https://mbu-assets.vercel.app/img/lucy/"
  if ($text2 -ne $text) { $changed = $true; $text = $text2; $report += "Lucy stray base -> CDN in $FilePath" }

  # 4) Fix Find Bruno v2/v3/v4 wrong jsonPath (fbttd-vN/images.json => findbruno/vN/hotspots.json)
  $text2 = $text -replace "https://mbu-assets\.vercel\.app/img/fbttd-v2/images\.json", "https://mbu-assets.vercel.app/img/findbruno/v2/hotspots.json"
  if ($text2 -ne $text) { $changed = $true; $text = $text2; $report += "fbttd-v2 jsonPath fixed in $FilePath" }
  $text2 = $text -replace "https://mbu-assets\.vercel\.app/img/fbttd-v3/images\.json", "https://mbu-assets.vercel.app/img/findbruno/v3/hotspots.json"
  if ($text2 -ne $text) { $changed = $true; $text = $text2; $report += "fbttd-v3 jsonPath fixed in $FilePath" }
  $text2 = $text -replace "https://mbu-assets\.vercel\.app/img/fbttd-v4/images\.json", "https://mbu-assets.vercel.app/img/findbruno/v4/hotspots.json"
  if ($text2 -ne $text) { $changed = $true; $text = $text2; $report += "fbttd-v4 jsonPath fixed in $FilePath" }

  if ($changed) {
    Set-Content -Path $FilePath -Value $text -Encoding UTF8
  }

  # 5) Dedup JS includes
  $dedup1 = Dedup-ScriptInclude -FilePath $FilePath -Pattern '<script\s+src="assets/js/site\.js"[^>]*></script>'
  if ($dedup1) { $report += "Deduped site.js in $FilePath" }
  $dedup2 = Dedup-ScriptInclude -FilePath $FilePath -Pattern '<script\s+src="assets/js/carousel\.js"[^>]*></script>'
  if ($dedup2) { $report += "Deduped carousel.js in $FilePath" }
}

$targets = Get-ChildItem -Recurse -File -Include *.html -Path $Root
foreach ($t in $targets) {
  Fix-File -FilePath $t.FullName
}

$logPath = Join-Path $Root "tools_logs"
New-Item -ItemType Directory -Path $logPath -Force | Out-Null
$reportFile = Join-Path $logPath "autofix_report.txt"
$report | Set-Content -Path $reportFile -Encoding UTF8
Write-Host "Autofix complete. See $reportFile"
