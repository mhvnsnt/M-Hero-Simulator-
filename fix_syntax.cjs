const fs = require('fs');
let code = fs.readFileSync('src/backend/HeroAPI.ts', 'utf8');

// The backticks were escaped in the cat string which broke the template literals
code = code.replace(/\\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('src/backend/HeroAPI.ts', code, 'utf8');

let code2 = fs.readFileSync('src/backend/WikiScraperEngine.ts', 'utf8');
code2 = code2.replace(/\\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('src/backend/WikiScraperEngine.ts', code2, 'utf8');

console.log("Syntax fixed");
