const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/api/tenders', async (req, res) => {
  try {
    const targetUrl = "https://egp.praz.org.zw/egp-SW5kZXhlcy9pbmRleA==?searchSuppName=Computers%2C+Printers%2C+Photocopiers%2C+Networking+Equipment+and+Accessories";
    
    // Fetch the HTML content
    const response = await axios.get(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    const $ = cheerio.load(response.data);
    const tenders = [];

    // Targeting the e-GP table rows
    $('table tbody tr').each((i, el) => {
      const cols = $(el).find('td');
      if (cols.length > 0) {
        tenders.push({
          tenderId: $(cols[0]).text().trim(),
          refNo: $(cols[1]).text().trim(),
          title: $(cols[2]).text().trim(),
          categoryCode: $(cols[3]).text().trim(),
          entity: $(cols[4]).text().trim(),
          scope: $(cols[5]).text().trim(),
          publishDate: $(cols[6]).text().trim(),
          closingDate: $(cols[7]).text().trim(),
        });
      }
    });

    res.json(tenders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch from e-GP portal" });
  }
});

app.listen(5000, () => console.log('Scraper running on port 5000'));