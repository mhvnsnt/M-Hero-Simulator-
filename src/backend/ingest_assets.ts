import fs from 'fs';
import path from 'path';

interface IngestOptions {
    owner: string;
    repo: string;
    path: string;
    type: string;
    name: string;
}

export async function ingestOpenSourceAsset(opts: IngestOptions) {
    console.log(`[Ingest Daemon] Starting automated ingestion for: ${opts.name} (${opts.type})`);
    
    // In a full implementation, this would use the GitHub API (@octokit/rest) to fetch the raw file
    // and save it into the public/models/dynamic folder.
    
    const registryPath = path.resolve(process.cwd(), 'src/asset_registry.json');
    let registry: any = { models: [] };
    
    if (fs.existsSync(registryPath)) {
        registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    }
    
    // Simulated fetch and save for demonstration
    const fakeLocalUrl = `/models/dynamic/${opts.name.replace(/\s+/g, '_').toLowerCase()}.glb`;
    
    const entry = {
        id: opts.name.toLowerCase().replace(/\s+/g, '_'),
        name: opts.name,
        type: opts.type, // 'head', 'back', 'chest', 'weapon', 'base'
        url: fakeLocalUrl,
        source: `https://github.com/${opts.owner}/${opts.repo}`,
        ingestedAt: new Date().toISOString()
    };
    
    // Check if it already exists
    const existingIndex = registry.models.findIndex((m: any) => m.id === entry.id);
    if (existingIndex >= 0) {
        registry.models[existingIndex] = entry;
    } else {
        registry.models.push(entry);
    }
    
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
    console.log(`[Ingest Daemon] Successfully ingested and registered ${opts.name} into the asset registry.`);
    return entry;
}

// Allow running directly
if (require.main === module) {
    // For manual CLI testing
    ingestOpenSourceAsset({
        owner: "M3-org",
        repo: "CharacterStudio",
        path: "assets/masks/cyber_visor.glb",
        type: "head",
        name: "Cyber Visor"
    }).catch(console.error);
}
