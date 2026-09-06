const fs = require('fs');
let code = fs.readFileSync('src/game.ts', 'utf8');

const badCode = `
     if (power.type === 'projectile') {
        const hand = fighter.bodies.get('rHand')?.translation() || pPos;

        if (this.effekseerVfx) {
           // We can trigger an effekseer particle at the hand
           this.effekseerVfx.triggerEffect('laser', new THREE.Vector3(hand.x, hand.y, hand.z), 1.0);
        }

        const hand = fighter.bodies.get('rHand')?.translation() || pPos;
`;

// It seems I injected `const hand` while it was already there.
// Let's just fix it via regex.
code = code.replace(/const hand = fighter\.bodies\.get\('rHand'\)\?\.translation\(\) \|\| pPos;[\s\n]*if \(this\.effekseerVfx\) \{[\s\n]*\/\/ We can trigger an effekseer particle at the hand[\s\n]*this\.effekseerVfx\.triggerEffect\('laser', new THREE\.Vector3\(hand\.x, hand\.y, hand\.z\), 1\.0\);[\s\n]*\}[\s\n]*const hand = fighter\.bodies\.get\('rHand'\)\?\.translation\(\) \|\| pPos;/,
`     if (power.type === 'projectile') {
        const hand = fighter.bodies.get('rHand')?.translation() || pPos;

        if (this.effekseerVfx) {
           this.effekseerVfx.triggerEffect('laser', new THREE.Vector3(hand.x, hand.y, hand.z), 1.0);
        }`);

fs.writeFileSync('src/game.ts', code);
console.log("Fixed hand variable redeclaration");
