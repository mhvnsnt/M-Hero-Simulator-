import { startHeroAPI } from './src/backend/HeroAPI';
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize the server-side Gemini client with proper telemetry headers
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Dynamic Superhero Generation via Gemini API
  app.post("/api/gemini/generate-hero", async (req, res) => {
    const { heroName } = req.body;
    if (!heroName || typeof heroName !== "string") {
      return res.status(400).json({ error: "Missing or invalid heroName in request body." });
    }

    try {
      const systemInstruction = `You are an expert game designer, superhero comic enthusiast, and 3D modeller. 
Your goal is to parse a requested superhero or custom hero character name, and generate a fully customized 3D character template configuration for a physics-based active-ragdoll fighting game.
You must creatively translate their iconic comic appearances, color schemes, cape styles, and signature physical superpowers into precise gameplay parameters, 3D mesh styles, and Three.js colors.

Instructions for visual color configurations:
- All colors MUST be hex strings starting with '0x' followed by 6 hex digits, e.g., '0xd32f2f' for red, '0x212121' for black.
- Batman style should be dark grey/black ('0x222222', '0x111111').
- Spiderman style should be red/blue ('0xd32f2f', '0x1976d2').
- Superman style should be royal blue/bright red ('0x1565c0', '0xd32f2f').
- Hulk style should be green/purple ('0x2e7d32', '0x7b1fa2').
- Wolverine style should be bright yellow/royal blue ('0xfdd835', '0x1565c0') or brown/tan.
- Choose primaryColor, accentColor, headColor, gloveColor, and feetColor carefully to represent the hero's actual design.
- Define if they have a Cape (hasCape: true) and pointed cowl ears/horns (hasCowlEars: true).
- Choose the closest chest logo emblem from: 'bat', 'spider', 's-shield', 'star', 'lightning', 'none'.

Instructions for powers and physics:
- stats.maxHealth should be between 800 and 1800 (Hulk higher, Flash lower).
- stats.stamina should be between 80 and 150 (energy recovery pool).
- stats.speed should be between 0.8 and 1.6 (Flash/Spiderman high, Hulk slow but heavy).
- stats.gravity should be between 0.4 and 1.2 (lower gravity enables floaty super-jumps or hover, higher gravity represents immense density).
- power.type MUST be one of: 'projectile' (fires a custom projectile like Batarang, shield, star), 'pull' (shoots web lines/grapple to drag opponent close), 'beam' (eyes or chest fires laser beam), 'blast' (earthquake slam/ground smash/force blast), 'dash' (speed blitz punch).
- power.damage should be between 100 and 300.
- power.cooldown should be between 1000 and 4000 milliseconds.
- power.soundPitch should be between 200 and 1200 Hz representing synthesized sfx frequency.`;

      const userPrompt = `Generate a 3D superhero template for: "${heroName}"`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "A unique slug, e.g., 'superman'" },
              name: { type: Type.STRING, description: "The clean name of the hero" },
              description: { type: Type.STRING, description: "A highly concise 1-sentence comic summary" },
              primaryColor: { type: Type.STRING },
              accentColor: { type: Type.STRING },
              headColor: { type: Type.STRING },
              gloveColor: { type: Type.STRING },
              feetColor: { type: Type.STRING },
              hasCape: { type: Type.BOOLEAN },
              capeColor: { type: Type.STRING },
              hasCowlEars: { type: Type.BOOLEAN },
              chestLogo: { 
                type: Type.STRING, 
                description: "Must be: 'bat', 'spider', 's-shield', 'star', 'lightning', 'none'" 
              },
              emblemColor: { type: Type.STRING },
              stats: {
                type: Type.OBJECT,
                properties: {
                  maxHealth: { type: Type.INTEGER },
                  stamina: { type: Type.INTEGER },
                  speed: { type: Type.NUMBER },
                  gravity: { type: Type.NUMBER }
                },
                required: ["maxHealth", "stamina", "speed", "gravity"]
              },
              power: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Action power name, e.g., 'Web-Pull' or 'Batarang Toss'" },
                  type: { type: Type.STRING, description: "Must be: 'projectile', 'pull', 'beam', 'blast', 'dash'" },
                  projectileColor: { type: Type.STRING },
                  damage: { type: Type.INTEGER },
                  cooldown: { type: Type.INTEGER },
                  soundPitch: { type: Type.INTEGER }
                },
                required: ["name", "type", "projectileColor", "damage", "cooldown"]
              }
            },
            required: [
              "id", "name", "description", "primaryColor", "accentColor", "headColor",
              "gloveColor", "feetColor", "hasCape", "hasCowlEars", "chestLogo",
              "emblemColor", "stats", "power"
            ]
          }
        }
      });

      const generatedText = response.text;
      if (!generatedText) {
        throw new Error("No text response received from Gemini.");
      }

      const parsedConfig = JSON.parse(generatedText.trim());
      res.json(parsedConfig);
    } catch (err: any) {
      console.error("Gemini superhero generation failed:", err);
      res.status(500).json({ 
        error: "Failed to generate superhero details via Gemini API.", 
        message: err.message || err 
      });
    }
  });

  // Vite middleware for development HMR & asset loading
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production asset server
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  
  // Start the Hero Data Router API (Internal port 3001)
  startHeroAPI();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
