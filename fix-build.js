const fs = require('fs');
const path = require('path');
const indexPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  html = html.replace('type="module" crossorigin ', '');
  html = html.replace('<html lang="en">', '<html lang="zh">');
  html = html.replace(/<title>.*?<\/title>/, '<title>人生设计 · 个人成长系统</title>');
  html = html.replace('crossorigin href', 'href');
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Build HTML fixed');
}
