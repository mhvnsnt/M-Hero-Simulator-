const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const routeStart = `app.post("/api/gemini/generate-hero"`;
const routeEnd = `  // Dynamic Taunt / Lore Generator`;

const oldRoute = code.substring(code.indexOf(routeStart), code.indexOf(routeEnd));

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
            type: "OBJECT",
            properties: {
              id: { type: "STRING" },
              name: { type: "STRING" },
              description: { type: "STRING" },
              alignment: { type: "STRING", description: "Hero, Villain, Anti-Hero, Vigilante, Mercenary" },
              primaryColor: { type: "STRING" },
              accentColor: { type: "STRING" },
              headColor: { type: "STRING" },
              gloveColor: { type: "STRING" },
              feetColor: { type: "STRING" },
              hasCape: { type: "BOOLEAN" },
              capeColor: { type: "STRING" },
              hasCowlEars: { type: "BOOLEAN" },
              chestLogo: { type: "STRING" },
              emblemColor: { type: "STRING" },
              stats: {
                type: "OBJECT",
                properties: { maxHealth: { type: "INTEGER" }, stamina: { type: "INTEGER" }, speed: { type: "NUMBER" }, gravity: { type: "NUMBER" } },
                required: ["maxHealth", "stamina", "speed", "gravity"]
              },
              power: {
                type: "OBJECT",
                properties: { name: { type: "STRING" }, type: { type: "STRING" }, projectileColor: { type: "STRING" }, damage: { type: "INTEGER" }, cooldown: { type: "INTEGER" }, energyCost: { type: "INTEGER" } },
                required: ["name", "type", "projectileColor", "damage", "cooldown", "energyCost"]
              },
              fightingStyle: {
                type: "OBJECT",
                properties: { name: { type: "STRING" }, comboChain: { type: "ARRAY", items: { type: "STRING" } }, damageMultiplier: { type: "NUMBER" } },
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

`;

if (code.includes(routeStart)) {
    code = code.replace(oldRoute, newRoute);
    fs.writeFileSync('server.ts', code);
    console.log("Patched server.ts with RPG Gemini schema.");
}
