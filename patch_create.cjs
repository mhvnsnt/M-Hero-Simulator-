const fs = require('fs');
let code = fs.readFileSync('src/game.ts', 'utf8');

const target1 = `     } else if (power.type === 'projectile') {
        const hand = fighter.bodies.get('rHand')?.translation() || pPos;`;
const insert1 = `     } else if (power.type === 'projectile') {
        const hand = fighter.bodies.get('rHand')?.translation() || pPos;
        if (!Number.isFinite(hand.x) || !Number.isFinite(hand.y) || !Number.isFinite(hand.z)) return;`;
code = code.replace(target1, insert1);

const target2 = `     } else if (power.type === 'pull') {
        const hand = fighter.bodies.get('rHand')?.translation() || pPos;`;
const insert2 = `     } else if (power.type === 'pull') {
        const hand = fighter.bodies.get('rHand')?.translation() || pPos;
        if (!Number.isFinite(hand.x) || !Number.isFinite(hand.y) || !Number.isFinite(hand.z)) return;`;
code = code.replace(target2, insert2);

fs.writeFileSync('src/game.ts', code, 'utf8');
