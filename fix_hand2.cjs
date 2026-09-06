const fs = require('fs');
let code = fs.readFileSync('src/game.ts', 'utf8');

code = code.replace(/if \(power.type === 'projectile'\) \{[\s\n]*if \(power.type === 'projectile'\) \{/, "if (power.type === 'projectile') {");

fs.writeFileSync('src/game.ts', code);
