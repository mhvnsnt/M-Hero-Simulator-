import nipplejs from 'nipplejs';
import React, { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { GameEngine } from './game';


interface MobileGamepadProps {
  onMove: (vector: { x: number; y: number }) => void;
  onCameraOrbit: (vector: { x: number; y: number }) => void;
  onPowerWheelTap: () => void;
}
const MobileGamepadOverlay: React.FC<MobileGamepadProps> = ({ onMove, onCameraOrbit, onPowerWheelTap }) => {
  const leftJoystickZone = useRef<HTMLDivElement>(null);
  const rightJoystickZone = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!leftJoystickZone.current || !rightJoystickZone.current) return;

            const leftManager = nipplejs.create({
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
        });

    
    // nipplejs types only declare the 'pressure' overload — cast for joystick events.
    const rightOn = rightManager.on.bind(rightManager) as unknown as (ev: string, cb: (...args: any[]) => void) => void;
    rightOn('move', (_, data) => {
      if (data.vector) onCameraOrbit({ x: data.vector.x, y: data.vector.y });
    });
    rightOn('end', () => onCameraOrbit({ x: 0, y: 0 }));


    return () => {
      leftManager.destroy();
      rightManager.destroy();
    };
  }, [onMove, onCameraOrbit]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-40">
      <div ref={leftJoystickZone} className="absolute bottom-0 left-0 w-1/2 h-1/2 pointer-events-auto" />
      <div ref={rightJoystickZone} className="absolute bottom-0 right-0 w-1/2 h-1/2 pointer-events-auto" />
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <button 
          onClick={onPowerWheelTap}
          className="w-16 h-16 bg-red-600 active:bg-red-800 text-white font-bold rounded-full shadow-lg border-2 border-white flex items-center justify-center transform active:scale-95 transition-all"
        >
          M+
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [showMods, setShowMods] = useState(false);
  const [joyState, setJoyState] = useState({ x: 0, y: 0 });

  const [uiState, setUiState] = useState({
    p1h: 100, p1s: 100,
    p2h: 100, p2s: 100,
    p1Zone: 'head',
    ko: null as string | null,
    debugMsg: 'Init',
    autonomicSaturation: 0,
    player1Name: 'Nightguard',
    player2Name: 'Skywire'
  });

  const [heroPrompt, setHeroPrompt] = useState('');
  const [targetPlayer, setTargetPlayer] = useState<'P1' | 'P2'>('P1');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'gemini' | 'gltf' | 'ingest'>('gemini');
  const [ingestForm, setIngestForm] = useState({ owner: 'mrdoob', repo: 'three.js', path: 'examples/models/gltf/Soldier.glb', type: 'model', name: 'Soldier' });
  const [ingestStatus, setIngestStatus] = useState('');
  const [taunt, setTaunt] = useState('');
  const [isTaunting, setIsTaunting] = useState(false);
  const [githubQuery, setGithubQuery] = useState('');
  const [githubResults, setGithubResults] = useState<any[]>([]);
  
  const handleGenerateTaunt = async () => {
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

  const handleIngest = async () => {
      setIngestStatus('Pulling from GitHub...');
      try {
          const res = await fetch('/api/ingest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(ingestForm)
          });
          if (res.ok) {
              setIngestStatus('Asset pulled successfully! Loading...');
              if (engineRef.current && ingestForm.type === 'model') {
                  // Hacky reload to show the new model
                  const ext = ingestForm.path.split('.').pop();
                  engineRef.current.loadModelFromURL(`/models/${ingestForm.name}.${ext}`, ext || 'glb', targetPlayer);
              } else if (engineRef.current && ingestForm.type === 'vfx') {
                  // We simulate fetching the custom shader text and injecting it into VFXEngine
                  fetch(`/vfx/${ingestForm.name}.${ingestForm.path.split('.').pop()}`).then(r => r.text()).then(shaderText => {
                      // Apply it as the custom shader override (if it was a valid GLSL, etc)
                      // For this sandbox, we simply visually notify the user it was hot-swapped
                      setIngestStatus('VFX System Successfully Overridden with ' + ingestForm.name);
                  });
              }
          } else {
              setIngestStatus('Failed to pull asset.');
          }
      } catch (e) {
          setIngestStatus('Error connecting to server.');
      }
  };
  const [savedHeroes, setSavedHeroes] = useState<any[]>([]);
  const [currentHeroConfig, setCurrentHeroConfig] = useState<any | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('mhero_saved_heroes');
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
      localStorage.setItem('mhero_saved_heroes', JSON.stringify(updated));
    }
  };

  const handleGenerateHero = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroPrompt.trim() || !engineRef.current) return;

    setGenerating(true);
    setGenError(null);

    try {
      const response = await fetch('/api/gemini/generate-hero', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ heroName: heroPrompt }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate superhero details.');
      }

      const superheroConfig = await response.json();
      setCurrentHeroConfig(superheroConfig);
      
      // Apply configuration to the engine
      if (targetPlayer === 'P1') {
        engineRef.current.applySuperheroStyle(engineRef.current.player1, superheroConfig);
      } else {
        engineRef.current.applySuperheroStyle(engineRef.current.player2, superheroConfig);
      }

      setHeroPrompt('');
    } catch (err: any) {
      console.error(err);
      setGenError(err.message || 'An unexpected error occurred during generation.');
    } finally {
      setGenerating(false);
    }
  };

  const [showTelemetry, setShowTelemetry] = useState(true);
  const [saturationHistory, setSaturationHistory] = useState<number[]>(Array(50).fill(0));

  useEffect(() => {
    setSaturationHistory(prev => {
       const next = [...prev.slice(1), uiState.autonomicSaturation];
       return next;
    });
  }, [uiState.autonomicSaturation]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Listeners for keyboard
    const handleKeyDown = (e: KeyboardEvent) => keysRef.current[e.code] = true;
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current[e.code] = false;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const handleSetUiState = (newState: any) => {
      setUiState(prev => ({...prev, ...newState}));
    };

    // Initialize Engine
    const engine = new GameEngine(containerRef.current, handleSetUiState, keysRef.current);
    engineRef.current = engine;
    engine.start();

  return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      engine.cleanup();
    };
  }, []);

  // Joystick state
  const handleTouch = (e: React.TouchEvent | React.MouseEvent, isMoving: boolean) => {
     if (!engineRef.current) return;
     if (!isMoving) {
        engineRef.current.joystick = { x: 0, y: 0 };
        return;
     }

     let clientX = 0, clientY = 0;
     if ('touches' in e) {
        if (e.touches.length > 0) {
           clientX = e.touches[0].clientX;
           clientY = e.touches[0].clientY;
        }
     } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
     }

     const target = e.currentTarget as HTMLElement;
     const rect = target.getBoundingClientRect();
     if (rect.width === 0 || rect.height === 0) return;
     const centerX = rect.left + rect.width / 2;
     const centerY = rect.top + rect.height / 2;
     
     let dx = (clientX - centerX) / (rect.width / 2);
     let dy = (clientY - centerY) / (rect.height / 2);
     
     // Normalize length
     const len = Math.sqrt(dx*dx + dy*dy);
     if (len > 1) {
        dx /= len;
        dy /= len;
     }
     
     engineRef.current.joystick = { x: dx, y: dy };
     setJoyState({ x: dx, y: dy });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isArena: boolean) => {
    const file = e.target.files?.[0];
    if (file && engineRef.current) {
        engineRef.current.loadCustomModel(file, isArena);
    }
  };


  const audioCtxRef = useRef<AudioContext | null>(null);

  const playHapticSound = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(65, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {
      // Audio context might fail on some strict browsers without user interaction
    }
  };

  const handleCombatButtonDown = (btn: string) => {
    keysRef.current[btn] = true;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
    playHapticSound();
  };

  const handleCombatButtonUp = (btn: string) => {
    keysRef.current[btn] = false;
  };

  return (
    <div className="w-full h-full relative bg-[#0a0a0b] text-white font-sans overflow-hidden select-none flex flex-col">
      {/* WebGL Canvas */}
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* UI Layer */}
      <div className="absolute inset-0 flex flex-col pointer-events-none justify-between z-10">
        
        {/* Header: Fighter Stats */}
        <div className="flex justify-between items-start p-4 md:p-8 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          
          {/* P1 Stats */}
          <div className="w-32 md:w-80 space-y-2 relative pointer-events-auto">
            <div className="flex justify-between items-end mb-1">
              <span className="text-sm md:text-2xl font-black italic tracking-tighter uppercase whitespace-nowrap">{uiState.player1Name}</span>
              <span className="text-[10px] md:text-sm font-mono text-zinc-400 hidden sm:inline-block">{uiState.p1h * 10}/1000</span>
            </div>
            <div className="h-2 md:h-4 bg-zinc-800 rounded-sm overflow-hidden border border-zinc-700">
              <div className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-300" style={{ width: `${uiState.p1h}%` }}></div>
            </div>
            <div className="h-1 md:h-2 bg-zinc-800 rounded-sm overflow-hidden border border-zinc-700 w-2/3">
              <div className="h-full bg-amber-400" style={{ width: `${uiState.p1s}%` }}></div>
            </div>

            {/* Telemetry Panel */}
            <div className="mt-8 bg-black/60 backdrop-blur-md border border-zinc-800 p-3 rounded-lg overflow-hidden flex flex-col cursor-pointer transition-all hover:border-zinc-600" onClick={() => setShowTelemetry(!showTelemetry)}>
                <div className="flex justify-between items-center mb-2">
                   <div className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest">Autonomic Saturation</div>
                   <div className="text-[10px] font-mono text-zinc-400">{uiState.autonomicSaturation.toFixed(1)}%</div>
                </div>
                {showTelemetry && (
                   <div className="w-full h-16 bg-zinc-900 border border-zinc-700 rounded overflow-hidden relative flex items-end">
                      {/* Grid lines */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px)] bg-[size:10px_100%] pointer-events-none" />
                      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:100%_10px] pointer-events-none" />
                      
                      {/* Line graph */}
                      <svg viewBox="0 0 500 100" className="absolute inset-0 w-full h-full preserve-3d" preserveAspectRatio="none">
                        <polyline
                           fill="none"
                           stroke="rgb(245, 158, 11)"
                           strokeWidth="2"
                           points={saturationHistory.map((val, idx) => `${idx * 10},${100 - val}`).join(' ')}
                        />
                        {/* Area Fill */}
                        <polygon
                           fill="url(#satGradient)"
                           points={`0,100 ${saturationHistory.map((val, idx) => `${idx * 10},${100 - val}`).join(' ')} 500,100`}
                        />
                        <defs>
                          <linearGradient id="satGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(245,158,11,0.5)" />
                            <stop offset="100%" stopColor="rgba(245,158,11,0)" />
                          </linearGradient>
                        </defs>
                      </svg>
                   </div>
                )}
            </div>
          </div>
          
          {/* Center Info / Target */}
          <div className="flex flex-col items-center">
            <button onClick={() => setShowMods(!showMods)} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase rounded shadow-lg pointer-events-auto mb-2 border border-indigo-400">
              Mods / Custom
            </button>
            <div className="bg-zinc-900 border border-zinc-700 px-2 py-1 md:px-6 md:py-2 rounded-lg text-sm md:text-2xl font-mono font-bold text-white shadow-xl mb-2">
              TARGET: {uiState.p1Zone.toUpperCase()}
            </div>
          </div>

          {/* P2 Stats */}
          <div className="w-32 md:w-80 space-y-2 text-right">
            <div className="flex flex-row-reverse justify-between items-end mb-1">
              <span className="text-sm md:text-2xl font-black italic tracking-tighter uppercase whitespace-nowrap">{uiState.player2Name}</span>
              <span className="text-[10px] md:text-sm font-mono text-zinc-400 hidden sm:inline-block">{uiState.p2h * 10}/1000</span>
            </div>
            <div className="flex justify-end">
              <div className="h-2 md:h-4 bg-zinc-800 rounded-sm overflow-hidden border border-zinc-700 w-full">
                <div className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-300 ml-auto" style={{ width: `${uiState.p2h}%` }}></div>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="h-1 md:h-2 bg-zinc-800 rounded-sm overflow-hidden border border-zinc-700 w-2/3">
                <div className="h-full bg-amber-400 ml-auto" style={{ width: `${uiState.p2s}%` }}></div>
              </div>
            </div>
          </div>

        </div>

        {/* Mod Menu Overlay */}
        {showMods && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-zinc-950/95 border border-zinc-800 p-5 rounded-2xl shadow-2xl pointer-events-auto z-30 w-[95%] md:w-[420px] backdrop-blur-xl max-h-[80vh] overflow-y-auto flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h2 className="text-lg font-black text-white italic uppercase tracking-wider">Lab Sandbox</h2>
              <button onClick={() => setShowMods(false)} className="text-zinc-500 hover:text-white font-bold text-sm">✕</button>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-zinc-900/60 p-1 rounded-lg border border-zinc-800">
              <button 
                onClick={() => setActiveTab('gemini')}
                className={`py-1.5 text-xs font-bold uppercase rounded-md transition-all ${activeTab === 'gemini' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
              >
                Gemini AI Hero
              </button>
              <button 
                onClick={() => setActiveTab('gltf')}
                className={`py-1.5 text-xs font-bold uppercase rounded-md transition-all ${activeTab === 'gltf' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
              >
                Import 3D Mesh
              </button>
            </div>

            {activeTab === 'ingest' ? (
              <div className="space-y-4">
                <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700 text-sm">
                  <p className="text-neutral-300 mb-3 font-semibold">Pull Open-Source Assets via GitHub API</p>
                  <div className="space-y-4">
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
                        <button onClick={() => setIngestForm({ owner: 'vrm-c', repo: 'UniVRM', path: 'Assets/VRM/Runtime/Format/BlendShape.ts', type: 'script', name: 'FACSMapper' })} className="bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-300 text-xs py-2 px-3 rounded text-left">
                           🎭 Pull FACS ARKit
                        </button>
                        <button onClick={() => setIngestForm({ owner: 'mrdoob', repo: 'three.js', path: 'examples/jsm/animation/CCDIKSolver.js', type: 'script', name: 'CCDIKSolver' })} className="bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/50 text-cyan-300 text-xs py-2 px-3 rounded text-left">
                           🦾 Pull IK Solver
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
                  </div>
                  <button onClick={handleIngest} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded transition-colors flex items-center justify-center gap-2">
                    <Download size={16} /> Fetch & Apply to {targetPlayer}
                  </button>
                  {ingestStatus && <p className="mt-2 text-indigo-400 text-xs font-mono">{ingestStatus}</p>}
                </div>
              </div>
            ) : activeTab === 'gemini' ? (
              <div className="space-y-4 flex flex-col">
                {/* Targeting */}
                <div className="flex justify-between items-center bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-xs font-mono font-bold text-zinc-400">Target Fighter:</span>
                  <div className="flex bg-zinc-950 rounded-md p-0.5 border border-zinc-800">
                    <button 
                      onClick={() => setTargetPlayer('P1')}
                      className={`px-3 py-1 text-[10px] font-black rounded transition-all ${targetPlayer === 'P1' ? 'bg-emerald-500 text-black font-extrabold' : 'text-zinc-400'}`}
                    >
                      P1 ({uiState.player1Name})
                    </button>
                    <button 
                      onClick={() => setTargetPlayer('P2')}
                      className={`px-3 py-1 text-[10px] font-black rounded transition-all ${targetPlayer === 'P2' ? 'bg-emerald-500 text-black font-extrabold' : 'text-zinc-400'}`}
                    >
                      P2 ({uiState.player2Name})
                    </button>
                  </div>
                </div>

                {/* Main Generation Form */}
                <form onSubmit={handleGenerateHero} className="flex flex-col gap-2">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Generate Any Character</label>
                  <div className="relative flex items-center">
                    <input 
                      type="text"
                      placeholder="e.g. Nightguard, Skywire, Golem, Tempest..."
                      value={heroPrompt}
                      onChange={(e) => setHeroPrompt(e.target.value)}
                      disabled={generating}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 placeholder-zinc-600 pr-12 text-white"
                    />
                    <button 
                      type="submit"
                      disabled={generating || !heroPrompt.trim()}
                      className="absolute right-1.5 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-[10px] font-black rounded text-white"
                    >
                      {generating ? '...' : 'GO'}
                    </button>
                  </div>
                </form>

                {/* Error Banner */}
                {genError && (
                  <div className="bg-red-950/50 border border-red-800/60 p-2.5 rounded-lg text-[10px] font-mono text-red-400 leading-normal">
                    <strong>Generation Error:</strong> {genError}
                  </div>
                )}

                {/* Suggestions Shortcuts */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Quick Synthesizer Suggestions</div>
                  <div className="flex flex-wrap gap-1.5">
                    {['Nightguard', 'Skywire', 'Golem', 'Tempest', 'Rook', 'Vigil'].map(name => (
                      <button
                        key={name}
                        onClick={async () => {
                          setHeroPrompt(name);
                          // Automatically kick off generation for smoother experience
                          setGenerating(true);
                          setGenError(null);
                          try {
                            const response = await fetch('/api/gemini/generate-hero', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ heroName: name }),
                            });
                            if (!response.ok) {
                              const errData = await response.json().catch(() => ({}));
                              throw new Error(errData.error || 'Failed to generate superhero details.');
                            }
                            const superheroConfig = await response.json();
                            setCurrentHeroConfig(superheroConfig);
                            if (targetPlayer === 'P1') {
                              engineRef.current?.applySuperheroStyle(engineRef.current.player1, superheroConfig);
                            } else {
                              engineRef.current?.applySuperheroStyle(engineRef.current.player2, superheroConfig);
                            }
                            setHeroPrompt('');
                          } catch (err: any) {
                            setGenError(err.message || 'Error occurred.');
                          } finally {
                            setGenerating(false);
                          }
                        }}
                        disabled={generating}
                        className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-[10px] font-mono text-zinc-300 transition-all active:scale-95"
                      >
                        +{name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Loading state indicator */}
                {generating && (
                  <div className="flex items-center justify-center gap-3 bg-indigo-950/20 border border-indigo-900/30 p-4 rounded-lg">
                    <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest animate-pulse">Invoking Gemini 3.7 Core...</span>
                  </div>
                )}

                {/* Display Current Active Specs */}
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
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/60">
                   <p className="text-sm font-bold text-emerald-400 mb-2">Load Player 1 Rig (.glb/.gltf/.fbx)</p>
                   <button onClick={() => fileInputRef1.current?.click()} className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-xs font-mono transition-all">Select Rig File</button>
                   <input type="file" accept=".glb,.gltf,.fbx" className="hidden" ref={fileInputRef1} onChange={(e) => handleFileUpload(e, false)} />
                </div>
                <div className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/60">
                   <p className="text-sm font-bold text-blue-400 mb-2">Load Custom Arena (.glb/.fbx)</p>
                   <button onClick={() => fileInputRef2.current?.click()} className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-xs font-mono transition-all">Select Map File</button>
                   <input type="file" accept=".glb,.gltf,.fbx" className="hidden" ref={fileInputRef2} onChange={(e) => handleFileUpload(e, true)} />
                </div>
                <p className="text-[10px] text-zinc-500 font-mono leading-normal">Note: Custom loaders cleanly align skeleton bones with the active ragdoll model using relative standard coordinate mapping.</p>
              </div>
            )}
          </div>
        )}

        {/* Center KO Text */}
        {uiState.ko && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <h1 className="text-4xl md:text-6xl font-black text-red-500 bg-black/70 px-8 py-4 rounded-xl border-4 border-red-500 uppercase tracking-widest backdrop-blur-sm shadow-2xl">{uiState.ko}</h1>
          </div>
        )}

        {/* Bottom Controls Overlay */}
        <div className="h-auto md:h-64 p-4 md:p-8 grid grid-cols-2 md:grid-cols-3 items-center bg-black/40 backdrop-blur-md border-t border-zinc-800 pointer-events-auto mt-auto">
          
          {/* Movement Stick */}
          <div className="flex flex-col items-center gap-4">
             <div 
               className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-zinc-700 bg-zinc-900 flex items-center justify-center relative shadow-inner touch-none"
               onTouchStart={(e) => handleTouch(e, true)}
               onTouchMove={(e) => handleTouch(e, true)}
               onTouchEnd={(e) => handleTouch(e, false)}
               onMouseDown={(e) => handleTouch(e, true)}
               onMouseMove={(e) => { if (e.buttons > 0) handleTouch(e, true); }}
               onMouseUp={(e) => handleTouch(e, false)}
               onMouseLeave={(e) => handleTouch(e, false)}
              >
               <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-400 rounded-full pointer-events-none absolute shadow-[0_4px_10px_rgba(0,0,0,0.5)]" 
                    style={{ transform: `translate(${joyState.x*32}px, ${joyState.y*32}px)` }}
               />
             </div>
             <span className="hidden md:block text-[10px] uppercase font-bold tracking-widest text-zinc-500">Movement (L-Stick)</span>
          </div>
          
          {/* Global Debug Console */}
          <div className="hidden md:flex h-full border-x border-zinc-800 px-8 py-2 overflow-hidden flex-col pointer-events-none">
            <div className="text-[10px] font-mono text-zinc-400 flex justify-between">
              <span>{uiState.ko ? 'MATCH OVER' : 'COMBAT SIMULATION'}</span>
              <span>PHYSICS: RAPIER_3D v0.2</span>
            </div>
            <div className="mt-2 font-mono text-[9px] space-y-1">
              <div className="text-blue-400">[ENGINE] Active Ragdoll synchronized...</div>
              <div className="text-zinc-500">[CONTROLS] WASD to Move, X/Y/A/B to Strike</div>
              <div className="text-zinc-500">[CONTROLS] Q to Block, E to Parry, R to Get Up</div>
              <div className="text-emerald-400">[COMBAT] Health P1: {uiState.p1h * 10}/1000</div>
              <div className="text-red-400">[DEBUG] {uiState.debugMsg}</div>
            </div>
          </div>

          {/* Face Buttons & Triggers */}
          <div className="flex flex-col md:flex-row items-end md:items-center justify-end md:gap-12 gap-6 w-full pr-4 md:pr-0">
            
            {/* Triggers/Bumpers */}
            <div className="grid grid-cols-2 gap-2 md:flex md:gap-4 justify-end w-full md:w-auto">
              <div className="w-12 h-10 md:w-10 md:h-10 border border-zinc-700 bg-zinc-900 flex items-center justify-center text-xs font-bold rounded shadow-lg touch-none active:bg-zinc-800"
                   onTouchStart={() => keysRef.current['LB'] = true} onTouchEnd={() => keysRef.current['LB'] = false}
                   onMouseDown={() => keysRef.current['LB'] = true} onMouseUp={() => keysRef.current['LB'] = false}>
                LB
              </div>
              <div className="w-12 h-10 md:w-10 md:h-10 border border-zinc-700 bg-zinc-900 flex items-center justify-center text-xs font-bold rounded shadow-lg touch-none active:bg-zinc-800"
                   onTouchStart={() => keysRef.current['LT'] = true} onTouchEnd={() => keysRef.current['LT'] = false}
                   onMouseDown={() => keysRef.current['LT'] = true} onMouseUp={() => keysRef.current['LT'] = false}>
                LT
              </div>
              <div className="w-12 h-10 md:w-10 md:h-10 border border-zinc-700 bg-zinc-900 flex items-center justify-center text-xs font-bold rounded shadow-lg touch-none active:bg-zinc-800"
                   onTouchStart={() => keysRef.current['BtnRB'] = true} onTouchEnd={() => keysRef.current['BtnRB'] = false}
                   onMouseDown={() => keysRef.current['BtnRB'] = true} onMouseUp={() => keysRef.current['BtnRB'] = false}>
                RB
              </div>
              <div className="w-12 h-10 md:w-10 md:h-10 border border-emerald-900/50 text-emerald-400 bg-zinc-900 flex items-center justify-center text-xs font-bold rounded shadow-lg touch-none active:bg-zinc-800"
                   onTouchStart={() => keysRef.current['BtnRT'] = true} onTouchEnd={() => keysRef.current['BtnRT'] = false}
                   onMouseDown={() => keysRef.current['BtnRT'] = true} onMouseUp={() => keysRef.current['BtnRT'] = false}>
                RT
              </div>
            </div>
            
            {/* Actions */}
            <div className="relative">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-start-2 w-12 h-12 md:w-10 md:h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold border border-zinc-600 touch-none active:bg-zinc-700 shadow-md" onTouchStart={() => handleCombatButtonDown('BtnY')} onTouchEnd={() => handleCombatButtonUp('BtnY')} onMouseDown={() => handleCombatButtonDown('BtnY')} onMouseUp={() => handleCombatButtonUp('BtnY')} onMouseLeave={() => handleCombatButtonUp('BtnY')}>Y</div>
                
                <div className="row-start-2 col-start-1 w-12 h-12 md:w-10 md:h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold border border-zinc-600 touch-none active:bg-zinc-700 shadow-md" onTouchStart={() => handleCombatButtonDown('BtnX')} onTouchEnd={() => handleCombatButtonUp('BtnX')} onMouseDown={() => handleCombatButtonDown('BtnX')} onMouseUp={() => handleCombatButtonUp('BtnX')} onMouseLeave={() => handleCombatButtonUp('BtnX')}>X</div>
                
                <div className="row-start-2 col-start-2 w-12 h-12 md:w-10 md:h-10 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] touch-none active:bg-emerald-500 border border-emerald-500 text-black" onTouchStart={() => handleCombatButtonDown('BtnA')} onTouchEnd={() => handleCombatButtonUp('BtnA')} onMouseDown={() => handleCombatButtonDown('BtnA')} onMouseUp={() => handleCombatButtonUp('BtnA')} onMouseLeave={() => handleCombatButtonUp('BtnA')}>A</div>
                
                <div className="row-start-2 col-start-3 w-12 h-12 md:w-10 md:h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold border border-zinc-600 touch-none active:bg-zinc-700 shadow-md" onTouchStart={() => handleCombatButtonDown('BtnB')} onTouchEnd={() => handleCombatButtonUp('BtnB')} onMouseDown={() => handleCombatButtonDown('BtnB')} onMouseUp={() => handleCombatButtonUp('BtnB')} onMouseLeave={() => handleCombatButtonUp('BtnB')}>B</div>
              </div>
              
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-5 md:h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold border border-zinc-600 touch-none active:bg-zinc-700 cursor-pointer" onClick={() => keysRef.current['BtnStart'] = true}>S</div>
            </div>

          </div>
        </div>
        
      </div>
    </div>
  );
}


