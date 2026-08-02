$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) { $ScriptDir = (Get-Location).Path }

$WshShell = New-Object -ComObject WScript.Shell
$StartupFolder = [System.Environment]::GetFolderPath('Startup')
$ShortcutPath = Join-Path $StartupFolder "AutoDownloadsSorter.lnk"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = Join-Path $ScriptDir "DownloadsSorterTray.exe"
$Shortcut.WorkingDirectory = $ScriptDir
$Shortcut.Description = "Auto Downloads File Sorter App Tray"
$Shortcut.Save()

Write-Host "Startup shortcut created for DownloadsSorterTray.exe at: $ShortcutPath"
