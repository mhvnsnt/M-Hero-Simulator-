import { ingestOpenSourceAsset } from './ingest_assets.js';

async function main() {
    await ingestOpenSourceAsset({
        owner: "mrdoob",
        repo: "three.js",
        path: "examples/models/gltf/RobotExpressive/RobotExpressive.glb",
        type: "model",
        name: "RobotExpressive"
    });
}

main();
