<#
    Erzeugt ein selbstsigniertes Code-Signing-Zertifikat fuer den Build.

    Einmalig ausfuehren:  npm run cert

    Das Zertifikat landet im Benutzerspeicher (Cert:\CurrentUser\My) und wird
    zusaetzlich als vertrauenswuerdig eingetragen (Cert:\CurrentUser\Root),
    damit Windows den Herausgeber auf diesem Rechner anerkennt. Beides ohne
    Adminrechte. Der oeffentliche Teil wird nach build\cert\ exportiert, um ihn
    auf weiteren Rechnern importieren zu koennen.

    Es ist ein End-Entity-Zertifikat, keine CA: vertraut wird damit genau
    diesem einen Zertifikat, nicht einer Signierstelle.
#>

[CmdletBinding()]
param(
    [string]$Subject = 'Dennis Drochmann',
    [int]$Years = 5
)

$ErrorActionPreference = 'Stop'

# Ohne das Cert:-Laufwerk geht hier nichts. Es fehlt, wenn PSModulePath auf
# PowerShell-7-Pfade zeigt (z. B. aus einem pwsh-Terminal geerbt) - Windows
# PowerShell 5.1 laedt dann ein inkompatibles Security-Modul. Das npm-Skript
# leert PSModulePath deshalb vorher.
if (-not (Get-PSDrive -Name Cert -ErrorAction SilentlyContinue)) {
    throw 'Das Cert:-Laufwerk fehlt. Bitte "npm run cert" verwenden oder in ' +
          'dieser Shell zuerst $env:PSModulePath = $null setzen.'
}

$dn      = "CN=$Subject"
$outDir  = Join-Path $PSScriptRoot '..\build\cert'
$cerPath = Join-Path $outDir 'code-signing.cer'

# OID der Code-Signing-Nutzung. Bewusst nicht ueber "Get-ChildItem
# -CodeSigningCert" gefiltert: dieser dynamische Parameter des Zertifikat-
# Providers fehlt in Windows PowerShell 5.1, wenn das Skript aus cmd/npm
# gestartet wird.
$codeSigningOid = '1.3.6.1.5.5.7.3.3'

# Vorhandenes, noch gueltiges Zertifikat wiederverwenden.
$cert = Get-ChildItem Cert:\CurrentUser\My |
    Where-Object {
        $_.Subject -eq $dn -and
        $_.NotAfter -gt (Get-Date) -and
        $_.HasPrivateKey -and
        ($_.EnhancedKeyUsageList.ObjectId -contains $codeSigningOid)
    } |
    Sort-Object NotAfter -Descending |
    Select-Object -First 1

if ($cert) {
    Write-Host "Vorhandenes Zertifikat wird genutzt: $($cert.Thumbprint)"
} else {
    $cert = New-SelfSignedCertificate `
        -Type CodeSigningCert `
        -Subject $dn `
        -KeyAlgorithm RSA `
        -KeyLength 3072 `
        -HashAlgorithm SHA256 `
        -KeyUsage DigitalSignature `
        -CertStoreLocation Cert:\CurrentUser\My `
        -NotAfter (Get-Date).AddYears($Years) `
        -FriendlyName "Shimly_Quiz Code Signing"
    Write-Host "Neues Zertifikat erstellt: $($cert.Thumbprint)"
}

# Als vertrauenswuerdig eintragen, damit die Signatur lokal gueltig ist.
$root = Get-ChildItem Cert:\CurrentUser\Root |
    Where-Object { $_.Thumbprint -eq $cert.Thumbprint }

if ($root) {
    Write-Host 'Vertrauensstellung war bereits gesetzt.'
} else {
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store 'Root', 'CurrentUser'
    $store.Open('ReadWrite')
    $store.Add([System.Security.Cryptography.X509Certificates.X509Certificate2]::new($cert.RawData))
    $store.Close()
    Write-Host 'Als vertrauenswuerdig eingetragen (CurrentUser\Root).'
}

# Oeffentlichen Teil exportieren - enthaelt keinen privaten Schluessel.
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
Export-Certificate -Cert $cert -FilePath $cerPath -Force | Out-Null

Write-Host ''
Write-Host "Herausgeber : $Subject"
Write-Host "Gueltig bis : $($cert.NotAfter.ToString('dd.MM.yyyy'))"
Write-Host "Exportiert  : $(Resolve-Path $cerPath)"
Write-Host ''
Write-Host 'Naechster Schritt: npm run dist'
