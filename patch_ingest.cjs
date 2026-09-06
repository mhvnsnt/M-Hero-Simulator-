const fs = require('fs');
let code = fs.readFileSync('src/backend/ingest_assets.ts', 'utf8');

const targetType = `type: 'model' | 'script';`;
const replaceType = `type: 'model' | 'script' | 'vfx';`;
code = code.replace(targetType, replaceType);

const targetSave = `} else if (target.type === 'script') {
            const ext = path.extname(target.path) || '.ts';
            outPath = path.join(EXTERNAL_LIB_DIR, \`\${target.name}\${ext}\`);
            fs.writeFileSync(outPath, fileContent);
        }`;
const replaceSave = `} else if (target.type === 'script') {
            const ext = path.extname(target.path) || '.ts';
            outPath = path.join(EXTERNAL_LIB_DIR, \`\${target.name}\${ext}\`);
            fs.writeFileSync(outPath, fileContent);
        } else if (target.type === 'vfx') {
            const ext = path.extname(target.path) || '.glsl';
            const VFX_DIR = path.join(process.cwd(), "public", "vfx");
            if (!fs.existsSync(VFX_DIR)) fs.mkdirSync(VFX_DIR, { recursive: true });
            outPath = path.join(VFX_DIR, \`\${target.name}\${ext}\`);
            fs.writeFileSync(outPath, fileContent);
        }`;
code = code.replace(targetSave, replaceSave);
fs.writeFileSync('src/backend/ingest_assets.ts', code);
console.log("Patched ingest_assets.ts");
