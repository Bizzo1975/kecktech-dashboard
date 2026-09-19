$ErrorActionPreference = 'Stop'

$desktopPython = (Get-Command python.exe -ErrorAction Stop).Source
$packageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$packagePaths = @($packageRoot)

& $desktopPython -c 'import tkinter; import openpyxl' 2>$null
if ($LASTEXITCODE -ne 0) {
    $bundledPackages = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\Lib\site-packages'
    if (-not (Test-Path -LiteralPath $bundledPackages)) {
        throw 'The desktop Python needs tkinter and openpyxl 3.1.5. Install requirements.txt in a private environment, then retry.'
    }
    $packagePaths += $bundledPackages
}

$env:PYTHONPATH = ($packagePaths -join [IO.Path]::PathSeparator)
& $desktopPython -c 'import tkinter; import openpyxl'
if ($LASTEXITCODE -ne 0) {
    throw 'The desktop Python cannot load tkinter and openpyxl. Install requirements.txt in a private environment.'
}
& $desktopPython -m finance_core.app
