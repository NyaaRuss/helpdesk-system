const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();

// Allow your React frontend (port 3000) to talk to this server
app.use(cors());

app.get('/api/tenders', async (req, res) => {
    let browser;
    try {
        // 1. Launch a headless browser
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // 2. Set a realistic User Agent so the portal doesn't block the request
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const targetUrl = "https://egp.praz.org.zw/egp-SW5kZXhlcy9pbmRleA==?searchSuppName=Computers%2C+Printers%2C+Photocopiers%2C+Networking+Equipment+and+Accessories";

        // 3. Navigate to the page and wait for the network to be idle
        await page.goto(targetUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        // 4. Wait specifically for the table rows to appear in the DOM
        // This is the "fix" for the empty data issue
        await page.waitForSelector('table tbody tr', { timeout: 15000 });

        // 5. Extract the data from the page context
        const tenders = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table tbody tr'));
            
            return rows.map(row => {
                const cols = row.querySelectorAll('td');
                
                // Ensure we only process rows that actually have data columns
                if (cols.length >= 8) {
                    return {
                        tenderId: cols[0].innerText.trim(),
                        refNo: cols[1].innerText.trim(),
                        title: cols[2].innerText.trim(),
                        categoryCode: cols[3].innerText.trim(),
                        entity: cols[4].innerText.trim(),
                        scope: cols[5].innerText.trim(),
                        publishDate: cols[6].innerText.trim(),
                        closingDate: cols[7].innerText.trim(),
                    };
                }
                return null;
            }).filter(item => item !== null);
        });

        // 6. Return the data to your React frontend
        res.json(tenders);

    } catch (error) {
        console.error("Scraper Error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch from e-GP portal", 
            details: error.message 
        });
    } finally {
        // 7. Always close the browser to prevent memory leaks
        if (browser) {
            await browser.close();
        }
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Scraper service running on http://localhost:${PORT}`);
});