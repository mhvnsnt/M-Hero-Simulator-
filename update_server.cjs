const fs = require('fs');

if (fs.existsSync('server.ts')) {
    let code = fs.readFileSync('server.ts', 'utf8');
    
    // Add import
    const importStatement = "import { startHeroAPI } from './src/backend/HeroAPI';\n";
    if (!code.includes('startHeroAPI')) {
        code = importStatement + code;
        
        // Add start call
        const startStatement = "\n  // Start the Hero Data Router API (Internal port 3001)\n  startHeroAPI();\n";
        
        // Insert before app.listen
        code = code.replace(/app\.listen\(PORT, "0\.0\.0\.0", \(\) => {/g, startStatement + '  app.listen(PORT, "0.0.0.0", () => {');
        fs.writeFileSync('server.ts', code, 'utf8');
        console.log("Updated server.ts with HeroAPI");
    }
} else {
    console.log("server.ts not found. Assuming client-only setup currently.");
}
