const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const cors = require('cors');

const PORT = process.env.PORT || 3000; // Use fallback locally

app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'ALLOW-FROM https://www.russianstatemedia.com'); // legacy
  res.setHeader('Content-Security-Policy', "frame-ancestors https://www.russianstatemedia.com"); // modern
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});


// 🔧 Page you want to mirror
const TARGET_URL = 'https://www.foxnews.com'; // ← MUST include www

// Rewrites all relative href/src links to point to the original site
function rewriteToOriginalLinks($, baseUrl) {
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');

    if (!href || href.startsWith('javascript:')) return;

    // Convert relative URLs to absolute
    if (href.startsWith('/')) {
      $(el).attr('href', baseUrl + href);
    } else if (!href.startsWith('http') && !href.startsWith('data:')) {
      const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      $(el).attr('href', base + href);
    }

    // 🚀 Force all links to open in top window (escape iframe)
    $(el).attr('target', '_top');
  });

  // Optionally fix other resources
  $('[src], [href]').each((_, el) => {
    const attr = el.attribs.href ? 'href' : 'src';
    const val = $(el).attr(attr);

    if (!val || val.startsWith('http') || val.startsWith('data:')) return;

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
