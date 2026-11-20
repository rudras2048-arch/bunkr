const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const publicDir = path.join(__dirname, 'public');
const extensionDir = path.join(__dirname, 'extension');

app.use(express.static(publicDir));
app.use(express.static(extensionDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Bunkr dev server running at http://${HOST}:${PORT}`);
});
