import RAPIER from '@dimforge/rapier3d-compat';
await RAPIER.init();
const w = new RAPIER.World({x:0,y:-9.81,z:0});
const parts = [
  { name: 'pelvis', w: 0.19, h: 0.24, x: 0, y: 0.92 }, { name: 'lowerSpine', w: 0.17, h: 0.29, x: 0, y: 1.20 },
  { name: 'midSpine', w: 0.17, h: 0.27, x: 0, y: 1.48 }, { name: 'upperSpine', w: 0.17, h: 0.24, x: 0, y: 1.70 },
  { name: 'neck', w: 0.10, h: 0.13, x: 0, y: 1.90 }, { name: 'head', w: 0.135, h: 0.16, x: 0, y: 2.08 },
  { name: 'lClav', w: 0.09, h: 0.13, x: 0.15, y: 1.72 }, { name: 'lUpperArm', w: 0.09, h: 0.36, x: 0.22, y: 1.55 },
  { name: 'lLowerArm', w: 0.075, h: 0.30, x: 0.22, y: 1.20 }, { name: 'lHand', w: 0.1, h: 0.15, x: 0.22, y: 0.98 },
  { name: 'rClav', w: 0.09, h: 0.13, x: -0.15, y: 1.72 }, { name: 'rUpperArm', w: 0.09, h: 0.36, x: -0.22, y: 1.55 },
  { name: 'rLowerArm', w: 0.075, h: 0.30, x: -0.22, y: 1.20 }, { name: 'rHand', w: 0.1, h: 0.15, x: -0.22, y: 0.98 },
  { name: 'lThigh', w: 0.11, h: 0.48, x: 0.12, y: 0.78 }, { name: 'lCalf', w: 0.095, h: 0.44, x: 0.12, y: 0.38 }, { name: 'lFoot', w: 0.09, h: 0.15, x: 0.12, y: 0.11 },
  { name: 'rThigh', w: 0.11, h: 0.48, x: -0.12, y: 0.78 }, { name: 'rCalf', w: 0.095, h: 0.44, x: -0.12, y: 0.38 }, { name: 'rFoot', w: 0.09, h: 0.15, x: -0.12, y: 0.11 }
];
const joints = [
  { parent: 'pelvis', child: 'lowerSpine', yAnchor: 1.06 }, { parent: 'lowerSpine', child: 'midSpine', yAnchor: 1.34 },
  { parent: 'midSpine', child: 'upperSpine', yAnchor: 1.59 }, { parent: 'upperSpine', child: 'neck', yAnchor: 1.80 },
  { parent: 'neck', child: 'head', yAnchor: 1.99 }, { parent: 'upperSpine', child: 'lClav', yAnchor: 1.71, x: 0.08 },
  { parent: 'lClav', child: 'lUpperArm', yAnchor: 1.71, x: 0.15 }, { parent: 'lUpperArm', child: 'lLowerArm', yAnchor: 1.37, x: 0.22 },
  { parent: 'lLowerArm', child: 'lHand', yAnchor: 1.09, x: 0.22 }, { parent: 'upperSpine', child: 'rClav', yAnchor: 1.71, x: -0.08 },
  { parent: 'rClav', child: 'rUpperArm', yAnchor: 1.71, x: -0.15 }, { parent: 'rUpperArm', child: 'rLowerArm', yAnchor: 1.37, x: -0.22 },
  { parent: 'rLowerArm', child: 'rHand', yAnchor: 1.09, x: -0.22 }, { parent: 'pelvis', child: 'lThigh', yAnchor: 0.85, x: 0.12 },
  { parent: 'lThigh', child: 'lCalf', yAnchor: 0.58, x: 0.12, type: 'revolute' }, { parent: 'lCalf', child: 'lFoot', yAnchor: 0.24, x: 0.12, type: 'revolute' },
  { parent: 'pelvis', child: 'rThigh', yAnchor: 0.85, x: -0.12 }, { parent: 'rThigh', child: 'rCalf', yAnchor: 0.58, x: -0.12, type: 'revolute' },
  { parent: 'rCalf', child: 'rFoot', yAnchor: 0.24, x: -0.12, type: 'revolute' },
];
function makeFighter(fx, cg) {
  const bodies = new Map();
  for (const p of parts) {
    const b = w.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(fx + (p.x||0), 1.0 + p.y, 0)
      .setLinearDamping(0.8).setAngularDamping(2.0).setAdditionalMass(5.0).setCcdEnabled(true));
    w.createCollider(RAPIER.ColliderDesc.capsule(p.h/2, p.w).setCollisionGroups(cg).setSolverGroups(cg), b);
    bodies.set(p.name, b);
  }
  for (const j of joints) {
    const p1 = parts.find(p=>p.name===j.parent), p2 = parts.find(p=>p.name===j.child);
    const ax = j.x||0;
    const a1 = {x: ax-(p1.x||0), y: j.yAnchor-p1.y, z: 0};
    const a2 = {x: ax-(p2.x||0), y: j.yAnchor-p2.y, z: 0};
    const jd = j.type==='revolute' ? RAPIER.JointData.revolute(a1,a2,{x:1,y:0,z:0}) : RAPIER.JointData.spherical(a1,a2);
    w.createImpulseJoint(jd, bodies.get(p1.name), bodies.get(p2.name), true);
  }
}
try {
  // chunk grounds (3x3)
  for (let cx=-1;cx<=1;cx++) for (let cz=-1;cz<=1;cz++) {
    const gb = w.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(cx*40+20, 0, cz*40+20));
    w.createCollider(RAPIER.ColliderDesc.cuboid(20,0.1,20), gb);
  }
  makeFighter(-1.8, 0x00020005);
  makeFighter(1.8, 0x00040003);
  // kinematic + character controller (both fighters have one)
  for (const fx of [-1.8, 1.8]) {
    const kb = w.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(fx, 2.2, 0));
    const kc = w.createCollider(RAPIER.ColliderDesc.capsule(0.8,0.4), kb);
    const cc = w.createCharacterController(0.1);
    cc.computeColliderMovement(kc, {x:0,y:-0.01,z:0});
    kb.setNextKinematicTranslation({x:fx, y:2.19, z:0});
  }
  for (let i=0;i<300;i++) w.step();
  console.log('OK 300 steps full fighter rig');
} catch(e){ console.log('FAIL', String(e).slice(0,120)); }
