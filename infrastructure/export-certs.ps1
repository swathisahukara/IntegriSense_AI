# =============================================================================
# IntegriSense AI — Windows Certificate Exporter
# =============================================================================
#
# Exports all Windows Root Certificates (machine and user) into a single PEM file
# so Node.js and gRPC can trust corporate decrypting proxy certs.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File infrastructure/export-certs.ps1
#
# =============================================================================

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrEmpty($scriptDir)) {
    $scriptDir = Get-Location
}
$pemPath = [System.IO.Path]::GetFullPath((Join-Path $scriptDir "..\backend\ca.pem"))

Write-Host "Analyzing Windows Certificate Stores..." -ForegroundColor Cyan

# Fetch all root and intermediate certificates from LocalMachine and CurrentUser using native .NET X509Store
$pemContent = ""
$count = 0

$stores = @(
    @{ Name = "Root"; Location = "LocalMachine" },
    @{ Name = "Root"; Location = "CurrentUser" },
    @{ Name = "CA"; Location = "LocalMachine" },
    @{ Name = "CA"; Location = "CurrentUser" }
)

foreach ($s in $stores) {
    try {
        $store = New-Object System.Security.Cryptography.X509Certificates.X509Store($s.Name, $s.Location)
        $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
        
        foreach ($cert in $store.Certificates) {
            $base64 = [System.Convert]::ToBase64String($cert.RawData, [System.Base64FormattingOptions]::InsertLineBreaks)
            $pemContent += "-----BEGIN CERTIFICATE-----`r`n$base64`r`n-----END CERTIFICATE-----`r`n`r`n"
            $count++
        }
        $store.Close()
    } catch {
        Write-Host "Warning: Could not open store $($s.Name) at $($s.Location). Error: $_" -ForegroundColor Red
    }
}

# Ensure the output directory exists
$parentDir = Split-Path -Parent $pemPath
if (!(Test-Path -Path $parentDir)) {
    New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
}

# Write the PEM content
$pemContent | Out-File -FilePath $pemPath -Encoding ascii -Force
Write-Host "Successfully exported $count root certificates to $pemPath" -ForegroundColor Green
Write-Host "Now both Node.js and gRPC can trust your corporate proxy CA!" -ForegroundColor Green
