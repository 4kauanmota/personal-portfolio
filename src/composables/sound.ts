import { ref, watch } from 'vue'

/**
 * Efeitos sonoros do portfólio, sintetizados na hora com a Web Audio API:
 * nenhum arquivo de áudio para baixar, nenhum serviço externo.
 *
 * Regras:
 *   - nunca toca nada sozinho ao abrir a página: todo som responde a um gesto
 *     (clique, toque ou tecla), que é quando os navegadores liberam o áudio;
 *   - poucos sons, curtos e baixos, com um pouco de reverberação ("sala de sonho");
 *   - a pessoa liga e desliga no cabeçalho, e a escolha fica salva neste navegador.
 */
export type SoundName =
  | 'toggle'
  | 'pick'
  | 'insert'
  | 'waves'
  | 'eject'
  | 'open'
  | 'close'
  | 'scribble'
  | 'rustle'
  | 'flutter'
  | 'chime'
  | 'copy'

const STORAGE_KEY = '4kauanmota:sound'

function readPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

/** Sons ligados? (padrão: sim; só tocam depois de um gesto da pessoa). */
export const soundOn = ref(typeof window === 'undefined' ? false : readPreference())

/** Muda a cada som tocado (o ícone do alto-falante pulsa junto). */
export const lastSound = ref(0)

watch(soundOn, (on) => {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
})

type AudioCtor = typeof AudioContext
let ctx: AudioContext | null = null
let master: GainNode | null = null
let reverb: ConvolverNode | null = null
let reverbSend: GainNode | null = null

/** Uma "sala" curta e macia: ruído que se apaga em pouco mais de um segundo. */
function makeImpulse(context: AudioContext, seconds = 1.8): AudioBuffer {
  const rate = context.sampleRate
  const length = Math.floor(rate * seconds)
  const buffer = context.createBuffer(2, length, rate)
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      const t = i / length
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2) * (t < 0.01 ? t / 0.01 : 1)
    }
  }
  return buffer
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (ctx) return ctx
  const Ctor: AudioCtor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext
  if (!Ctor) return null
  try {
    ctx = new Ctor()
  } catch {
    return null
  }
  const compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = -18
  compressor.ratio.value = 3
  master = ctx.createGain()
  master.gain.value = 0.32
  master.connect(compressor).connect(ctx.destination)
  reverb = ctx.createConvolver()
  reverb.buffer = makeImpulse(ctx)
  reverbSend = ctx.createGain()
  reverbSend.gain.value = 0.32
  reverbSend.connect(reverb).connect(master)
  return ctx
}

/** Saída de um som: seco no master e um pouco na reverberação. */
function out(context: AudioContext, wet = 1): GainNode {
  const node = context.createGain()
  node.connect(master as GainNode)
  if (reverbSend && wet > 0) {
    const send = context.createGain()
    send.gain.value = wet
    node.connect(send).connect(reverbSend)
  }
  return node
}

function envelope(param: AudioParam, at: number, peak: number, attack: number, decay: number) {
  param.cancelScheduledValues(at)
  param.setValueAtTime(0.0001, at)
  param.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack)
  param.exponentialRampToValueAtTime(0.0001, at + attack + decay)
}

/** Sino suave: parciais inarmônicas, como um copo tocado de leve. */
function bell(context: AudioContext, at: number, freq: number, gain = 0.18, decay = 1.4, wet = 1) {
  const dest = out(context, wet)
  const partials: Array<[number, number]> = [
    [1, 1],
    [2.76, 0.32],
    [5.4, 0.12],
  ]
  for (const [ratio, level] of partials) {
    const osc = context.createOscillator()
    const g = context.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq * ratio
    envelope(g.gain, at, gain * level, 0.006, decay / ratio ** 0.4)
    osc.connect(g).connect(dest)
    osc.start(at)
    osc.stop(at + decay + 0.1)
  }
}

let noiseBuffer: AudioBuffer | null = null
function noise(context: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  noiseBuffer = buffer
  return buffer
}

/** Ruído filtrado com envelope: deslizar, papel, clique de plástico. */
function hiss(
  context: AudioContext,
  at: number,
  options: { duration: number; from: number; to?: number; q?: number; gain: number; attack?: number; type?: BiquadFilterType; wet?: number },
) {
  const src = context.createBufferSource()
  src.buffer = noise(context)
  const filter = context.createBiquadFilter()
  filter.type = options.type ?? 'bandpass'
  filter.Q.value = options.q ?? 1.2
  filter.frequency.setValueAtTime(options.from, at)
  if (options.to) filter.frequency.exponentialRampToValueAtTime(options.to, at + options.duration)
  const g = context.createGain()
  envelope(g.gain, at, options.gain, options.attack ?? 0.004, options.duration)
  src.connect(filter).connect(g).connect(out(context, options.wet ?? 0.4))
  src.start(at, Math.random() * 0.5)
  src.stop(at + options.duration + 0.05)
}

/** Batida grave e curta (o disquete assentando no leitor). */
function thud(context: AudioContext, at: number, freq = 120, gain = 0.3) {
  const osc = context.createOscillator()
  const g = context.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, at)
  osc.frequency.exponentialRampToValueAtTime(freq * 0.45, at + 0.12)
  envelope(g.gain, at, gain, 0.003, 0.16)
  osc.connect(g).connect(out(context, 0.15))
  osc.start(at)
  osc.stop(at + 0.25)
}

/** Nota longa e trêmula, como uma transmissão distante (as ondas de rádio). */
function shimmer(context: AudioContext, at: number, freq: number, gain = 0.08, length = 1.6) {
  const osc = context.createOscillator()
  const lfo = context.createOscillator()
  const lfoGain = context.createGain()
  const g = context.createGain()
  osc.type = 'triangle'
  osc.frequency.value = freq
  lfo.frequency.value = 5.2
  lfoGain.gain.value = freq * 0.012
  lfo.connect(lfoGain).connect(osc.frequency)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(gain, at + 0.35)
  g.gain.exponentialRampToValueAtTime(0.0001, at + length)
  osc.connect(g).connect(out(context, 1.4))
  osc.start(at)
  lfo.start(at)
  osc.stop(at + length + 0.1)
  lfo.stop(at + length + 0.1)
}

const RECIPES: Record<SoundName, (context: AudioContext, t: number) => void> = {
  // Ligar os sons: um sininho só.
  toggle: (c, t) => bell(c, t, 1318.5, 0.14, 1.1),
  // Tirar o disquete da caixa: plástico raspando de leve.
  pick: (c, t) => {
    hiss(c, t, { duration: 0.05, from: 2600, q: 2.5, gain: 0.12, wet: 0.2 })
    hiss(c, t + 0.05, { duration: 0.12, from: 1400, to: 3200, q: 1.4, gain: 0.05, wet: 0.3 })
  },
  // Entrar no leitor: desliza, encaixa (clique) e assenta (batida grave).
  insert: (c, t) => {
    hiss(c, t, { duration: 0.32, from: 900, to: 2400, q: 0.9, gain: 0.07, attack: 0.05, wet: 0.2 })
    hiss(c, t + 0.31, { duration: 0.035, from: 3400, q: 3, gain: 0.2, wet: 0.15 })
    thud(c, t + 0.33, 140, 0.32)
    hiss(c, t + 0.4, { duration: 0.05, from: 1800, q: 4, gain: 0.08, wet: 0.2 })
  },
  // As ondas: um acorde suave que se espalha.
  waves: (c, t) => {
    shimmer(c, t, 523.25, 0.06, 1.9)
    shimmer(c, t + 0.14, 783.99, 0.045, 1.7)
    bell(c, t + 0.05, 1567.98, 0.07, 1.6, 1.6)
    bell(c, t + 0.32, 2093, 0.045, 1.3, 1.6)
  },
  // Ejetar: a mola solta e o disquete sobe.
  eject: (c, t) => {
    hiss(c, t, { duration: 0.03, from: 3000, q: 3, gain: 0.16, wet: 0.15 })
    thud(c, t + 0.02, 220, 0.12)
    hiss(c, t + 0.06, { duration: 0.26, from: 2600, to: 900, q: 0.9, gain: 0.06, wet: 0.25 })
  },
  // Abrir o README: folha que se abre e um sino baixo.
  open: (c, t) => {
    hiss(c, t, { duration: 0.34, from: 700, to: 3800, q: 0.7, gain: 0.06, attack: 0.08, wet: 0.5 })
    bell(c, t + 0.12, 880, 0.08, 1.4)
    bell(c, t + 0.24, 1318.5, 0.05, 1.2)
  },
  close: (c, t) => {
    hiss(c, t, { duration: 0.26, from: 3200, to: 600, q: 0.7, gain: 0.045, attack: 0.03, wet: 0.4 })
    bell(c, t + 0.06, 659.25, 0.05, 0.9)
  },
  // Rabisco do filtro: um traço de lápis.
  scribble: (c, t) => {
    for (let i = 0; i < 5; i++) {
      hiss(c, t + i * 0.07, { duration: 0.06, from: 3800 + i * 160, q: 3.5, gain: 0.035, attack: 0.012, type: 'bandpass', wet: 0.1 })
    }
  },
  // Mostrar mais / menos: papéis se ajeitando.
  rustle: (c, t) => {
    hiss(c, t, { duration: 0.22, from: 1800, to: 4200, q: 0.8, gain: 0.04, attack: 0.04, wet: 0.3 })
    hiss(c, t + 0.12, { duration: 0.18, from: 4200, to: 2200, q: 0.8, gain: 0.03, attack: 0.03, wet: 0.3 })
  },
  // Passarinho: asas batendo e um piado curto.
  flutter: (c, t) => {
    for (let i = 0; i < 6; i++) hiss(c, t + i * 0.045, { duration: 0.035, from: 1200 + (i % 2) * 400, q: 1.5, gain: 0.05, wet: 0.2 })
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(2900, t + 0.08)
    osc.frequency.exponentialRampToValueAtTime(3900, t + 0.14)
    osc.frequency.exponentialRampToValueAtTime(3100, t + 0.2)
    envelope(g.gain, t + 0.08, 0.05, 0.01, 0.13)
    osc.connect(g).connect(out(c, 0.6))
    osc.start(t + 0.08)
    osc.stop(t + 0.3)
  },
  // Tocar uma auréola.
  chime: (c, t) => {
    bell(c, t, 1046.5, 0.1, 1.8, 1.4)
    bell(c, t + 0.09, 1567.98, 0.07, 1.6, 1.4)
    bell(c, t + 0.18, 2093, 0.05, 1.4, 1.4)
  },
  copy: (c, t) => {
    bell(c, t, 1174.66, 0.08, 0.8)
    bell(c, t + 0.08, 1760, 0.06, 0.8)
  },
}

/** Toca um som (se estiverem ligados). Deve ser chamado dentro de um gesto da pessoa. */
export function playSound(name: SoundName, delayMs = 0): void {
  if (!soundOn.value) return
  // Antes do primeiro gesto da pessoa (um passar de mouse não conta), nada toca.
  const activation = typeof navigator !== 'undefined' ? (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation : undefined
  if (activation && !activation.hasBeenActive) return
  const context = audio()
  if (!context) return
  const start = () => {
    try {
      RECIPES[name](context, context.currentTime + 0.01 + delayMs / 1000)
      lastSound.value++
    } catch {
      /* som é enfeite: falhar em silêncio */
    }
  }
  if (context.state === 'suspended') void context.resume().then(start, () => undefined)
  else start()
}

/** Liga/desliga os sons. Ao ligar, um sininho confirma (o clique já liberou o áudio). */
export function toggleSound(): void {
  soundOn.value = !soundOn.value
  if (soundOn.value) playSound('toggle')
}

/*
 * O áudio do navegador só pode começar depois de um gesto. O primeiro toque, clique
 * ou tecla em qualquer lugar da página "destrava" o contexto (em silêncio), para que
 * sons que vêm um pouco depois da ação (o fim de uma animação) também possam tocar.
 */
if (typeof window !== 'undefined') {
  const unlock = () => {
    window.removeEventListener('pointerdown', unlock, true)
    window.removeEventListener('keydown', unlock, true)
    if (!soundOn.value) return
    const context = audio()
    if (context?.state === 'suspended') void context.resume().catch(() => undefined)
  }
  window.addEventListener('pointerdown', unlock, true)
  window.addEventListener('keydown', unlock, true)
}
