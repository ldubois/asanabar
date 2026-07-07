const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const iconsDir = path.join(__dirname, '..', 'assets', 'icons');

const colors = {
  green: '#10B981',
  orange: '#F59E0B',
  red: '#EF4444',
  gray: '#9CA3AF',
};

// Tray icon: le logo Asana (trois boules).
async function generateTrayIcon(name, color, size) {
  const r = size * 0.165;
  const topY = size * 0.32;
  const botY = size * 0.68;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size * 0.5}" cy="${topY}" r="${r}" fill="${color}"/>
    <circle cx="${size * 0.21}" cy="${botY}" r="${r}" fill="${color}"/>
    <circle cx="${size * 0.79}" cy="${botY}" r="${r}" fill="${color}"/>
  </svg>`;

  const suffix = size === 32 ? '@2x' : '';
  const outputPath = path.join(iconsDir, `tray-${name}${suffix}.png`);

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outputPath);

  console.log(`Generated: ${outputPath}`);
}

async function generateAppIcon() {
  const svgPath = path.join(iconsDir, 'icon.svg');
  const outputPath = path.join(iconsDir, 'icon.png');

  await sharp(svgPath)
    .resize(512, 512)
    .png()
    .toFile(outputPath);

  console.log(`Generated: ${outputPath}`);
}

async function main() {
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  for (const [name, color] of Object.entries(colors)) {
    await generateTrayIcon(name, color, 16);  // 1x
    await generateTrayIcon(name, color, 32);  // 2x
  }

  await generateAppIcon();

  console.log('All icons generated successfully!');
}

main().catch(console.error);
