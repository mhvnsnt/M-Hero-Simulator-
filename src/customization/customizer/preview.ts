/**
 * customizer/preview.ts — the customizer's ZOOMABLE LIVE 3D preview.
 *
 * A standalone renderer (separate from the game mount): it loads the actual
 * roster fighter GLB via the repo's loader conventions (GLTFLoader +
 * MeshoptDecoder + assetUrl()), stages it under studio lighting on a dark
 * void, and applies the player's CustomBuild — eye color, morphs, hair,
 * accessories, face paint.
 *
 * Camera: drag to orbit, wheel / pinch to zoom, double-tap resets. Slow
 * auto-turntable while idle (pauses on interaction, resumes after 4s).
 * Idle motion: plays the model's first authored animation clip when one
 * exists, otherwise a subtle breathing sway.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { assetUrl } from "../../asset-base";
import { applyEyeColor } from "./eye-colors";
import { applyMorphs, resetMorphs } from "./morphs";
import {
  attachAccessory,
  detachAllAccessories,
  loadAccessoryManifests,
} from "./accessories";
import {
  applyFacePaintSpec,
  clearFacePaint,
  disposeFacePaint,
  facePaintAvailable,
  retouchFacePaint,
} from "./facepaint-adapter";
import { defaultBuild, type AccessoryManifest, type CustomBuild } from "./types";

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

const glbCache = new Map<string, THREE.Group>();

export interface PreviewStatus {
  loading: boolean;
  error: string | null;
  modelName: string | null;
}

export class CustomizerPreview {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private raf = 0;
  private modelRoot: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private modelFile: string | null = null;
  private build: CustomBuild;
  private yaw = 0.35;
  private pitch = 0.08;
  private distance = 3.2;
  private targetDistance = 3.2;
  /** Override for the camera look-at height as a fraction of model height (default 0.52 = chest). */
  private focusHeight: number | null = null;
  private lastInteract = 0;
  private disposed = false;
  private resizeObs: ResizeObserver | null = null;
  private manifests: AccessoryManifest[] | null = null;
  // Deferred face-paint material retouch (see facepaint-adapter note).
  // Set after paint applies; the render loop performs it once the deadline
  // passes, ensuring it runs during normal rendering (not inside an
  // evaluate/promise, where it has no effect).
  private paintRetouchRoot: THREE.Object3D | null = null;
  private paintRetouchAt = 0;
  private applyToken = 0;
  status: PreviewStatus = { loading: false, error: null, modelName: null };
  onStatus: (s: PreviewStatus) => void = () => {};

  constructor(private canvas: HTMLCanvasElement) {
    // preserveDrawingBuffer: true powers the "export portrait" capture —
    // the player can save a PNG of their build. Negligible cost on a menu screen.
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene.background = new THREE.Color(0x0a0910);
    this.scene.fog = new THREE.Fog(0x0a0910, 6, 14);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);

    // Studio lighting: warm key, cool rim, soft fill — the character performs.
    const key = new THREE.DirectionalLight(0xfff1dd, 2.6);
    key.position.set(2.2, 3.4, 2.6);
    const rim = new THREE.DirectionalLight(0x7aa2ff, 1.6);
    rim.position.set(-2.6, 2.2, -2.4);
    const fill = new THREE.HemisphereLight(0x8a7f9e, 0x0b0a12, 0.9);
    this.scene.add(key, rim, fill);

    // Ground shadow-catcher.
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 48),
      new THREE.ShadowMaterial({ opacity: 0.45 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);

    this.wireInput(canvas);
    this.resize();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas);
    this.build = defaultBuild("", "");
    this.lastInteract = performance.now();
    this.loop();
  }

  // -- model loading ------------------------------------------------------

  /** Load a fighter attire GLB (cached), then apply the current build. */
  async loadFighter(fighterId: string, attireFile: string): Promise<void> {
    const token = ++this.applyToken;
    this.setStatus({ loading: true, error: null, modelName: attireFile });
    try {
      let scene = glbCache.get(attireFile);
      if (!scene) {
        const gltf = await loader.loadAsync(assetUrl(`models/cast/${attireFile}`));
        scene = gltf.scene;
        (scene as THREE.Group & { __clips?: THREE.AnimationClip[] }).__clips = gltf.animations;
        glbCache.set(attireFile, scene);
      }
      if (token !== this.applyToken || this.disposed) return;
      if (this.modelRoot) {
        disposeFacePaint(this.modelRoot);
        this.scene.remove(this.modelRoot);
        this.mixer?.stopAllAction();
        this.mixer = null;
      }
      // Clone the cached scene so per-model clones (iris) never leak across fighters.
      const { clone: cloneRig } = await import("three/examples/jsm/utils/SkeletonUtils.js");
      const root = cloneRig(scene) as THREE.Group;
      // The accessory loader reads this for per-character head-fit transforms.
      (root.userData as Record<string, unknown>).fighterId = fighterId;
      root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.frustumCulled = true;
        }
      });
      this.modelRoot = root;
      this.modelFile = attireFile;
      this.scene.add(root);

      // Create the mixer now but start the idle clip AFTER applyBuild: the
      // face-paint decal binds in bind pose (paint lane contract).
      const clips = (scene as THREE.Group & { __clips?: THREE.AnimationClip[] }).__clips ?? [];
      let idleClip: THREE.AnimationClip | null = null;
      if (clips.length > 0) {
        this.mixer = new THREE.AnimationMixer(root);
        idleClip =
          clips.find((c) => /idle|breath|stand/i.test(c.name)) ?? clips[0];
      }

      this.centerModel();
      await this.applyBuild(this.build.fighterId === fighterId ? this.build : defaultBuild(fighterId, ""));
      if (token !== this.applyToken || this.disposed) return;
      if (this.mixer && idleClip) this.mixer.clipAction(idleClip).play();
      this.setStatus({ loading: false, error: null, modelName: attireFile });
    } catch (e) {
      if (token !== this.applyToken || this.disposed) return;
      this.setStatus({
        loading: false,
        error: `Could not load ${attireFile}`,
        modelName: null,
      });
      console.error("Customizer preview load failed:", e);
    }
  }

  /** Load a procedural fighter (M-Hero): clone the live body-part meshes into
   * a group for the studio preview. The clone is static (current pose);
   * accessories/morphs apply live. */
  async loadProceduralFighter(meshes: THREE.Mesh[], fighterId: string): Promise<void> {
    const token = ++this.applyToken;
    this.setStatus({ loading: true, error: null, modelName: fighterId });
    try {
      if (this.modelRoot) {
        disposeFacePaint(this.modelRoot);
        this.scene.remove(this.modelRoot);
        this.mixer?.stopAllAction();
        this.mixer = null;
      }
      const root = new THREE.Group();
      for (const m of meshes) {
        const c = m.clone();
        // Preserve the live world transform on the clone.
        c.position.copy(m.position);
        c.quaternion.copy(m.quaternion);
        c.scale.copy(m.scale);
        // Use a clean material (the game's onBeforeCompile shader doesn't
        // survive the preview renderer) preserving the authored color.
        const srcMat = m.material as THREE.MeshStandardMaterial;
        let colorHex = 0x4488ff;
        if (srcMat && (srcMat as unknown as { isMeshStandardMaterial?: boolean }).isMeshStandardMaterial) {
          const sc = (srcMat as THREE.MeshStandardMaterial).color;
          if (sc) colorHex = sc.getHex();
        }
        // eslint-disable-next-line no-console
        c.material = new THREE.MeshStandardMaterial({
          color: colorHex,
          roughness: 0.6,
          metalness: 0.1,
        });
        root.add(c);
      }
      (root.userData as Record<string, unknown>).fighterId = fighterId;
      (root.userData as Record<string, unknown>).customMeshes = [...root.children];
      root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.frustumCulled = true;
        }
      });
      this.modelRoot = root;
      this.modelFile = fighterId;
      this.scene.add(root);
      if (token !== this.applyToken || this.disposed) return;
      this.centerModel();
      await this.applyBuild(this.build.fighterId === fighterId ? this.build : defaultBuild(fighterId, ""));
      if (token !== this.applyToken || this.disposed) return;
      this.setStatus({ loading: false, error: null, modelName: fighterId });
    } catch (e) {
      if (token !== this.applyToken || this.disposed) return;
      this.setStatus({
        loading: false,
        error: `Could not load ${fighterId}`,
        modelName: null,
      });
      console.error("Customizer preview load failed:", e);
    }
  }

  /** Frame the model: feet at y=0, camera aimed at chest height. */
  private centerModel(): void {
    const root = this.modelRoot;
    if (!root) return;
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    if (!isFinite(box.min.y)) return;
    root.position.y -= box.min.y;
    const height = box.max.y - box.min.y;
    this.targetDistance = THREE.MathUtils.clamp(height * 1.9, 2.2, 5.2);
    this.distance = this.targetDistance;
  }

  // -- build application ----------------------------------------------------

  async applyBuild(build: CustomBuild): Promise<void> {
    const token = ++this.applyToken;
    this.build = structuredClone(build);
    const root = this.modelRoot;
    if (!root) return;

    // Order matters: morphs first (bone scales), then eye color (material),
    // then accessories (bone attach), then face paint (texture/decal).
    resetMorphs(root);
    applyMorphs(root, this.build.morphs);
    applyEyeColor(root, this.build.eyeColor);

    detachAllAccessories(root);
    if (!this.manifests) this.manifests = await loadAccessoryManifests();
    if (token !== this.applyToken || this.disposed) return;
    const wanted = Object.values(this.build.accessories).filter(Boolean) as string[];
    for (const id of wanted) {
      const manifest = this.manifests.find((m) => m.id === id);
      if (manifest) {
        await attachAccessory(root, manifest).catch(() => null);
        if (token !== this.applyToken || this.disposed) return;
      }
    }

    const paint = this.build.facePaint;
    clearFacePaint(root);
    if (paint && facePaintAvailable(this.build.fighterId)) {
      const errors = await applyFacePaintSpec(root, this.build.fighterId, paint).catch((e) => [
        String(e),
      ]);
      if (errors.length > 0) console.warn("Customizer face paint failed:", errors);
      // First-paint material stabilization: defer to the render loop.
      this.paintRetouchRoot = root;
      this.paintRetouchAt = performance.now() + 1500;
    }
  }

  /** Incremental face-paint change without re-applying the whole build. */
  async setFacePaint(spec: string | null): Promise<void> {
    this.build.facePaint = spec;
    const root = this.modelRoot;
    if (!root) return;
    if (!spec || !facePaintAvailable(this.build.fighterId)) {
      clearFacePaint(root);
      return;
    }
    const errors = await applyFacePaintSpec(root, this.build.fighterId, spec).catch((e) => [
      String(e),
    ]);
    if (errors.length > 0) console.warn("Customizer face paint failed:", errors);
    // First-paint material stabilization: defer to the render loop.
    this.paintRetouchRoot = root;
    this.paintRetouchAt = performance.now() + 1500;
  }

  /** Incremental eye-color change without re-applying the whole build. */
  setEyeColor(eyeColorId: string): void {
    this.build.eyeColor = eyeColorId;
    if (this.modelRoot) applyEyeColor(this.modelRoot, eyeColorId);
  }

  /** Incremental morph change without re-applying the whole build. */
  setMorphs(values: CustomBuild["morphs"]): void {
    this.build.morphs = { ...values };
    if (!this.modelRoot) return;
    resetMorphs(this.modelRoot);
    applyMorphs(this.modelRoot, values);
  }

  // -- camera / input ---------------------------------------------------------

  private wireInput(canvas: HTMLCanvasElement): void {
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchStart = 0;
    let pinchDist = 0;

    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture(e.pointerId);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = this.targetDistance;
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
      this.lastInteract = performance.now();
    });
    canvas.addEventListener("pointermove", (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (pointers.size === 1) {
        this.yaw -= dx * 0.008;
        this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.006, -0.15, 0.9);
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0) {
          this.targetDistance = THREE.MathUtils.clamp(
            pinchStart * (pinchDist / Math.max(d, 1)),
            1.4,
            7,
          );
        }
      }
      this.lastInteract = performance.now();
    });
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      this.lastInteract = performance.now();
    };
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.targetDistance = THREE.MathUtils.clamp(
          this.targetDistance * (1 + Math.sign(e.deltaY) * 0.12),
          1.4,
          7,
        );
        this.lastInteract = performance.now();
      },
      { passive: false },
    );
    canvas.addEventListener("dblclick", () => {
      this.yaw = 0.35;
      this.pitch = 0.08;
      this.centerModel();
      this.lastInteract = performance.now();
    });
  }

  /** Zoom control for the slider (1.4 = close, 7 = far). */
  setZoom(distance: number): void {
    this.targetDistance = THREE.MathUtils.clamp(distance, 1.4, 7);
    this.lastInteract = performance.now();
  }

  get zoom(): number {
    return this.targetDistance;
  }

  /**
   * Point the camera at the head (for the eye-color picker) or back at the
   * chest. `fraction` is the look-at height as a fraction of model height.
   */
  setFocusHeight(fraction: number | null): void {
    this.focusHeight = fraction;
    this.lastInteract = performance.now();
  }

  private resize(): void {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private setStatus(patch: Partial<PreviewStatus>): void {
    this.status = { ...this.status, ...patch };
    this.onStatus(this.status);
  }

  private loop = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);

    // Deferred face-paint retouch (first-paint stabilization).
    if (this.paintRetouchRoot && performance.now() >= this.paintRetouchAt) {
      const r = this.paintRetouchRoot;
      this.paintRetouchRoot = null;
      if (this.modelRoot === r) retouchFacePaint(r);
    }

    // Idle turntable — pauses while the player is driving the camera.
    if (performance.now() - this.lastInteract > 4000) {
      this.yaw += dt * 0.25;
    }
    // Smooth zoom.
    this.distance += (this.targetDistance - this.distance) * Math.min(dt * 8, 1);

    this.mixer?.update(dt);

    const targetY = this.modelRoot
      ? this.modelHeight() * (this.focusHeight ?? 0.52)
      : 0.9;
    const cx = Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance;
    const cz = Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance;
    const cy = targetY + Math.sin(this.pitch) * this.distance;
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(0, targetY, 0);

    this.renderer.render(this.scene, this.camera);
  };

  private modelHeight(): number {
    if (!this.modelRoot) return 1.7;
    const box = new THREE.Box3().setFromObject(this.modelRoot);
    return isFinite(box.max.y) ? box.max.y - box.min.y : 1.7;
  }

  /** Export the current preview frame as a PNG data URL (portrait of the build). */
  capturePNG(): string {
    this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL("image/png");
  }

  /** The live model root — for QC probes and fight-side application. */
  get root(): THREE.Group | null {
    return this.modelRoot;
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObs?.disconnect();
    if (this.modelRoot) this.scene.remove(this.modelRoot);
    this.renderer.dispose();
  }
}
