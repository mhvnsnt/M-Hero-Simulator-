
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
        const oldEquipped = (targetBoneNode as THREE.Object3D).getObjectByName(`equipped_item_in_${targetSocketName}`);
        if (oldEquipped) (targetBoneNode as THREE.Object3D).remove(oldEquipped);

        itemMesh.name = `equipped_item_in_${targetSocketName}`;
        itemMesh.position.set(0, 0, 0);
        itemMesh.rotation.set(0, 0, 0);
        itemMesh.scale.set(1, 1, 1);

        (targetBoneNode as THREE.Object3D).add(itemMesh);
        console.log(`Success! Attached custom model component natively inside skeletal frame bone slot: ${targetSocketName}`);
      } else {
        console.warn(`Critical Error: Target bone rig coordinate node '${targetSocketName}' was not located inside this character geometry template.`);
      }
    });
  }
}

import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;


export class ThirdPersonCamera {
    private camera: THREE.PerspectiveCamera;
    private target: THREE.Object3D | null = null;
    private currentPosition = new THREE.Vector3();
    private currentLookat = new THREE.Vector3();
    
    public radius = 5.0;
    public theta = 0; // Horizontal
    public phi = Math.PI / 2.5; // Vertical (radians)
    private actualRadius = 5.0; // Dynamic radius for SpringArm

    constructor(camera: THREE.PerspectiveCamera) {
        this.camera = camera;
    }

    public setTarget(target: THREE.Object3D) {
        this.target = target;
        this.target.getWorldPosition(this.currentLookat);
        this.currentPosition.copy(this.camera.position);
    }

    public update(dt: number, orbitDelta: {x: number, y: number}, world?: any) {
        if (!this.target) return;
        
        // Apply orbit changes from Nipple.js (right stick)
        this.theta -= orbitDelta.x * dt * 2.0;
        this.phi -= orbitDelta.y * dt * 2.0;
        
        // Clamp phi to prevent flipping
        this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi));

        const targetPos = new THREE.Vector3();
        this.target.getWorldPosition(targetPos);
        targetPos.y += 1.2; // Aim at head/shoulders

        // Default Spherical to Cartesian relative to target
        const offset = new THREE.Vector3(
            Math.sin(this.phi) * Math.sin(this.theta),
            Math.cos(this.phi),
            Math.sin(this.phi) * Math.cos(this.theta)
        ).normalize();
        
        // SpringArm Raycast using Rapier
        this.actualRadius = this.radius;
        if (world) {
            // FIX 2026-10-09: rapier3d-compat exposes Ray at the module top level,
            // not on world.math. The old call threw every frame and killed the
            // render loop (black viewport).
            const ray = new RAPIER.Ray(targetPos, offset);
            // Raycast against solid geometry
            const maxToi = this.radius;
            const solid = true;
            const hit = world.castRay(ray, maxToi, solid);
            
            if (hit != null) {
                // We hit something! Pull camera in closer to avoid clipping
                this.actualRadius = Math.max(0.5, hit.toi - 0.2); // 0.2 margin
            }
        }

        const idealPos = targetPos.clone().add(offset.multiplyScalar(this.actualRadius));

        // Smooth LERP (Spring Arm effect)
        const t = 1.0 - Math.pow(0.001, dt);
        this.currentPosition.lerp(idealPos, t);
        this.currentLookat.lerp(targetPos, t);

        this.camera.position.copy(this.currentPosition);
        this.camera.lookAt(this.currentLookat);
    }
}

export class ChunkManager {
    private scene: THREE.Scene;
    private world: RAPIER.World;
    private chunkSize = 40;
    private loadedChunks = new Map<string, { group: THREE.Group, bodies: RAPIER.RigidBody[] }>();
    
    constructor(scene: THREE.Scene, world: RAPIER.World) {
        this.scene = scene;
        this.world = world;
    }

    public update(playerPos: THREE.Vector3) {
        const cx = Math.floor(playerPos.x / this.chunkSize);
        const cz = Math.floor(playerPos.z / this.chunkSize);

        const neededChunks = new Set<string>();
        // 3x3 Matrix loading around player
        for (let x = -1; x <= 1; x++) {
            for (let z = -1; z <= 1; z++) {
                neededChunks.add(`${cx + x},${cz + z}`);
            }
        }

        // Unload old
        for (const [key, chunk] of this.loadedChunks.entries()) {
            if (!neededChunks.has(key)) {
                this.scene.remove(chunk.group);
                chunk.bodies.forEach(b => this.world.removeRigidBody(b));
                this.loadedChunks.delete(key);
            }
        }

        // Load new
        for (const key of neededChunks) {
            if (!this.loadedChunks.has(key)) {
                this.loadChunk(key);
            }
        }
    }

    private loadChunk(key: string) {
        const [cx, cz] = key.split(',').map(Number);
        const group = new THREE.Group();
        const bodies: RAPIER.RigidBody[] = [];
        
        const offsetX = cx * this.chunkSize;
        const offsetZ = cz * this.chunkSize;

        // Ground Plane for the chunk
        const groundGeo = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize);
        const groundMat = new THREE.MeshStandardMaterial({ 
            color: (cx + cz) % 2 === 0 ? 0x2d3a3a : 0x223333,
            roughness: 0.9,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(offsetX + this.chunkSize/2, 0, offsetZ + this.chunkSize/2);
        ground.receiveShadow = true;
        group.add(ground);

        // Ground Physics
        const groundBody = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(offsetX + this.chunkSize/2, 0, offsetZ + this.chunkSize/2));
        this.world.createCollider(RAPIER.ColliderDesc.cuboid(this.chunkSize/2, 0.1, this.chunkSize/2), groundBody);
        bodies.push(groundBody);

        // Procedural City Buildings (Low-poly abstraction)
        // Pseudo-random based on chunk coordinates
        const seed = Math.abs(cx * 73856093 ^ cz * 19349663);
        const buildingCount = (seed % 6); // 0 to 5 buildings per chunk
        
        for(let i=0; i<buildingCount; i++) {
            const bw = 3 + ((seed * (i+1)) % 5);
            const bh = 5 + ((seed * (i+2)) % 25);
            const bd = 3 + ((seed * (i+3)) % 5);
            
            const px = offsetX + 5 + ((seed * (i+4)) % (this.chunkSize - 10));
            const pz = offsetZ + 5 + ((seed * (i+5)) % (this.chunkSize - 10));

            const bGeo = new THREE.BoxGeometry(bw, bh, bd);
            const bMat = new THREE.MeshStandardMaterial({ 
                color: (i % 2 === 0) ? 0x444455 : 0x555566, 
                roughness: 0.8,
                metalness: 0.2
            });
            const bMesh = new THREE.Mesh(bGeo, bMat);
            bMesh.position.set(px, bh/2, pz);
            bMesh.castShadow = true;
            bMesh.receiveShadow = true;
            group.add(bMesh);

            const bBody = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(px, bh/2, pz));
            this.world.createCollider(RAPIER.ColliderDesc.cuboid(bw/2, bh/2, bd/2), bBody);
            bodies.push(bBody);
        }

        this.scene.add(group);
        this.loadedChunks.set(key, { group, bodies });
    }
}


export class KinematicPlayerController {
  public mesh: THREE.Group;
  public characterController: RAPIER.KinematicCharacterController;
  public rigidBody: RAPIER.RigidBody;
  public collider: RAPIER.Collider;
  private targetPosition = new THREE.Vector3();
  private targetRotation = new THREE.Quaternion();

  private positionLerpFactor = 15.0; 
  private rotationLerpFactor = 10.0;
  public isFlying = false;

  constructor(mesh: THREE.Group, world: RAPIER.World, startPos: THREE.Vector3) {
    this.mesh = mesh;
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(startPos.x, startPos.y, startPos.z);
    this.rigidBody = world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.capsule(0.8, 0.4);
    this.collider = world.createCollider(colliderDesc, this.rigidBody);
    this.characterController = world.createCharacterController(0.1);
    this.characterController.setApplyImpulsesToDynamicBodies(true);
    this.characterController.enableAutostep(0.4, 0.2, true);
    this.characterController.enableSnapToGround(0.3);
  }

  public setFlightMode(enabled: boolean): void {
    this.isFlying = enabled;
    // rapier3d-compat 0.19: enableSnapToGround takes a snap distance (number).
    // Pass 0 while flying to disable ground snapping.
    this.characterController.enableSnapToGround(enabled ? 0.3 : 0);
  }

  public updateController(deltaTime: number, inputVector: THREE.Vector3, cameraQuaternion: THREE.Quaternion): void {
    const movementDirection = inputVector.clone().applyQuaternion(cameraQuaternion);
    if (!this.isFlying) movementDirection.y = 0;
    movementDirection.normalize();

    const speed = this.isFlying ? 25.0 : 8.0;
    const velocity = movementDirection.multiplyScalar(speed * deltaTime);

    if (!this.isFlying) velocity.y -= 9.81 * deltaTime;

    this.characterController.computeColliderMovement(this.collider, velocity);
    const correctedMovement = this.characterController.computedMovement();

    const currentTranslation = this.rigidBody.translation();
    const nextX = currentTranslation.x + correctedMovement.x;
    const nextY = currentTranslation.y + correctedMovement.y;
    const nextZ = currentTranslation.z + correctedMovement.z;
    
    this.rigidBody.setNextKinematicTranslation({ x: nextX, y: nextY, z: nextZ });
    this.targetPosition.set(nextX, nextY, nextZ);

    if (inputVector.lengthSq() > 0.001) {
      const targetAngle = Math.atan2(movementDirection.x, movementDirection.z);
      this.targetRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetAngle);
    }

    this.mesh.position.lerp(this.targetPosition, this.positionLerpFactor * deltaTime);
    this.mesh.quaternion.slerp(this.targetRotation, this.rotationLerpFactor * deltaTime);
  }
}

import { VFXEngine, EffekseerVfxEngine } from './vfx';
import { FACSController } from './facs';
import RAPIER from '@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { ProceduralAudio } from './ProceduralAudio';
import { SuperheroConfig } from './types';
import { PoseTuneEngine } from './physics/PoseTuneEngine';
import { JointMotors } from './physics/JointMotors';
import { GrappleMatrix } from './physics/GrappleMatrix';
import { FootPlantIK } from './physics/FootPlantIK';
import { BalancePolish } from './physics/BalancePolish';

/**
 * Default fighter presets — ORIGINAL placeholder hero identities
 * (2026-10-09 de-IP pass: borrowed DC/Marvel labels removed per owner
 * directive). The game's full identity gets defined later; these are clean,
 * lawful placeholder roster slots only — no invented canon.
 */
export const NIGHTGUARD_PRESET: SuperheroConfig = {
  id: 'nightguard',
  name: 'Nightguard',
  description: "Nocturnal street tactician. Heavy tactical armor, a gliding cape, and precision gadgets.",
  primaryColor: '0x2a2a2a',
  accentColor: '0x111111',
  headColor: '0x111111',
  gloveColor: '0x111111',
  feetColor: '0x111111',
  hasCape: true,
  capeColor: '0x111111',
  hasCowlEars: true,
  chestLogo: 'wings',
  emblemColor: '0xfdd835',
  stats: { maxHealth: 1300, stamina: 110, speed: 1.1, gravity: 1.0 },
  power: { name: 'Crescent Throw', type: 'projectile', projectileColor: '0x212121', damage: 160, cooldown: 1200, soundPitch: 400 }
};

export const SKYWIRE_PRESET: SuperheroConfig = {
  id: 'skywire',
  name: 'Skywire',
  description: 'Hyper-agile urban acrobat. Grapple-line zips and aerial agility with quick reflexes.',
  primaryColor: '0xd32f2f',
  accentColor: '0x1565c0',
  headColor: '0xd32f2f',
  gloveColor: '0xd32f2f',
  feetColor: '0xd32f2f',
  hasCape: false,
  hasCowlEars: false,
  chestLogo: 'orb',
  emblemColor: '0x111111',
  stats: { maxHealth: 1100, stamina: 140, speed: 1.4, gravity: 0.65 },
  power: { name: 'Skyline Zip', type: 'pull', projectileColor: '0xffffff', damage: 120, cooldown: 1800, soundPitch: 750 }
};

export class GameEngine {
  public effekseerVfx: EffekseerVfxEngine | null = null;
  public bvhCombat: BvhCombatManager | null = null;

  public rigCustomizer: CharacterRigCustomizer;

  public tpCamera: ThirdPersonCamera | null = null;
  public chunkManager: ChunkManager | null = null;

  public virtualMove = { x: 0, y: 0 };
  public virtualOrbit = { x: 0, y: 0 };

  handleVirtualMove(vec: { x: number; y: number }) {
      this.virtualMove = vec;
  }
  handleVirtualOrbit(vec: { x: number; y: number }) {
      this.virtualOrbit = vec;
  }

  container: HTMLElement;
  updateUI: (state: any) => void;
  active: boolean = true;
  
  audio: ProceduralAudio;
  audioStarted: boolean = false;

  scene!: THREE.Scene;
  vfx!: VFXEngine;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  world!: RAPIER.World;

  player1: any;
  player2: any;
  keys: Record<string, boolean>;
  joystick: { x: number; y: number } = { x: 0, y: 0 };

  lastTime: number = 0;

  rafId: number = 0;

  particles: { mesh: THREE.Object3D, vel: THREE.Vector3, life: number, isLight: boolean }[] = [];
  weapons: { mesh: THREE.Mesh, body: RAPIER.RigidBody, isTable?: boolean, broken?: boolean }[] = [];
  activeProjectiles: { mesh: THREE.Mesh, body: RAPIER.RigidBody, damage: number, born: number }[] = [];
  player1Hero: SuperheroConfig | null = null;
  player2Hero: SuperheroConfig | null = null;
  shakeIntensity: number = 0;
  poseTuner!: PoseTuneEngine;
  jointMotors!: JointMotors;
  grappleMatrix!: GrappleMatrix;
  footPlantIK!: FootPlantIK;
  balancePolish!: BalancePolish;

  constructor(container: HTMLElement, updateUI: (state: any) => void, keys: Record<string, boolean>) {
    this.container = container;
    this.updateUI = updateUI;
    this.keys = keys;
    this.audio = new ProceduralAudio();
    
    const startAudio = () => {
        if (!this.audioStarted && this.active) {
            this.audioStarted = true;
            this.audio.start();
            window.removeEventListener('click', startAudio);
            window.removeEventListener('keydown', startAudio);
        }
    };
    window.addEventListener('click', startAudio);
    window.addEventListener('keydown', startAudio);
  }

  async start() {
    await RAPIER.init();
    if (!this.active) return;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0b);
    this.scene.fog = new THREE.FogExp2(0x0a0a0b, 0.04);

    let width = window.innerWidth || 1;
    let height = window.innerHeight || 1;
    let initialAspect = width / height;
    if (isNaN(initialAspect) || !isFinite(initialAspect)) initialAspect = 1;
    this.camera = new THREE.PerspectiveCamera(60, initialAspect, 0.1, 100);
    this.camera.position.set(0, 1.9, 6);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // Try to get GL context for Effekseer
    try {
        const glContext = this.renderer.getContext();
        this.effekseerVfx = new EffekseerVfxEngine(glContext, this.scene, this.camera);
        this.effekseerVfx.preloadEffect('laser', '/assets/laser.efk').catch(e => console.warn(e));
    } catch(e) {}
    
    
    if (!this.active) return;
    this.container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    this.scene.add(dirLight);

    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.vfx = new VFXEngine(this.scene);
    this.poseTuner = new PoseTuneEngine();
    this.jointMotors = new JointMotors(null);
    this.grappleMatrix = new GrappleMatrix(this.world, RAPIER);
    this.footPlantIK = new FootPlantIK();
    this.balancePolish = new BalancePolish(this.world);

    this.createFloor();
    this.spawnTable(0, 0.85, 2.5);
    this.spawnTable(-2.5, 0.85, -2.5);
    this.spawnChair(2.0, 0.85, -2.0);

    this.player1 = this.createFighter(-1.8, 1.0, 0, 0x4488ff, 0x00020005);
    this.player2 = this.createFighter(1.8, 1.0, 0, 0xff4444, 0x00040003);

    // Apply default hero presets (original placeholder identities)
    this.applySuperheroStyle(this.player1, NIGHTGUARD_PRESET);
    this.applySuperheroStyle(this.player2, SKYWIRE_PRESET);
    
    // Automatically load the ingested open-source model onto Player 2
    setTimeout(() => {
        this.loadModelFromURL('/models/RobotExpressive.glb', 'glb', 'P2');
    }, 1000);

    window.addEventListener('resize', this.onResize);

    this.lastTime = performance.now();
    this.animate(this.lastTime);
  }

  onResize = () => {
    if (!this.camera || !this.renderer) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    
    // In iframe sometimes it can be 0, avoid NaN aspect ratio
    if (width === 0) width = 1;
    if (height === 0) height = 1;

    this.camera.aspect = width / height;
    if (isNaN(this.camera.aspect) || !isFinite(this.camera.aspect)) this.camera.aspect = 1;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  physicsSafeSet(body: any, type: string, val: any) {
    if (!body || !val) return;
    try {
      if (type === 'linvel' || type === 'angvel' || type === 'impulse' || type === 'torqueImpulse' || type === 'translation') {
        if (!Number.isFinite(val.x) || !Number.isFinite(val.y) || !Number.isFinite(val.z)) return;
      }
      if (type === 'linvel') body.setLinvel(val, true);
      else if (type === 'angvel') body.setAngvel(val, true);
      else if (type === 'translation') body.setTranslation(val, true);
      else if (type === 'impulse') body.applyImpulse(val, true);
      else if (type === 'torqueImpulse') body.applyTorqueImpulse(val, true);
      else if (type === 'rotation') {
        if (!Number.isFinite(val.x) || !Number.isFinite(val.y) || !Number.isFinite(val.z) || !Number.isFinite(val.w)) return;
        body.setRotation(val, true);
      }
    } catch(e) {}
  }

  createFloor() {
    this.chunkManager = new ChunkManager(this.scene, this.world);
    
    // Also initialize the TP Camera if it doesn't exist
    if (!this.tpCamera && this.camera) {
        this.tpCamera = new ThirdPersonCamera(this.camera);
    }
  }

  spawnTable(x: number, y: number, z: number) {
     const tableMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
     
     // Single Rigid Body for the table
     const tableBody = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y + 0.8, z).setAdditionalMass(5.0).setCcdEnabled(true).setLinearDamping(0.5).setAngularDamping(2.0));

     // Top Mesh and Collider
     const topMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 1.2), tableMat);
     topMesh.castShadow = true;
     
     this.world.createCollider(RAPIER.ColliderDesc.cuboid(1.0, 0.05, 0.6).setCollisionGroups(0x0001FFFF).setSolverGroups(0x0001FFFF), tableBody);
     
     const meshesToSync: {mesh: THREE.Mesh, offsetX: number, offsetY: number, offsetZ: number}[] = [];
     meshesToSync.push({mesh: topMesh, offsetX: 0, offsetY: 0, offsetZ: 0});

     // Legs Meshes and Colliders
     const offsets = [ [0.9, 0.5], [-0.9, 0.5], [0.9, -0.5], [-0.9, -0.5] ];
     offsets.forEach(off => {
        const legMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), tableMat);
        legMesh.castShadow = true;
        
        // Leg collider offset from table center
        const legColDesc = RAPIER.ColliderDesc.cuboid(0.05, 0.4, 0.05).setTranslation(off[0], -0.45, off[1]).setCollisionGroups(0x0001FFFF).setSolverGroups(0x0001FFFF);
        this.world.createCollider(legColDesc, tableBody);
        
        meshesToSync.push({mesh: legMesh, offsetX: off[0], offsetY: -0.45, offsetZ: off[1]});
     });

     // Group to hold meshes together
     const group = new THREE.Group();
     meshesToSync.forEach(m => {
         m.mesh.position.set(m.offsetX, m.offsetY, m.offsetZ);
         group.add(m.mesh);
     });
     group.position.set(x, y + 0.8, z);
     this.scene.add(group);

     this.weapons.push({ mesh: group as unknown as THREE.Mesh, body: tableBody, isTable: true, broken: false });
  }

  spawnChair(x: number, y: number, z: number) {
     const chairMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.4, metalness: 0.8 });
     // Single Rigid Body for the chair
     const chairBody = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y + 0.4, z).setAdditionalMass(3.0).setCcdEnabled(true).setLinearDamping(0.5).setAngularDamping(1.0));

     const meshesToSync: {mesh: THREE.Mesh, offsetX: number, offsetY: number, offsetZ: number}[] = [];
     
     // Seat
     const seatMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.5), chairMat);
     seatMesh.castShadow = true;
     this.world.createCollider(RAPIER.ColliderDesc.cuboid(0.3, 0.025, 0.25).setCollisionGroups(0x0001FFFF).setSolverGroups(0x0001FFFF), chairBody);
     meshesToSync.push({mesh: seatMesh, offsetX: 0, offsetY: 0, offsetZ: 0});
     
     // Backrest
     const backMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.05), chairMat);
     backMesh.castShadow = true;
     this.world.createCollider(RAPIER.ColliderDesc.cuboid(0.3, 0.25, 0.025).setTranslation(0, 0.25, -0.225).setCollisionGroups(0x0001FFFF).setSolverGroups(0x0001FFFF), chairBody);
     meshesToSync.push({mesh: backMesh, offsetX: 0, offsetY: 0.25, offsetZ: -0.225});

     // Legs
     const legOffsets = [ [0.25, 0.2], [-0.25, 0.2], [0.25, -0.2], [-0.25, -0.2] ];
     legOffsets.forEach(off => {
        const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 4), chairMat);
        legMesh.castShadow = true;
        const legColDesc = RAPIER.ColliderDesc.cylinder(0.225, 0.02).setTranslation(off[0], -0.225, off[1]).setCollisionGroups(0x0001FFFF).setSolverGroups(0x0001FFFF);
        this.world.createCollider(legColDesc, chairBody);
        meshesToSync.push({mesh: legMesh, offsetX: off[0], offsetY: -0.225, offsetZ: off[1]});
     });

     const group = new THREE.Group();
     meshesToSync.forEach(m => {
         m.mesh.position.set(m.offsetX, m.offsetY, m.offsetZ);
         group.add(m.mesh);
     });
     group.position.set(x, y + 0.4, z);
     this.scene.add(group);

     this.weapons.push({ mesh: group as unknown as THREE.Mesh, body: chairBody, isTable: false, broken: false });
  }

  spawnHitSparks(pos: THREE.Vector3, isBlock: boolean, intensity: number) {
    const color = isBlock ? 0x44aaff : 0xffaa44;
    const light = new THREE.PointLight(color, 5, 4);
    light.position.copy(pos);
    this.scene.add(light);
    
    this.particles.push({ mesh: light, vel: new THREE.Vector3(), life: 0.15, isLight: true });

    const numSparks = isBlock ? 5 : 15;
    const geo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let i = 0; i < numSparks; i++) {
       const mesh = new THREE.Mesh(geo, mat);
       mesh.position.copy(pos);
       this.scene.add(mesh);
       this.particles.push({
          mesh: mesh,
          vel: new THREE.Vector3((Math.random()-0.5)*9, Math.random()*9 + 2, (Math.random()-0.5)*9),
          life: 0.3 + Math.random()*0.2,
          isLight: false
       });
    }

    this.shakeIntensity = Math.max(this.shakeIntensity, intensity * 0.15);
  }

  updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        if(!p.isLight && (p.mesh as THREE.Mesh).geometry) (p.mesh as THREE.Mesh).geometry.dispose();
        if(!p.isLight && (p.mesh as THREE.Mesh).material) ((p.mesh as THREE.Mesh).material as THREE.Material).dispose();
        if(p.isLight) (p.mesh as THREE.PointLight).dispose();
        this.particles.splice(i, 1);
        continue;
      }
      if (!p.isLight) {
        p.vel.y -= 9.8 * dt * 0.5;
        p.mesh.position.addScaledVector(p.vel, dt);
        const scale = Math.max(0.01, p.life / 0.5);
        p.mesh.scale.setScalar(scale);
      } else {
        (p.mesh as THREE.PointLight).intensity = (p.life / 0.15) * 5;
      }
    }
  }

  createFighter(x: number, y: number, z: number, color: number, collisionGroup: number) {
    const f: any = {
      group: new THREE.Group(),
      bodies: new Map<string, RAPIER.RigidBody>(),
      bones: new Map<string, THREE.Mesh>(),
      origPositions: new Map<string, {x: number, y: number, z: number}>(),
      stamina: 100,
      health: 1000,
      maxHealth: 1000,
      state: 'standing',
      strikePhase: null,
      strikeType: null,
      blockActive: false,
      lastHitTime: 0,
      lastStrike: 0,
      targetZone: 'head',
      combo: 0,
      heldWeapon: null,
      customModel: null,
      customBoneMap: [], // { bone: THREE.Bone, bodyName: string, offsetMatrix: THREE.Matrix4 }
      mixer: null,
      actions: {},
      currentAction: null,
      facs: new FACSController(),
      kinematic: null,
      grappleJoint: null,
      autonomicSaturation: 0,
      metabolicHeat: 0,
      shaderUniforms: []
    };

    this.scene.add(f.group);
    f.group.position.set(x, y, z);
    f.kinematic = new KinematicPlayerController(f.group, this.world, new THREE.Vector3(x, y + 1.2, z));

    const parts = [
      { name: 'pelvis', w: 0.19, h: 0.24, x: 0, y: 0.92, bodyType: 'torso' },
      { name: 'lowerSpine', w: 0.17, h: 0.29, x: 0, y: 1.20, bodyType: 'torso' },
      { name: 'midSpine', w: 0.17, h: 0.27, x: 0, y: 1.48, bodyType: 'torso' },
      { name: 'upperSpine', w: 0.17, h: 0.24, x: 0, y: 1.70, bodyType: 'torso' },
      { name: 'neck', w: 0.10, h: 0.13, x: 0, y: 1.90, bodyType: 'head' },
      { name: 'head', w: 0.135, h: 0.16, x: 0, y: 2.08, bodyType: 'head' },

      { name: 'lClav', w: 0.09, h: 0.13, x: 0.15, y: 1.72, bodyType: 'limb' }, { name: 'lUpperArm', w: 0.09, h: 0.36, x: 0.22, y: 1.55, bodyType: 'limb' },
      { name: 'lLowerArm', w: 0.075, h: 0.30, x: 0.22, y: 1.20, bodyType: 'limb' }, { name: 'lHand', w: 0.1, h: 0.15, x: 0.22, y: 0.98, bodyType: 'glove' },
      { name: 'rClav', w: 0.09, h: 0.13, x: -0.15, y: 1.72, bodyType: 'limb' }, { name: 'rUpperArm', w: 0.09, h: 0.36, x: -0.22, y: 1.55, bodyType: 'limb' },
      { name: 'rLowerArm', w: 0.075, h: 0.30, x: -0.22, y: 1.20, bodyType: 'limb' }, { name: 'rHand', w: 0.1, h: 0.15, x: -0.22, y: 0.98, bodyType: 'glove' },

      { name: 'lThigh', w: 0.11, h: 0.48, x: 0.12, y: 0.78, bodyType: 'limb' }, { name: 'lCalf', w: 0.095, h: 0.44, x: 0.12, y: 0.38, bodyType: 'limb' }, { name: 'lFoot', w: 0.09, h: 0.15, x: 0.12, y: 0.11, bodyType: 'foot' },
      { name: 'rThigh', w: 0.11, h: 0.48, x: -0.12, y: 0.78, bodyType: 'limb' }, { name: 'rCalf', w: 0.095, h: 0.44, x: -0.12, y: 0.38, bodyType: 'limb' }, { name: 'rFoot', w: 0.09, h: 0.15, x: -0.12, y: 0.11, bodyType: 'foot' }
    ];

    parts.forEach((p, idx) => {
      const geo = new THREE.CapsuleGeometry(p.w, p.h, 10, 20);
      let matColor = color;
      if (p.bodyType === 'head') matColor = 0xffe0c0;
      if (p.bodyType === 'glove') matColor = color === 0x4488ff ? 0x2244ff : 0xff2222;
      const mat = new THREE.MeshStandardMaterial({ 
        color: matColor, 
        roughness: p.bodyType === 'glove' ? 0.3 : 0.6,
        metalness: 0.1 
      });
      
      const uniforms = {
         metabolicHeat: { value: 0.0 },
         volumetricBulgeRadius: { value: 0.0 },
         volumetricBulgeCenter: { value: new THREE.Vector3() },
         volumetricBulgeForce: { value: 0.0 }
      };
      f.shaderUniforms.push(uniforms);

      mat.onBeforeCompile = (shader) => {
         shader.uniforms.metabolicHeat = uniforms.metabolicHeat;
         shader.uniforms.volumetricBulgeRadius = uniforms.volumetricBulgeRadius;
         shader.uniforms.volumetricBulgeCenter = uniforms.volumetricBulgeCenter;
         shader.uniforms.volumetricBulgeForce = uniforms.volumetricBulgeForce;

         shader.vertexShader = `
           uniform float volumetricBulgeRadius;
           uniform vec3 volumetricBulgeCenter;
           uniform float volumetricBulgeForce;
         ` + shader.vertexShader;

         shader.vertexShader = shader.vertexShader.replace(
            `#include <begin_vertex>`,
            `
            #include <begin_vertex>
            
            // Volumetric Bulge for deep physical internal distension
            if (volumetricBulgeForce > 0.0) {
               vec4 worldPosition = modelMatrix * vec4(position, 1.0);
               float dist = distance(worldPosition.xyz, volumetricBulgeCenter);
               if (dist < volumetricBulgeRadius) {
                  float intensity = 1.0 - (dist / volumetricBulgeRadius);
                  // Push vertex along normal
                  transformed += normal * intensity * volumetricBulgeForce;
               }
            }
            `
         );

         shader.fragmentShader = `
           uniform float metabolicHeat;
         ` + shader.fragmentShader;

         shader.fragmentShader = shader.fragmentShader.replace(
            `#include <roughnessmap_fragment>`,
            `
            #include <roughnessmap_fragment>
            // Thermodynamic Exudation: Metabolic heat drops roughness (makes it sweat-slicked)
            roughnessFactor = mix(roughnessFactor, 0.05, metabolicHeat * 0.8);
            `
         );
      };

      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh); // Add to SCENE directly to avoid double transforms!
      f.bones.set(p.name, mesh);
      f.origPositions.set(p.name, { x: p.x || 0, y: p.y, z: 0 });

      const rbDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(f.group.position.x + (p.x || 0), f.group.position.y + p.y, f.group.position.z)
        .setLinearDamping(0.8)
        .setAngularDamping(2.0)
        .setAdditionalMass(5.0)
        .setCcdEnabled(true);
      const body = this.world.createRigidBody(rbDesc);
      this.world.createCollider(RAPIER.ColliderDesc.capsule(p.h / 2, p.w).setCollisionGroups(collisionGroup).setSolverGroups(collisionGroup), body);
      f.bodies.set(p.name, body);
    });

    const joints = [
      { parent: 'pelvis', child: 'lowerSpine', yAnchor: 1.06 },
      { parent: 'lowerSpine', child: 'midSpine', yAnchor: 1.34 },
      { parent: 'midSpine', child: 'upperSpine', yAnchor: 1.59 },
      { parent: 'upperSpine', child: 'neck', yAnchor: 1.80 },
      { parent: 'neck', child: 'head', yAnchor: 1.99 },

      { parent: 'upperSpine', child: 'lClav', yAnchor: 1.71, x: 0.08 },
      { parent: 'lClav', child: 'lUpperArm', yAnchor: 1.71, x: 0.15 },
      { parent: 'lUpperArm', child: 'lLowerArm', yAnchor: 1.37, x: 0.22 },
      { parent: 'lLowerArm', child: 'lHand', yAnchor: 1.09, x: 0.22 },

      { parent: 'upperSpine', child: 'rClav', yAnchor: 1.71, x: -0.08 },
      { parent: 'rClav', child: 'rUpperArm', yAnchor: 1.71, x: -0.15 },
      { parent: 'rUpperArm', child: 'rLowerArm', yAnchor: 1.37, x: -0.22 },
      { parent: 'rLowerArm', child: 'rHand', yAnchor: 1.09, x: -0.22 },

      { parent: 'pelvis', child: 'lThigh', yAnchor: 0.85, x: 0.12 },
      { parent: 'lThigh', child: 'lCalf', yAnchor: 0.58, x: 0.12, type: 'revolute', axis: {x: 1, y: 0, z: 0} },
      { parent: 'lCalf', child: 'lFoot', yAnchor: 0.24, x: 0.12, type: 'revolute', axis: {x: 1, y: 0, z: 0} },

      { parent: 'pelvis', child: 'rThigh', yAnchor: 0.85, x: -0.12 },
      { parent: 'rThigh', child: 'rCalf', yAnchor: 0.58, x: -0.12, type: 'revolute', axis: {x: 1, y: 0, z: 0} },
      { parent: 'rCalf', child: 'rFoot', yAnchor: 0.24, x: -0.12, type: 'revolute', axis: {x: 1, y: 0, z: 0} },
    ];

    joints.forEach(j => {
      const p1 = parts.find(p => p.name === j.parent);
      const p2 = parts.find(p => p.name === j.child);
      if(p1 && p2) {
        const anchorX = j.x || 0;
        const anchorY = j.yAnchor;
        const a1 = { x: anchorX - (p1.x || 0), y: anchorY - p1.y, z: 0 };
        const a2 = { x: anchorX - (p2.x || 0), y: anchorY - p2.y, z: 0 };
        
        let jointData;
        if ((j as any).type === 'revolute' && (j as any).axis) {
            jointData = RAPIER.JointData.revolute(a1, a2, (j as any).axis);
        } else {
            jointData = RAPIER.JointData.spherical(a1, a2);
        }
        this.world.createImpulseJoint(jointData, f.bodies.get(p1.name) as RAPIER.RigidBody, f.bodies.get(p2.name) as RAPIER.RigidBody, true);
      }
    });

    
    if (this.tpCamera && this.player1 === undefined) {
        // First player created becomes the target
        this.tpCamera.setTarget(f.group);
    }

    return f;
  }

  // Active Ragdoll: Spring system instead of rigid joints to avoid explosion and provide organic movement
  applyActiveRagdoll(f: any, isPlayer: boolean) {
    if (f.state === 'grounded' || f.state.startsWith('stagger')) return; // let physics take over

    const pelvis = f.bodies.get('pelvis');
    if (!pelvis) return;

    const pRot = pelvis.rotation();
    const pTrans = pelvis.translation();
    const pQuat = new THREE.Quaternion(pRot.x, pRot.y, pRot.z, pRot.w).normalize();
    const pEuler = new THREE.Euler().setFromQuaternion(pQuat);
    
    // Torque controller to keep pelvis upright
    if (f.state !== 'diving' && f.state !== 'grounded' && f.state.indexOf('slammed') === -1) {
        if (isNaN(pEuler.y)) pEuler.y = 0;
        const targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, pEuler.y, 0));
        let diff = targetQuat.clone().multiply(pQuat.clone().invert());
        let axis = new THREE.Vector3(diff.x, diff.y, diff.z);
        let angle = 2 * Math.acos(Math.max(-1, Math.min(1, diff.w)));
        if (angle > Math.PI) angle -= 2 * Math.PI;
        if (axis.lengthSq() > 0.0001) {
           axis.normalize();
           // Increase torque stability dramatically to stop "walking on torso"
           let tx = (axis.x * angle * 2500) - ((pelvis.angvel().x || 0) * 150);
           let ty = (axis.y * angle * 2500) - ((pelvis.angvel().y || 0) * 150);
           let tz = (axis.z * angle * 2500) - ((pelvis.angvel().z || 0) * 150);
           this.physicsSafeSet(pelvis, 'torqueImpulse', {x: tx * 0.016, y: ty * 0.016, z: tz * 0.016});
        }
    }
    
    // Pelvis Height Spring (Leg strength simulation)
    if (pTrans && pTrans.y < 0.9 && f.state !== 'diving' && f.state.indexOf('slammed') === -1) {
       let errorY = 0.9 - pTrans.y;
       let vy = pelvis.linvel().y;
       if (!isNaN(errorY) && !isNaN(vy)) {
          let forceY = (errorY * 3000) - (vy * 150);
          if (forceY > 0) this.physicsSafeSet(pelvis, 'impulse', {x: 0, y: forceY * 0.016, z: 0});
       }
    }

    // Active Muscle Simulation (Springs)
    if (!f.state.startsWith('stagger') && f.state !== 'grounded' && f.state.indexOf('slammed') === -1) {
       const baseQuat = f.state === 'diving' ? pQuat : new THREE.Quaternion().setFromEuler(new THREE.Euler(0, pEuler.y, 0));
       const pelvisOrig = f.origPositions.get('pelvis') || {x:0,y:0,z:0};
       
       f.bodies.forEach((body: RAPIER.RigidBody, name: string) => {
          if (name === 'pelvis') return;
          const isCore = ['lowerSpine', 'midSpine', 'upperSpine', 'neck', 'head'].includes(name);
          // if (f.state === 'standing' && !isCore) return;

          const orig = f.origPositions.get(name);
          if (!orig) return;
          
          const localTarget = new THREE.Vector3(orig.x - pelvisOrig.x, orig.y - pelvisOrig.y, orig.z - pelvisOrig.z);
          localTarget.applyQuaternion(baseQuat);
          
          let targetX = pTrans.x + localTarget.x;
          let targetY = pTrans.y + localTarget.y;
          let targetZ = pTrans.z + localTarget.z;
          
          if (f.state === 'standing' && isCore) {
             targetY += Math.sin(performance.now() * 0.003 + (isPlayer?0:Math.PI)) * 0.05;
          }
          
          const curTrans = body.translation();
          const dx = targetX - curTrans.x;
          const dy = targetY - curTrans.y;
          const dz = targetZ - curTrans.z;
          
          const stiffness = isCore ? 1500.0 : 600.0;
          const damping = isCore ? 100.0 : 40.0;
          let ix = (dx * stiffness) - ((body.linvel().x||0) * damping);
          let iy = (dy * stiffness) - ((body.linvel().y||0) * damping);
          let iz = (dz * stiffness) - ((body.linvel().z||0) * damping);
          
          if (!isNaN(ix) && !isNaN(iy) && !isNaN(iz)) {
              this.physicsSafeSet(body, 'impulse', { x: ix * 0.016, y: iy * 0.016, z: iz * 0.016 });
              
              const rotStiffness = isCore ? 2000.0 : 800.0;
              const rotDamping = isCore ? 150.0 : 50.0;
              let cuRot = body.rotation();
              let cu = new THREE.Quaternion(cuRot.x, cuRot.y, cuRot.z, cuRot.w);
              let diff = baseQuat.clone().multiply(cu.invert());
              let axis = new THREE.Vector3(diff.x, diff.y, diff.z);
              let angle = 2 * Math.acos(Math.max(-1, Math.min(1, diff.w)));
              if (angle > Math.PI) angle -= 2 * Math.PI;
              if (axis.lengthSq() > 0.0001) {
                  axis.normalize();
                  let tx = (axis.x * angle * rotStiffness) - ((body.angvel().x||0) * rotDamping);
                  let ty = (axis.y * angle * rotStiffness) - ((body.angvel().y||0) * rotDamping);
                  let tz = (axis.z * angle * rotStiffness) - ((body.angvel().z||0) * rotDamping);
                  this.physicsSafeSet(body, 'torqueImpulse', {x: tx * 0.016, y: ty * 0.016, z: tz * 0.016});
              }
              
              // Excruciatingly detailed tissue and biological strain simulation
              // Calculate structural dislocation strain
              const strainDist = Math.hypot(dx, dy, dz);
              if (strainDist > 0.05 && !isCore) {
                 // If a limb is forcefully dislocated from its socket anchor due to violent torque/impacts,
                 // we stretch the geometry longitudinally to simulate extreme tearing tension of tendons/skin.
                 const mesh = f.bones.get(name);
                 if (mesh && !f.customBoneMap?.length) { 
                    // Base capsule stretching, maintaining approximate volume
                    const strainScale = Math.min(2.0, 1.0 + ((strainDist - 0.05) * 4.0));
                    mesh.scale.set(1.0 / Math.sqrt(strainScale), strainScale, 1.0 / Math.sqrt(strainScale)); 
                 }
              } else {
                 const mesh = f.bones.get(name);
                 if (mesh && !f.customBoneMap?.length && mesh.scale.y !== 1.0) {
                    mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1); 
                 }
              }
          }
       });
    }
  }

  // Procedural IK
  applyIK(fighter: any, chain: string[], targetPos: THREE.Vector3, strength = 600) {
    let positions = chain.map(name => {
      const b = fighter.bodies.get(name);
      return b ? new THREE.Vector3().copy(b.translation() as any) : new THREE.Vector3();
    });

    const lengths = [];
    for (let i = 0; i < chain.length - 1; i++) {
      const o1 = fighter.origPositions.get(chain[i]) || {x:0, y:0, z:0};
      const o2 = fighter.origPositions.get(chain[i+1]) || {x:0, y:0, z:0};
      const dist = Math.hypot(o1.x-o2.x, o1.y-o2.y, o1.z-o2.z);
      lengths.push(dist || 0.42);
    }

    for (let it = 0; it < 8; it++) {
      positions[positions.length - 1].copy(targetPos);
      for (let i = positions.length - 2; i >= 0; i--) {
        const diff = positions[i + 1].clone().sub(positions[i]);
        if (diff.lengthSq() > 0.0001) diff.normalize();
        else diff.set(0, -1, 0);
        positions[i].copy(positions[i + 1]).sub(diff.multiplyScalar(lengths[i]));
      }
      positions[0].copy(fighter.bodies.get(chain[0])?.translation() as any || new THREE.Vector3());
      for (let i = 1; i < positions.length; i++) {
        const diff = positions[i].clone().sub(positions[i - 1]);
        if (diff.lengthSq() > 0.0001) diff.normalize();
        else diff.set(0, -1, 0);
        positions[i].copy(positions[i - 1]).add(diff.multiplyScalar(lengths[i-1]));
      }
    }

    chain.forEach((name, i) => {
      const body = fighter.bodies.get(name);
      if (body) {
        const cur = body.translation();
        if (cur) {
          const damping = strength * 0.1;
          let ix = ((positions[i].x - cur.x) * strength) - ((body.linvel().x||0) * damping);
          let iy = ((positions[i].y - cur.y) * strength) - ((body.linvel().y||0) * damping);
          let iz = ((positions[i].z - cur.z) * strength) - ((body.linvel().z||0) * damping);
          if (isNaN(ix) || !isFinite(ix)) ix = 0;
          if (isNaN(iy) || !isFinite(iy)) iy = 0;
          if (isNaN(iz) || !isFinite(iz)) iz = 0;
          this.physicsSafeSet(body, 'impulse', {x: ix * 0.016, y: iy * 0.016, z: iz * 0.016});
          
          if (i < chain.length - 1) {
             const dir = new THREE.Vector3().subVectors(positions[i+1], positions[i]).normalize();
             const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
             
             let cuRot = body.rotation();
             let cu = new THREE.Quaternion(cuRot.x, cuRot.y, cuRot.z, cuRot.w);
             let diff = targetQuat.clone().multiply(cu.invert());
             let axis = new THREE.Vector3(diff.x, diff.y, diff.z);
             let angle = 2 * Math.acos(Math.max(-1, Math.min(1, diff.w)));
             if (angle > Math.PI) angle -= 2 * Math.PI;
             
             if (axis.lengthSq() > 0.0001) {
                 axis.normalize();
                 let tx = (axis.x * angle * strength * 0.5) - ((body.angvel().x||0) * strength * 0.05);
                 let ty = (axis.y * angle * strength * 0.5) - ((body.angvel().y||0) * strength * 0.05);
                 let tz = (axis.z * angle * strength * 0.5) - ((body.angvel().z||0) * strength * 0.05);
                 this.physicsSafeSet(body, 'torqueImpulse', {x: tx * 0.016, y: ty * 0.016, z: tz * 0.016});
             }
          }
        }
      }
    });
  }

  startStrike(fighter: any, type: string, powered: boolean) {
    const now = performance.now();
    if (fighter.state !== 'standing' || fighter.stamina < 12 || (now - fighter.lastStrike < 140)) return;

    fighter.state = 'windup';
    fighter.lastStrike = now;
    const cost = powered ? 26 : 13;
    fighter.stamina = Math.max(0, fighter.stamina - cost);

    const windup = powered ? 280 : 150;
    setTimeout(() => {
      if (!this.active) return;
      if (fighter.state === 'windup') {
        fighter.state = 'striking';
        this.executeStrike(fighter, type, powered);
      }
    }, windup);
    setTimeout(() => {
      if (!this.active) return;
      if (fighter.state === 'striking' || fighter.state === 'windup') fighter.state = 'recovery';
    }, windup + 180);
    setTimeout(() => {
      if (!this.active) return;
      if (fighter.state === 'recovery') fighter.state = 'standing';
    }, windup + 520);
  }

  executeStrike(fighter: any, type: string, powered: boolean) {
    let force = powered ? 720 : 380;
    let baseDmg = powered ? 280 : 150; // scaled x10 for internal health

    let limb = 'rHand';
    let chain = ['upperSpine', 'rClav', 'rUpperArm', 'rLowerArm', 'rHand'];
    let heightOffset = fighter.targetZone === 'head' ? 2.0 : fighter.targetZone === 'body' ? 1.4 : 0.8;

    if (type === 'leftPunch') { limb = 'lHand'; chain = ['upperSpine', 'lClav', 'lUpperArm', 'lLowerArm', 'lHand']; }
    if (type.includes('Kick') || type === 'stomp') {
      limb = type.includes('left') ? 'lFoot' : 'rFoot';
      chain = ['pelvis', type.includes('left') ? 'lThigh' : 'rThigh', type.includes('left') ? 'lCalf' : 'rCalf', limb];
      heightOffset = type === 'stomp' ? 0.3 : 1.2;
    }
    if (type === 'elbow') limb = 'rLowerArm';
    if (type === 'knee') { limb = 'rThigh'; chain = ['pelvis', 'rThigh']; heightOffset = 1.2; }

    const opp = fighter === this.player1 ? this.player2 : this.player1;
    const pPos = fighter.bodies.get('pelvis')?.translation();
    const oppPos = opp.bodies.get('pelvis')?.translation();
    if (!pPos || !oppPos) return;
    
    // Dynamic direction toward opponent
    let dirToOpp = new THREE.Vector3(oppPos.x - pPos.x, 0, oppPos.z - pPos.z);
    if (dirToOpp.lengthSq() > 0) {
      dirToOpp.normalize();
    } else {
      dirToOpp.set(0, 0, 1);
    }
    const reach = type.includes('Kick') ? 0.9 : 0.7; // reach distance
    
    const targetPos = new THREE.Vector3(
      pPos.x + dirToOpp.x * reach,
      heightOffset,
      pPos.z + dirToOpp.z * reach
    );
    this.applyIK(fighter, chain, targetPos);
    
    // PoseTuneEngine Integration
    this.poseTuner.applyToRig(fighter, 0.5); // Tune at apex (strike phase)

    const limbBody = fighter.bodies.get(limb);
    if (limbBody) {
      let ix = dirToOpp.x * (force * 0.2);
      let iy = powered ? 30 : 10;
      let iz = dirToOpp.z * (force * 0.2);
      if (isNaN(ix) || !isFinite(ix)) ix = 0;
      if (isNaN(iz) || !isFinite(iz)) iz = 0;
      this.physicsSafeSet(limbBody, 'impulse', { x: ix, y: iy, z: iz });
    }

    // Delay hit check slightly to allow physics movement
    setTimeout(() => {
      if (!this.active) return;
      if (this.bvhCombat) {
          // Temporarily attach to player group if needed, or pass it
          // Actually, our BvhCombatManager needs the current fighter's mesh to run executeMeleeHitreg
          // Let's create a temporary BVH manager for the current fighter
          const tempBvh = new BvhCombatManager(fighter.group, this.world);
          tempBvh.executeMeleeHitreg(1.5, type.includes('Kick') ? 0.4 : 0.25, baseDmg, force);
      } else {
          this.checkHitDistance(fighter, opp, baseDmg, limb, targetPos);
      }
    }, 50);
  }

  checkHitDistance(attacker: any, target: any, dmg: number, limb: string, expectedPos: THREE.Vector3) {
    if (attacker.state !== 'striking') return;
    
    // Real distance check instead of blind hit
    const attackingLimb = attacker.bodies.get(limb);
    const targetBody = target.bodies.get(attacker.targetZone === 'legs' ? 'lThigh' : attacker.targetZone === 'body' ? 'midSpine' : 'head');
    
    if (!attackingLimb || !targetBody) return;

    const alPos = attackingLimb.translation();
    const tbPos = targetBody.translation();
    
    const dist = new THREE.Vector3(alPos.x, alPos.y, alPos.z).distanceTo(new THREE.Vector3(tbPos.x, tbPos.y, tbPos.z));
    
    const hitPt = new THREE.Vector3(alPos.x, alPos.y, alPos.z);

    // If block is active, reduce damage heavily 70%
    if (target.blockActive) {
      if (dist < 1.2) {
        target.health -= dmg * 0.3;
        target.stamina = Math.max(0, target.stamina - 15); // drain stam on block
        this.spawnHitSparks(hitPt, true, 0.5);
      }
      return;
    }

    // Reach threshold check
    let threshold = limb.includes('Foot') ? 1.0 : 0.8;
    if (dist < threshold) {
      target.health = Math.max(0, target.health - dmg);
      target.lastHitTime = performance.now();
      
      // Volumetric Bulge
      target.shaderUniforms.forEach((u: any) => {
         u.volumetricBulgeCenter.value.set(hitPt.x, hitPt.y, hitPt.z);
         u.volumetricBulgeRadius.value = 0.5;
         u.volumetricBulgeForce.value = 0.4;
      });

      this.spawnHitSparks(hitPt, false, dmg > 200 ? 1.5 : 1.0);
      
      // Impact effects via JointMotors torque coupling
      this.jointMotors.staminaSag = Math.max(0.1, target.stamina / 100.0);
      const targetLimb = limb;
      const targetBodyNode = target.bodies.get(targetLimb) || target.bodies.get('upperSpine');
      const targetParent = target.bodies.get('midSpine');
      
      if (targetBodyNode) {
         const attPel = attacker.bodies.get('pelvis')?.translation();
         const tarPel = target.bodies.get('pelvis')?.translation();
         let dirToOpp = new THREE.Vector3(0, 0, 1);
         if (attPel && tarPel) {
            dirToOpp.set(tarPel.x - attPel.x, 0, tarPel.z - attPel.z);
            if (dirToOpp.lengthSq() > 0) dirToOpp.normalize();
         }
         const force = dmg * 1.5;
         let rrx = force * dirToOpp.x * 2.0;
         let rry = 30;
         let rrz = force * dirToOpp.z * 2.0;
         if (isNaN(rrx)) rrx = 0; if (isNaN(rrz)) rrz = 0;
         this.jointMotors.applyTorqueCoupling(
            { x: rrx, y: rry, z: rrz },
            targetBodyNode,
            targetParent
         );
      }

      const head = target.bodies.get('head');
      if (head) {
         let rx = (Math.random()-0.5)*30;
         let rz = (Math.random()-0.5)*30;
         if (isNaN(rx)) rx = 0; if (isNaN(rz)) rz = 0;
         this.physicsSafeSet(head, 'impulse', {x: rx, y: 30, z: rz});
      }
      
      if (dmg >= 250 || target.health <= 0 || Math.random() < 0.25) {
        this.startKnockdownSequence(target);
      }
    }
  }

  attemptContextAction(f: any) {
    if (f.state !== 'standing' && f.state !== 'turnbuckle_top') return;
    
    if (f.state === 'turnbuckle_top') {
       this.executeDive(f);
       return;
    }
    
    const pPos = f.bodies.get('pelvis')?.translation();
    if (!pPos) return;
    
    // Throw held weapon
    if (f.heldWeapon) {
       this.throwWeapon(f);
       return;
    }
    
    // Pick up weapon
    let weaponToPickup = null;
    let minDist = 1.5;
    this.weapons.forEach(w => {
       if (w.broken) return;
       const wPos = w.body.translation();
       const d = new THREE.Vector3(pPos.x, 0, pPos.z).distanceTo(new THREE.Vector3(wPos.x, 0, wPos.z));
       if (d < minDist) {
          minDist = d;
          weaponToPickup = w;
       }
    });
    
    if (weaponToPickup) {
       f.heldWeapon = weaponToPickup;
       // We disable physics on the weapon temporarily by moving it far away and zeroing velocity,
       // and we will sync it manually to the player's hand in the loop.
       this.physicsSafeSet(weaponToPickup.body, 'translation', { x: 0, y: -100, z: 0 });
       return;
    }

    const absX = Math.abs(pPos.x);
    const absZ = Math.abs(pPos.z);
    
    if (absX > 2.5 && absZ > 2.5) {
       this.startClimbTurnbuckle(f, Math.sign(pPos.x), Math.sign(pPos.z));
       return;
    }
    
    if (absX > 2.8 || absZ > 2.8) {
       this.startSpringboard(f, absX > absZ ? 'X' : 'Z', absX > absZ ? Math.sign(pPos.x) : Math.sign(pPos.z));
       return;
    }
    
    this.startSlam(f);
  }

  throwWeapon(f: any) {
     const w = f.heldWeapon;
     if (!w) return;
     f.heldWeapon = null;
     f.state = 'windup';
     
     const opp = f === this.player1 ? this.player2 : this.player1;
     const pPos = f.bodies.get('pelvis')?.translation();
     const tPos = opp.bodies.get('pelvis')?.translation();
     
     // Animation
     this.applyIK(f, ['rClav', 'rUpperArm', 'rLowerArm', 'rHand'], new THREE.Vector3(pPos.x, pPos.y + 2.0, pPos.z - 0.5), 50);
     this.applyIK(f, ['lClav', 'lUpperArm', 'lLowerArm', 'lHand'], new THREE.Vector3(pPos.x, pPos.y + 2.0, pPos.z + 0.5), 50);

     setTimeout(() => {
        if (!this.active) return;
        f.state = 'recovery';
        const hand = f.bodies.get('rHand')?.translation() || pPos;
        this.physicsSafeSet(w.body, 'translation', { x: hand.x, y: hand.y + 0.5, z: hand.z });
        
        const dir = new THREE.Vector3(tPos.x - pPos.x, 1.0, tPos.z - pPos.z).normalize();
        this.physicsSafeSet(w.body, 'linvel', { x: dir.x * 25, y: dir.y * 10, z: dir.z * 25 });
        this.physicsSafeSet(w.body, 'angvel', { x: (Math.random()-0.5)*10, y: (Math.random()-0.5)*10, z: (Math.random()-0.5)*10 });
        
        // Also apply massive impulse to target if close
        setTimeout(() => {
            const curW = w.body.translation();
            const curT = opp.bodies.get('pelvis')?.translation();
            if (curW && curT && new THREE.Vector3(curW.x, curW.y, curW.z).distanceTo(new THREE.Vector3(curT.x, curT.y, curT.z)) < 2.0) {
               this.spawnHitSparks(new THREE.Vector3(curT.x, curT.y, curT.z), false, 2.5);
               opp.health = Math.max(0, opp.health - 250);
               this.startKnockdownSequence(opp);
               if (w.isTable) w.broken = true; // Breaking table on target
            }
        }, 150);
     }, 200);
     
     setTimeout(() => { if (this.active && f.state === 'recovery') f.state = 'standing'; }, 800);
  }

  startClimbTurnbuckle(f: any, signX: number, signZ: number) {
    if (f.state !== 'standing') return;
    f.state = 'climbing';
    const tx = signX * 3.3;
    const tz = signZ * 3.3;
    
    // Jump up sequence
    f.bodies.forEach((b: RAPIER.RigidBody, name: string) => {
       const orig = f.origPositions.get(name) || {x:0, y:0, z:0};
       this.physicsSafeSet(b, 'translation', { x: tx + orig.x, y: 3.5 + orig.y, z: tz + orig.z });
       this.physicsSafeSet(b, 'linvel', { x: 0, y: 0, z: 0 });
    });
    
    setTimeout(() => {
       if (!this.active) return;
       f.state = 'turnbuckle_top';
       const pelvis = f.bodies.get('pelvis');
       if (pelvis) {
          // Face the center
          const targetQuat = new THREE.Quaternion().setFromRotationMatrix(
             new THREE.Matrix4().lookAt(
                new THREE.Vector3(tx, 0, tz),
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0, 1, 0)
             )
          );
          this.physicsSafeSet(pelvis, 'rotation', { x: targetQuat.x, y: targetQuat.y, z: targetQuat.z, w: targetQuat.w });
          this.physicsSafeSet(pelvis, 'linvel', { x: 0, y: 0, z: 0 });
       }
    }, 100);
  }

  executeDive(f: any) {
    f.state = 'diving';
    const opp = f === this.player1 ? this.player2 : this.player1;
    const pPos = f.bodies.get('pelvis')?.translation();
    const tPos = opp.bodies.get('pelvis')?.translation();
    if (!pPos || !tPos) return;
    
    const dx = tPos.x - pPos.x;
    const dz = tPos.z - pPos.z;
    
    // Launch towards opponent
    f.bodies.forEach((b: RAPIER.RigidBody) => {
       this.physicsSafeSet(b, 'linvel', { x: dx * 1.5, y: 8, z: dz * 1.5 });
       // Add some rotation spin for visual flair
       this.physicsSafeSet(b, 'angvel', { x: (Math.random()-0.5)*10, y: 0, z: (Math.random()-0.5)*10 });
    });
    
    // Check for collision soon
    setTimeout(() => {
       if (!this.active) return;
       this.checkDiveHit(f, opp);
    }, 500);
    setTimeout(() => {
       if (!this.active) return;
       if (f.state === 'diving') {
           f.state = 'grounded';
           setTimeout(() => { if (this.active && f.state === 'grounded') this.attemptGetUp(f); }, 2000);
       }
    }, 1500);
  }

  checkDiveHit(attacker: any, target: any) {
    if (attacker.state !== 'diving') return;
    const pPos = attacker.bodies.get('pelvis')?.translation();
    const tPos = target.bodies.get('pelvis')?.translation();
    if (!pPos || !tPos) return;
    const dist = new THREE.Vector3(pPos.x, pPos.y, pPos.z).distanceTo(new THREE.Vector3(tPos.x, tPos.y, tPos.z));
    if (dist < 2.5) {
       // Successful dive
       this.spawnHitSparks(new THREE.Vector3(tPos.x, tPos.y, tPos.z), false, 2.0);
       target.health = Math.max(0, target.health - 250);
       this.startKnockdownSequence(target);
       this.shakeIntensity = Math.max(this.shakeIntensity, 1.5);
       attacker.state = 'grounded';
       setTimeout(() => { if (this.active && attacker.state === 'grounded') this.attemptGetUp(attacker); }, 2000);
    }
  }

  startSpringboard(f: any, axis: string, sign: number) {
    if (f.state !== 'standing') return;
    f.state = 'springboard';
    
    // Throw backwards towards ropes
    const vx = axis === 'X' ? sign * 8 : 0;
    const vz = axis === 'Z' ? sign * 8 : 0;
    
    f.bodies.forEach((b: RAPIER.RigidBody) => {
       this.physicsSafeSet(b, 'linvel', { x: vx, y: 3, z: vz });
    });
    
    setTimeout(() => {
       if (!this.active || f.state !== 'springboard') return;
       // Launch back towards center
       f.state = 'diving';
       this.spawnHitSparks(new THREE.Vector3(f.bodies.get('pelvis').translation().x, 2, f.bodies.get('pelvis').translation().z), true, 1.5);
       f.bodies.forEach((b: RAPIER.RigidBody) => {
          this.physicsSafeSet(b, 'linvel', { x: -vx * 1.5, y: 6, z: -vz * 1.5 });
          this.physicsSafeSet(b, 'angvel', { x: (Math.random()-0.5)*15, y: (Math.random()-0.5)*15, z: (Math.random()-0.5)*15 });
       });
       
       const opp = f === this.player1 ? this.player2 : this.player1;
       setTimeout(() => this.checkDiveHit(f, opp), 400);
       setTimeout(() => { 
          if (this.active && f.state === 'diving') {
              f.state = 'grounded'; 
              setTimeout(() => { if (this.active && f.state === 'grounded') this.attemptGetUp(f); }, 2000);
          }
       }, 1200);
    }, 400); // 400ms to hit ropes
  }

  startSlam(attacker: any) {
    const target = attacker === this.player1 ? this.player2 : this.player1;
    if (attacker.state !== 'standing' || target.state.startsWith('stagger') || target.state === 'grounded') return;
    
    const pPos = attacker.bodies.get('pelvis')?.translation();
    const tPos = target.bodies.get('pelvis')?.translation();
    if (!pPos || !tPos) return;

    // Check distance
    const dist = Math.sqrt(Math.pow(pPos.x-tPos.x, 2) + Math.pow(pPos.z-tPos.z, 2));
    if (dist > 1.4 || isNaN(dist)) return; // Too far to grapple
    
    // Choose slam type
    const slamType = Math.random();
    
    attacker.state = 'slamming';
    target.state = 'slammed';

    if (slamType < 0.33) {
        // Suplex
        target.bodies.forEach((body: RAPIER.RigidBody, name: string) => {
           const orig = target.origPositions.get(name) || {x:0, y:0, z:0};
           this.physicsSafeSet(body, 'translation', { x: pPos.x + orig.x * 0.5, y: pPos.y + 1.5 + (orig.y - 0.92), z: pPos.z + orig.z * 0.5 });
           this.physicsSafeSet(body, 'linvel', { x: 0, y: 8, z: 0 }); // toss up
        });
        const targetPelvis = target.bodies.get('pelvis');
        if (targetPelvis) this.physicsSafeSet(targetPelvis, 'angvel', { x: -12, y: 0, z: 0 }); 
        
        // Attacker arch back
        const aDirX = Math.sign(pPos.x - tPos.x) || 1;
        const aDirZ = Math.sign(pPos.z - tPos.z) || 1;
        
        setTimeout(() => {
            if (!this.active) return;
            // Slam behind
            target.bodies.forEach((b: RAPIER.RigidBody) => {
               this.physicsSafeSet(b, 'linvel', { x: aDirX * 10, y: -20, z: aDirZ * 10 });
            });
            const aPelvis = attacker.bodies.get('pelvis');
            if (aPelvis) {
               this.physicsSafeSet(aPelvis, 'linvel', { x: aDirX * 6, y: 5, z: aDirZ * 6 });
               this.physicsSafeSet(aPelvis, 'angvel', { x: -5, y: 0, z: 0 }); 
            }
            attacker.state = 'grounded';
            setTimeout(() => { if (this.active && attacker.state === 'grounded') this.attemptGetUp(attacker); }, 2000);
            target.health = Math.max(0, target.health - 450);
            this.startKnockdownSequence(target);
            this.spawnHitSparks(new THREE.Vector3(pPos.x + aDirX * 1.5, 0.8, pPos.z + aDirZ * 1.5), false, 3.0);
            this.shakeIntensity = 2.5;
        }, 500);
        
    } else if (slamType < 0.66) {
        // Chokeslam
        target.bodies.forEach((body: RAPIER.RigidBody, name: string) => {
           const orig = target.origPositions.get(name) || {x:0, y:0, z:0};
           this.physicsSafeSet(body, 'translation', { x: pPos.x + orig.x * 0.5, y: pPos.y + 1.8 + (orig.y - 0.92), z: pPos.z + orig.z * 0.5 });
           this.physicsSafeSet(body, 'linvel', { x: 0, y: 2, z: 0 }); 
        });
        this.applyIK(attacker, ['rClav', 'rUpperArm', 'rLowerArm', 'rHand'], new THREE.Vector3(pPos.x, pPos.y + 2.2, pPos.z), 60);

        setTimeout(() => {
            if (!this.active) return;
            target.bodies.forEach((b: RAPIER.RigidBody) => {
               this.physicsSafeSet(b, 'linvel', { x: 0, y: -25, z: 0 });
            });
            attacker.state = 'recovery';
            target.health = Math.max(0, target.health - 400); 
            this.startKnockdownSequence(target);
            this.spawnHitSparks(new THREE.Vector3(pPos.x, 0.8, pPos.z), false, 2.5);
            this.shakeIntensity = 2.0;
        }, 600);
        
    } else {
        // Basic toss
        target.bodies.forEach((body: RAPIER.RigidBody, name: string) => {
           const orig = target.origPositions.get(name) || {x:0, y:0, z:0};
           this.physicsSafeSet(body, 'translation', { x: pPos.x + orig.x, y: pPos.y + 1.2 + (orig.y - 0.92), z: pPos.z + orig.z });
           this.physicsSafeSet(body, 'linvel', { x: 0, y: 5, z: 0 }); 
        });
        const targetPelvis = target.bodies.get('pelvis');
        if (targetPelvis) this.physicsSafeSet(targetPelvis, 'angvel', { x: -8, y: 0, z: 0 }); 

        this.applyIK(attacker, ['rClav', 'rUpperArm', 'rLowerArm', 'rHand'], new THREE.Vector3(pPos.x, pPos.y + 1.8, pPos.z), 50);
        this.applyIK(attacker, ['lClav', 'lUpperArm', 'lLowerArm', 'lHand'], new THREE.Vector3(pPos.x, pPos.y + 1.8, pPos.z), 50);

        setTimeout(() => {
            if (!this.active) return;
            target.bodies.forEach((b: RAPIER.RigidBody) => {
               this.physicsSafeSet(b, 'linvel', { x: (Math.random() - 0.5) * 4, y: -15, z: (Math.random() - 0.5) * 4 });
            });
            attacker.state = 'recovery';
            target.health = Math.max(0, target.health - 350); 
            this.startKnockdownSequence(target);
            this.spawnHitSparks(new THREE.Vector3(pPos.x, 0.8, pPos.z), false, 2.0);
            this.shakeIntensity = 1.5;
        }, 400);
    }

    setTimeout(() => {
        if (!this.active) return;
        if (attacker.state === 'recovery') attacker.state = 'standing';
    }, 1500);
  }

  
  attemptGrapple(attacker: any, defender: any) {
      if (attacker.grappleJoint || attacker.state !== 'standing' || defender.state === 'grounded') return;
      
      const p1 = attacker.bodies.get('pelvis');
      const p2 = defender.bodies.get('pelvis');
      if (!p1 || !p2) return;
      
      const pos1 = p1.translation();
      const pos2 = p2.translation();
      const dist = Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.z - pos2.z, 2));
      
      // Open-Source Rapier Physics Joint integration for dynamic grappling
      if (dist < 1.8) {
          attacker.state = 'grappling';
          defender.state = 'grappled';
          
          // Apply a spherical joint between the two characters
          const jointParams = RAPIER.JointData.spherical(
              new RAPIER.Vector3(0, 0, 0),
              new RAPIER.Vector3(0, 0, 0)
          );
          attacker.grappleJoint = this.world.createImpulseJoint(jointParams, p1, p2, true);
          this.updateUI({ debugMsg: `Grapple Established!` });
          
          setTimeout(() => {
              if (attacker.grappleJoint) {
                  this.world.removeImpulseJoint(attacker.grappleJoint, true);
                  attacker.grappleJoint = null;
                  
                  // Throw recoil (IK + Physics throw)
                  p2.applyImpulse(new RAPIER.Vector3((pos2.x - pos1.x)*20, 15, (pos2.z - pos1.z)*20), true);
                  
                  attacker.state = 'standing';
                  defender.state = 'grounded';
                  defender.health = Math.max(0, defender.health - 150); // Grapple damage
                  this.updateUI({ debugMsg: `Grapple Break & Throw` });
              }
          }, 2000);
      }
  }

  updateDefense(f: any, isP1: boolean) {
    f.blockActive = isP1 ? !!this.keys['LB'] : false;
    if (isP1 && this.keys['RB']) {
      this.keys['RB'] = false;
      f.state = 'recovery';
    }
    
    if (f.blockActive) {
       // Pull hands up to guard
       const pPos = f.bodies.get('pelvis')?.translation();
       if (pPos) {
         this.applyIK(f, ['lClav', 'lUpperArm', 'lLowerArm', 'lHand'], new THREE.Vector3(pPos.x - 0.2, 1.8, pPos.z + 0.3), 30);
         this.applyIK(f, ['rClav', 'rUpperArm', 'rLowerArm', 'rHand'], new THREE.Vector3(pPos.x + 0.2, 1.8, pPos.z + 0.3), 30);
       }
    }
  }

  startKnockdownSequence(f: any) {
    if (f.state.startsWith('stagger') || f.state === 'grounded') return;
    f.state = 'slammed';

    // GrappleMatrix integration: execute physical slam via coupled kinematics if attacker is close
    const opp = f === this.player1 ? this.player2 : this.player1;
    const fPelvis = f.bodies.get('pelvis');
    const oppPelvis = opp.bodies.get('pelvis');
    if (fPelvis && oppPelvis && new THREE.Vector3(fPelvis.translation().x, fPelvis.translation().y, fPelvis.translation().z).distanceTo(new THREE.Vector3(oppPelvis.translation().x, oppPelvis.translation().y, oppPelvis.translation().z)) < 2.5) {
        this.grappleMatrix.executeVisceralSlam(oppPelvis, fPelvis, fPelvis.translation());
    }
    
    // Unlock rotation to allow ragdolling
    const pelvis = f.bodies.get('pelvis');
    if (pelvis) {
       let rx = (Math.random()-0.5)*10;
       let ry = (Math.random()-0.5)*10;
       let rz = (Math.random()-0.5)*10;
       if(isNaN(rx)) rx = 0; if(isNaN(ry)) ry = 0; if(isNaN(rz)) rz = 0;
       this.physicsSafeSet(pelvis, 'angvel', {x:rx, y:ry, z:rz});
    }

    setTimeout(() => { if (this.active && f.health > 0) f.state = 'stagger2'; }, 320);
    setTimeout(() => { if (this.active && f.health > 0) f.state = 'stagger3'; }, 750);
    setTimeout(() => { if (this.active && f.health > 0) f.state = 'stagger4'; }, 1200);
    setTimeout(() => { 
        if (!this.active) return;
        f.state = 'grounded'; 
        if (f.health <= 0) {
           console.log("KO!");
           setTimeout(() => { if (this.active) this.resetMatch(); }, 3500);
        } else {
           // Auto get-up
           setTimeout(() => { if (this.active && f.state === 'grounded') this.attemptGetUp(f); }, 3000);
        }
    }, 1700);
  }

  attemptGetUp(f: any) {
    if (f.state !== 'grounded' || f.health <= 0) return;
    f.state = 'getup1';
    
    // Upward impulse to lift full body smoothly
    f.bodies.forEach((b: RAPIER.RigidBody) => {
       this.physicsSafeSet(b, 'impulse', {x: 0, y: 30, z: 0});
    });

    let phase = 1;
    const int = setInterval(() => {
      if (!this.active) { clearInterval(int); return; }
      phase++;
      if (f.state.startsWith('getup')) {
         f.state = `getup${phase}`;
      }
      if (phase >= 3) {
         const pelvis = f.bodies.get('pelvis');
         if (pelvis) {
            const rot = pelvis.rotation();
            const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w));
            if (!isNaN(euler.y)) {
               const targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, euler.y, 0));
               this.physicsSafeSet(pelvis, 'rotation', { x: targetQuat.x, y: targetQuat.y, z: targetQuat.z, w: targetQuat.w });
            }
         }
      }
      if (phase >= 5) {
        if (f.state.startsWith('getup')) f.state = 'standing';
        clearInterval(int);
      }
    }, 340);
  }

  groundedStomp(fighter: any) {
    if (fighter.state !== 'grounded') return;
    const foot = fighter.bodies.get('rFoot');
    if (foot) this.physicsSafeSet(foot, 'impulse', { x: 0, y: -200, z: -50 });
    const opp = fighter === this.player1 ? this.player2 : this.player1;
    if (opp.state === 'grounded') opp.health -= 350;
  }

  updateMovement(f: any, isPlayer: boolean) {
    if (f.state === 'grounded' || f.state.startsWith('stagger')) return;
    
    const pelvis = f.bodies.get('pelvis');
    if (!pelvis) return;

    let dir = new THREE.Vector3();
    
    if (isPlayer) {
      if (this.keys['KeyW']) dir.z -= 1;
      if (this.keys['KeyS']) dir.z += 1;
      if (this.keys['KeyA']) dir.x -= 1;
      if (this.keys['KeyD']) dir.x += 1;
      
      if (this.joystick.x !== 0 || this.joystick.y !== 0) {
        dir.x += this.joystick.x;
        dir.z += this.joystick.y;
      }
    } else {
       // AI movement
       const pPos = this.player1.bodies.get('pelvis')?.translation();
       const aiPos = f.bodies.get('pelvis')?.translation();
       if (pPos && aiPos && f.state !== 'striking' && f.state !== 'windup') {
           const dist = new THREE.Vector3(pPos.x, pPos.y, pPos.z).distanceTo(new THREE.Vector3(aiPos.x, aiPos.y, aiPos.z));
           
           if (dist > 1.8) {
              const dx = pPos.x - aiPos.x;
              const dz = pPos.z - aiPos.z;
              const len = Math.sqrt(dx*dx + dz*dz);
              if (len > 0) { dir.x = dx / len; dir.z = dz / len; }
           } else if (dist < 1.0) {
              const dx = aiPos.x - pPos.x;
              const dz = aiPos.z - pPos.z;
              const len = Math.sqrt(dx*dx + dz*dz);
              if (len > 0) { dir.x = dx / len; dir.z = dz / len; }
           }
       }
    }

    // Default Leg IK (Standing)
    let moveSpeed = 0;
    if (dir.lengthSq() > 0.0001 && (f.state === 'standing' || f.state === 'blocking')) {
      dir.normalize().multiplyScalar(isPlayer && f.blockActive ? 2.5 : 4.8);
      moveSpeed = dir.length();
      
      let tx = dir.x;
      let tz = dir.z;
      let cvel = pelvis.linvel();
      let ix = (tx - cvel.x) * 200 * 0.016;
      let iz = (tz - cvel.z) * 200 * 0.016;
      if (!isNaN(ix) && !isNaN(iz)) {
         this.physicsSafeSet(pelvis, 'impulse', { x: ix, y: 0, z: iz });
      }
    } else if (f.state === 'standing' || f.state === 'blocking') {
      let cvel = pelvis.linvel();
      let ix = -cvel.x * 100 * 0.016;
      let iz = -cvel.z * 100 * 0.016;
      if (!isNaN(ix) && !isNaN(iz)) {
         this.physicsSafeSet(pelvis, 'impulse', { x: ix, y: 0, z: iz });
      }
    }

    // Always solve Leg IK unless doing a specific leg strike
    if (f.state !== 'diving' && f.state.indexOf('slammed') === -1) {
        const time = performance.now() * 0.01;
        const speed = isPlayer && f.blockActive ? 0.8 : 1.5;
        const rHipOffset = new THREE.Vector3(-0.12, 0, 0).applyEuler(new THREE.Euler(0, pelvis.rotation().y || 0, 0));
        const lHipOffset = new THREE.Vector3(0.12, 0, 0).applyEuler(new THREE.Euler(0, pelvis.rotation().y || 0, 0));
        
        let rFootTarget, lFootTarget, rStrength = 800, lStrength = 800;
        
        if (moveSpeed > 0) {
            rFootTarget = new THREE.Vector3(
               pelvis.translation().x + rHipOffset.x + Math.sin(time * speed) * 0.5 * (dir.x/moveSpeed),
               Math.max(0, Math.sin(time * speed)) * 0.4 + 0.1,
               pelvis.translation().z + rHipOffset.z + Math.sin(time * speed) * 0.5 * (dir.z/moveSpeed)
            );
            lFootTarget = new THREE.Vector3(
               pelvis.translation().x + lHipOffset.x + Math.sin(time * speed + Math.PI) * 0.5 * (dir.x/moveSpeed),
               Math.max(0, Math.sin(time * speed + Math.PI)) * 0.4 + 0.1,
               pelvis.translation().z + lHipOffset.z + Math.sin(time * speed + Math.PI) * 0.5 * (dir.z/moveSpeed)
            );
            rStrength = Math.sin(time * speed) > 0 ? 1000 : 400;
            lStrength = Math.sin(time * speed + Math.PI) > 0 ? 1000 : 400;
        } else {
            rFootTarget = new THREE.Vector3(pelvis.translation().x + rHipOffset.x, 0.1, pelvis.translation().z + rHipOffset.z);
            lFootTarget = new THREE.Vector3(pelvis.translation().x + lHipOffset.x, 0.1, pelvis.translation().z + lHipOffset.z);
        }

        // Only override legs if not kicking
        if (!f.strikeType?.includes('Kick') && !f.strikeType?.includes('stomp') || f.state !== 'striking') {
            this.applyIK(f, ['rThigh', 'rCalf', 'rFoot'], rFootTarget, rStrength);
            this.applyIK(f, ['lThigh', 'lCalf', 'lFoot'], lFootTarget, lStrength);
        }
    }

    // Arm IK based on state
    if (f.state === 'standing' || f.state === 'blocking') {
        const time = performance.now() * (moveSpeed > 0 ? 0.01 : 0.003);
        const speed = isPlayer && f.blockActive ? 0.8 : 1.5;
        const opp = f === this.player1 ? this.player2 : this.player1;
        const faceDir = new THREE.Vector3().subVectors(opp.bodies.get('pelvis')?.translation() || new THREE.Vector3(), pelvis.translation()).normalize();
        
        if (moveSpeed > 0 && !f.blockActive) {
            const rArmTarget = new THREE.Vector3(
               pelvis.translation().x + (dir.x/moveSpeed) * 0.5 + Math.sin(time * speed + Math.PI) * 0.5,
               1.2,
               pelvis.translation().z + (dir.z/moveSpeed) * 0.5 + Math.cos(time * speed + Math.PI) * 0.5
            );
            const lArmTarget = new THREE.Vector3(
               pelvis.translation().x + (dir.x/moveSpeed) * 0.5 + Math.sin(time * speed) * 0.5,
               1.2,
               pelvis.translation().z + (dir.z/moveSpeed) * 0.5 + Math.cos(time * speed) * 0.5
            );
            this.applyIK(f, ['rClav', 'rUpperArm', 'rLowerArm', 'rHand'], rArmTarget, 200);
            this.applyIK(f, ['lClav', 'lUpperArm', 'lLowerArm', 'lHand'], lArmTarget, 200);
        } else if (!f.blockActive) {
            const rArmTarget = new THREE.Vector3(
               pelvis.translation().x + faceDir.z * 0.3,
               1.6 + Math.sin(time) * 0.05,
               pelvis.translation().z - faceDir.x * 0.3
            );
            const lArmTarget = new THREE.Vector3(
               pelvis.translation().x + faceDir.x * 0.4 - faceDir.z * 0.3,
               1.5 + Math.cos(time) * 0.05,
               pelvis.translation().z + faceDir.z * 0.4 + faceDir.x * 0.3
            );
            this.applyIK(f, ['rClav', 'rUpperArm', 'rLowerArm', 'rHand'], rArmTarget, 150);
            this.applyIK(f, ['lClav', 'lUpperArm', 'lLowerArm', 'lHand'], lArmTarget, 150);
        }
    }
  }

  playAnimation(player: any, animName: string, blendDuration = 0.2, timeScale = 1.0) {
      if (!player.mixer || !player.actions) return;
      const targetKey = Object.keys(player.actions).find(k => k.includes(animName.toLowerCase()));
      if (!targetKey) return;
      const newAction = player.actions[targetKey];
      if (player.currentAction !== newAction) {
          if (player.currentAction) player.currentAction.fadeOut(blendDuration);
          newAction.reset().setEffectiveTimeScale(timeScale).fadeIn(blendDuration).play();
          player.currentAction = newAction;
      }
  }

  updateAI() {
    if (this.player2.health <= 0) return;

    // AI Superpower triggering occasionally if standing
    if (this.player2.superheroConfig && this.player2.state === 'standing' && Math.random() < 0.015) {
       this.triggerSuperheroPower(this.player2);
    }

    if (this.player2.state === 'turnbuckle_top' && Math.random() < 0.05) {
       this.attemptContextAction(this.player2);
       return;
    }
    if (this.player2.state === 'grounded' && Math.random() < 0.03) {
       this.attemptGetUp(this.player2);
       return;
    }
    if (this.player2.state !== 'standing') return;
    
    const dist = new THREE.Vector3(
       this.player2.bodies.get('pelvis').translation().x, 0, this.player2.bodies.get('pelvis').translation().z
    ).distanceTo(new THREE.Vector3(
       this.player1.bodies.get('pelvis').translation().x, 0, this.player1.bodies.get('pelvis').translation().z
    ));

    if (dist < 2.5 && Math.random() < 0.05) {
      const moves = ['rightPunch', 'leftPunch', 'rightKick', 'elbow'];
      this.startStrike(this.player2, moves[Math.floor(Math.random() * moves.length)], Math.random() > 0.65);
    } else if (dist < 1.6 && Math.random() < 0.03) {
      this.attemptContextAction(this.player2);
    } else if (dist < 2.0 && Math.random() < 0.02) {
       this.player2.targetZone = ['head', 'body', 'legs'][Math.floor(Math.random()*3)];
    }
  }

  resetMatch() {
     [this.player1, this.player2].forEach((f, i) => {
        f.health = f.maxHealth;
        f.stamina = 100;
        f.state = 'standing';
        
        // Reset positions
        const xOffset = i === 0 ? -1.8 : 1.8;
        f.bodies.forEach((body: RAPIER.RigidBody, name: string) => {
           const orig = f.origPositions.get(name) || {x: 0, y: 1.5, z: 0};
           this.physicsSafeSet(body, 'translation', {x: xOffset + orig.x, y: orig.y + 1.0, z: orig.z});
           this.physicsSafeSet(body, 'linvel', {x:0,y:0,z:0});
           this.physicsSafeSet(body, 'angvel', {x:0,y:0,z:0});
           this.physicsSafeSet(body, 'rotation', {x:0,y:0,z:0,w:1});
        });
     });
  }

  animate = (time: number) => {
    if (!this.active) return;
    
    // Safety check - if camera isn't valid, don't try to render
    if (!this.camera || !this.renderer || !this.world || !this.scene) {
        this.rafId = requestAnimationFrame(this.animate);
        return;
    }
    
    const dtStr = (time - this.lastTime) / 1000;
    const dt = Math.max(0.001, Math.min(dtStr, 0.1));
    this.lastTime = time;
    if (isNaN(dt) || !isFinite(dt)) return;

    try {
       this.world.step();
    } catch(err) {
       console.error("Physics step error:", err);
       this.active = false;
       return;
    }

    
    const p1Input = new THREE.Vector3(0, 0, 0);
    if (this.keys['ArrowUp'] || this.keys['KeyW']) p1Input.z -= 1;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) p1Input.z += 1;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) p1Input.x -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) p1Input.x += 1;
    
    // Merge Virtual Joystick
    if (this.virtualMove.x !== 0 || this.virtualMove.y !== 0) {
        p1Input.x = this.virtualMove.x;
        p1Input.z = this.virtualMove.y;
    }

    if (this.camera && this.player1 && this.player1.kinematic) {
        this.player1.kinematic.updateController(dt, p1Input, this.camera.quaternion);
    }

    // Foot Plant IK & Balance Polish
    [this.player1, this.player2].forEach(p => {
       const pelvis = p.bodies.get('pelvis');
       if (pelvis) {
          const com = pelvis.translation();
          const pFeet = [p.bodies.get('lFoot'), p.bodies.get('rFoot')];
          
          pFeet.forEach(foot => {
             if (foot && foot.translation().y < 0.2) {
                 this.footPlantIK.enforceGrounding(foot, 150.0);
             }
          });

          // Compute average support center
          let supportX = com.x, supportZ = com.z;
          if (pFeet[0] && pFeet[1]) {
             supportX = (pFeet[0].translation().x + pFeet[1].translation().x) / 2;
             supportZ = (pFeet[0].translation().z + pFeet[1].translation().z) / 2;
          }
          this.balancePolish.evaluateCenterOfMass(com, {x: supportX, z: supportZ}, p);
       }
    });

    [this.player1, this.player2].forEach(p => {
      if (p.stamina < 100 && p.state !== 'striking') p.stamina = Math.min(100, p.stamina + 0.28);
      
      // Apply custom gravity per hero
      if (p.superheroConfig) {
         const gravityFactor = p.superheroConfig.stats.gravity;
         if (gravityFactor !== 1.0) {
            const gravityDiff = (-9.81 * gravityFactor) - (-9.81);
            p.bodies.forEach((body: RAPIER.RigidBody) => {
               const mass = body.mass() || 5.0;
               this.physicsSafeSet(body, 'impulse', { x: 0, y: mass * gravityDiff * dt, z: 0 });
            });
         }

         // Update dynamic flowing cape rotation based on velocity
         if (p.capeMesh) {
            const pelvis = p.bodies.get('pelvis');
            if (pelvis) {
               const vel = pelvis.linvel();
               const speedZ = vel.z || 0;
               const speedX = vel.x || 0;
               const speedY = vel.y || 0;
               p.capeMesh.rotation.x = 0.1 + Math.max(-0.4, Math.min(1.2, speedZ * 0.15)) - Math.max(0, speedY * 0.05);
               p.capeMesh.rotation.z = -speedX * 0.08;
               const wave = Math.sin(performance.now() * 0.012 + (p === this.player1 ? 0 : Math.PI)) * 0.06;
               p.capeMesh.rotation.x += wave;
            }
         }
      }

      this.applyActiveRagdoll(p, p === this.player1);
    });

    // Update active flying projectiles (Crescent throws, etc.)
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
       const proj = this.activeProjectiles[i];
       const pos = proj.body.translation();
       const rot = proj.body.rotation();
       
       if (performance.now() - proj.born > 5000 || !Number.isFinite(pos.x)) {
          this.scene.remove(proj.mesh);
          proj.mesh.geometry.dispose();
          (proj.mesh.material as THREE.Material).dispose();
          this.world.removeRigidBody(proj.body);
          this.activeProjectiles.splice(i, 1);
          continue;
       }

       proj.mesh.position.set(pos.x, pos.y, pos.z);
       proj.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);

       // Check collision distance with opponents
       let projectileHit = false;
       for (const p of [this.player1, this.player2]) {
          // Prevent hitting self immediately after throw
          if (performance.now() - proj.born < 250) {
             continue;
          }
          
          const pelvis = p.bodies.get('pelvis');
          if (pelvis) {
             const pPos = pelvis.translation();
             const d = new THREE.Vector3(pos.x, pos.y, pos.z).distanceTo(new THREE.Vector3(pPos.x, pPos.y, pPos.z));
             if (d < 0.95) {
                p.health = Math.max(0, p.health - proj.damage);
                p.lastHitTime = performance.now();
                this.startKnockdownSequence(p);
                this.spawnHitSparks(new THREE.Vector3(pos.x, pos.y, pos.z), false, 2.0);
                projectileHit = true;
                break;
             }
          }
       }

       if (projectileHit) {
          this.scene.remove(proj.mesh);
          proj.mesh.geometry.dispose();
          (proj.mesh.material as THREE.Material).dispose();
          this.world.removeRigidBody(proj.body);
          this.activeProjectiles.splice(i, 1);
       }
    }

    this.updateDefense(this.player1, true);
    this.updateMovement(this.player1, true);
    this.updateMovement(this.player2, false);

    const shift = this.keys['ShiftLeft'] || this.keys['LT'];

    if (this.keys['LT']) {
       this.keys['LT'] = false;
       this.attemptContextAction(this.player1);
    }

    if (this.keys['KeyX'] || this.keys['BtnX']) {
       this.startStrike(this.player1, 'rightPunch', shift);
       this.keys['BtnX'] = false;
    }
    if (this.keys['KeyG'] || this.keys['LB']) { // Grapple trigger
       this.attemptGrapple(this.player1, this.player2);
       this.keys['KeyG'] = false;
       this.keys['LB'] = false;
    }
    if (this.keys['KeyY'] || this.keys['BtnY']) {
       this.startStrike(this.player1, 'leftPunch', shift);
       this.keys['BtnY'] = false;
    }
    if (this.keys['KeyA'] || this.keys['BtnA']) {
       this.startStrike(this.player1, 'rightKick', shift);
       this.keys['BtnA'] = false;
    }
    if (this.keys['KeyB'] || this.keys['BtnB']) {
       this.startStrike(this.player1, 'leftKick', shift);
       this.keys['BtnB'] = false;
    }
    
    if (this.keys['KeyV']) {
       if (this.player1.kinematic) {
           this.player1.kinematic.setFlightMode(!this.player1.kinematic.isFlying);
           if (this.player1.kinematic.isFlying && this.effekseerVfx) {
               // Activate wind distortion ring or trail
               this.player1.flightWindHandle = this.effekseerVfx.triggerEffect('wind_distortion', this.player1.group.position, 1.5);
           } else if (!this.player1.kinematic.isFlying && this.effekseerVfx && this.player1.flightWindHandle) {
               // Assuming a method exists to stop it or let it die out
               this.player1.flightWindHandle = null;
           }
       }
       this.keys['KeyV'] = false;
    }

    if (this.keys['KeyF'] || this.keys['KeyP'] || this.keys['BtnPower']) {
       this.triggerSuperheroPower(this.player1);
       this.keys['BtnPower'] = false;
       this.keys['KeyF'] = false;
       this.keys['KeyP'] = false;
    }
    if (this.keys['KeyK'] || this.keys['BtnRB']) {
      if (this.player1.state === 'grounded') this.groundedStomp(this.player1);
      else {
         this.startStrike(this.player1, Math.random() > 0.5 ? 'elbow' : 'knee', shift);
      }
      this.keys['BtnRB'] = false;
    }
    
    // Targeting cycle
    if (this.keys['KeyT'] || this.keys['BtnRT']) {
      this.keys['KeyT'] = false;
      this.keys['BtnRT'] = false;
      
      const zones = ['head', 'body', 'legs'];
      let idx = zones.indexOf(this.player1.targetZone);
      this.player1.targetZone = zones[(idx + 1) % 3];
    }
    
    if (this.keys['KeyR'] || this.keys['BtnStart']) {
       if (this.player1.state === 'grounded') {
          this.attemptGetUp(this.player1);
       } else if (this.keys['BtnStart']) {
          // Manual reset if start pressed
          this.resetMatch();
       }
       this.keys['BtnStart'] = false;
    }

    this.updateAI();

    // Sync visuals
    [this.player1, this.player2].forEach(f => {
      f.bodies.forEach((body: RAPIER.RigidBody, name: string) => {
        const mesh = f.bones.get(name);
        const pos = body.translation();
        const rot = body.rotation();
        if (Number.isFinite(pos.x) && Number.isFinite(rot.x)) {
          if (mesh && mesh.visible !== false) {
            mesh.position.set(pos.x, pos.y, pos.z);
            mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
          }
        }
      });
      
      // Update custom GLTF skin using the calculated mappings
      if (f.customBoneMap && f.customBoneMap.length > 0) {
          if (f.mixer) {
              const pelvis = f.bodies.get('pelvis');
              if (pelvis && f.customModel) {
                  const pos = pelvis.translation();
                  if (Number.isFinite(pos.x)) {
                      f.customModel.position.set(pos.x, pos.y - 1.0, pos.z);
                      
                      const linvel = pelvis.linvel();
                      if (Math.abs(linvel.x) > 0.5 || Math.abs(linvel.z) > 0.5) {
                          const angle = Math.atan2(linvel.x, linvel.z);
                          // Smooth rotation towards velocity vector
                          const targetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                          f.customModel.quaternion.slerp(targetQuat, 0.1);
                      }
                  }
              }
          } else {
              f.customBoneMap.forEach((mapping: any) => {
                  const body = f.bodies.get(mapping.bodyName);
                  if (body) {
                      const pos = body.translation();
                      const rot = body.rotation();
                      if (Number.isFinite(pos.x) && Number.isFinite(rot.x)) {
                          const bodyQuat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
                          const targetQuat = bodyQuat.multiply(mapping.offsetQuat);
                          
                          const parentWorldQuat = new THREE.Quaternion();
                          if (mapping.bone.parent) {
                              mapping.bone.parent.getWorldQuaternion(parentWorldQuat);
                          }
                          
                          // rotation
                          const localQuat = parentWorldQuat.clone().invert().multiply(targetQuat);
                          mapping.bone.quaternion.copy(localQuat);
                          
                          // translation (root only)
                          if (mapping.isRoot) {
                              const bodyPos = new THREE.Vector3(pos.x, pos.y, pos.z);
                              const targetPos = bodyPos.add(mapping.bodyToBoneOffset);
                              const parentWorld = mapping.bone.parent ? mapping.bone.parent.matrixWorld : new THREE.Matrix4();
                              const localPos = targetPos.applyMatrix4(parentWorld.clone().invert());
                              mapping.bone.position.copy(localPos);
                          }
                          
                          mapping.bone.updateMatrix();
                          mapping.bone.updateMatrixWorld(true);
                      }
                  }
              });
          }
      } else {
        // Synchronize legacy group wrapper if no bone map
        const pelvis = f.bodies.get('pelvis');
        if (pelvis) {
           const pos = pelvis.translation();
           const rot = pelvis.rotation();
           if (Number.isFinite(pos.x) && Number.isFinite(rot.x)) {
              f.group.position.set(pos.x, pos.y - 0.92, pos.z); // -0.92 is pelvis offset
              f.group.quaternion.set(rot.x, rot.y, rot.z, rot.w);
           }
        }
      }
    });

    this.weapons.forEach((w, index) => {
       // If held, sync with hand and don't calculate natural physics
       let isHeld = false;
       [this.player1, this.player2].forEach(p => {
           if (p.heldWeapon === w) {
               isHeld = true;
               const hand = p.bodies.get('rHand')?.translation();
               if (hand) {
                   w.mesh.position.set(hand.x, hand.y + 0.5, hand.z);
                   // Keep physics body hidden to avoid collisions while held
                   this.physicsSafeSet(w.body, 'translation', { x: 0, y: -100, z: 0 });
                   this.physicsSafeSet(w.body, 'linvel', { x: 0, y: 0, z: 0 });
                   this.physicsSafeSet(w.body, 'angvel', { x: 0, y: 0, z: 0 });
               }
           }
       });
       
       if (isHeld) return;

       const pos = w.body.translation();
       const rot = w.body.rotation();
       if (Number.isFinite(pos.x) && Number.isFinite(rot.x)) {
          w.mesh.position.set(pos.x, pos.y, pos.z);
          w.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
       }
       
       // Check for massive impact
       if (!w.broken && w.isTable) {
           [this.player1, this.player2].forEach(p => {
               if (p.state.startsWith('slammed') || p.state === 'diving') {
                   const pPos = p.bodies.get('pelvis')?.translation();
                   if (pPos && Math.abs(pPos.x - pos.x) < 1.0 && Math.abs(pPos.z - pos.z) < 0.6 && pPos.y < pos.y + 0.5) {
                       // Break the table
                       w.broken = true;
                       this.spawnHitSparks(new THREE.Vector3(pos.x, pos.y, pos.z), false, 3.0);
                       this.shakeIntensity = 2.0;
                       
                       // We can't safely remove bodies mid-step easily without rebuilding, so instead we shrink it and push it down
                       // Better yet, just explode the mesh visually into pieces and move physics body underground
                       const parts = w.mesh.children;
                       w.mesh.children = [];
                       this.scene.remove(w.mesh);
                       
                       // Spawn physics gibs
                       parts.forEach((part: any, i) => {
                           const px = pos.x + (Math.random()-0.5);
                           const py = pos.y + (Math.random());
                           const pz = pos.z + (Math.random()-0.5);
                           part.position.set(px, py, pz);
                           this.scene.add(part);
                           
                           // Create real rapier bodies for broken parts
                           const gibBody = this.world.createRigidBody(
                              RAPIER.RigidBodyDesc.dynamic()
                              .setTranslation(px, py, pz)
                              .setLinearDamping(0.5)
                              .setAngularDamping(0.5)
                           );
                           
                           let colDesc = RAPIER.ColliderDesc.cuboid(0.1, 0.4, 0.1);
                           if (i === 0) colDesc = RAPIER.ColliderDesc.cuboid(1.0, 0.05, 0.6); // Table top
                           colDesc.setCollisionGroups(0x0001FFFF).setSolverGroups(0x0001FFFF);
                           this.world.createCollider(colDesc, gibBody);
                           
                           gibBody.setLinvel({ x: (Math.random()-0.5)*15, y: 5 + Math.random()*10, z: (Math.random()-0.5)*15 }, true);
                           gibBody.setAngvel({ x: (Math.random()-0.5)*10, y: (Math.random()-0.5)*10, z: (Math.random()-0.5)*10 }, true);
                           
                           // Sync interval
                           const gibInterval = setInterval(() => {
                               if (!this.active) { clearInterval(gibInterval); return; }
                               const gPos = gibBody.translation();
                               const gRot = gibBody.rotation();
                               if (Number.isFinite(gPos.x)) {
                                  part.position.set(gPos.x, gPos.y, gPos.z);
                                  part.quaternion.set(gRot.x, gRot.y, gRot.z, gRot.w);
                               }
                           }, 16);
                       });
                       
                       // Remove table collision from way
                       this.physicsSafeSet(w.body, 'translation', { x: 100, y: -100, z: 100 });
                   }
               }
           });
       }
    });

    // Dynamic Camera
    const p1Pos = this.player1.bodies.get('pelvis')?.translation() || { x: 0, y: 1.5, z: 0 };
    const p2Pos = this.player2.bodies.get('pelvis')?.translation() || { x: 0, y: 1.5, z: 0 };
    
    // Boundary checks to prevent characters from falling forever or glitching out of bounds
    [this.player1, this.player2].forEach((p, index) => {
        const pelvis = p.bodies.get('pelvis');
        if (pelvis) {
            const pos = pelvis.translation();
            if (pos.y < -5.0 || Math.abs(pos.x) > 30.0 || Math.abs(pos.z) > 30.0) {
                // Teleport back to center and reset state
                const resetX = index === 0 ? -2 : 2;
                this.physicsSafeSet(pelvis, 'translation', { x: resetX, y: 3.0, z: 0 });
                this.physicsSafeSet(pelvis, 'linvel', { x: 0, y: 0, z: 0 });
                p.health = Math.max(0, p.health - 200); // Penalty for ring out
                p.state = 'grounded';
            }
        }
    });

    // Update Autonomic Systems
    [this.player1, this.player2].forEach(p => {
       if (p.facs) p.facs.updateAutonomic(p.health/p.maxHealth, p.stamina/100, p.autonomicSaturation);
       let stressGain = 0;
       if (p.state !== 'standing' && p.state !== 'grounded') stressGain += 8;
       if (p.stamina < 50) stressGain += 4;
       let cvel = p.bodies.get('pelvis')?.linvel() || {x:0,y:0,z:0};
       let speed = Math.sqrt(cvel.x*cvel.x + cvel.y*cvel.y + cvel.z*cvel.z);
       if (speed > 1.0) stressGain += speed * 2;
       
       if (stressGain > 0) {
          p.autonomicSaturation = Math.min(100, p.autonomicSaturation + stressGain * dt);
       } else {
          p.autonomicSaturation = Math.max(0, p.autonomicSaturation - 2.0 * dt);
       }
       p.metabolicHeat = p.autonomicSaturation / 100.0;
       
       p.shaderUniforms.forEach((u: any) => {
          u.metabolicHeat.value = p.metabolicHeat;
          if (u.volumetricBulgeForce.value > 0) {
              u.volumetricBulgeForce.value -= dt * 2.0;
              if (u.volumetricBulgeForce.value < 0) u.volumetricBulgeForce.value = 0;
          }
       });
    });

    // Update procedural audio driven by player 1 stress
    if (this.audioStarted) {
       this.audio.update(this.player1.autonomicSaturation, 100 - this.player1.stamina, dt);
    }
    
    this.updateUI({
      p1h: Math.floor(this.player1.health / 10),
      p1s: Math.floor(this.player1.stamina),
      p2h: Math.floor(this.player2.health / 10),
      p2s: Math.floor(this.player2.stamina),
      p1Zone: this.player1.targetZone,
      ko: this.player1.health <= 0 ? `${(this.player2.superheroConfig?.name || 'PLAYER 2').toUpperCase()} WINS` : this.player2.health <= 0 ? `${(this.player1.superheroConfig?.name || 'PLAYER 1').toUpperCase()} WINS` : null,
      debugMsg: `FPS:${Math.round(1/dt)} CamX:${this.camera?.position?.x?.toFixed(1)} P1X:${p1Pos.x?.toFixed(1)}`,
      autonomicSaturation: this.player1.autonomicSaturation,
      player1Name: this.player1.superheroConfig?.name || 'Nightguard',
      player2Name: this.player2.superheroConfig?.name || 'Skywire'
    });
    
    let midX = (p1Pos.x + p2Pos.x) / 2;
    let midY = (p1Pos.y + p2Pos.y) / 2;
    let midZ = (p1Pos.z + p2Pos.z) / 2;
    if (isNaN(midX) || !isFinite(midX)) midX = 0;
    if (isNaN(midY) || !isFinite(midY)) midY = 1.5;
    if (isNaN(midZ) || !isFinite(midZ)) midZ = 0;
    
    // Clamp the camera target so it doesn't leave the arena visually
    midX = Math.max(-15, Math.min(15, midX));
    midY = Math.max(0.5, Math.min(10, midY));
    midZ = Math.max(-15, Math.min(15, midZ));
    
    let dist = Math.sqrt(Math.pow(p1Pos.x - p2Pos.x, 2) + Math.pow(p1Pos.z - p2Pos.z, 2));
    if (isNaN(dist) || !isFinite(dist)) dist = 5;
    dist = Math.min(20, dist); // Clamp distance so camera doesn't zoom out infinitely

    const lookAtTarget = new THREE.Vector3(midX, Math.max(1.0, midY) + 0.5, midZ);
    
    
    // Chunk Manager Update
    if (this.chunkManager && this.player1 && this.player1.group) {
        this.chunkManager.update(this.player1.group.position);
    }

    // Third Person Camera Update
    if (this.tpCamera) {
        this.tpCamera.update(dt, this.virtualOrbit, this.world);
    }


    this.updateParticles(dt);
    if (this.vfx) this.vfx.update(dtStr);

    if (this.effekseerVfx) this.effekseerVfx.renderVfx(dtStr);


    [this.player1, this.player2].forEach(p => {
       if (p.mixer) {
           p.mixer.update(dtStr);
           // State machine to trigger animations
           if (p.state === 'standing' || p.state === 'recovery') {
               const linvel = p.bodies.get('pelvis')?.linvel();
               const speed = Math.sqrt((linvel?.x||0)**2 + (linvel?.z||0)**2);
               if (speed > 2.5) this.playAnimation(p, 'run', 0.2, speed * 0.3);
               else if (speed > 0.5) this.playAnimation(p, 'walk', 0.2, speed * 0.5);
               else this.playAnimation(p, 'idle', 0.2);
           } else if (p.state === 'windup' || p.state === 'striking') {
               this.playAnimation(p, 'punch', 0.1, 1.5);
           } else if (p.state === 'grounded') {
               this.playAnimation(p, 'death', 0.1);
           }
       }
    });

    this.renderer.render(this.scene, this.camera);
    if (this.active) {
       this.rafId = requestAnimationFrame(this.animate);
    }
  };

  loadModelFromURL(url: string, extension: string, targetPlayer: 'P1' | 'P2' = 'P1') {
    const onLoad = (object: any) => {
      let model = object.scene || object;
      model.scale.set(1.5, 1.5, 1.5);
      
      const player = targetPlayer === 'P1' ? this.player1 : this.player2;
      player.group.add(model);
      player.customModel = model;
      player.facs.bind(model);
      
      if (object.animations && object.animations.length > 0) {
          player.mixer = new THREE.AnimationMixer(model);
          object.animations.forEach((clip: any) => {
              const name = clip.name.toLowerCase();
              player.actions[name] = player.mixer.clipAction(clip);
          });
          const idle = player.actions['idle'] || player.actions['standing'] || player.actions['wait'] || Object.values(player.actions)[0];
          if (idle) {
              idle.play();
              player.currentAction = idle;
          }
      }

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
      this.updateUI({ debugMsg: `Loaded model from ${url} onto ${targetPlayer}` });
    };

    if (extension === 'glb' || extension === 'gltf') {
       const loader = new GLTFLoader();
       const dracoLoader = new DRACOLoader();
       dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
       loader.setDRACOLoader(dracoLoader);
       loader.load(url, onLoad, undefined, (e) => {
           console.error(e);
           this.updateUI({ debugMsg: `Error loading model: ${(e as Error)?.message || 'Unknown'}` });
       });
    }
  }

  loadCustomModel(file: File, isArena: boolean = false) {
    const url = URL.createObjectURL(file);
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    const onLoad = (object: any) => {
      let model = object.scene || object;
      if (isArena) {
         model.scale.set(5, 5, 5);
         model.position.set(0, 0, 0);
         this.scene.add(model);
      } else {
         model.scale.set(1.5, 1.5, 1.5);
         // Place model on the ground (y=0) to correctly calculate global bone offsets
         model.position.set(this.player1.group.position.x, 0, this.player1.group.position.z);
         this.scene.remove(this.player1.group);
         this.scene.add(model); // Move model outside to root
         
         this.player1.customModel = model;
         this.player1.customBoneMap = [];
         
         // Force update world matrices so we can calculate valid offsets
         model.updateMatrixWorld(true);
         
         const depth = (obj: any) => {
             let d = 0;
             let curr = obj;
             while(curr.parent) { d++; curr = curr.parent; }
             return d;
         };
         
         const mapNames = new Map<string, string>();
         model.traverse((child: any) => {
             if (child.isBone) {
                 const name = child.name.toLowerCase();
                 let targetBody = '';
                 
                 // Handle mixamo, VRoid, standard conventions
                 if (name.includes('hip') || name.includes('pelvis')) targetBody = 'pelvis';
                 else if (name.includes('spine') || name.includes('chest') || name.includes('torso')) {
                     if (!mapNames.has('lowerSpine')) targetBody = 'lowerSpine';
                     else if (!mapNames.has('midSpine')) targetBody = 'midSpine';
                     else targetBody = 'upperSpine';
                 }
                 else if (name.includes('neck')) targetBody = 'neck';
                 else if (name.includes('head')) targetBody = 'head';
                 else if (name.includes('shoulder') || name.includes('clavicle')) {
                     targetBody = (name.includes('left') || name.includes('_l')) ? 'lClav' : 'rClav';
                 }
                 else if (name.includes('arm') && (name.includes('up') || name.includes('upper'))) {
                     targetBody = (name.includes('left') || name.includes('_l')) ? 'lUpperArm' : 'rUpperArm';
                 }
                 else if ((name.includes('arm') || name.includes('fore')) && (name.includes('low') || name.includes('lower'))) {
                     targetBody = (name.includes('left') || name.includes('_l')) ? 'lLowerArm' : 'rLowerArm';
                 }
                 else if (name.includes('hand')) {
                     targetBody = (name.includes('left') || name.includes('_l')) ? 'lHand' : 'rHand';
                 }
                 else if (name.includes('leg') && (name.includes('up') || name.includes('upper') || name.includes('thigh'))) {
                     targetBody = (name.includes('left') || name.includes('_l')) ? 'lThigh' : 'rThigh';
                 }
                 else if ((name.includes('leg') || name.includes('calf')) && (name.includes('low') || name.includes('lower'))) {
                     targetBody = (name.includes('left') || name.includes('_l')) ? 'lCalf' : 'rCalf';
                 }
                 else if (name.includes('foot') || name.includes('toe')) {
                     targetBody = (name.includes('left') || name.includes('_l')) ? 'lFoot' : 'rFoot';
                 }

                 if (targetBody && !mapNames.has(targetBody)) {
                     mapNames.set(targetBody, name);
                     child.matrixAutoUpdate = false; // Manually drive
                     
                     const body = this.player1.bodies.get(targetBody);
                     if (body) {
                         const bodyRot = body.rotation();
                         const bodyWorldQuat = new THREE.Quaternion(bodyRot.x, bodyRot.y, bodyRot.z, bodyRot.w);
                         
                         const boneWorldQuat = new THREE.Quaternion();
                         child.getWorldQuaternion(boneWorldQuat);
                         
                         // Diff between physics body rest rot and bone rest rot
                         const offsetQuat = bodyWorldQuat.clone().invert().multiply(boneWorldQuat);
                         
                         const bodyPos = body.translation();
                         const bodyWorldPos = new THREE.Vector3(bodyPos.x, bodyPos.y, bodyPos.z);
                         const boneWorldPos = new THREE.Vector3();
                         child.getWorldPosition(boneWorldPos);
                         
                         this.player1.customBoneMap.push({
                             bone: child,
                             bodyName: targetBody,
                             offsetQuat: offsetQuat,
                             isRoot: targetBody === 'pelvis',
                             bodyToBoneOffset: boneWorldPos.sub(bodyWorldPos),
                             depth: depth(child)
                         });
                     }
                 }
             }
         });
         
         // Sort bones by depth top-down (root to leaves)
         this.player1.customBoneMap.sort((a: any, b: any) => a.depth - b.depth);
         
         // In case the model has built-in animations, don't let them override physics
         if (object.animations && object.animations.length > 0) {
            console.log("Model has animations, but using procedural active ragdoll instead.");
         }
         
         // Hide original capsules
         this.player1.bones.forEach((mesh: THREE.Mesh) => mesh.visible = false);
      }
      this.updateUI({ debugMsg: `Loaded ${file.name}` });
    };

    if (extension === 'glb' || extension === 'gltf') {
       const loader = new GLTFLoader();
       const dracoLoader = new DRACOLoader();
       dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
       loader.setDRACOLoader(dracoLoader);
       loader.load(url, onLoad, undefined, (e) => {
           console.error(e);
           this.updateUI({ debugMsg: `Error loading model: ${(e as Error)?.message || 'Unknown'}` });
       });
    } else if (extension === 'fbx') {
       const loader = new FBXLoader();
       loader.load(url, onLoad, undefined, (e) => console.error(e));
    }
  }

  applySuperheroStyle(f: any, config: SuperheroConfig) {
    if (!f) return;
    f.superheroConfig = config;
    f.maxHealth = config.stats.maxHealth;
    f.health = config.stats.maxHealth;

    // Remove old cowl ears
    if (f.cowlEars) {
       f.cowlEars.forEach((ear: THREE.Mesh) => {
          if (ear.parent) ear.parent.remove(ear);
       });
    }
    f.cowlEars = [];

    // Remove old cape
    if (f.capeMesh) {
       if (f.capeMesh.parent) f.capeMesh.parent.remove(f.capeMesh);
       f.capeMesh = null;
    }

    // Remove old chest logo
    if (f.chestLogoMesh) {
       if (f.chestLogoMesh.parent) f.chestLogoMesh.parent.remove(f.chestLogoMesh);
       f.chestLogoMesh = null;
    }

    // Remove old belt
    if (f.utilityBeltMesh) {
       if (f.utilityBeltMesh.parent) f.utilityBeltMesh.parent.remove(f.utilityBeltMesh);
       f.utilityBeltMesh = null;
    }

    const primary = parseInt(config.primaryColor);
    const accent = parseInt(config.accentColor);
    const headColor = parseInt(config.headColor);
    const gloveColor = parseInt(config.gloveColor);
    const feetColor = parseInt(config.feetColor);

    // Apply colors to base meshes
    f.bones.forEach((mesh: THREE.Mesh, name: string) => {
       let col = primary;
       if (name === 'head') col = headColor;
       else if (['lHand', 'rHand'].includes(name)) col = gloveColor;
       else if (['lFoot', 'rFoot'].includes(name)) col = feetColor;
       else if (['lThigh', 'rThigh', 'lCalf', 'rCalf'].includes(name)) col = accent;
       else if (['lClav', 'rClav', 'lUpperArm', 'rUpperArm'].includes(name)) col = accent;

       if (mesh.material) {
          (mesh.material as THREE.MeshStandardMaterial).color.setHex(col);
          (mesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
       }
    });

    // pointed ears
    if (config.hasCowlEars) {
       const headMesh = f.bones.get('head');
       if (headMesh) {
          const earGeo = new THREE.ConeGeometry(0.04, 0.25, 4);
          const earMat = new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.5 });
          
          const leftEar = new THREE.Mesh(earGeo, earMat);
          leftEar.position.set(0.08, 0.16, 0);
          leftEar.rotation.z = -0.15;
          leftEar.castShadow = true;
          headMesh.add(leftEar);

          const rightEar = new THREE.Mesh(earGeo, earMat);
          rightEar.position.set(-0.08, 0.16, 0);
          rightEar.rotation.z = 0.15;
          rightEar.castShadow = true;
          headMesh.add(rightEar);

          f.cowlEars = [leftEar, rightEar];
       }
    }

    // cape
    if (config.hasCape) {
       const spineMesh = f.bones.get('upperSpine');
       if (spineMesh) {
          const capeCol = config.capeColor ? parseInt(config.capeColor) : accent;
          const capeGeo = new THREE.PlaneGeometry(0.7, 1.3, 4, 4);
          const capeMat = new THREE.MeshStandardMaterial({ 
             color: capeCol, 
             roughness: 0.8, 
             side: THREE.DoubleSide,
             metalness: 0.1 
          });
          
          const cape = new THREE.Mesh(capeGeo, capeMat);
          cape.position.set(0, -0.4, -0.16);
          cape.rotation.x = 0.1;
          cape.castShadow = true;
          spineMesh.add(cape);
          f.capeMesh = cape;
       }
    }

    // chest emblem logo
    if (config.chestLogo && config.chestLogo !== 'none') {
       const spineMesh = f.bones.get('upperSpine') || f.bones.get('midSpine');
       if (spineMesh) {
          const logoCol = config.emblemColor ? parseInt(config.emblemColor) : accent;
          const logoMat = new THREE.MeshStandardMaterial({ 
             color: logoCol, 
             emissive: logoCol, 
             emissiveIntensity: 0.2,
             roughness: 0.2 
          });

          let logoGeo;
          if (config.chestLogo === 'wings') {
             logoGeo = new THREE.BoxGeometry(0.24, 0.08, 0.03);
          } else if (config.chestLogo === 'orb') {
             logoGeo = new THREE.BoxGeometry(0.08, 0.12, 0.03);
          } else if (config.chestLogo === 'shield') {
             logoGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.03, 3);
          } else if (config.chestLogo === 'lightning') {
             logoGeo = new THREE.BoxGeometry(0.06, 0.18, 0.03);
          } else {
             logoGeo = new THREE.SphereGeometry(0.06, 8, 8);
          }

          const logoMesh = new THREE.Mesh(logoGeo, logoMat);
          logoMesh.position.set(0, 0.05, 0.16);
          if (config.chestLogo === 'shield') {
             logoMesh.rotation.x = Math.PI / 2;
             logoMesh.rotation.z = Math.PI;
          } else if (config.chestLogo === 'lightning') {
             logoMesh.rotation.z = -0.4;
          }
          logoMesh.castShadow = true;
          spineMesh.add(logoMesh);
          f.chestLogoMesh = logoMesh;
       }
    }

    // belt
    if (config.id === 'nightguard' || config.chestLogo === 'wings') {
       const pelvisMesh = f.bones.get('pelvis');
       if (pelvisMesh) {
          const beltGeo = new THREE.BoxGeometry(0.25, 0.05, 0.25);
          const beltMat = new THREE.MeshStandardMaterial({ color: 0xfdd835, roughness: 0.5 });
          const belt = new THREE.Mesh(beltGeo, beltMat);
          belt.position.set(0, 0, 0);
          pelvisMesh.add(belt);
          f.utilityBeltMesh = belt;
       }
    }

    // Force UI state sync
    this.updateUI({
       player1Name: this.player1.superheroConfig?.name || "Nightguard",
       player2Name: this.player2.superheroConfig?.name || "Skywire",
       player1Health: this.player1.health,
       player2Health: this.player2.health
    });
  }

  triggerSuperheroPower(fighter: any) {
     if (!fighter || fighter.state === 'grounded' || fighter.state.startsWith('stagger') || fighter.health <= 0) return;
     if (!fighter.superheroConfig) return;

     const power = fighter.superheroConfig.power;
     const now = performance.now();
     if (fighter.lastPowerTime && (now - fighter.lastPowerTime < power.cooldown)) return;
     
     fighter.lastPowerTime = now;
     fighter.stamina = Math.max(0, fighter.stamina - 20);

     if (this.audioStarted) {
        this.audio.playSynthesizedSfx(power.soundPitch || 600, power.type);
     }

     const opp = fighter === this.player1 ? this.player2 : this.player1;
     const pPos = fighter.bodies.get('pelvis')?.translation();
     const oppPos = opp.bodies.get('pelvis')?.translation();
     if (!pPos || !oppPos) return;

     let dirToOpp = new THREE.Vector3(oppPos.x - pPos.x, 0, oppPos.z - pPos.z);
     if (dirToOpp.lengthSq() > 0) dirToOpp.normalize();
     else dirToOpp.set(0, 0, 1);

     fighter.state = 'windup';
     setTimeout(() => { if (this.active && fighter.state === 'windup') fighter.state = 'standing'; }, 300);

     
     if (power.type === 'projectile') {
        const hand = fighter.bodies.get('rHand')?.translation() || pPos;

        if (this.effekseerVfx) {
           this.effekseerVfx.triggerEffect('laser', new THREE.Vector3(hand.x, hand.y, hand.z), 1.0);
        }
        const projGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 3);
        const projMat = new THREE.MeshStandardMaterial({ 
           color: parseInt(power.projectileColor), 
           emissive: parseInt(power.projectileColor),
           emissiveIntensity: 0.5,
           roughness: 0.2 
        });
        const projMesh = new THREE.Mesh(projGeo, projMat);
        projMesh.rotation.x = Math.PI / 2;
        projMesh.position.set(hand.x, hand.y + 0.2, hand.z);
        projMesh.castShadow = true;
        this.scene.add(projMesh);

        const projBody = this.world.createRigidBody(
           RAPIER.RigidBodyDesc.dynamic()
           .setTranslation(hand.x, hand.y + 0.2, hand.z)
           .setLinearDamping(0.1)
           .setAngularDamping(0)
           .setCcdEnabled(true)
        );

        const colDesc = RAPIER.ColliderDesc.ball(0.15)
           .setCollisionGroups(0x0001FFFF)
           .setSolverGroups(0x0001FFFF);
        this.world.createCollider(colDesc, projBody);

        this.physicsSafeSet(projBody, 'linvel', { x: dirToOpp.x * 20, y: 1.5, z: dirToOpp.z * 20 });
        this.physicsSafeSet(projBody, 'angvel', { x: 0, y: 35, z: 0 });

        const activeProj = {
           mesh: projMesh,
           body: projBody,
           damage: power.damage,
           born: now
        };
        this.activeProjectiles.push(activeProj);

     } else if (power.type === 'pull') {
        const hand = fighter.bodies.get('rHand')?.translation() || pPos;
        if (!Number.isFinite(hand.x) || !Number.isFinite(hand.y) || !Number.isFinite(hand.z)) return;
        const targetPos = new THREE.Vector3(oppPos.x, oppPos.y, oppPos.z);
        const startPos = new THREE.Vector3(hand.x, hand.y, hand.z);

        const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 });
        const lineGeo = new THREE.BufferGeometry().setFromPoints([startPos, targetPos]);
        const webLine = new THREE.Line(lineGeo, lineMat);
        this.scene.add(webLine);

        const oppPelvis = opp.bodies.get('pelvis');
        if (oppPelvis) {
           const pullDir = new THREE.Vector3().subVectors(startPos, targetPos).normalize();
           this.physicsSafeSet(oppPelvis, 'impulse', { x: pullDir.x * 55, y: 12, z: pullDir.z * 55 });
           
           opp.health = Math.max(0, opp.health - power.damage);
           opp.lastHitTime = now;
           this.startKnockdownSequence(opp);
           this.spawnHitSparks(targetPos, false, 1.5);
        }

        setTimeout(() => {
           this.scene.remove(webLine);
           lineGeo.dispose();
           lineMat.dispose();
        }, 350);

     } else if (power.type === 'beam') {
        const head = fighter.bodies.get('head')?.translation() || pPos;
        const startPos = new THREE.Vector3(head.x, head.y, head.z);
        const targetPos = new THREE.Vector3(oppPos.x, oppPos.y + 0.3, oppPos.z);

        const beamColor = parseInt(power.projectileColor);
        const dist = startPos.distanceTo(targetPos);
        const beamGeo = new THREE.CylinderGeometry(0.06, 0.06, dist, 8);
        const beamMat = new THREE.MeshBasicMaterial({ color: beamColor, transparent: true, opacity: 0.8 });
        const beam = new THREE.Mesh(beamGeo, beamMat);

        const midPoint = new THREE.Vector3().addVectors(startPos, targetPos).multiplyScalar(0.5);
        beam.position.copy(midPoint);
        const direction = new THREE.Vector3().subVectors(targetPos, startPos).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        beam.quaternion.copy(quat);
        this.scene.add(beam);

        const laserLight = new THREE.PointLight(beamColor, 8, 4);
        laserLight.position.copy(targetPos);
        this.scene.add(laserLight);

        const oppPelvis = opp.bodies.get('pelvis');
        if (oppPelvis) {
           this.physicsSafeSet(oppPelvis, 'impulse', { x: direction.x * 65, y: 10, z: direction.z * 65 });
           opp.health = Math.max(0, opp.health - power.damage);
           opp.lastHitTime = now;
           this.startKnockdownSequence(opp);
           this.spawnHitSparks(targetPos, false, 2.0);
        }

        setTimeout(() => {
           this.scene.remove(beam);
           this.scene.remove(laserLight);
           beamGeo.dispose();
           beamMat.dispose();
           laserLight.dispose();
        }, 400);

     } else if (power.type === 'blast') {
        const pelvis = fighter.bodies.get('pelvis');
        if (pelvis) {
           this.physicsSafeSet(pelvis, 'linvel', { x: dirToOpp.x * 5, y: 15, z: dirToOpp.z * 5 });
           fighter.state = 'diving';

           setTimeout(() => {
              if (!this.active) return;
              this.physicsSafeSet(pelvis, 'linvel', { x: 0, y: -30, z: 0 });

              setTimeout(() => {
                 if (!this.active) return;
                 const landPos = pelvis.translation();
                 const impactPt = new THREE.Vector3(landPos.x, 0.1, landPos.z);

                 const ringColor = parseInt(power.projectileColor);
                 const ringGeo = new THREE.RingGeometry(0.1, 0.4, 32);
                 const ringMat = new THREE.MeshBasicMaterial({ color: ringColor, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
                 const ring = new THREE.Mesh(ringGeo, ringMat);
                 ring.rotation.x = Math.PI / 2;
                 ring.position.copy(impactPt);
                 this.scene.add(ring);

                 const curOppPos = opp.bodies.get('pelvis')?.translation();
                 if (curOppPos) {
                    const blastDist = impactPt.distanceTo(new THREE.Vector3(curOppPos.x, curOppPos.y, curOppPos.z));
                    if (blastDist < 3.2) {
                       const blastDir = new THREE.Vector3(curOppPos.x - impactPt.x, 0, curOppPos.z - impactPt.z).normalize();
                       const oppPelvis = opp.bodies.get('pelvis');
                       if (oppPelvis) {
                          const blastForce = (1 - (blastDist / 3.2)) * 120;
                          this.physicsSafeSet(oppPelvis, 'impulse', { x: blastDir.x * blastForce, y: 16, z: blastDir.z * blastForce });
                          opp.health = Math.max(0, opp.health - power.damage * (1 - (blastDist / 3.2)));
                          opp.lastHitTime = now;
                          this.startKnockdownSequence(opp);
                          this.spawnHitSparks(new THREE.Vector3(curOppPos.x, curOppPos.y, curOppPos.z), false, 2.5);
                       }
                    }
                 }

                 let scale = 1.0;
                 const expandInt = setInterval(() => {
                    if (!this.active) { clearInterval(expandInt); return; }
                    scale += 0.4;
                    ring.scale.set(scale, scale, 1.0);
                    ringMat.opacity -= 0.1;
                    if (ringMat.opacity <= 0) {
                       this.scene.remove(ring);
                       ringGeo.dispose();
                       ringMat.dispose();
                       clearInterval(expandInt);
                    }
                 }, 30);

                 this.shakeIntensity = 3.0;
                 if (this.audioStarted) {
                    this.audio.playSynthesizedSfx(200, 'blast');
                 }

              }, 300);

           }, 400);
        }

     } else if (power.type === 'dash') {
        const pelvis = fighter.bodies.get('pelvis');
        if (pelvis) {
           this.physicsSafeSet(pelvis, 'linvel', { x: dirToOpp.x * 28, y: 2, z: dirToOpp.z * 28 });
           
           setTimeout(() => {
              if (!this.active) return;
              this.startStrike(fighter, 'rightPunch', true);

              const curOppPos = opp.bodies.get('pelvis')?.translation();
              if (curOppPos && pPos) {
                 const curDist = new THREE.Vector3(pPos.x, pPos.y, pPos.z).distanceTo(new THREE.Vector3(curOppPos.x, curOppPos.y, curOppPos.z));
                 if (curDist < 1.6) {
                    opp.health = Math.max(0, opp.health - power.damage);
                    opp.lastHitTime = now;
                    this.startKnockdownSequence(opp);
                    this.spawnHitSparks(new THREE.Vector3(curOppPos.x, curOppPos.y, curOppPos.z), false, 2.0);
                 }
              }
           }, 200);
        }
     }
  }

  cleanup() {
    this.active = false;
    window.removeEventListener('resize', this.onResize);
    try {
       this.container.removeChild(this.renderer.domElement);
    } catch(e) {}
    
    if (this.rafId) {
       cancelAnimationFrame(this.rafId);
    }
    
    setTimeout(() => {
      if (this.world) {
         this.world.free();
      }
    }, 100);
  }
}


export class BvhCombatManager {
  private playerMesh: THREE.Group;
  private world: RAPIER.World;

  constructor(playerMesh: THREE.Group, world: RAPIER.World) {
    this.playerMesh = playerMesh;
    this.world = world;
  }

  public executeMeleeHitreg(attackRange: number, attackRadius: number, damage: number, knockbackForce: number): void {
    // NOTE 2026-10-09: stubbed. The rapier3d-compat 0.19 API has no
    // world.projectShape / RAPIER.QueryFilter, and this method is never
    // called (GameEngine.bvhCombat is always null; strikes fall back to
    // checkHitDistance). Re-implement with world.intersectionsWithShape when
    // the BVH hit-reg path is actually wired up.
    console.log("executeMeleeHitreg: BVH shape sweep is a stub (unwired).");
  }
}
