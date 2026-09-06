import express from 'express';
import { WikiScraperEngine, FHeroStatsPayload } from './WikiScraperEngine';

export const heroRouter = express.Router();

const scraperEngine = new WikiScraperEngine();

// Simple in-memory cache simulating Redis
const localCache = new Map<string, FHeroStatsPayload>();

heroRouter.get('/hero/:name', async (req, res) => {
    const heroName = req.params.name;
    
    // 1. Check Cache
    if (localCache.has(heroName)) {
        console.log(`[Cache Hit] Serving ${heroName} from cache.`);
        return res.status(200).json(localCache.get(heroName));
    }

    console.log(`[Cache Miss] Initiating scrape for ${heroName}...`);
    
    // 2. Execute Scraper
    try {
        // Replace with actual target database search URLs
        const targetUrl = `https://marvel.fandom.com/wiki/Special:Search?query=${encodeURIComponent(heroName)}`;
        
        const stats = await scraperEngine.extractHeroStats(heroName, targetUrl);
        
        if (stats) {
            // 3. Format strictly to FHeroStatsPayload (already done by the engine in this setup)
            // 4. Cache the new data
            localCache.set(heroName, stats);
            
            // 5. Return 200 OK JSON
            return res.status(200).json(stats);
        } else {
            return res.status(404).json({ error: "Hero stats not found or extraction failed." });
        }
    } catch (error) {
        console.error("Scraping error:", error);
        return res.status(500).json({ error: "Internal server error during scraping." });
    }
});

// Router exported above
