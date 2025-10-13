# Regenerate images.json for each image folder in MBU site
$root = "C:\active_projects\mbu\website_build\mbu-website\assets\img"

# folders you want to include in the automation
$folders = @('books','clothing','songs','woodworking','story')

foreach ($f in $folders) {
    $path = Join-Path $root $f
    if (Test-Path $path) {
        Write-Host "Updating $f ..."

        # Gather images (case-insensitive, all common formats)
        $files = Get-ChildItem -Path $path -File -Recurse | Where-Object {
            $_.Extension -match 'jpg|jpeg|png|webp'
        } | Sort-Object Name | Select-Object -ExpandProperty Name

        # Convert to JSON
        $json = $files | ConvertTo-Json -Compress
        $outfile = Join-Path $path "images.json"
        $json | Out-File -FilePath $outfile -Encoding utf8

        Write-Host "  -> wrote $($files.Count) entries to images.json"
    } else {
        Write-Host "Skipping missing folder: $f"
    }
}

Write-Host "All done."
