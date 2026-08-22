const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add the helper function
const helperInsert = `  const handleCombatButtonDown = (btn: string) => {
    keysRef.current[btn] = true;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(40);
    }
  };

  const handleCombatButtonUp = (btn: string) => {
    keysRef.current[btn] = false;
  };

  return (`;
code = code.replace("  return (", helperInsert);

// 2. Update BtnY
code = code.replace(
  "onTouchStart={() => keysRef.current['BtnY'] = true} onTouchEnd={() => keysRef.current['BtnY'] = false} onMouseDown={() => keysRef.current['BtnY'] = true} onMouseUp={() => keysRef.current['BtnY'] = false} onMouseLeave={() => keysRef.current['BtnY'] = false}",
  "onTouchStart={() => handleCombatButtonDown('BtnY')} onTouchEnd={() => handleCombatButtonUp('BtnY')} onMouseDown={() => handleCombatButtonDown('BtnY')} onMouseUp={() => handleCombatButtonUp('BtnY')} onMouseLeave={() => handleCombatButtonUp('BtnY')}"
);

// 3. Update BtnX
code = code.replace(
  "onTouchStart={() => keysRef.current['BtnX'] = true} onTouchEnd={() => keysRef.current['BtnX'] = false} onMouseDown={() => keysRef.current['BtnX'] = true} onMouseUp={() => keysRef.current['BtnX'] = false} onMouseLeave={() => keysRef.current['BtnX'] = false}",
  "onTouchStart={() => handleCombatButtonDown('BtnX')} onTouchEnd={() => handleCombatButtonUp('BtnX')} onMouseDown={() => handleCombatButtonDown('BtnX')} onMouseUp={() => handleCombatButtonUp('BtnX')} onMouseLeave={() => handleCombatButtonUp('BtnX')}"
);

// 4. Update BtnA
code = code.replace(
  "onTouchStart={() => keysRef.current['BtnA'] = true} onTouchEnd={() => keysRef.current['BtnA'] = false} onMouseDown={() => keysRef.current['BtnA'] = true} onMouseUp={() => keysRef.current['BtnA'] = false} onMouseLeave={() => keysRef.current['BtnA'] = false}",
  "onTouchStart={() => handleCombatButtonDown('BtnA')} onTouchEnd={() => handleCombatButtonUp('BtnA')} onMouseDown={() => handleCombatButtonDown('BtnA')} onMouseUp={() => handleCombatButtonUp('BtnA')} onMouseLeave={() => handleCombatButtonUp('BtnA')}"
);

// 5. Update BtnB
code = code.replace(
  "onTouchStart={() => keysRef.current['BtnB'] = true} onTouchEnd={() => keysRef.current['BtnB'] = false} onMouseDown={() => keysRef.current['BtnB'] = true} onMouseUp={() => keysRef.current['BtnB'] = false} onMouseLeave={() => keysRef.current['BtnB'] = false}",
  "onTouchStart={() => handleCombatButtonDown('BtnB')} onTouchEnd={() => handleCombatButtonUp('BtnB')} onMouseDown={() => handleCombatButtonDown('BtnB')} onMouseUp={() => handleCombatButtonUp('BtnB')} onMouseLeave={() => handleCombatButtonUp('BtnB')}"
);

fs.writeFileSync('src/App.tsx', code, 'utf8');
console.log("App.tsx patched with haptic feedback!");
