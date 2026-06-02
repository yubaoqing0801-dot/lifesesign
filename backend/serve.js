const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 8080;

app.use('/api', createProxyMiddleware({ target: 'http://localhost:3001', changeOrigin: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, () => console.log('Static server at http://localhost:' + PORT));
