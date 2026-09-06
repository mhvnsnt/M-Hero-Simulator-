
import * as THREE from 'three';

export class FACSController {
    mesh: THREE.SkinnedMesh | null = null;
    dictionary: { [key: string]: number } = {};
    
    bind(model: THREE.Object3D) {
        // Recursively find the first SkinnedMesh with morph targets
        model.traverse((child: any) => {
            if (child.isMesh && child.morphTargetDictionary) {
                this.mesh = child;
                this.dictionary = child.morphTargetDictionary;
                console.log("FACS bound to:", child.name, "with", Object.keys(this.dictionary).length, "morphs");
            }
        });
    }

    setMorph(name: string, value: number) {
        if (this.mesh && this.dictionary[name] !== undefined && this.mesh.morphTargetInfluences) {
            this.mesh.morphTargetInfluences[this.dictionary[name]] = Math.max(0, Math.min(1, value));
        }
    }

    updateAutonomic(healthRatio: number, staminaRatio: number, stress: number) {
        if (!this.mesh) return;
        
        // Open-source ARKit / ReadyPlayerMe standard blendshapes
        const exhaust = Math.max(0, 1.0 - staminaRatio);
        this.setMorph('jawOpen', exhaust * 0.8);
        this.setMorph('mouthOpen', exhaust * 0.8);
        this.setMorph('mouthSmile', healthRatio > 0.8 ? 0.5 : 0.0);
        
        const pain = Math.max(0, 1.0 - healthRatio);
        this.setMorph('browInnerUp', pain);
        this.setMorph('browDownLeft', pain * 0.5);
        this.setMorph('browDownRight', pain * 0.5);
        this.setMorph('eyeSquintLeft', pain * 0.8);
        this.setMorph('eyeSquintRight', pain * 0.8);
        
        // Stress mapping
        if (stress > 80) {
            this.setMorph('eyeWideLeft', 0.8);
            this.setMorph('eyeWideRight', 0.8);
        } else {
            this.setMorph('eyeWideLeft', 0.0);
            this.setMorph('eyeWideRight', 0.0);
        }
    }
}
