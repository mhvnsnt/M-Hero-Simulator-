import React, { useState, useEffect } from 'react';
import { Settings, Save, Play, Square, Database, Cpu, Activity, User, Crosshair } from 'lucide-react';
import { customDb } from './lib/firebase';
import { collection, doc, setDoc, getDoc, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import EngineViewport from './EngineViewport';

export default function Editor() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState('physics');
  const [uid, setUid] = useState<string | null>(null);

  const [loadout, setLoadout] = useState({
    name: 'Default Hero',
    ragdollStiffness: 1500,
    ragdollDamping: 150,
    swingSpeed: 1.0,
    ropeLength: 35.0,
    attackRange: 2.5,
  });

  useEffect(() => {
    const auth = getAuth();
    signInAnonymously(auth).then((userCredential) => {
      setUid(userCredential.user.uid);
      loadFromFirebase(userCredential.user.uid);
    }).catch((error) => {
      console.error("Auth error:", error);
    });
  }, []);

  const saveToFirebase = async () => {
    if (!uid) return;
    try {
      const loadoutRef = doc(customDb, `users/${uid}/loadouts/current`);
      await setDoc(loadoutRef, {
        ...loadout,
        updatedAt: new Date()
      });
      alert('Loadout saved to database successfully!');
    } catch (err) {
      console.error("Error saving:", err);
    }
  };

  const loadFromFirebase = async (currentUid: string) => {
    try {
      const loadoutRef = doc(customDb, `users/${currentUid}/loadouts/current`);
      const snap = await getDoc(loadoutRef);
      if (snap.exists()) {
        setLoadout(snap.data() as any);
      }
    } catch (err) {
      console.error("Error loading:", err);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-neutral-950 border-r border-neutral-800 flex flex-col">
        <div className="p-6 border-b border-neutral-800">
          <div className="flex items-center gap-2 text-indigo-400 mb-2">
            <Cpu size={24} />
            <h1 className="text-xl font-bold tracking-wider">BANNON ENGINE</h1>
          </div>
          <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Zero-Touch Editor</p>
        </div>

        <div className="flex bg-neutral-900 border-b border-neutral-800">
          <button 
            onClick={() => setActiveTab('physics')}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider ${activeTab === 'physics' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-neutral-800/50' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            Physics
          </button>
          <button 
            onClick={() => setActiveTab('combat')}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider ${activeTab === 'combat' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-neutral-800/50' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            Combat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {activeTab === 'physics' && (
            <>
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-neutral-300 flex items-center gap-2">
                  <Activity size={16} className="text-emerald-400" /> Active Ragdoll (PD Motor)
                </h3>
                <div className="space-y-2">
                  <label className="flex justify-between text-xs text-neutral-400">
                    <span>Stiffness (Kp)</span>
                    <span className="text-indigo-300">{loadout.ragdollStiffness}</span>
                  </label>
                  <input type="range" min="500" max="3000" value={loadout.ragdollStiffness} onChange={(e) => setLoadout({...loadout, ragdollStiffness: Number(e.target.value)})} className="w-full accent-indigo-500" />
                </div>
                <div className="space-y-2">
                  <label className="flex justify-between text-xs text-neutral-400">
                    <span>Damping (Kd)</span>
                    <span className="text-indigo-300">{loadout.ragdollDamping}</span>
                  </label>
                  <input type="range" min="10" max="500" value={loadout.ragdollDamping} onChange={(e) => setLoadout({...loadout, ragdollDamping: Number(e.target.value)})} className="w-full accent-indigo-500" />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-neutral-800">
                <h3 className="text-sm font-bold text-neutral-300 flex items-center gap-2">
                  <Settings size={16} className="text-blue-400" /> Traversal Constraints
                </h3>
                <div className="space-y-2">
                  <label className="flex justify-between text-xs text-neutral-400">
                    <span>Pendulum Rope Length</span>
                    <span className="text-indigo-300">{loadout.ropeLength}m</span>
                  </label>
                  <input type="range" min="10" max="100" value={loadout.ropeLength} onChange={(e) => setLoadout({...loadout, ropeLength: Number(e.target.value)})} className="w-full accent-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="flex justify-between text-xs text-neutral-400">
                    <span>Base Swing Speed</span>
                    <span className="text-indigo-300">{loadout.swingSpeed}x</span>
                  </label>
                  <input type="range" min="0.5" max="3.0" step="0.1" value={loadout.swingSpeed} onChange={(e) => setLoadout({...loadout, swingSpeed: Number(e.target.value)})} className="w-full accent-blue-500" />
                </div>
              </div>
            </>
          )}

          {activeTab === 'combat' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-neutral-300 flex items-center gap-2">
                <Crosshair size={16} className="text-rose-400" /> Freeflow Combat
              </h3>
              <div className="space-y-2">
                <label className="flex justify-between text-xs text-neutral-400">
                  <span>Cone-Trace Target Range</span>
                  <span className="text-rose-300">{loadout.attackRange}m</span>
                </label>
                <input type="range" min="1.0" max="15.0" step="0.5" value={loadout.attackRange} onChange={(e) => setLoadout({...loadout, attackRange: Number(e.target.value)})} className="w-full accent-rose-500" />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-neutral-800 bg-neutral-900/50">
          <button 
            onClick={saveToFirebase}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-indigo-900/20"
          >
            <Database size={16} /> Save to Database
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col relative bg-black">
        <div className="absolute top-6 left-6 z-10 flex items-center gap-4">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold text-sm shadow-xl backdrop-blur-md transition-all ${isPlaying ? 'bg-rose-500/90 text-white shadow-rose-900/50' : 'bg-emerald-500/90 text-white shadow-emerald-900/50'}`}
          >
            {isPlaying ? <Square size={16} /> : <Play size={16} />}
            {isPlaying ? 'STOP ENGINE' : 'RUN ENGINE'}
          </button>
          
          {isPlaying && (
            <div className="flex items-center gap-3 px-4 py-2 bg-neutral-900/80 backdrop-blur-md rounded-full border border-neutral-800">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono text-neutral-300">JOLT_PHYSICS_TICK: 60Hz</span>
            </div>
          )}
        </div>

        {/* 3D Canvas Placeholder / Native UI Render */}
        <div className="flex-1 w-full h-full relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800 via-neutral-950 to-black">
            {/* Grid overlay */}
            <div className="absolute inset-0" style={{ 
              backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)', 
              backgroundSize: '40px 40px',
              transform: 'perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px)',
            }} />
          </div>

          {!isPlaying ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500 z-10">
              <Cpu size={64} className="mb-4 opacity-20" />
              <h2 className="text-2xl font-bold tracking-widest text-neutral-600 mb-2">ENGINE STANDBY</h2>
              <p className="text-sm">Press Run Engine to initialize WebGL & Physics modules</p>
            </div>
          ) : (
            <div className="absolute inset-0 z-10">
              <EngineViewport isPlaying={isPlaying} loadout={loadout} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
