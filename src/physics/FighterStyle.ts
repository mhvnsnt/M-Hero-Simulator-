export class FighterStyle {
    baseStance: any;

    constructor(styleName: string, poseDatabase: Map<string, any>) {
        this.baseStance = poseDatabase.get(styleName) || { idle: 'generic', rhythm: 1.0 };
    }

    loadStyle(rig: any) {
        // Overwrites the generic ragdoll with your specific authored flavor
        rig.idlePose = this.baseStance.idle;
        rig.movementCadence = this.baseStance.rhythm;
    }
}
