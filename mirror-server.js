const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

// 🔧 CHANGE THIS TO THE DOMAIN YOU WANT TO MIRROR
const TARGET_BASE = 'https://foxnews.com'; // ← Change this

// Rewrites internal page and asset links to go through your server
function rewriteLinks($, baseUrl) {
  // Rewrite hyperlinks to go through /mirror
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href.startsWith('/')) {
      $(el).attr('href', `/mirror${href}`);
    } else if (href.startsWith(baseUrl)) {
      const relative = href.replace(baseUrl, '');
      $(el).attr('href', `/mirror${relative}`);
    } else if (!href.startsWith('http')) {
      $(el).attr('href', `/mirror/${href}`);
    }
  });

  // Rewrite assets to go through the proxy
  $('link[href], script[src], img[src]').each((_, el) => {
    const attr = el.name === 'link' ? 'href' : 'src';
    const original = $(el).attr(attr);
    if (!original) return;

    // Absolute or root-relative paths
    if (original.startsWith('http')) {
      $(el).attr(attr, `/asset-proxy?url=${encodeURIComponent(original)}`);
    } else if (original.startsWith('/')) {
      $(el).attr(attr, `/asset-proxy?url=${encodeURIComponent(baseUrl + original)}`);
    } else {
      const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      $(el).attr(attr, `/asset-proxy?url=${encodeURIComponent(base + original)}`);
    }
  });
}

// Mirror endpoint for HTML pages
app.get('/mirror*', async (req, res) => {
  try {
    const path = req.path.replace('/mirror', '') || '/';
    const url = `${TARGET_BASE}${path}`;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    rewriteLinks($, TARGET_BASE);
    res.send($.html());
  } catch (err) {
    res.status(500).send(`Failed to fetch ${req.url}`);
  }
});

// Proxy endpoint for CSS, JS, images, etc.
app.get('/asset-proxy', async (req, res) => {
  const { url } = req.query;
  if (!url || !url.startsWith('http')) {
    return res.status(400).send('Invalid URL');
  }

  try {
    const assetRes = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        // You may need to spoof headers for some sites
        'User-Agent': 'Mozilla/5.0 (compatible; MirrorBot/1.0)',
        Referer: TARGET_BASE
      }
    });

    const contentType = assetRes.headers['content-type'] || 'application/octet-stream';
    res.set('Content-Type', contentType);
    res.send(assetRes.data);
  } catch (err) {
    res.status(502).send(`Failed to fetch asset: ${url}`);
  }
});

// Default to mirroring the home page
app.get('/', (req, res) => {
  res.redirect('/mirror');
});

// 🔧 Optional: change port if needed
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Mirror server with asset proxy running at http://localhost:${PORT}`);
});
