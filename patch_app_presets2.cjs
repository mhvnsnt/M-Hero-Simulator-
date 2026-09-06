const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetButtons = `✨ Load Sparkles Shaders
                        </button>`;
const replaceButtons = `✨ Load Sparkles Shaders
                        </button>
                        <button onClick={() => setIngestForm({ owner: 'vrm-c', repo: 'UniVRM', path: 'Assets/VRM/Runtime/Format/BlendShape.ts', type: 'script', name: 'FACSMapper' })} className="bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-300 text-xs py-2 px-3 rounded text-left">
                           🎭 Pull FACS ARKit
                        </button>
                        <button onClick={() => setIngestForm({ owner: 'mrdoob', repo: 'three.js', path: 'examples/jsm/animation/CCDIKSolver.js', type: 'script', name: 'CCDIKSolver' })} className="bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/50 text-cyan-300 text-xs py-2 px-3 rounded text-left">
                           🦾 Pull IK Solver
                        </button>`;
if (code.includes(targetButtons)) {
    code = code.replace(targetButtons, replaceButtons);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Patched App.tsx buttons");
} else {
    console.log("Could not find button target");
}
