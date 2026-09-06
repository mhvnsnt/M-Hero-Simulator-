const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const routeStart = `app.post("/api/gemini/generate-hero", async (req, res) => {`;
const routeEnd = `  // Vite middleware for development`;

const startIndex = code.indexOf(routeStart);
const endIndex = code.indexOf(routeEnd);

if (startIndex !== -1 && endIndex !== -1) {
    const newRoute = `app.post("/api/gemini/generate-hero", async (req, res) => {
    const { heroName } = req.body;
    if (!heroName || typeof heroName !== "string") {
      return res.status(400).json({ error: "Missing or invalid heroName in request body." });
    }
    try {
      const systemInstruction = \`You are the Lead Full-Stack Game Architect for "M+ : Hero Simulator", an open-world RPG. Your goal is to parse a requested superhero or custom hero character name, and generate a fully customized 3D character profile.
Generate visual configs, physics parameters, and deep RPG profiling including:
- Alignment (Hero, Villain, Anti-Hero, Vigilante, Mercenary).
- Power loadout (Ranged/Melee/Locomotion/Passive) with energy costs.
- Fighting Style (choose from 50+ martial arts like Drunken Master, Jeet Kune Do, Kung Fu, Pro Wrestling, Muay Thai, Boxing, Capoeira, etc).
Return valid JSON matching the schema precisely.\`;
      const userPrompt = \`Generate a 3D superhero template for: "\${heroName}"\`;
      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              alignment: { type: Type.STRING, description: "Hero, Villain, Anti-Hero, Vigilante, Mercenary" },
              primaryColor: { type: Type.STRING },
              accentColor: { type: Type.STRING },
              headColor: { type: Type.STRING },
              gloveColor: { type: Type.STRING },
              feetColor: { type: Type.STRING },
              hasCape: { type: Type.BOOLEAN },
              capeColor: { type: Type.STRING },
              hasCowlEars: { type: Type.BOOLEAN },
              chestLogo: { type: Type.STRING },
              emblemColor: { type: Type.STRING },
              stats: {
                type: Type.OBJECT,
                properties: { maxHealth: { type: Type.INTEGER }, stamina: { type: Type.INTEGER }, speed: { type: Type.NUMBER }, gravity: { type: Type.NUMBER } },
                required: ["maxHealth", "stamina", "speed", "gravity"]
              },
              power: {
                type: Type.OBJECT,
                properties: { name: { type: Type.STRING }, type: { type: Type.STRING }, projectileColor: { type: Type.STRING }, damage: { type: Type.INTEGER }, cooldown: { type: Type.INTEGER }, energyCost: { type: Type.INTEGER } },
                required: ["name", "type", "projectileColor", "damage", "cooldown", "energyCost"]
              },
              fightingStyle: {
                type: Type.OBJECT,
                properties: { name: { type: Type.STRING }, comboChain: { type: Type.ARRAY, items: { type: Type.STRING } }, damageMultiplier: { type: Type.NUMBER } },
                required: ["name", "comboChain", "damageMultiplier"]
              }
            },
            required: ["id", "name", "description", "alignment", "primaryColor", "accentColor", "headColor", "gloveColor", "feetColor", "hasCape", "hasCowlEars", "chestLogo", "emblemColor", "stats", "power", "fightingStyle"]
          }
        }
      });
      res.json(JSON.parse(response.text?.trim() || "{}"));
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "Failed to generate superhero", message: err.message });
    }
  });

  // Dynamic Taunt / Lore Generator
  app.post("/api/gemini/generate-taunt", async (req, res) => {
    const { character, context } = req.body;
    try {
      const prompt = \`Generate a short, intense mid-match fighting game taunt for \${character} \${context ? "in the context of " + context : ""}. Keep it under 20 words. Do not use quotes.\`;
      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt
      });
      res.json({ taunt: response.text?.trim() });
    } catch (err: any) {
      console.error("Gemini taunt generation failed:", err);
      res.status(500).json({ error: "Failed to generate taunt." });
    }
  });

  // Deep GitHub Open-Source Search
  app.post("/api/search-github", async (req, res) => {
      const { query } = req.body;
      try {
          const fetchRes = await fetch(\`https://api.github.com/search/repositories?q=\${encodeURIComponent(query)}+in:readme+in:description+stars:>10&per_page=5\`);
          const data = await fetchRes.json();
          res.json({ results: data.items || [] });
      } catch (e: any) {
          res.status(500).json({ error: "GitHub search failed" });
      }
  });

`;
    code = code.substring(0, startIndex) + newRoute + code.substring(endIndex);
    fs.writeFileSync('server.ts', code);
    console.log("Patched server.ts with RPG Gemini schema and Taunts.");
} else {
    console.log("Could not find boundaries.");
}
