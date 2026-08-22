const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add savedHeroes and currentHeroConfig states
const stateTarget = "const [activeTab, setActiveTab] = useState<'gemini' | 'gltf'>('gemini');";
const stateInsert = `const [activeTab, setActiveTab] = useState<'gemini' | 'gltf'>('gemini');
  const [savedHeroes, setSavedHeroes] = useState<any[]>([]);
  const [currentHeroConfig, setCurrentHeroConfig] = useState<any | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('bannon_saved_heroes');
    if (stored) {
      try {
        setSavedHeroes(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse Neural Archives:', e);
      }
    }
  }, []);

  const handleSaveHero = () => {
    if (!currentHeroConfig) return;
    const updated = [...savedHeroes];
    // Avoid duplicates by name
    if (!updated.find(h => h.name === currentHeroConfig.name)) {
      updated.push(currentHeroConfig);
      setSavedHeroes(updated);
      localStorage.setItem('bannon_saved_heroes', JSON.stringify(updated));
    }
  };`;
code = code.replace(stateTarget, stateInsert);

// 2. Capture currentHeroConfig in handleGenerateHero
const genSuccessTarget = `      const superheroConfig = await response.json();
      
      // Apply configuration to the engine`;
const genSuccessInsert = `      const superheroConfig = await response.json();
      setCurrentHeroConfig(superheroConfig);
      
      // Apply configuration to the engine`;
code = code.replace(genSuccessTarget, genSuccessInsert);

// 3. Capture currentHeroConfig in suggestion shortcut
const shortcutTarget = `const superheroConfig = await response.json();
                            if (targetPlayer === 'P1') {`;
const shortcutInsert = `const superheroConfig = await response.json();
                            setCurrentHeroConfig(superheroConfig);
                            if (targetPlayer === 'P1') {`;
code = code.replace(shortcutTarget, shortcutInsert);

// 4. Inject the Save UI and the Neural Archives list in the Active Fighter Diagnostics section
const diagnosticsTarget = `{/* Display Current Active Specs */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 p-3 rounded-lg space-y-2">
                  <div className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Active Fighter Diagnostics</div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="bg-zinc-900 p-1.5 rounded text-zinc-400">
                      P1: <strong className="text-white">{uiState.player1Name}</strong>
                    </div>
                    <div className="bg-zinc-900 p-1.5 rounded text-zinc-400">
                      P2: <strong className="text-white">{uiState.player2Name}</strong>
                    </div>
                  </div>
                </div>`;

const diagnosticsInsert = `{/* Display Current Active Specs */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 p-3 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Active Fighter Diagnostics</div>
                    {currentHeroConfig && (
                      <button 
                        onClick={handleSaveHero}
                        className="px-2 py-1 bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-800/60 text-emerald-400 text-[9px] font-bold uppercase rounded transition-all active:scale-95"
                      >
                        Save to Neural Archive
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="bg-zinc-900 p-1.5 rounded text-zinc-400">
                      P1: <strong className="text-white">{uiState.player1Name}</strong>
                    </div>
                    <div className="bg-zinc-900 p-1.5 rounded text-zinc-400">
                      P2: <strong className="text-white">{uiState.player2Name}</strong>
                    </div>
                  </div>
                </div>

                {/* Neural Archives (Saved Heroes) */}
                {savedHeroes.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    <div className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-widest flex items-center justify-between">
                      <span>Neural Archives</span>
                      <span className="text-zinc-600">Local Persistence</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {savedHeroes.map((hero, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setCurrentHeroConfig(hero);
                            if (targetPlayer === 'P1') {
                              engineRef.current?.applySuperheroStyle(engineRef.current.player1, hero);
                            } else {
                              engineRef.current?.applySuperheroStyle(engineRef.current.player2, hero);
                            }
                          }}
                          className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-emerald-700/50 rounded text-[10px] font-mono text-emerald-400 transition-all active:scale-95 flex items-center gap-1"
                        >
                          <svg className="w-2.5 h-2.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"></path></svg>
                          {hero.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}`;

code = code.replace(diagnosticsTarget, diagnosticsInsert);

fs.writeFileSync('src/App.tsx', code, 'utf8');
console.log("App.tsx patched with localStorage save/load logic!");
