$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "Auto Downloads Sorter.lnk"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "C:\Users\faiza\AutoDownloadsSorter\DownloadsSorterTray.exe"
$Shortcut.WorkingDirectory = "C:\Users\faiza\AutoDownloadsSorter"
$Shortcut.Description = "Auto Downloads File Sorter App Tray"
$Shortcut.Save()

Write-Host "Desktop shortcut updated to DownloadsSorterTray.exe at: $ShortcutPath"
