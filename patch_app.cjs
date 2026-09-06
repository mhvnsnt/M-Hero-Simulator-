const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const nippleImport = `import nipplejs from 'nipplejs';\n`;
if (!code.includes("import nipplejs")) {
    code = code.replace("import React,", nippleImport + "import React,");
}

const overlayCode = `
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
      zone: leftJoystickZone.current,
      mode: 'static',
      position: { left: '80px', bottom: '80px' },
      color: '#ffffff',
      size: 110,
    });

    leftManager.on('move', (_, data) => {
      if (data.vector) onMove({ x: data.vector.x, y: -data.vector.y });
    });
    leftManager.on('end', () => onMove({ x: 0, y: 0 }));

    const rightManager = nipplejs.create({
      zone: rightJoystickZone.current,
      mode: 'static',
      position: { right: '80px', bottom: '80px' },
      color: '#ffffff',
      size: 110,
    });

    rightManager.on('move', (_, data) => {
      if (data.vector) onCameraOrbit({ x: data.vector.x, y: data.vector.y });
    });

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
`;

if (!code.includes("MobileGamepadOverlay")) {
    code = code.replace("export default function App() {", overlayCode + "\nexport default function App() {");
}

const renderOverlay = `          <MobileGamepadOverlay 
            onMove={(vec) => { if(engineRef.current) engineRef.current.handleVirtualMove(vec); }} 
            onCameraOrbit={(vec) => { if(engineRef.current) engineRef.current.handleVirtualOrbit(vec); }}
            onPowerWheelTap={() => alert('M+ Power Wheel Opened!')}
          />`;

if (!code.includes("MobileGamepadOverlay onMove")) {
    // Add inside the return, maybe near the top of the absolute container
    code = code.replace("{/* Header overlay */}", renderOverlay + "\n          {/* Header overlay */}");
}

const currentHeroConfigUI = `                  {currentHeroConfig && (
                    <div className="mt-2 text-[10px] text-indigo-200 bg-indigo-950/50 p-2 rounded border border-indigo-900/50">
                      <div><strong className="text-white">Generated:</strong> {currentHeroConfig.name}</div>
                      <div className="opacity-80 italic">"{currentHeroConfig.description}"</div>
                      <div className="mt-1 flex gap-2">
                        <span className="bg-indigo-900/80 px-1 rounded text-white">{currentHeroConfig.stats.maxHealth} HP</span>
                        <span className="bg-emerald-900/80 px-1 rounded text-white">{currentHeroConfig.stats.speed}x SPD</span>
                      </div>
                    </div>
                  )}`;

const newHeroConfigUI = `                  {currentHeroConfig && (
                    <div className="mt-2 text-[10px] text-indigo-200 bg-indigo-950/50 p-2 rounded border border-indigo-900/50">
                      <div><strong className="text-white">Generated:</strong> {currentHeroConfig.name}</div>
                      <div className="opacity-80 italic">"{currentHeroConfig.description}"</div>
                      <div className="mt-1 flex gap-2 flex-wrap">
                        <span className="bg-indigo-900/80 px-1 rounded text-white">{currentHeroConfig.alignment || 'Hero'}</span>
                        <span className="bg-emerald-900/80 px-1 rounded text-white">{currentHeroConfig.fightingStyle?.name || 'Brawler'} Style</span>
                        <span className="bg-rose-900/80 px-1 rounded text-white">{currentHeroConfig.power?.name || 'Strike'}</span>
                      </div>
                    </div>
                  )}`;

if (code.includes(currentHeroConfigUI)) {
    code = code.replace(currentHeroConfigUI, newHeroConfigUI);
} else {
    // It might not exactly match. Let's do a targeted replace for currentHeroConfig UI
    const targetDivStart = `{currentHeroConfig && (`;
    const replaceDiv = `{currentHeroConfig && (
                    <div className="mt-2 text-[10px] text-indigo-200 bg-indigo-950/50 p-2 rounded border border-indigo-900/50">
                      <div><strong className="text-white">Generated:</strong> {currentHeroConfig.name}</div>
                      <div className="opacity-80 italic">"{currentHeroConfig.description}"</div>
                      <div className="mt-1 flex gap-2 flex-wrap">
                        <span className="bg-indigo-900/80 px-1 rounded text-white">{currentHeroConfig.alignment || 'Hero'}</span>
                        <span className="bg-emerald-900/80 px-1 rounded text-white">{currentHeroConfig.fightingStyle?.name || 'Brawler'} Style</span>
                        <span className="bg-rose-900/80 px-1 rounded text-white">{currentHeroConfig.power?.name || 'Strike'}</span>
                      </div>
                    </div>
                  )}`;
    code = code.replace(/\{currentHeroConfig && \([\s\S]*?\}\)/, replaceDiv);
}

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx for NippleJS and Hero Config");
