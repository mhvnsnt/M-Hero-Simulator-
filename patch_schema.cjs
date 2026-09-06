const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldSchemaProps = `chestLogo: { type: Type.STRING },
              emblemColor: { type: Type.STRING },
              stats: {`;

const newSchemaProps = `chestLogo: { type: Type.STRING },
              emblemColor: { type: Type.STRING },
              equipmentSlots: {
                type: Type.OBJECT,
                properties: {
                  head: { type: Type.STRING, description: "Search query or keyword for mask/helmet from CC0 library (e.g., 'cowl', 'visor', 'none')" },
                  back: { type: Type.STRING, description: "Search query or keyword for back accessory (e.g., 'cape', 'jetpack', 'wings', 'none')" },
                  chest: { type: Type.STRING, description: "Search query or keyword for chest accessory (e.g., 'armor plate', 'logo', 'none')" },
                  weapon: { type: Type.STRING, description: "Search query or keyword for held weapon (e.g., 'sword', 'staff', 'none')" }
                },
                required: ["head", "back", "chest", "weapon"]
              },
              stats: {`;

if (code.includes(oldSchemaProps)) {
    code = code.replace(oldSchemaProps, newSchemaProps);
}

const oldRequired = `required: ["id", "name", "description", "alignment", "primaryColor", "accentColor", "headColor", "gloveColor", "feetColor", "hasCape", "hasCowlEars", "chestLogo", "emblemColor", "stats", "power", "fightingStyle"]`;
const newRequired = `required: ["id", "name", "description", "alignment", "primaryColor", "accentColor", "headColor", "gloveColor", "feetColor", "hasCape", "hasCowlEars", "chestLogo", "emblemColor", "equipmentSlots", "stats", "power", "fightingStyle"]`;

if (code.includes(oldRequired)) {
    code = code.replace(oldRequired, newRequired);
}

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts with equipmentSlots schema");
