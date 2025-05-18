const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

// 🔧 Change this to the single page you want to mirror
const TARGET_URL = 'https://foxnews.com'; // ← Change this

// Normalize relative links to absolute original site URLs
function rewriteToOriginalLinks($, baseUrl) {
  // Rewrite href/src attributes to point to the original site
  $('[href], [src]').each((_, el) => {
    const attr = el.attribs.href ? 'href' : el.attribs.src ? 'src' : null;
    if (!attr) return;

    const val = $(el).attr(attr);
    if (!val) return;

    // Convert relative links to absolute
    if (val.startsWith('/')) {
      $(el).attr(attr, baseUrl + val);
    } else if (!val.startsWith('http') && !val.startsWith('data:')) {
      const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      $(el).attr(attr, base + val);
    }
  });
}

app.get('/', async (req, res) => {
  try {
    const response = await axios.get(TARGET_URL);
    const $ = cheerio.load(response.data);

    // Rewrite internal links to point back to the original site
    rewriteToOriginalLinks($, new URL(TARGET_URL).origin);

    res.send($.html());
  } catch (err) {
    console.error(err.message);
    res.status(500).send(`Error loading page: ${TARGET_URL}`);
  }
});

const express = require('express');
const app = express();
const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
