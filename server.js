const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const cors = require('cors');

const PORT = process.env.PORT || 3000; // Use fallback locally

app.use(cors()); // Allow all origins

// 🔧 Page you want to mirror
const TARGET_URL = 'https://www.foxnews.com'; // ← MUST include www

// Rewrites all relative href/src links to point to the original site
function rewriteToOriginalLinks($, baseUrl) {
  $('[href], [src]').each((_, el) => {
    const attr = el.attribs.href ? 'href' : el.attribs.src ? 'src' : null;
    if (!attr) return;

    const val = $(el).attr(attr);
    if (!val || val.startsWith('http') || val.startsWith('data:')) return;

    // Convert relative links to absolute
    if (val.startsWith('/')) {
      $(el).attr(attr, baseUrl + val);
    } else {
      const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      $(el).attr(attr, base + val);
    }
  });
}

app.get('/', async (req, res) => {
  try {
    const response = await axios.get(TARGET_URL);
    const $ = cheerio.load(response.data);

    // Fix relative paths to absolute for all assets/links
    rewriteToOriginalLinks($, new URL(TARGET_URL).origin);

    res.send($.html());
  } catch (err) {
    console.error('Scrape error:', err.message);
    res.status(500).send(`Error loading page: ${TARGET_URL}`);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
