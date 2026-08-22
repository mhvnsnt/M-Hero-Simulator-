const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const properInsert = `
  const handleCombatButtonDown = (btn: string) => {
    keysRef.current[btn] = true;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleCombatButtonUp = (btn: string) => {
    keysRef.current[btn] = false;
  };

  return (`;

const mainReturnRegex = /  return \(\s*<div className="w-full h-full relative/g;
code = code.replace(mainReturnRegex, (match) => {
    return properInsert + `\n    <div className="w-full h-full relative`;
});

fs.writeFileSync('src/App.tsx', code, 'utf8');
console.log("App.tsx haptics fixed again!");
