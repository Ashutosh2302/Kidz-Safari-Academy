/**
 * Soft placeholder pad (Web Audio) until a licensed track is dropped at
 * /public/audio/memory-lane.mp3
 */
export function startAmbientPad(ctx: AudioContext) {
  const master = ctx.createGain();
  master.gain.value = 0.08;
  master.connect(ctx.destination);

  const freqs = [196, 246.94, 293.66, 392]; // G3–G4 soft open chord
  const oscs: OscillatorNode[] = [];

  for (const f of freqs) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = f;
    g.gain.value = 0.2;
    osc.connect(g);
    g.connect(master);
    osc.start();
    oscs.push(osc);
  }

  return () => {
    for (const o of oscs) {
      try {
        o.stop();
      } catch {
        /* already stopped */
      }
    }
    master.disconnect();
  };
}
