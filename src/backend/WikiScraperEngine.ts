import { PlaywrightCrawler, Dataset, ProxyConfiguration } from 'crawlee';
import { Page } from 'playwright';

export interface FHeroStatsPayload {
    HeroName: string;
    BaseHealth: number;
    MovementSpeed: number;
    PhysicsMass: number;
    MeshAssetID: string;
}

export class WikiScraperEngine {
    private crawler: PlaywrightCrawler;

    constructor() {
        this.crawler = new PlaywrightCrawler({
            // Limit concurrency to avoid getting blocked easily
            maxConcurrency: 10,
            
            // Turn on headless stealth features
            headless: true,

            // A typical request handler
            async requestHandler({ page, request, log }) {
                log.info(`Processing ${request.url}...`);
                
                // Wait for the main body to render
                await page.waitForSelector('body');

                // Extract data using Playwright (which acts as a headless browser)
                // Example logic to adapt to target wikis
                const baseHealth = await page.evaluate(() => {
                    // Logic to extract health
                    return 1000.0; 
                });

                const movementSpeed = await page.evaluate(() => {
                    // Logic to extract speed
                    return 600.0;
                });

                const physicsMass = await page.evaluate(() => {
                    // Logic to extract weight
                    return 95.0;
                });

                const results: FHeroStatsPayload = {
                    HeroName: request.userData.heroName,
                    BaseHealth: baseHealth,
                    MovementSpeed: movementSpeed,
                    PhysicsMass: physicsMass,
                    MeshAssetID: request.userData.heroName.toLowerCase().replace(/[^a-z0-9]/g, '_')
                };

                // Push data to Crawlee dataset
                await Dataset.pushData(results);
            },

            // Handle failed requests
            failedRequestHandler({ request, log }) {
                log.error(`Request ${request.url} failed too many times.`);
            },
        });
    }

    async extractHeroStats(heroName: string, targetUrl: string): Promise<FHeroStatsPayload | null> {
        // Run the crawler
        await this.crawler.run([{
            url: targetUrl,
            userData: { heroName }
        }]);

        // Retrieve the data
        const dataset = await Dataset.open();
        const data = await dataset.getData();
        
        // Clean up the dataset for the next run
        await dataset.drop();

        if (data.items.length > 0) {
            return data.items[0] as FHeroStatsPayload;
        }
        return null;
    }
}
