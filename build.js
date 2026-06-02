const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building frontend...');
execSync('npx vite build', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });

console.log('Fixing HTML for non-ESM browser...');
const indexPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace('type="module" crossorigin ', '');
html = html.replace('<html lang="en">', '<html lang="zh">');
html = html.replace(/<title>.*?<\/title>/, '<title>人生设计 · 个人成长系统</title>');
html = html.replace('crossorigin href', 'href');
fs.writeFileSync(indexPath, html, 'utf8');
console.log('Build complete!');
