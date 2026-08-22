const fs = require('fs');
let code = fs.readFileSync('src/game.ts', 'utf8');

const target = `  physicsSafeSet(body: any, prop: string, val: any) {
    if (!body || !body.isValid()) return;
    
    // Validate numbers
    if (val && typeof val === 'object') {
       if (val.x !== undefined && (isNaN(val.x) || !isFinite(val.x))) return;
       if (val.y !== undefined && (isNaN(val.y) || !isFinite(val.y))) return;
       if (val.z !== undefined && (isNaN(val.z) || !isFinite(val.z))) return;
       if (val.w !== undefined && (isNaN(val.w) || !isFinite(val.w))) return;
    }

    try {`;

const insert = `  physicsSafeSet(body: any, prop: string, val: any) {
    if (!body || !body.isValid()) return;
    
    // Validate numbers stricter
    if (val && typeof val === 'object') {
       if (val.x === undefined || isNaN(val.x) || !isFinite(val.x)) val.x = 0;
       if (val.y === undefined || isNaN(val.y) || !isFinite(val.y)) val.y = 0;
       if (val.z === undefined || isNaN(val.z) || !isFinite(val.z)) val.z = 0;
       if (prop === 'rotation' && (val.w === undefined || isNaN(val.w) || !isFinite(val.w))) val.w = 1;
    }

    try {`;

code = code.replace(target, insert);
fs.writeFileSync('src/game.ts', code, 'utf8');
