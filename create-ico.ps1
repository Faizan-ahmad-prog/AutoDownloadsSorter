Add-Type -AssemblyName System.Drawing

$assetsDir = "C:\Users\faiza\AutoDownloadsSorter\assets"
if (!(Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir | Out-Null
}

// Create 32x32 bitmap for tray icon
$bmp = New-Object System.Drawing.Bitmap 32, 32
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

// Fill background with bright vibrant indigo/purple
$bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 99, 102, 241))
$g.FillEllipse($bgBrush, 1, 1, 30, 30)

// Draw sharp white folder shape
$folderBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$g.FillRectangle($folderBrush, 7, 12, 18, 12)
$g.FillRectangle($folderBrush, 7, 9, 8, 4)

// Draw arrow down inside folder
$arrowPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 99, 102, 241)), 2
$g.DrawLine($arrowPen, 16, 14, 16, 20)
$g.DrawLine($arrowPen, 13, 17, 16, 20)
$g.DrawLine($arrowPen, 19, 17, 16, 20)

$pngPath = Join-Path $assetsDir "tray-icon.png"
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

// Convert Hicon to ICO file
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$icoPath = Join-Path $assetsDir "tray-icon.ico"
$stream = New-Object System.IO.FileStream($icoPath, [System.IO.FileMode]::Create)
$icon.Save($stream)
$stream.Close()

$g.Dispose()
$bmp.Dispose()

Write-Host "Created sharp ICO and PNG tray icons successfully at $icoPath"
