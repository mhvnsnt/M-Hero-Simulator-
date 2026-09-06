const fs = require('fs');

const code = fs.readFileSync('src/game.ts', 'utf8');

const targetInit = `    this.applySuperheroStyle(this.player1, BATMAN_PRESET);
    this.applySuperheroStyle(this.player2, SPIDERMAN_PRESET);`;

const replacementInit = `    this.applySuperheroStyle(this.player1, BATMAN_PRESET);
    this.applySuperheroStyle(this.player2, SPIDERMAN_PRESET);
    
    // Automatically load the ingested open-source model onto Player 2
    setTimeout(() => {
        this.loadModelFromURL('/models/RobotExpressive.glb', 'glb', 'P2');
    }, 1000);`;

if (code.includes('this.applySuperheroStyle(this.player2, SPIDERMAN_PRESET);')) {
    fs.writeFileSync('src/game.ts', code.replace(targetInit, replacementInit));
    console.log("Patched game.ts init successfully");
} else {
    console.log("Could not find target init string in game.ts");
}
