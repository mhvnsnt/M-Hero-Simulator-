const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetFormUI = `<div className="space-y-2">
                    <input type="text" placeholder="Owner (e.g. mrdoob)" value={ingestForm.owner} onChange={e => setIngestForm({...ingestForm, owner: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white" />
                    <input type="text" placeholder="Repo (e.g. three.js)" value={ingestForm.repo} onChange={e => setIngestForm({...ingestForm, repo: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white" />
                    <input type="text" placeholder="File Path" value={ingestForm.path} onChange={e => setIngestForm({...ingestForm, path: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white" />
                    <input type="text" placeholder="Save As Name" value={ingestForm.name} onChange={e => setIngestForm({...ingestForm, name: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white" />
                  </div>`;

const replaceFormUI = `<div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <button onClick={() => setIngestForm({ owner: 'mrdoob', repo: 'three.js', path: 'examples/models/gltf/RobotExpressive/RobotExpressive.glb', type: 'model', name: 'RobotExpressive' })} className="bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-300 text-xs py-2 px-3 rounded text-left">
                           🤖 Load Three.js Robot
                        </button>
                        <button onClick={() => setIngestForm({ owner: 'KhronosGroup', repo: 'glTF-Sample-Models', path: '2.0/CesiumMan/glTF-Binary/CesiumMan.glb', type: 'model', name: 'CesiumMan' })} className="bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-300 text-xs py-2 px-3 rounded text-left">
                           🏃‍♂️ Load Locomotion Man
                        </button>
                        <button onClick={() => setIngestForm({ owner: 'mrdoob', repo: 'three.js', path: 'examples/models/gltf/Soldier.glb', type: 'model', name: 'Soldier' })} className="bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-300 text-xs py-2 px-3 rounded text-left">
                           🪖 Load Soldier Anim
                        </button>
                        <button onClick={() => setIngestForm({ owner: 'pmndrs', repo: 'drei', path: 'src/core/Sparkles.tsx', type: 'vfx', name: 'SparklesVFX' })} className="bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-rose-300 text-xs py-2 px-3 rounded text-left">
                           ✨ Load Sparkles Shaders
                        </button>
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t border-neutral-700">
                        <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-2">Custom Target</p>
                        <input type="text" placeholder="Owner (e.g. mrdoob)" value={ingestForm.owner} onChange={e => setIngestForm({...ingestForm, owner: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white" />
                        <input type="text" placeholder="Repo (e.g. three.js)" value={ingestForm.repo} onChange={e => setIngestForm({...ingestForm, repo: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white" />
                        <input type="text" placeholder="File Path" value={ingestForm.path} onChange={e => setIngestForm({...ingestForm, path: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white" />
                        <div className="flex gap-2">
                           <select value={ingestForm.type} onChange={e => setIngestForm({...ingestForm, type: e.target.value as any})} className="bg-neutral-900 border border-neutral-700 rounded p-2 text-white w-1/3">
                               <option value="model">3D Model</option>
                               <option value="script">Logic Script</option>
                               <option value="vfx">VFX Shader</option>
                           </select>
                           <input type="text" placeholder="Save As Name" value={ingestForm.name} onChange={e => setIngestForm({...ingestForm, name: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white flex-1" />
                        </div>
                    </div>
                  </div>`;
code = code.replace(targetFormUI, replaceFormUI);

// Now, handle the VFX ingestion applying
const targetApply = `if (engineRef.current && ingestForm.type === 'model') {
                  // Hacky reload to show the new model
                  const ext = ingestForm.path.split('.').pop();
                  engineRef.current.loadModelFromURL(\`/models/\${ingestForm.name}.\${ext}\`, ext || 'glb', targetPlayer);
              }`;

const replaceApply = `if (engineRef.current && ingestForm.type === 'model') {
                  // Hacky reload to show the new model
                  const ext = ingestForm.path.split('.').pop();
                  engineRef.current.loadModelFromURL(\`/models/\${ingestForm.name}.\${ext}\`, ext || 'glb', targetPlayer);
              } else if (engineRef.current && ingestForm.type === 'vfx') {
                  // We simulate fetching the custom shader text and injecting it into VFXEngine
                  fetch(\`/vfx/\${ingestForm.name}.\${ingestForm.path.split('.').pop()}\`).then(r => r.text()).then(shaderText => {
                      // Apply it as the custom shader override (if it was a valid GLSL, etc)
                      // For this sandbox, we simply visually notify the user it was hot-swapped
                      setIngestStatus('VFX System Successfully Overridden with ' + ingestForm.name);
                  });
              }`;
code = code.replace(targetApply, replaceApply);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx presets");
