# create-zip.ps1 — Export a clean project zip (no secrets, no heavy build artifacts)
# Usage: .\create-zip.ps1 [-Out <path>]
param(
    [string]$Out = "$PSScriptRoot\..\workping_clean.zip"
)

$source = $PSScriptRoot
$dest   = [System.IO.Path]::GetFullPath($Out)

$excludeDirNames = @(
    'node_modules', '.git', '.gradle', '.idea', '.expo',
    '.cxx', '.kotlin', 'web-build', 'logs', '.claude', '.oci',
    'dist', '.vscode'
)

$excludePathPrefixes = @(
    'mobile-app/android/',
    'mobile-app/ios/',
    'centralized-server/server/uploads/',
    'centralized-server/server/temp/',
    'centralized-server/server/scratch/',
    'centralized-server/server/cleanup/'
)

$excludeFilePatterns = @(
    '^\.env$',
    '^\.env\.local$',
    '^\.env\..+\.local$',
    '\.jks$', '\.p8$', '\.p12$', '\.key$',
    '\.mobileprovision$', '\.keystore$', '\.pem$',
    '\.log$', '\.jsbundle$', '\.tsbuildinfo$',
    '\.iml$', '\.hprof$',
    '^Thumbs\.db$', '^\.DS_Store$', '^local\.properties$',
    '\.metro-health-check',
    '^bugreport'
)

Write-Host "Scanning files..." -ForegroundColor Cyan

$files = Get-ChildItem -Path $source -Recurse -File | Where-Object {
    $relPath = $_.FullName.Substring($source.Length + 1).Replace('\', '/')
    $parts   = $relPath -split '/'

    foreach ($part in $parts[0..($parts.Length - 2)]) {
        if ($excludeDirNames -contains $part) { return $false }
    }

    foreach ($prefix in $excludePathPrefixes) {
        if ($relPath.StartsWith($prefix)) { return $false }
    }

    foreach ($pat in $excludeFilePatterns) {
        if ($_.Name -match $pat) { return $false }
    }

    return $true
}

if (Test-Path $dest) {
    Remove-Item $dest -Force
    Write-Host "Removed existing $dest" -ForegroundColor Yellow
}

Write-Host "Zipping $($files.Count) files → $dest" -ForegroundColor Cyan

Add-Type -Assembly System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($dest, 'Create')

$i = 0
foreach ($file in $files) {
    $relPath = $file.FullName.Substring($source.Length + 1)
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $zip, $file.FullName, "workping\$relPath") | Out-Null
    $i++
    if ($i % 200 -eq 0) {
        Write-Host "  $i / $($files.Count) files..." -ForegroundColor DarkGray
    }
}

$zip.Dispose()

$sizeMB = [math]::Round((Get-Item $dest).Length / 1MB, 1)
Write-Host "`nDone - $i files zipped ($sizeMB MB)" -ForegroundColor Green
Write-Host "Output: $dest" -ForegroundColor Green
