import RAPIER from '@dimforge/rapier3d-compat';
await RAPIER.init();
const w = new RAPIER.World({x:0,y:-9.81,z:0});
// ground
const gb = w.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0,0,0));
w.createCollider(RAPIER.ColliderDesc.cuboid(20,0.1,20), gb);
// fighter mirror (two body parts + joints, like createFighter)
const mk = (x,y,cg) => {
  const b = w.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,y,0)
    .setLinearDamping(0.8).setAngularDamping(2.0).setAdditionalMass(5.0).setCcdEnabled(true));
  w.createCollider(RAPIER.ColliderDesc.capsule(0.12, 0.19).setCollisionGroups(cg).setSolverGroups(cg), b);
  return b;
};
try {
  const pelvis = mk(-1.8, 1.0, 0x00020005);
  const spine  = mk(-1.8, 1.3, 0x00020005);
  const jd = RAPIER.JointData.spherical({x:0,y:0.14,z:0},{x:0,y:-0.14,z:0});
  w.createImpulseJoint(jd, pelvis, spine, true);
  const knee = mk(-1.8, 0.6, 0x00020005);
  const jd2 = RAPIER.JointData.revolute({x:0,y:-0.2,z:0},{x:0,y:0.2,z:0},{x:1,y:0,z:0});
  w.createImpulseJoint(jd2, pelvis, knee, true);
  // table mirror
  const tb = w.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0,1.65,2.5).setAdditionalMass(5.0).setCcdEnabled(true).setLinearDamping(0.5).setAngularDamping(2.0));
  w.createCollider(RAPIER.ColliderDesc.cuboid(1.0,0.05,0.6).setCollisionGroups(0x0001FFFF).setSolverGroups(0x0001FFFF), tb);
  for (let i=0;i<20;i++) w.step();
  console.log('OK fighter+joints+table, 20 steps');
} catch(e){ console.log('FAIL', String(e).slice(0,150)); }
