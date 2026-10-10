export class ProceduralAudio {
  ctx: AudioContext;
  noise: AudioBufferSourceNode | null = null;
  filter: BiquadFilterNode;
  gain: GainNode;
  lfos: OscillatorNode[] = [];
  active: boolean = false;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create base respiratory noise
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; // white noise
    }

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.Q.value = 1.0;

    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0;

    this.filter.connect(this.gain);
    this.gain.connect(this.ctx.destination);

    // Save buffer for starting later
    this.noiseBuffer = buffer;
  }

  noiseBuffer: AudioBuffer;

  start() {
    if (this.active) return;
    this.active = true;
    if (this.ctx.state === 'suspended') {
        this.ctx.resume();
    }
    this.noise = this.ctx.createBufferSource();
    this.noise.buffer = this.noiseBuffer;
    this.noise.loop = true;
    this.noise.connect(this.filter);
    this.noise.start();
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    if (this.noise) {
        this.noise.stop();
        this.noise.disconnect();
        this.noise = null;
    }
  }

  update(saturation: number, currentStrain: number, dt: number) {
     if (!this.active) return;

     // Respiratory simulation driven by autonomic saturation
     const breathingRate = 1.0 + (saturation / 100) * 3.0; // scales up to 4x normal rate
     const phase = (performance.now() * 0.001 * breathingRate) % (Math.PI * 2);
     
     // Gasp amplitude based on strain
     const baseAmp = 0.05 + (saturation / 100) * 0.1;
     // Sine wave for breathing in/out
     let breathAmp = Math.max(0, Math.sin(phase)) * baseAmp;
     
     // Gasp/strain spikes
     if (currentStrain > 50) {
        breathAmp += (currentStrain / 100) * 0.2 * Math.random();
     }

     this.gain.gain.setTargetAtTime(breathAmp, this.ctx.currentTime, 0.05);

     // Pitch/Frequency modulation depending on in/out breath and stress
     const baseFreq = 400 + (saturation * 2.0);
     const breathFreq = baseFreq + Math.sin(phase) * 150;
     this.filter.frequency.setTargetAtTime(breathFreq, this.ctx.currentTime, 0.05);
     this.filter.Q.value = 0.5 + (saturation / 100) * 2.0;
  }

  playSynthesizedSfx(pitch: number, type: string) {
     if (!this.ctx) return;
     try {
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        
        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);

        if (type === 'pull') {
           // Skyline Zip swoosh frequency sweep
           osc.type = 'triangle';
           osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
           osc.frequency.exponentialRampToValueAtTime(pitch * 2.5, this.ctx.currentTime + 0.35);
           oscGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
           oscGain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);
           osc.start();
           osc.stop(this.ctx.currentTime + 0.35);
        } else if (type === 'projectile') {
           // Crescent Throw whirring sound
           osc.type = 'sine';
           osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
           osc.frequency.linearRampToValueAtTime(pitch - 150, this.ctx.currentTime + 0.4);
           
           oscGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
           oscGain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
           osc.start();
           osc.stop(this.ctx.currentTime + 0.4);
        } else if (type === 'beam') {
           // Solar thermal high-pitch laser buzz
           osc.type = 'sawtooth';
           osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
           osc.frequency.linearRampToValueAtTime(pitch / 2, this.ctx.currentTime + 0.5);
           
           oscGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
           oscGain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
           osc.start();
           osc.stop(this.ctx.currentTime + 0.5);
        } else {
           // Deep heavy ground slam blast/shockwave explosion
           osc.type = 'triangle';
           osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
           osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.6);
           
           oscGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
           oscGain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);
           osc.start();
           osc.stop(this.ctx.currentTime + 0.6);
        }
     } catch (e) {
        console.error("Synthesizer error:", e);
     }
  }
}
