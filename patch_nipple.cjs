const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldNipple = `        const leftManager = nipplejs.create({
            zone: leftJoystickZone.current!,
            mode: 'static',
            position: { left: '20%', bottom: '20%' },
            color: '#ffffff',
            size: 100
        });

        const rightManager = nipplejs.create({
            zone: rightJoystickZone.current!,
            mode: 'static',
            position: { right: '20%', bottom: '20%' },
            color: '#ffffff',
            size: 100
        });`;

const newNipple = `        const leftManager = nipplejs.create({
            zone: leftJoystickZone.current!,
            mode: 'static',
            position: { left: '80px', bottom: '80px' },
            color: '#ffffff',
            size: 110
        });

        const rightManager = nipplejs.create({
            zone: rightJoystickZone.current!,
            mode: 'static',
            position: { right: '80px', bottom: '80px' },
            color: '#ffffff',
            size: 110
        });`;

// In case the structure is a bit different, let's use regex based on user instructions
code = code.replace(/const leftManager = nipplejs\.create\(\{[\s\S]*?\}\);[\s\S]*?const rightManager = nipplejs\.create\(\{[\s\S]*?\}\);/, newNipple);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx with proper Nipple.js configuration options");
