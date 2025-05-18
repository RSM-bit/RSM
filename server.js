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
    let href = $(el).attr('href');
    if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;

    // Skip if already fully qualified and matches base domain
    if (href.startsWith('http') || href.startsWith('//')) {
      $(el).attr('target', '_top');
      return;
    }

    // Make absolute
    if (href.startsWith('/')) {
      href = baseUrl + href;
    } else {
      const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      href = base + href;
    }

    $(el).attr('href', href);
    $(el).attr('target', '_top');
  });

  // Fix resource paths (src/href for css, js, images)
  $('[src], link[href]').each((_, el) => {
    const attr = el.attribs.src ? 'src' : el.attribs.href ? 'href' : null;
    if (!attr) return;

    let val = $(el).attr(attr);
    if (!val || val.startsWith('http') || val.startsWith('//') || val.startsWith('data:')) return;

    if (val.startsWith('/')) {
      val = baseUrl + val;
    } else {
      const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      val = base + val;
    }

    $(el).attr(attr, val);
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
