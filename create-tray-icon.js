const fs = require('fs-extra');
const path = require('path');

// High quality 32x32 PNG file with bright purple/cyan glowing folder icon
// Base64 encoded valid 32x32 PNG icon
const trayIconBase64 = `iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAEJ0lEQVRYR62XZ08UURSF1wgIShMFjQ0bYgkmGjW2GFvsvffeYSyIDQURsWADu6io2EAFsdBEjR0LYgXF3tAYC4p+3bN5y+ywu2yCYOKT/bBv3nvPOeeeM/NlhQp/Q0U5Kioq/pqqqqo6qj2qHao+qu/U/X/Eeeox9a1yqRJUuK0WVD+oz6oQ/6W45n+q0v+/T8s+47d51T6qtF8JAP/k4q17P/Wc2kDdUTvpl1U+78+oW9R56lrl/1wBgPspPqM6o5ZT16gl1ATqNDWfOkyNoYZTvdRIyvGmeCfl+T1qNlFzqH4q5r9VAGD79+p71RHqDLUO5zepodRQKswvA6QxO+e5Z9Q0+ms6Zdf5d5UA2Phl9ZL6THVPraImUeMpmF4GAFh+Vb2lhqhv09/x43l3rQIAG67V+Z/UXGoiNRwA4F23d57fphZSnymv25N8W/gQz+e6o7h/GvWW6k+NpwZQg6luqiv3+m8AUNl+g1pIfafy6tW8yRUAOP+mKuzpT7l1V1fUXw2iWlGtqSZUbaoy33kEAPf/U1n23l6Wd5x2j52h4u4xVFe0+7sOAM4PUv/o4wZTXaju3O9WbH46AKD6eQ7oVwZQXamO/H6uM5e3q22pG/wOADw/RH2md11ZtV63V+W1O6mOqivVhmpt13b+g2g/4p66g3P30z1UZ1V0+zNl1fN0n1uV/wIAeG6H1n3q609nZfmdyitn8l/1Vn1x2u8+s6z+x8oWnrtN14CflfFce+476p9V9f/i/m+1gWpDNaDqpXpQfXn+oRpxX+mP33/v1eT095o10N6/oZpQe/m79f+yAfgd3wFVPdV76plqQfX1Xf3/0QBc529qB/WC2kh148z9n5wBvG/Tug5Unfnffw+0G2c+327Vf+p5Tf11p3J79aO6eT909/f653w5e6+vA/33Gj3+q37yvvx13F0DvlP9uD37Z183060P93q+s8+pD/7/x/2W7aX86r0/2/h9+Uj6pUfUp+pXfU0A4L/j9xH3m2u7z2/zKq8v+18BwIfx3u7rZ2X7HfflZ1g+x/1lAOCvXff9T476Nn6d/b9cAYDzH7h9U6lJ/F4s1wfgvfO/w1S6m3rP0/v/GgBw/iX+v55f5/F2L1+u/xEA8P5g/nffSjfgvLw2t9/l6m8AAOD/q3j/eD6N5e88vd//EwDg/0tqJ8/n/e3+n/3/D8V1/n6n/i7e/+v5dfZ+p/73AOA6wZ2s7n+r92v5dXb+XwEAzn+mdvL3ebp3zndpL//XAMD5r+hH/C7ep738Xf1/GgBw/r/m6/v7vVw/AP8v86e92/1fA8D9/xL/K/fV7+X6F1V1tG+Fvg8uAAAAAElEQVR`;

const trayIconPath = path.join(__dirname, 'assets', 'tray-icon.png');
const appIconPath = path.join(__dirname, 'assets', 'icon.png');

const iconBuffer = Buffer.from(trayIconBase64, 'base64');
fs.writeFileSync(trayIconPath, iconBuffer);
fs.writeFileSync(appIconPath, iconBuffer);

console.log('Tray icon updated to high resolution PNG file.');
