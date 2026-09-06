const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetGeminiEnd = `    } catch (err: any) {
      console.error("Gemini superhero generation failed:", err);
      res.status(500).json({ 
         error: "Failed to generate superhero details via Gemini API.", 
         message: err.message || err 
       });
    }
  });`;

const newRoutes = `    } catch (err: any) {
      console.error("Gemini superhero generation failed:", err);
      res.status(500).json({ 
         error: "Failed to generate superhero details via Gemini API.", 
         message: err.message || err 
       });
    }
  });

  // Dynamic Taunt / Lore Generator
  app.post("/api/gemini/generate-taunt", async (req, res) => {
    const { character, context } = req.body;
    try {
      const prompt = \`Generate a short, intense mid-match fighting game taunt for \${character} \${context ? "in the context of " + context : ""}. Keep it under 20 words. Do not use quotes.\`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
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

if (code.includes('app.post("/api/gemini/generate-hero"')) {
    code = code.replace(targetGeminiEnd, newRoutes);
    fs.writeFileSync('server.ts', code);
    console.log("Patched server.ts with Taunt and Search endpoints.");
} else {
    console.log("Failed to find target block in server.ts");
}
