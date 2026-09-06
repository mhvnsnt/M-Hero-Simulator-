const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetState = `  const [ingestStatus, setIngestStatus] = useState('');`;
const replaceState = `  const [ingestStatus, setIngestStatus] = useState('');
  const [taunt, setTaunt] = useState('');
  const [isTaunting, setIsTaunting] = useState(false);
  const [githubQuery, setGithubQuery] = useState('');
  const [githubResults, setGithubResults] = useState<any[]>([]);`;
code = code.replace(targetState, replaceState);

const targetHandlers = `  const handleIngest = async () => {`;
const replaceHandlers = `  const handleGenerateTaunt = async () => {
    setIsTaunting(true);
    const character = targetPlayer === 'P1' ? uiState.player1Name : uiState.player2Name;
    try {
      const res = await fetch('/api/gemini/generate-taunt', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ character })
      });
      const data = await res.json();
      if (data.taunt) {
         setTaunt(data.taunt);
         if ('speechSynthesis' in window) {
             const utterance = new SpeechSynthesisUtterance(data.taunt);
             utterance.rate = 1.1;
             utterance.pitch = targetPlayer === 'P1' ? 0.8 : 1.2;
             window.speechSynthesis.speak(utterance);
         }
         setTimeout(() => setTaunt(''), 4000);
      }
    } catch (e) {
      console.error(e);
    }
    setIsTaunting(false);
  };

  const handleSearchGithub = async () => {
      if (!githubQuery) return;
      try {
          const res = await fetch('/api/search-github', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: githubQuery })
          });
          const data = await res.json();
          setGithubResults(data.results || []);
      } catch (e) {
          console.error(e);
      }
  };

  const handleIngest = async () => {`;
code = code.replace(targetHandlers, replaceHandlers);

const targetGeminiTab = `                  <button 
                    type="submit" 
                    disabled={generating || !heroPrompt}
                    className="absolute right-1 top-1 bottom-1 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 font-bold text-[10px] uppercase rounded transition-colors flex items-center justify-center min-w-[80px]"
                  >
                    {generating ? '...' : 'Create'}
                  </button>
                  </div>
                </form>`;
const replaceGeminiTab = `                  <button 
                    type="submit" 
                    disabled={generating || !heroPrompt}
                    className="absolute right-1 top-1 bottom-1 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 font-bold text-[10px] uppercase rounded transition-colors flex items-center justify-center min-w-[80px]"
                  >
                    {generating ? '...' : 'Create'}
                  </button>
                  </div>
                </form>
                
                <div className="pt-2 border-t border-zinc-800 mt-2">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block mb-2">Dynamic Lore & Audio Taunts</label>
                    <button 
                        onClick={handleGenerateTaunt} 
                        disabled={isTaunting}
                        className="w-full bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-300 text-xs py-2 px-3 rounded text-center disabled:opacity-50"
                    >
                        {isTaunting ? 'Generating...' : \`🗣️ Generate Contextual Taunt for \${targetPlayer}\`}
                    </button>
                </div>`;
code = code.replace(targetGeminiTab, replaceGeminiTab);

const targetIngestTab = `<div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 mb-4">`;
const replaceIngestTab = `<div className="space-y-4">
                    <div className="bg-neutral-900 border border-neutral-700 p-2 rounded flex gap-2">
                        <input type="text" placeholder="Search GitHub (e.g. three.js examples)" value={githubQuery} onChange={e => setGithubQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchGithub()} className="flex-1 bg-transparent text-white text-xs outline-none" />
                        <button onClick={handleSearchGithub} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1 rounded">Search</button>
                    </div>
                    {githubResults.length > 0 && (
                        <div className="max-h-32 overflow-y-auto bg-neutral-900 rounded p-1 text-xs border border-neutral-700">
                            {githubResults.map((repo, i) => (
                                <div key={i} className="p-1 hover:bg-neutral-800 cursor-pointer text-indigo-300" onClick={() => setIngestForm({...ingestForm, owner: repo.owner.login, repo: repo.name})}>
                                    {repo.full_name} <span className="text-neutral-500 text-[10px]">⭐{repo.stargazers_count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 mb-4">`;
code = code.replace(targetIngestTab, replaceIngestTab);

const targetOverlay = `<div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-12 font-mono text-sm uppercase tracking-[0.2em] font-black pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">`;
const replaceOverlay = `
          {taunt && (
              <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                  <div className="bg-black/80 border border-indigo-500/50 text-indigo-400 font-mono text-sm p-4 rounded-xl shadow-2xl max-w-lg text-center backdrop-blur-md">
                      "{taunt}"
                  </div>
              </div>
          )}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-12 font-mono text-sm uppercase tracking-[0.2em] font-black pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">`;
code = code.replace(targetOverlay, replaceOverlay);


fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx for Taunts and Github Search.");
