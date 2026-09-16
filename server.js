const express = require('express');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const app = express();
const port = process.env.PORT || 3000;
const profileDir = process.env.PROFILE_DIR || '/app/profile';
const downloadDir = process.env.DOWNLOAD_DIR || '/data/downloads';

app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'envato-playwright-worker'
  });
});

app.post('/download', async (req, res) => {
  const itemUrl = String(req.body?.url || '');

  // Захист: дозволяємо тільки Envato Elements
  if (!itemUrl.startsWith('https://elements.envato.com/')) {
    return res.status(400).json({
      error: 'Only elements.envato.com URLs are allowed'
    });
  }

  let browser;

  try {
    fs.mkdirSync(downloadDir, { recursive: true });

    browser = await chromium.launchPersistentContext(profileDir, {
      headless: true,
      acceptDownloads: true
    });

    const page = await browser.newPage();

    await page.goto(itemUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Якщо сесія Envato не авторизована
    if (page.url().includes('login')) {
      return res.status(401).json({
        error: 'Envato session is not authenticated'
      });
    }

    const downloadPromise = page.waitForEvent('download', {
      timeout: 120000
    });

    const downloadButton = page.getByRole('button', {
      name: /download/i
    }).first();

    await downloadButton.click();

    const download = await downloadPromise;
    const filename = download.suggestedFilename() || `envato-${Date.now()}.mp4`;
    const outputPath = path.join(downloadDir, filename);

    await download.saveAs(outputPath);

    res.download(outputPath, filename, (error) => {
      if (error) {
        console.error('Send file error:', error.message);
      }

      // Видалити тимчасовий файл після відправки
      fs.unlink(outputPath, () => {});
    });
  } catch (error) {
    console.error('Download error:', error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Download failed',
        message: error.message
      });
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Playwright worker listening on port ${port}`);
});
