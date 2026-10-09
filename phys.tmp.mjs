import RAPIER from '@dimforge/rapier3d-compat';
await RAPIER.init();
const step = (label, fn) => {
  try { fn(); const w = fn.world; for (let i=0;i<10;i++) w.step(); console.log('OK  ', label); }
  catch (e) { console.log('FAIL', label, String(e).slice(0,80)); }
};
// 1. plain world
step('plain world', Object.assign(() => {}, { world: new RAPIER.World({x:0,y:-9.81,z:0}) }));
// 2. + fixed ground
{
  const w = new RAPIER.World({x:0,y:-9.81,z:0});
  try {
    const gb = w.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0,0,0));
    w.createCollider(RAPIER.ColliderDesc.cuboid(20,0.1,20), gb);
    for (let i=0;i<10;i++) w.step();
    console.log('OK   fixed ground');
  } catch(e){ console.log('FAIL fixed ground', String(e).slice(0,80)); }
}
// 3. + kinematic + character controller (KinematicPlayerController mirror)
{
  const w = new RAPIER.World({x:0,y:-9.81,z:0});
  try {
    const bd = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,2.2,0);
    const rb = w.createRigidBody(bd);
    const col = w.createCollider(RAPIER.ColliderDesc.capsule(0.8,0.4), rb);
    const cc = w.createCharacterController(0.1);
    cc.setApplyImpulsesToDynamicBodies(true);
    cc.enableAutostep(0.4,0.2,true);
    cc.enableSnapToGround(0.3);
    for (let i=0;i<10;i++) w.step();
    console.log('OK   kinematic+controller');
  } catch(e){ console.log('FAIL kinematic+controller', String(e).slice(0,120)); }
}
// 4. + dynamic capsule like fighter bodies
{
  const w = new RAPIER.World({x:0,y:-9.81,z:0});
  try {
    for (let i=0;i<24;i++) {
      const b = w.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(i*0.5, 2+i*0.1, 0));
      w.createCollider(RAPIER.ColliderDesc.capsule(0.1,0.2), b);
    }
    for (let i=0;i<10;i++) w.step();
    console.log('OK   24 dynamic capsules');
  } catch(e){ console.log('FAIL 24 dynamic capsules', String(e).slice(0,120)); }
}
