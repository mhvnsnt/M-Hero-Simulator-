const RAPIER = require('@dimforge/rapier3d-compat');
RAPIER.init().then(() => {
    let world = new RAPIER.World({x:0, y:-9.81, z:0});
    try {
        let cc = world.createCharacterController(0.1);
        console.log("createCharacterController works");
    } catch(e) { console.error(e); }
});
