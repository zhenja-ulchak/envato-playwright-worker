const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'envato-playwright-worker'
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Playwright worker listening on port ${port}`);
});
