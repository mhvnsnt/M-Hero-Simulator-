import * as THREE from 'three';

export class VFXEngine {
  scene: THREE.Scene;
  particleSystems: { 
      points: THREE.Points, 
      material: THREE.ShaderMaterial, 
      life: number, 
      maxLife: number,
      velocities: Float32Array 
  }[] = [];

  // Default spark shader (can be overridden by ingested shaders)
  sparkVertexShader = `
    attribute vec3 velocity;
    varying vec4 vColor;
    uniform float uTime;
    void main() {
      vec3 pos = position + velocity * uTime * 2.0;
      // Gravity effect
      pos.y -= uTime * uTime * 9.8; 
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      gl_PointSize = (10.0 / -mvPosition.z) * (1.0 - uTime);
      
      // Interpolate color based on time
      vColor = vec4(1.0, 0.8 - uTime, uTime * 0.2, 1.0 - uTime);
    }
  `;

  sparkFragmentShader = `
    varying vec4 vColor;
    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      
      gl_FragColor = vColor * (1.0 - dist * 2.0);
    }
  `;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawnImpact(position: THREE.Vector3, color: number = 0xffa500, count: number = 20) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      // Spherical random burst
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = 2.0 + Math.random() * 3.0;

      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.cos(phi) * speed + 2.0; // Upward bias
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const material = new THREE.ShaderMaterial({
      vertexShader: this.sparkVertexShader,
      fragmentShader: this.sparkFragmentShader,
      uniforms: {
        uTime: { value: 0.0 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.particleSystems.push({
      points,
      material,
      life: 0,
      maxLife: 1.0, // 1 second life
      velocities
    });
  }

  update(dt: number) {
    for (let i = this.particleSystems.length - 1; i >= 0; i--) {
      const ps = this.particleSystems[i];
      ps.life += dt;
      
      if (ps.life >= ps.maxLife) {
        this.scene.remove(ps.points);
        ps.points.geometry.dispose();
        ps.material.dispose();
        this.particleSystems.splice(i, 1);
      } else {
        ps.material.uniforms.uTime.value = ps.life / ps.maxLife;
      }
    }
  }
}


// Interface wrapper mapping to compiled Effekseer WASM library distribution targets
declare const effekseer: any;

export class EffekseerVfxEngine {
  private context: any;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private loadedEffects: Map<string, any> = new Map();

  constructor(glContext: WebGLRenderingContext, scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;

    // 1. Initialize official Effekseer WebGL Engine Runtime
    if (typeof effekseer !== 'undefined') {
      effekseer.initRuntime('/libs/effekseer.wasm', () => {
        this.context = effekseer.createContext();
        this.context.init(glContext);
        console.log("Effekseer 3D VFX System Context running flawlessly.");
      }, () => {
        console.warn("Effekseer failed loading WASM binary. Diverting to native WebGL particles.");
        this.context = null; // Clean fallback to prevent rendering freezes
      });
    } else {
      console.warn("Effekseer global object missing. Suppressing VFX to allow normal 3D rendering.");
      this.context = null;
    }
  }

  public async preloadEffect(effectId: string, effectUrl: string): Promise<void> {
    if (!this.context) return;
    
    return new Promise((resolve, reject) => {
      this.context.loadEffect(effectUrl, 1.0, (effect: any) => {
        this.loadedEffects.set(effectId, effect);
        resolve();
      }, () => reject(new Error(`Failed to download VFX path: ${effectUrl}`)));
    });
  }

  public triggerEffect(effectId: string, anchorPosition: THREE.Vector3, scale: number = 1.0): number {
    const effect = this.loadedEffects.get(effectId);
    if (!this.context || !effect) return -1;

    const handle = this.context.play(effect, anchorPosition.x, anchorPosition.y, anchorPosition.z);
    this.context.setScale(handle, scale, scale, scale);
    return handle;
  }

  public updateEffectTransform(handle: number, currentPos: THREE.Vector3, currentRotation?: THREE.Matrix4): void {
    if (!this.context || handle === -1) return;
    this.context.setLocation(handle, currentPos.x, currentPos.y, currentPos.z);
    
    if (currentRotation) {
      const elements = currentRotation.elements;
      this.context.setRotationMatrix(handle, ...elements);
    }
  }

  public renderVfx(deltaTime: number): void {
    if (!this.context) return;

    const camMatrix = this.camera.matrixWorldInverse.elements;
    const projMatrix = this.camera.projectionMatrix.elements;

    this.context.setCameraMatrix(...camMatrix);
    this.context.setProjectionMatrix(...projMatrix);
    
    this.context.update(deltaTime * 60.0);
    this.context.draw();
  }
}
