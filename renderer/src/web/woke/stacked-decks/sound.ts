// C2: a short rising chime for a big hit. Made, not loaded, so there's no
// sound file to bundle.
export function playHitSound () {
  try {
    const ctx = new AudioContext()
    const notes = [660, 880, 1320]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = ctx.currentTime + i * 0.09
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.36)
      // Each context holds an audio thread until it's closed.
      if (i === notes.length - 1) osc.onended = () => { ctx.close().catch(() => {}) }
    })
  } catch {}
}
