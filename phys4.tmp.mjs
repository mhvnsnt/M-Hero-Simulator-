import RAPIER from '@dimforge/rapier3d-compat';
// Simulate StrictMode: two concurrent init() calls, then two worlds stepping
const p1 = RAPIER.init();
const p2 = RAPIER.init();
await Promise.all([p1, p2]);
console.log('both inits resolved');
const worlds = [];
for (let k = 0; k < 2; k++) {
  const w = new RAPIER.World({x:0,y:-9.81,z:0});
  const gb = w.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0,0,0));
  w.createCollider(RAPIER.ColliderDesc.cuboid(20,0.1,20), gb);
  const b = w.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0,5,0));
  w.createCollider(RAPIER.ColliderDesc.ball(0.5), b);
  worlds.push(w);
}
try {
  for (let i = 0; i < 200; i++) { worlds[0].step(); worlds[1].step(); }
  console.log('OK 200 interleaved steps on 2 worlds');
} catch(e) { console.log('FAIL', String(e).slice(0,100)); }
