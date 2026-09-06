const fs = require('fs');
let code = fs.readFileSync('src/game.ts', 'utf8');

const loaderImport = `import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';\n`;
if (!code.includes("GLTFLoader")) {
    code = code.replace("import * as THREE from 'three';", "import * as THREE from 'three';\n" + loaderImport);
}

const rigClass = `
export class CharacterRigCustomizer {
  private loader: GLTFLoader;

  constructor() {
    this.loader = new GLTFLoader();
  }

  public async attachCustomizationPiece(
    characterGroup: THREE.Group, 
    gltfUrl: string
  ): Promise<void> {
    this.loader.load(gltfUrl, (gltf) => {
      const itemMesh = gltf.scene.children[0] as THREE.Mesh;
      
      const metadata = gltf.scene.userData;
      const targetSocketName = gltf.scene.userData.mPlusTargetSocket || 'Head_Socket';

      let targetBoneNode: THREE.Object3D | null = null;
      characterGroup.traverse((child) => {
        if (child.isObject3D && (child.name === targetSocketName || child.name === 'head' || child.name.includes('Head'))) {
          targetBoneNode = child;
        }
      });

      if (targetBoneNode) {
        const oldEquipped = (targetBoneNode as THREE.Object3D).getObjectByName(\`equipped_item_in_\${targetSocketName}\`);
        if (oldEquipped) (targetBoneNode as THREE.Object3D).remove(oldEquipped);

        itemMesh.name = \`equipped_item_in_\${targetSocketName}\`;
        itemMesh.position.set(0, 0, 0);
        itemMesh.rotation.set(0, 0, 0);
        itemMesh.scale.set(1, 1, 1);

        (targetBoneNode as THREE.Object3D).add(itemMesh);
        console.log(\`Success! Attached custom model component natively inside skeletal frame bone slot: \${targetSocketName}\`);
      } else {
        console.warn(\`Critical Error: Target bone rig coordinate node '\${targetSocketName}' was not located inside this character geometry template.\`);
      }
    });
  }
}
`;

if (!code.includes("class CharacterRigCustomizer")) {
    const importMatch = code.match(/import .* from 'three\/examples\/jsm\/loaders\/GLTFLoader';/);
    if (importMatch) {
        code = code.replace(importMatch[0], importMatch[0] + "\n" + rigClass);
    } else {
        code = rigClass + "\n" + code;
    }
}

if (!code.includes("public rigCustomizer: CharacterRigCustomizer")) {
    code = code.replace("export class GameEngine {", "export class GameEngine {\n  public rigCustomizer: CharacterRigCustomizer;\n");
    code = code.replace("constructor(container: HTMLElement) {", "constructor(container: HTMLElement) {\n    this.rigCustomizer = new CharacterRigCustomizer();\n");
}

fs.writeFileSync('src/game.ts', code);
console.log("Patched game.ts with CharacterRigCustomizer");
