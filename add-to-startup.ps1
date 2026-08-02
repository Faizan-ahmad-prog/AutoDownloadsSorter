$WshShell = New-Object -ComObject WScript.Shell
$StartupFolder = [System.Environment]::GetFolderPath('Startup')
$ShortcutPath = Join-Path $StartupFolder "AutoDownloadsSorter.lnk"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "C:\Users\faiza\AutoDownloadsSorter\DownloadsSorterTray.exe"
$Shortcut.WorkingDirectory = "C:\Users\faiza\AutoDownloadsSorter"
$Shortcut.Description = "Auto Downloads File Sorter App Tray"
$Shortcut.Save()

Write-Host "Startup shortcut updated to DownloadsSorterTray.exe at: $ShortcutPath"
