export class PoseTuneEngine {
    customPoses: Map<string, {x: number, y: number, z: number}>;

    constructor() {
        this.customPoses = new Map();
    }

    tuneBoneCoordinate(boneName: string, offsetX: number, offsetY: number, offsetZ: number) {
        this.customPoses.set(boneName, {x: offsetX, y: offsetY, z: offsetZ});
    }

    applyToRig(rig: any, strikePhase: number) {
        let powerWeight = Math.exp(-Math.pow(strikePhase - 1.0, 2) / 0.1);
        // Applies your exact slider coordinates at the moment of peak impact
    }
}
