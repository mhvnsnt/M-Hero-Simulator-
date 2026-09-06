const fs = require('fs');
let code = fs.readFileSync('src/game.ts', 'utf8');

const virtualMoveCode = `
  handleVirtualMove(vec: { x: number; y: number }) {
      this.virtualMove = vec;
  }
  handleVirtualOrbit(vec: { x: number; y: number }) {
      this.virtualOrbit = vec;
  }
`;

if (!code.includes("handleVirtualMove")) {
    code = code.replace("export class GameEngine {", "export class GameEngine {\n  public virtualMove = { x: 0, y: 0 };\n  public virtualOrbit = { x: 0, y: 0 };\n" + virtualMoveCode);
}

// Update the animate loop to use kinematic controllers instead of standard physics
const updateAnimate = `
    const p1Input = new THREE.Vector3(0, 0, 0);
    if (this.keys['ArrowUp'] || this.keys['KeyW']) p1Input.z -= 1;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) p1Input.z += 1;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) p1Input.x -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) p1Input.x += 1;
    
    // Merge Virtual Joystick
    if (this.virtualMove.x !== 0 || this.virtualMove.y !== 0) {
        p1Input.x = this.virtualMove.x;
        p1Input.z = this.virtualMove.y;
    }

    if (this.camera && this.player1 && this.player1.kinematic) {
        this.player1.kinematic.updateController(dt, p1Input, this.camera.quaternion);
    }
`;

// Find where [this.player1, this.player2].forEach(p => { is called and insert this logic above it
const targetUpdateStr = `// Foot Plant IK & Balance Polish`;
if (code.includes(targetUpdateStr)) {
    code = code.replace(targetUpdateStr, updateAnimate + "\n    " + targetUpdateStr);
}

fs.writeFileSync('src/game.ts', code);
console.log("Patched game.ts with Virtual Joystick integration");
