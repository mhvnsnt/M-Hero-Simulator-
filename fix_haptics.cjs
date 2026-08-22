const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// The incorrect insertion:
const badInsert = `    const handleCombatButtonDown = (btn: string) => {
    keysRef.current[btn] = true;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(40);
    }
  };

  const handleCombatButtonUp = (btn: string) => {
    keysRef.current[btn] = false;
  };

  return (`;

code = code.replace(badInsert, "  return (");

// Now we insert it at the very bottom, right before the MAIN return of the component.
// The main return is `  return (` around line 150. Let's find it securely.

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

// We'll just replace the LAST occurrence of `  return (` which should be the main component return?
// Actually wait, there might be returns inside map functions.
// Let's use regex to replace `  return (\n    <div className="w-screen h-screen` or similar
const mainReturnRegex = /  return \(\s*<div className="w-screen h-screen bg-black/g;
code = code.replace(mainReturnRegex, (match) => {
    return properInsert + `\n    <div className="w-screen h-screen bg-black`;
});

fs.writeFileSync('src/App.tsx', code, 'utf8');
console.log("App.tsx haptics fixed!");
