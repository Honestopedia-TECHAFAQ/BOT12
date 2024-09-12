const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

// API Keys
const EBAY_APP_ID = 'ThynkLyn-HoltexPr-PRD-bcd9e8edd-1ad9f7a7';
const SERPAPI_KEY = 'de56b2ea25e7fc6c6ebaf7c649421c3c85da142758ee1adcf17891846971a910';

// Serve static files from the 'public' directory
app.use(express.static('public'));

app.get('/search', async (req, res) => {
    const query = req.query.query;
    const sort = req.query.sort || 'relevance'; // Default sorting
    const filter = req.query.filter || 'all'; // Default filter

    if (!query) {
        return res.status(400).json({ message: 'Query parameter is missing' });
    }

    try {
        // Fetch results from eBay
        const ebayResponse = await axios.get('https://svcs.ebay.com/services/search/FindingService/v1', {
            params: {
                'OPERATION-NAME': 'findItemsByKeywords',
                'SERVICE-VERSION': '1.0.0',
                'SECURITY-APPNAME': EBAY_APP_ID,
                'RESPONSE-DATA-FORMAT': 'JSON',
                'REST-PAYLOAD': '',
                'keywords': query,
                'paginationInput.entriesPerPage': 10,
                'sortOrder': sort // Add sorting parameter if available
            },
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Fetch results from SerpAPI
        const serpAPIResponse = await axios.get('https://serpapi.com/search', {
            params: {
                api_key: SERPAPI_KEY,
                q: query,
                tbm: 'shop',
                sort: sort // Add sorting parameter if available
            }
        });

        // Extract items from eBay
        const ebayItems = ebayResponse.data.findItemsByKeywordsResponse[0].searchResult[0].item.map(item => ({
            title: item.title[0],
            price: item.sellingStatus[0].currentPrice[0].__value__,
            currency: item.sellingStatus[0].currentPrice[0]['@currencyId'],
            imageUrl: item.galleryURL ? item.galleryURL[0] : 'https://via.placeholder.com/120',
            url: item.viewItemURL[0]
        })) || [];

        // Extract items from Google Shopping (SerpAPI)
        const googleItems = serpAPIResponse.data.shopping_results.map(item => ({
            title: item.title,
            price: item.price,
            imageUrl: item.thumbnail,
            url: item.link
        })) || [];

        // Filter results based on the filter parameter
        const filteredEbayItems = ebayItems.filter(item => {
            // Example filter logic
            if (filter === 'electronics') {
                return item.category === 'Electronics'; // Adjust based on actual data
            }
            return true;
        });

        // Sort results based on the sort parameter
        const sortedEbayResults = filteredEbayItems.sort((a, b) => {
            const priceA = parseFloat(a.price);
            const priceB = parseFloat(b.price);
            return sort === 'price_asc' ? priceA - priceB : priceB - priceA;
        });

        const sortedGoogleResults = googleItems.sort((a, b) => {
            const priceA = parseFloat(a.price.replace(/[^0-9.]/g, '')); // Remove currency symbols
            const priceB = parseFloat(b.price.replace(/[^0-9.]/g, '')); // Remove currency symbols
            return sort === 'price_asc' ? priceA - priceB : priceB - priceA;
        });

        res.json({
            ebayItems: sortedEbayResults,
            googleItems: sortedGoogleResults
        });
    } catch (error) {
        console.error('Error fetching data:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Error fetching data', error: error.response ? error.response.data : error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
