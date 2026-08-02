const { Notification, shell } = require('electron');
const notifier = require('node-notifier');
const path = require('path');
const fs = require('fs-extra');

const iconPath = path.join(__dirname, 'assets', 'icon.png');

function sendNotification(title, message, destPath) {
  console.log(`[Notification] Sending: ${title} - ${message}`);

  let notificationShown = false;

  // 1. Try Electron Native Notification first
  try {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: title,
        body: message,
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
        silent: false
      });

      notification.on('click', () => {
        if (destPath && fs.existsSync(destPath)) {
          shell.showItemInFolder(destPath);
        }
      });

      notification.show();
      notificationShown = true;
    }
  } catch (err) {
    console.error('Electron notification failed:', err);
  }

  // 2. Fallback / Secondary backup via node-notifier (Windows Toast / Balloon)
  try {
    notifier.notify(
      {
        title: title,
        message: message,
        icon: iconPath,
        sound: true,
        wait: true,
        appID: 'com.autodownloadssorter.app'
      },
      (err, response) => {
        if (err) console.error('node-notifier error:', err);
      }
    );
  } catch (e) {
    console.error('node-notifier fallback failed:', e);
  }
}

module.exports = { sendNotification };
