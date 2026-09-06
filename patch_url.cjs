const fs = require('fs');

const code = fs.readFileSync('src/game.ts', 'utf8');

const targetFunction = `  loadCustomModel(file: File, isArena: boolean = false) {
    const url = URL.createObjectURL(file);
    const extension = file.name.split('.').pop()?.toLowerCase();`;

const replacement = `  loadModelFromURL(url: string, extension: string, targetPlayer: 'P1' | 'P2' = 'P1') {
    const onLoad = (object: any) => {
      let model = object.scene || object;
      model.scale.set(1.5, 1.5, 1.5);
      
      const player = targetPlayer === 'P1' ? this.player1 : this.player2;
      player.group.add(model);
      player.customModel = model;
      
      // Basic bone mapping heuristic (simplified)
      model.traverse((child: any) => {
         if (child.isMesh) {
             child.castShadow = true;
             child.receiveShadow = true;
         }
         if (child.isBone) {
            const n = child.name.toLowerCase();
            let bodyName = null;
            if (n.includes('head')) bodyName = 'head';
            else if (n.includes('spine') || n.includes('torso') || n.includes('chest')) bodyName = 'torso';
            else if (n.includes('pelvis') || n.includes('hips')) bodyName = 'pelvis';
            else if (n.includes('left') && n.includes('arm')) bodyName = 'lArm';
            else if (n.includes('right') && n.includes('arm')) bodyName = 'rArm';
            else if (n.includes('left') && n.includes('leg')) bodyName = 'lThigh';
            else if (n.includes('right') && n.includes('leg')) bodyName = 'rThigh';
            
            if (bodyName && player.bodies.has(bodyName)) {
                // Approximate binding
                player.customBoneMap.push({
                   bone: child,
                   bodyName: bodyName,
                   offsetMatrix: new THREE.Matrix4()
                });
            }
         }
      });
      
      player.bones.forEach((mesh: THREE.Mesh) => mesh.visible = false);
      this.updateUI({ debugMsg: \`Loaded model from \${url} onto \${targetPlayer}\` });
    };

    if (extension === 'glb' || extension === 'gltf') {
       const loader = new GLTFLoader();
       const dracoLoader = new DRACOLoader();
       dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
       loader.setDRACOLoader(dracoLoader);
       loader.load(url, onLoad, undefined, (e) => {
           console.error(e);
           this.updateUI({ debugMsg: \`Error loading model: \${(e as Error)?.message || 'Unknown'}\` });
       });
    }
  }

  loadCustomModel(file: File, isArena: boolean = false) {
    const url = URL.createObjectURL(file);
    const extension = file.name.split('.').pop()?.toLowerCase();`;

if (code.includes('loadCustomModel(file: File')) {
    fs.writeFileSync('src/game.ts', code.replace(targetFunction, replacement));
    console.log("Patched game.ts successfully");
} else {
    console.log("Could not find target string in game.ts");
}
