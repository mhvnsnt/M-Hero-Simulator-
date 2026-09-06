const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Ensure right stick sends end event
const replaceEnd = `
    rightManager.on('move', (_, data) => {
      if (data.vector) onCameraOrbit({ x: data.vector.x, y: data.vector.y });
    });
    rightManager.on('end', () => onCameraOrbit({ x: 0, y: 0 }));
`;

if (code.includes("rightManager.on('move', (_, data) => {") && !code.includes("rightManager.on('end'")) {
    code = code.replace(/rightManager\.on\('move', \(_, data\) => \{\n      if \(data\.vector\) onCameraOrbit\(\{ x: data\.vector\.x, y: data\.vector\.y \}\);\n    \}\);/, replaceEnd);
}

fs.writeFileSync('src/App.tsx', code);

let gameCode = fs.readFileSync('src/game.ts', 'utf8');
// Remove decay of virtualOrbit
const oldDecay = `
        this.tpCamera.update(dt, this.virtualOrbit);
        // decay virtual orbit so it stops when finger released
        this.virtualOrbit.x *= 0.8;
        this.virtualOrbit.y *= 0.8;
`;
const newDecay = `
        this.tpCamera.update(dt, this.virtualOrbit);
`;

if (gameCode.includes("this.virtualOrbit.x *= 0.8;")) {
    gameCode = gameCode.replace(oldDecay, newDecay);
}

fs.writeFileSync('src/game.ts', gameCode);

