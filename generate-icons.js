// Run with: node generate-icons.js
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size;

  // Background
  const grad = ctx.createLinearGradient(0, 0, s, s);
  grad.addColorStop(0, '#6366f1');
  grad.addColorStop(1, '#4f46e5');
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, s, s, s * 0.2);
  ctx.fill();

  // Spider web lines
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = size * 0.04;
  const cx = s / 2, cy = s / 2;
  const r = s * 0.38;
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    ctx.stroke();
  }
  for (let ring = 1; ring <= 3; ring++) {
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const angle = (i * Math.PI) / 3;
      const rr = r * (ring / 3);
      const x = cx + Math.cos(angle) * rr;
      const y = cy + Math.sin(angle) * rr;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // Cursor arrow
  ctx.fillStyle = 'white';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = size * 0.08;
  const cs = s * 0.28;
  const cx2 = s * 0.58, cy2 = s * 0.58;
  ctx.beginPath();
  ctx.moveTo(cx2, cy2);
  ctx.lineTo(cx2 + cs, cy2 + cs * 0.6);
  ctx.lineTo(cx2 + cs * 0.45, cy2 + cs * 0.75);
  ctx.lineTo(cx2 + cs * 0.7, cy2 + cs * 1.1);
  ctx.lineTo(cx2 + cs * 0.5, cy2 + cs * 1.18);
  ctx.lineTo(cx2 + cs * 0.25, cy2 + cs * 0.83);
  ctx.lineTo(cx2, cy2 + cs);
  ctx.closePath();
  ctx.fill();

  return canvas.toBuffer('image/png');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

[16, 32, 48, 128].forEach(size => {
  const buf = drawIcon(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buf);
  console.log(`✓ icon${size}.png`);
});

console.log('\nIconos generados en /icons/');
