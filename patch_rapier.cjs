const fs = require('fs');
let code = fs.readFileSync('src/game.ts', 'utf8');
code = code.replace(/world\.createKinematicCharacterController/g, "world.createCharacterController");
fs.writeFileSync('src/game.ts', code);
console.log("Patched game.ts with world.createCharacterController");
