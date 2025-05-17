const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

const TARGET_BASE = 'https://foxnews.com'; // Site you want to mirror

function rewriteLinks($, baseUrl) {
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
  $('link[href], script[src], img[src]').each((_, el) => {
    const attr = el.name === 'link' ? 'href' : 'src';
    const val = $(el).attr(attr);
    if (val && val.startsWith('/')) {
      $(el).attr(attr, `${baseUrl}${val}`);
    }
  });
}

app.get('/mirror*', async (req, res) => {
  try {
    const path = req.path.replace('/mirror', '') || '/';
    const url = `${TARGET_BASE}${path}`;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Rewrite links to stay within your mirrored domain
    rewriteLinks($, TARGET_BASE);

    res.send($.html());
  } catch (err) {
    res.status(500).send(`Failed to fetch ${req.url}`);
  }
});

app.get('/', (req, res) => {
  res.redirect('/mirror');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Mirror server running on http://localhost:${PORT}`);
});
