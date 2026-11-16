param(
    [ValidateRange(1024, 65535)][int]$Port = 5187,
    [switch]$NoBrowser,
    [string]$ServerRoot = $PSScriptRoot
)
$ErrorActionPreference = 'Stop'

function Show-PomoMentalError([string]$Message) {
    try {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show($Message, 'PomoMental', 'OK', 'Error') | Out-Null
    } catch { Write-Error $Message }
}

function Find-PomoMentalNode([string]$AppRoot) {
    $candidates = [System.Collections.Generic.List[string]]::new()
    if ($env:POMOMENTAL_NODE) { $candidates.Add($env:POMOMENTAL_NODE) }
    $candidates.Add((Join-Path $AppRoot 'runtime\node.exe'))
    $command = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($command) { $candidates.Add($command.Source) }
    if ($env:ProgramFiles) { $candidates.Add((Join-Path $env:ProgramFiles 'nodejs\node.exe')) }
    foreach ($candidate in $candidates) {
        if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { continue }
        try {
            $versionText = [string](& $candidate --version 2>$null)
            if ($LASTEXITCODE -eq 0 -and $versionText -match '^v(\d+)\.(\d+)\.(\d+)') {
                if ([int]$Matches[1] -ge 22) { return $candidate }
            }
        } catch { }
    }
    throw 'PomoMental needs Node.js 22 or newer. Install Node.js and ensure it is available on PATH.'
}

function Get-PomoMentalHealth([int]$CandidatePort, [string]$RootId) {
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$CandidatePort/__pomomental_health" -TimeoutSec 2 -Method Get
        return ($health.app -eq 'PomoMental' -and $health.kind -eq 'local-static' -and $health.version -eq 1 -and $health.rootId -eq $RootId)
    } catch { return $false }
}

function Test-PomoMentalPortBusy([int]$CandidatePort) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $connection = $client.BeginConnect('127.0.0.1', $CandidatePort, $null, $null)
        if (-not $connection.AsyncWaitHandle.WaitOne(300)) { return $false }
        $client.EndConnect($connection)
        return $true
    } catch { return $false } finally { $client.Dispose() }
}

try {
    $appRoot = (Resolve-Path -LiteralPath $ServerRoot).Path
    $serverScript = Join-Path $appRoot 'scripts\serve-static.mjs'
    if (-not (Test-Path -LiteralPath $serverScript -PathType Leaf) -or -not (Test-Path -LiteralPath (Join-Path $appRoot 'focus.html') -PathType Leaf)) {
        throw 'The PomoMental app files are missing. Extract the whole package into one folder, then open PomoMental.cmd again.'
    }
    $normalizedRoot = $appRoot.Replace('\', '/').ToLowerInvariant()
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { $rootId = ([System.BitConverter]::ToString($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($normalizedRoot)))).Replace('-', '').ToLowerInvariant().Substring(0, 16) }
    finally { $sha.Dispose() }
    $stateFolder = Join-Path $appRoot '.runtime'
    $stateFile = Join-Path $stateFolder 'launcher-state.json'
    $ports = [System.Collections.Generic.List[int]]::new()
    if (Test-Path -LiteralPath $stateFile -PathType Leaf) {
        try {
            $saved = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
            if ($saved.port -ge 1024 -and $saved.port -le 65535) { $ports.Add([int]$saved.port) }
        } catch { }
    }
    for ($offset = 0; $offset -lt 20 -and $Port + $offset -le 65535; $offset++) {
        if (-not $ports.Contains($Port + $offset)) { $ports.Add($Port + $offset) }
    }
    $activePort = 0
    $node = $null
    foreach ($candidatePort in $ports) {
        if (Get-PomoMentalHealth $candidatePort $rootId) { $activePort = $candidatePort; break }
        if (Test-PomoMentalPortBusy $candidatePort) { continue }
        if (-not $node) { $node = Find-PomoMentalNode $appRoot }
        # Paths are passed as arguments to Node, never evaluated as shell commands.
        $nodeArguments = '"{0}" --root "{1}" --port {2} --quiet' -f $serverScript, $appRoot, $candidatePort
        $ownedProcess = Start-Process -FilePath $node -ArgumentList $nodeArguments -WorkingDirectory $appRoot -WindowStyle Hidden -PassThru
        for ($attempt = 0; $attempt -lt 25; $attempt++) {
            if (Get-PomoMentalHealth $candidatePort $rootId) { $activePort = $candidatePort; break }
            $ownedProcess.Refresh()
            if ($ownedProcess.HasExited) { break }
            Start-Sleep -Milliseconds 200
        }
        if ($activePort) { break }
        $ownedProcess.Refresh()
        if (-not $ownedProcess.HasExited) { $ownedProcess.Kill() }
    }
    if (-not $activePort) { throw 'PomoMental could not start a local server. The requested ports may already be occupied. No existing process was stopped.' }
    New-Item -ItemType Directory -Path $stateFolder -Force | Out-Null
    @{ port = $activePort; app = 'PomoMental'; rootId = $rootId } | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8
    $appUrl = "http://127.0.0.1:$activePort/focus.html"
    if (-not $NoBrowser) { Start-Process $appUrl }
    Write-Output $appUrl
} catch {
    Show-PomoMentalError $_.Exception.Message
    exit 1
}
