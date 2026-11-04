import { DISPLAY_SHADER, FLUID_SHADER, VERTEX_SHADER } from './shaders'

export type GradientColors = readonly [string, string, string, string]

export interface GradientOptions {
  /** 4 colores en hex (#rgb o #rrggbb). */
  colors: GradientColors
  brushSize: number
  brushStrength: number
  distortionAmount: number
  fluidDecay: number
  trailLength: number
  stopDecay: number
  colorIntensity: number
  softness: number
  /** Píxeles de simulación por píxel CSS. 1 = como el original; 0.5 alivia GPUs de móviles. */
  resolutionScale: number
}

export const DEFAULT_GRADIENT_OPTIONS: Omit<GradientOptions, 'colors'> = {
  brushSize: 25,
  brushStrength: 0.5,
  distortionAmount: 2.5,
  fluidDecay: 0.98,
  trailLength: 0.8,
  stopDecay: 0.85,
  colorIntensity: 1,
  softness: 1,
  resolutionScale: 1,
}

/** Sin movimiento del puntero durante este tiempo, el fluido deja de recibir arrastre. */
const POINTER_IDLE_MS = 100

const FLUID_UNIFORMS = [
  'iTime',
  'iResolution',
  'iMouse',
  'iFrame',
  'iPreviousFrame',
  'uBrushSize',
  'uBrushStrength',
  'uFluidDecay',
  'uTrailLength',
  'uStopDecay',
] as const

const DISPLAY_UNIFORMS = [
  'iTime',
  'iResolution',
  'iFluid',
  'uDistortionAmount',
  'uColor1',
  'uColor2',
  'uColor3',
  'uColor4',
  'uColorIntensity',
  'uSoftness',
] as const

type Uniforms<T extends readonly string[]> = Record<T[number], WebGLUniformLocation | null>

type Rgb = [number, number, number]

interface Target {
  texture: WebGLTexture
  framebuffer: WebGLFramebuffer
}

export function hexToRgb(hex: string): Rgb {
  const value = hex.trim().replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value
  if (!/^[0-9a-f]{6}$/i.test(full)) return [0, 0, 0]
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255) as Rgb
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('No se pudo crear el shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'Error al compilar el shader')
  }
  return shader
}

function createProgram(gl: WebGL2RenderingContext, fragmentSource: string): WebGLProgram {
  const program = gl.createProgram()
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.bindAttribLocation(program, 0, 'position')
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? 'Error al enlazar el programa')
  }
  return program
}

function uniformLocations<K extends string>(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  names: readonly K[],
): Record<K, WebGLUniformLocation | null> {
  return Object.fromEntries(
    names.map((name) => [name, gl.getUniformLocation(program, name)]),
  ) as Record<K, WebGLUniformLocation | null>
}

/**
 * Degradado interactivo con simulación de fluido (WebGL2, sin dependencias).
 * Se pausa fuera de pantalla o con la pestaña oculta y respeta `prefers-reduced-motion`.
 * Lanza un error si el navegador no soporta WebGL2 con texturas de coma flotante.
 */
export class GradientEngine {
  private readonly container: HTMLElement
  private readonly canvas: HTMLCanvasElement
  private readonly gl: WebGL2RenderingContext
  private readonly fluidProgram: WebGLProgram
  private readonly displayProgram: WebGLProgram
  private readonly vertexArray: WebGLVertexArrayObject
  private readonly vertexBuffer: WebGLBuffer
  private readonly fluidUniforms: Uniforms<typeof FLUID_UNIFORMS>
  private readonly displayUniforms: Uniforms<typeof DISPLAY_UNIFORMS>
  private readonly resizeObserver: ResizeObserver
  private readonly intersectionObserver: IntersectionObserver
  private readonly reducedMotion: MediaQueryList

  private options: GradientOptions
  private colors: [Rgb, Rgb, Rgb, Rgb]
  private targets: [Target, Target] | null = null
  private width = 0
  private height = 0
  private frameCount = 0
  private rafId = 0
  private inView = true
  private mouse: [number, number, number, number] = [0, 0, 0, 0]
  private lastPointerMove = 0

  constructor(container: HTMLElement, options: GradientOptions) {
    this.container = container
    this.options = options
    this.colors = options.colors.map(hexToRgb) as [Rgb, Rgb, Rgb, Rgb]

    this.canvas = document.createElement('canvas')
    this.canvas.setAttribute('aria-hidden', 'true')
    Object.assign(this.canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
    })

    const gl = this.canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false })
    if (!gl) throw new Error('WebGL2 no disponible')
    if (
      !gl.getExtension('EXT_color_buffer_float') &&
      !gl.getExtension('EXT_color_buffer_half_float')
    ) {
      throw new Error('El navegador no permite renderizar a texturas de coma flotante')
    }
    this.gl = gl

    this.fluidProgram = createProgram(gl, FLUID_SHADER)
    this.displayProgram = createProgram(gl, DISPLAY_SHADER)
    this.fluidUniforms = uniformLocations(gl, this.fluidProgram, FLUID_UNIFORMS)
    this.displayUniforms = uniformLocations(gl, this.displayProgram, DISPLAY_UNIFORMS)

    // Un triángulo que cubre toda la pantalla.
    this.vertexArray = gl.createVertexArray()
    this.vertexBuffer = gl.createBuffer()
    gl.bindVertexArray(this.vertexArray)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    this.resize()
    container.appendChild(this.canvas)

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.resizeObserver = new ResizeObserver(() => {
      this.resize()
      this.renderStaticIfPaused()
    })
    this.resizeObserver.observe(container)
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.inView = entry?.isIntersecting ?? true
      this.updateLoop()
    })
    this.intersectionObserver.observe(container)

    window.addEventListener('pointermove', this.handlePointerMove, { passive: true })
    document.addEventListener('visibilitychange', this.updateLoop)
    this.reducedMotion.addEventListener('change', this.updateLoop)
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost)

    this.renderStaticIfPaused()
    this.updateLoop()
  }

  setOptions(partial: Partial<GradientOptions>): void {
    const scaleChanged =
      partial.resolutionScale !== undefined &&
      partial.resolutionScale !== this.options.resolutionScale
    this.options = { ...this.options, ...partial }
    if (partial.colors) this.colors = partial.colors.map(hexToRgb) as [Rgb, Rgb, Rgb, Rgb]
    if (scaleChanged) this.resize()
    this.renderStaticIfPaused()
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId)
    this.rafId = 0
    this.resizeObserver.disconnect()
    this.intersectionObserver.disconnect()
    window.removeEventListener('pointermove', this.handlePointerMove)
    document.removeEventListener('visibilitychange', this.updateLoop)
    this.reducedMotion.removeEventListener('change', this.updateLoop)
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost)

    const { gl } = this
    this.deleteTargets()
    gl.deleteProgram(this.fluidProgram)
    gl.deleteProgram(this.displayProgram)
    gl.deleteBuffer(this.vertexBuffer)
    gl.deleteVertexArray(this.vertexArray)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    this.canvas.remove()
  }

  private get shouldAnimate(): boolean {
    return (
      this.inView && !document.hidden && !this.reducedMotion.matches && !this.gl.isContextLost()
    )
  }

  private readonly updateLoop = (): void => {
    if (this.shouldAnimate && !this.rafId) {
      this.rafId = requestAnimationFrame(this.tick)
    } else if (!this.shouldAnimate && this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
  }

  private readonly tick = (now: number): void => {
    this.rafId = requestAnimationFrame(this.tick)
    this.render(now)
  }

  /** Con movimiento reducido o en pausa se dibuja un único cuadro estático. */
  private renderStaticIfPaused(): void {
    if (!this.rafId && !this.gl.isContextLost()) this.render(performance.now())
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const rect = this.container.getBoundingClientRect()
    const scale = this.options.resolutionScale
    this.mouse = [
      (event.clientX - rect.left) * scale,
      (rect.height - (event.clientY - rect.top)) * scale,
      this.mouse[0],
      this.mouse[1],
    ]
    this.lastPointerMove = performance.now()
  }

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault()
    this.updateLoop()
  }

  private resize(): void {
    const { clientWidth, clientHeight } = this.container
    const scale = this.options.resolutionScale
    const width = Math.max(1, Math.round(clientWidth * scale))
    const height = Math.max(1, Math.round(clientHeight * scale))
    if (width === this.width && height === this.height && this.targets) return

    this.width = width
    this.height = height
    this.canvas.width = width
    this.canvas.height = height
    this.deleteTargets()
    this.targets = [this.createTarget(), this.createTarget()]
    this.frameCount = 0
  }

  private createTarget(): Target {
    const { gl } = this
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA16F,
      this.width,
      this.height,
      0,
      gl.RGBA,
      gl.HALF_FLOAT,
      null,
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    const framebuffer = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('El navegador no permite renderizar a texturas de coma flotante')
    }
    return { texture, framebuffer }
  }

  private deleteTargets(): void {
    for (const target of this.targets ?? []) {
      this.gl.deleteTexture(target.texture)
      this.gl.deleteFramebuffer(target.framebuffer)
    }
    this.targets = null
  }

  private render(now: number): void {
    if (!this.targets) return
    const { gl, options, width, height } = this
    const [current, previous] = this.targets
    const time = now * 0.001
    if (now - this.lastPointerMove > POINTER_IDLE_MS) this.mouse = [0, 0, 0, 0]

    gl.bindVertexArray(this.vertexArray)
    gl.viewport(0, 0, width, height)
    gl.activeTexture(gl.TEXTURE0)

    // 1. Fluido: lee el cuadro anterior y escribe el actual.
    const fluid = this.fluidUniforms
    gl.useProgram(this.fluidProgram)
    gl.bindFramebuffer(gl.FRAMEBUFFER, current.framebuffer)
    gl.bindTexture(gl.TEXTURE_2D, previous.texture)
    gl.uniform1i(fluid.iPreviousFrame, 0)
    gl.uniform1f(fluid.iTime, time)
    gl.uniform2f(fluid.iResolution, width, height)
    gl.uniform4f(fluid.iMouse, ...this.mouse)
    gl.uniform1i(fluid.iFrame, this.frameCount)
    gl.uniform1f(fluid.uBrushSize, options.brushSize)
    gl.uniform1f(fluid.uBrushStrength, options.brushStrength)
    gl.uniform1f(fluid.uFluidDecay, options.fluidDecay)
    gl.uniform1f(fluid.uTrailLength, options.trailLength)
    gl.uniform1f(fluid.uStopDecay, options.stopDecay)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    // 2. Degradado: se dibuja en pantalla deformado por el fluido.
    const display = this.displayUniforms
    gl.useProgram(this.displayProgram)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, current.texture)
    gl.uniform1i(display.iFluid, 0)
    gl.uniform1f(display.iTime, time)
    gl.uniform2f(display.iResolution, width, height)
    gl.uniform1f(display.uDistortionAmount, options.distortionAmount)
    gl.uniform3f(display.uColor1, ...this.colors[0])
    gl.uniform3f(display.uColor2, ...this.colors[1])
    gl.uniform3f(display.uColor3, ...this.colors[2])
    gl.uniform3f(display.uColor4, ...this.colors[3])
    gl.uniform1f(display.uColorIntensity, options.colorIntensity)
    gl.uniform1f(display.uSoftness, options.softness)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    this.targets = [previous, current]
    this.frameCount++
  }
}
