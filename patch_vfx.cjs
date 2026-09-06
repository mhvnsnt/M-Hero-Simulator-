const fs = require('fs');
let code = fs.readFileSync('src/vfx.ts', 'utf8');

const effekseerInit = `    // 1. Initialize official Effekseer WebGL Engine Runtime
    if (typeof effekseer !== 'undefined') {
      effekseer.initRuntime('/libs/effekseer.wasm', () => {
        this.context = effekseer.createContext();
        this.context.init(glContext);
        console.log("Effekseer 3D VFX System Context running flawlessly.");
      }, () => {
        console.warn("Effekseer failed loading WASM binary. Diverting to native WebGL particles.");
        this.context = null; // Clean fallback to prevent rendering freezes
      });
    } else {
      console.warn("Effekseer global object missing. Suppressing VFX to allow normal 3D rendering.");
      this.context = null;
    }`;

code = code.replace(/    \/\/ 1\. Initialize official Effekseer WebGL Engine Runtime[\s\S]*?    \} else \{[\s\S]*?    \}/, effekseerInit);

fs.writeFileSync('src/vfx.ts', code);
console.log("Patched vfx.ts with Effekseer fallback");
