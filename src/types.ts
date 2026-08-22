export interface SuperheroConfig {
  id: string;
  name: string;
  description: string;
  primaryColor: string; // Hex string e.g., "0x222222"
  accentColor: string;
  headColor: string;
  gloveColor: string;
  feetColor: string;
  hasCape: boolean;
  capeColor?: string;
  hasCowlEars: boolean;
  chestLogo?: 'bat' | 'spider' | 's-shield' | 'star' | 'lightning' | 'none';
  emblemColor?: string;
  stats: {
    maxHealth: number;
    stamina: number;
    speed: number;
    gravity: number; // custom gravity multiplier
  };
  power: {
    name: string;
    type: 'projectile' | 'pull' | 'beam' | 'blast' | 'dash';
    projectileColor: string;
    damage: number;
    cooldown: number;
    soundPitch?: number;
  };
}
