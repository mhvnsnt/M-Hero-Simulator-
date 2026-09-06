import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

interface EngineViewportProps {
  isPlaying: boolean;
  loadout: any;
}

export default function EngineViewport({ isPlaying, loadout }: EngineViewportProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPlaying || !mountRef.current) return;

    let animationFrameId: number;
    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let world: RAPIER.World;
    let playerBody: RAPIER.RigidBody;
    let playerMesh: THREE.Mesh;
    const objectsToUpdate: { mesh: THREE.Mesh; body: RAPIER.RigidBody }[] = [];

    const keys = { w: false, a: false, s: false, d: false, space: false, q: false, e: false };
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (keys.hasOwnProperty(k)) keys[k as keyof typeof keys] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (keys.hasOwnProperty(k)) keys[k as keyof typeof keys] = false;
    };

    const init = async () => {
      await RAPIER.init();

      // 1. SCENE SETUP
      scene = new THREE.Scene();
      scene.background = new THREE.Color('#0a0a0a');
      scene.fog = new THREE.Fog('#0a0a0a', 15, 60);

      const width = mountRef.current!.clientWidth;
      const height = mountRef.current!.clientHeight;
      camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      mountRef.current!.appendChild(renderer.domElement);

      // 2. LIGHTING (Cinematic)
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0x4ade80, 1.5); // Emerald tint
      dirLight.position.set(10, 20, -10);
      dirLight.castShadow = true;
      dirLight.shadow.camera.top = 20;
      dirLight.shadow.camera.bottom = -20;
      dirLight.shadow.camera.left = -20;
      dirLight.shadow.camera.right = 20;
      scene.add(dirLight);

      const rimLight = new THREE.DirectionalLight(0xf43f5e, 1.0); // Rose tint
      rimLight.position.set(-10, 5, 10);
      scene.add(rimLight);

      // 3. RAPIER PHYSICS WORLD
      world = new RAPIER.World({ x: 0.0, y: -15.0, z: 0.0 }); // Slightly heavier gravity

      // Environment (Ground Grid)
      const groundDesc = RAPIER.RigidBodyDesc.fixed();
      const groundBody = world.createRigidBody(groundDesc);
      const groundCollider = RAPIER.ColliderDesc.cuboid(50.0, 0.5, 50.0);
      world.createCollider(groundCollider, groundBody);

      // Create a glowing Tron-like grid floor
      const gridHelper = new THREE.GridHelper(100, 50, 0x333333, 0x111111);
      gridHelper.position.y = -0.49;
      scene.add(gridHelper);

      // 4. BANNON KINEMATIC BODY (Player)
      const playerDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, 5, 0)
        .linearDamping(1.5) // Air resistance
        .angularDamping(5.0); // Stop infinite spinning
      playerBody = world.createRigidBody(playerDesc);
      const playerCollider = RAPIER.ColliderDesc.capsule(0.5, 0.5).setRestitution(0.2);
      world.createCollider(playerCollider, playerBody);

      playerMesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.5, 1, 4, 16),
        new THREE.MeshStandardMaterial({ 
          color: '#4ade80', 
          emissive: '#4ade80', 
          emissiveIntensity: 0.2,
          roughness: 0.2,
          metalness: 0.8
        })
      );
      playerMesh.castShadow = true;
      scene.add(playerMesh);

      // 5. ENEMIES (Procedural Active Ragdoll Stand-ins)
      // Represented as physics boxes that react to the impact values from the loadout
      const spawnEnemy = (x: number, z: number) => {
        const boxDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(x, 2, z);
        const boxBody = world.createRigidBody(boxDesc);
        const boxCollider = RAPIER.ColliderDesc.cuboid(0.5, 1.0, 0.5).setRestitution(0.5);
        world.createCollider(boxCollider, boxBody);

        const boxMesh = new THREE.Mesh(
          new THREE.BoxGeometry(1, 2, 1),
          new THREE.MeshStandardMaterial({ 
            color: '#f43f5e',
            roughness: 0.5,
            metalness: 0.1
          })
        );
        boxMesh.castShadow = true;
        boxMesh.receiveShadow = true;
        scene.add(boxMesh);
        objectsToUpdate.push({ mesh: boxMesh, body: boxBody });
      };

      for(let i=0; i<8; i++) {
        spawnEnemy((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20 - 10);
      }

      // Input Binding
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      const clock = new THREE.Clock();

      // 6. RENDER LOOP & C++ MODULE VISUALIZATION
      const renderLoop = () => {
        const delta = clock.getDelta();
        
        // Step Physics Engine
        world.step();

        // Sync Player Visuals
        const playerPos = playerBody.translation();
        const playerRot = playerBody.rotation();
        playerMesh.position.copy(playerPos as any);
        playerMesh.quaternion.copy(playerRot as any);

        // --- BANNON COMBAT & FLIGHT LOGIC VISUALIZATION ---
        // Calculate velocity for camera and flight dynamics
        const linVel = playerBody.linvel();
        const speed = Math.sqrt(linVel.x * linVel.x + linVel.y * linVel.y + linVel.z * linVel.z);

        const force = { x: 0, y: 0, z: 0 };
        const thrust = loadout.swingSpeed * 20.0; 

        if (keys.w) force.z -= thrust;
        if (keys.s) force.z += thrust;
        if (keys.a) force.x -= thrust;
        if (keys.d) force.x += thrust;
        if (keys.space) force.y += thrust * 1.5; // Flight Burst
        if (keys.q) force.y -= thrust; // Dive

        // Apply forces
        playerBody.applyImpulse(force, true);

        // --- BANNON ACTIVE RAGDOLL VISUALIZATION ---
        // Check distance to enemies. If close, simulate "Combat Snap" and hit
        objectsToUpdate.forEach(obj => {
          const pos = obj.body.translation();
          const dist = playerMesh.position.distanceTo(new THREE.Vector3(pos.x, pos.y, pos.z));
          
          if (dist < loadout.attackRange) {
             // Simulate a strike using the PD Stiffness weight from the loadout
             const knockback = loadout.ragdollStiffness / 100.0;
             const dir = new THREE.Vector3(pos.x - playerPos.x, 1.0, pos.z - playerPos.z).normalize();
             obj.body.applyImpulse({ x: dir.x * knockback, y: dir.y * knockback, z: dir.z * knockback }, true);
          }

          // Sync enemy visuals
          obj.mesh.position.copy(pos as any);
          obj.mesh.quaternion.copy(obj.body.rotation() as any);
        });

        // --- BANNON SPRING ARM CAMERA VISUALIZATION ---
        // Dynamically adjust FOV based on speed (Frame expansion)
        const targetFov = 75 + (speed * 0.8);
        camera.fov = THREE.MathUtils.lerp(camera.fov, Math.min(targetFov, 120), delta * 5.0);
        camera.updateProjectionMatrix();

        // Calculate trailing camera position
        const camDistance = 8.0 + (speed * 0.1); // Pull back when flying fast
        const targetCamPos = new THREE.Vector3(
            playerPos.x,
            playerPos.y + 4.0,
            playerPos.z + camDistance
        );
        
        // Smooth interpolation
        camera.position.lerp(targetCamPos, delta * 8.0);
        camera.lookAt(new THREE.Vector3(playerPos.x, playerPos.y + 1, playerPos.z));

        renderer.render(scene, camera);
        animationFrameId = requestAnimationFrame(renderLoop);
      };

      renderLoop();
    };

    init();

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (renderer && mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [isPlaying, loadout]);

  return (
    <div className="relative w-full h-full">
        <div ref={mountRef} className="absolute inset-0" />
        {/* Controls Overlay */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-6 py-3 rounded-xl border border-neutral-800 text-neutral-300 text-xs font-mono tracking-widest flex gap-6 z-20">
            <div><span className="text-emerald-400 font-bold">W A S D</span> FLY</div>
            <div><span className="text-emerald-400 font-bold">SPACE</span> ASCEND</div>
            <div><span className="text-emerald-400 font-bold">Q</span> DIVE</div>
            <div><span className="text-rose-400 font-bold">PROXIMITY</span> AUTO-STRIKE</div>
        </div>
    </div>
  );
}
