const fs = require('fs');
let code = fs.readFileSync('src/game.ts', 'utf8');

const target = `     setTimeout(() => {
        if (!this.active) return;
        this.scene.remove(projMesh);
        projGeo.dispose();
        projMat.dispose();
        this.world.removeRigidBody(projBody);
        
        let idx = this.activeProjectiles.indexOf(activeProj);
        if (idx > -1) this.activeProjectiles.splice(idx, 1);
     }, 1500);`;

const insert = `     setTimeout(() => {
        if (!this.active) return;
        this.scene.remove(projMesh);
        projGeo.dispose();
        projMat.dispose();
        
        let idx = this.activeProjectiles.indexOf(activeProj);
        if (idx > -1) {
            try { this.world.removeRigidBody(projBody); } catch(e) {}
            this.activeProjectiles.splice(idx, 1);
        }
     }, 1500);`;

code = code.replace(target, insert);
fs.writeFileSync('src/game.ts', code, 'utf8');
