const fs = require('fs');
let code = fs.readFileSync('src/game.ts', 'utf8');

// Replace createFloor content with ChunkManager init
const createFloorStart = `createFloor() {`;
const createFloorEnd = `    // Ring Posts`;
// Actually, let's just replace the whole createFloor function using regex
const oldCreateFloorRegex = /createFloor\(\) \{[\s\S]*?\n  \}/;

const newCreateFloor = `createFloor() {
    this.chunkManager = new ChunkManager(this.scene, this.world);
    
    // Also initialize the TP Camera if it doesn't exist
    if (!this.tpCamera && this.camera) {
        this.tpCamera = new ThirdPersonCamera(this.camera);
    }
  }`;

if (code.match(oldCreateFloorRegex)) {
    code = code.replace(oldCreateFloorRegex, newCreateFloor);
} else {
    console.log("Could not find createFloor regex.");
}

// Ensure createFighter sets the target for tpCamera for player 1
const setTargetCode = `
    if (this.tpCamera && this.player1 === undefined) {
        // First player created becomes the target
        this.tpCamera.setTarget(f.group);
    }
`;

// In createFighter, we can just append it before return f;
const returnF = `return f;`;
if (code.includes(returnF)) {
    code = code.replace(returnF, setTargetCode + "\n    " + returnF);
}

// Now replace the old camera logic in animate
// Look for "TV Broadcast Hard Cam Style"
const oldCamRegex = /\/\/ TV Broadcast Hard Cam Style[\s\S]*?if \(!Number\.isFinite\(this\.camera\.position\.x\)\) \{\n       this\.camera\.position\.set\(0, 1\.9, 6\);\n    \}/;

const newCamLogic = `
    // Chunk Manager Update
    if (this.chunkManager && this.player1 && this.player1.group) {
        this.chunkManager.update(this.player1.group.position);
    }

    // Third Person Camera Update
    if (this.tpCamera) {
        this.tpCamera.update(dt, this.virtualOrbit);
        // decay virtual orbit so it stops when finger released
        this.virtualOrbit.x *= 0.8;
        this.virtualOrbit.y *= 0.8;
    }
`;

if (code.match(oldCamRegex)) {
    code = code.replace(oldCamRegex, newCamLogic);
} else {
    console.log("Could not find old TV cam regex.");
}

fs.writeFileSync('src/game.ts', code);
console.log("Patched game.ts with open world initialization and update hooks.");
