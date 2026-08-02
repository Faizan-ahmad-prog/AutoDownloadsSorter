const fs = require('fs-extra');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');
fs.ensureDirSync(assetsDir);

// 1x1 transparent PNG fallback buffer
const transparentPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const iconBuffer = Buffer.from(transparentPngBase64, 'base64');

const trayIconPath = path.join(assetsDir, 'tray-icon.png');
const appIconPath = path.join(assetsDir, 'icon.png');

if (!fs.existsSync(trayIconPath)) {
  fs.writeFileSync(trayIconPath, iconBuffer);
}
if (!fs.existsSync(appIconPath)) {
  fs.writeFileSync(appIconPath, iconBuffer);
}

console.log('Assets initialized successfully.');
