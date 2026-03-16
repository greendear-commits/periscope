'use client'

import { useEffect, useRef } from 'react'

// Tuning constants
const DOT_SPACING       = 14    // px between dot centers
const MAX_RADIUS        = 5.5   // px max dot radius at center
const MIN_RADIUS        = 0.4   // px min dot radius near edge
const EYE_WIDTH_RATIO   = 0.72  // fraction of canvas width for eye span
const EYE_HEIGHT_RATIO  = 0.38  // fraction of canvas height for eye span
const RIPPLE_SPEED      = 1.8   // radians/second for ripple phase advance
const RIPPLE_AMPLITUDE  = 0.28  // fraction of base radius to modulate
const RIPPLE_WAVELENGTH = 55    // px — spatial frequency of ripple wave
const BLINK_PERIOD      = 4500  // ms between blink starts
const BLINK_DURATION    = 700   // ms for full close+open cycle

interface DotData {
  px: number
  py: number
  nd: number        // normalized distance [0,1]
  rawDist: number   // pixel distance from center
}

function isInsideEye(
  px: number, py: number,
  cx: number, cy: number,
  a: number, b: number
): boolean {
  if (b <= 0) return false
  // Horizontal almond: two circular arcs meeting at (±a, 0).
  // Each arc is part of a circle with radius R = (a²+b²)/(2b),
  // centered on the vertical axis at cy ± yOffset where yOffset = (a²-b²)/(2b).
  const R = (a * a + b * b) / (2 * b)
  const yOffset = (a * a - b * b) / (2 * b)  // positive when a > b (flat eye)
  const cy1 = cy - yOffset  // top-arc circle center (below midline when a > b)
  const cy2 = cy + yOffset  // bottom-arc circle center (above midline when a > b)
  return Math.hypot(px - cx, py - cy1) <= R && Math.hypot(px - cx, py - cy2) <= R
}

function normalizedEyeDist(
  px: number, py: number,
  cx: number, cy: number,
  a: number, b: number
): number {
  const dx = px - cx
  const dy = py - cy
  const rawDist = Math.hypot(dx, dy)
  if (rawDist < 0.001) return 0

  const ux = dx / rawDist
  const uy = dy / rawDist
  let lo = 0
  let hi = Math.max(a, b) * 1.1

  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2
    if (isInsideEye(cx + ux * mid, cy + uy * mid, cx, cy, a, b)) {
      lo = mid
    } else {
      hi = mid
    }
  }

  return Math.min(rawDist / Math.max(lo, 0.001), 1)
}

function buildDotGrid(W: number, H: number): DotData[] {
  const dots: DotData[] = []
  const cx = W / 2
  const cy = H / 2
  const a = (W * EYE_WIDTH_RATIO) / 2
  const b = (H * EYE_HEIGHT_RATIO) / 2

  const startX = Math.ceil((cx - a) / DOT_SPACING) * DOT_SPACING
  const startY = Math.ceil((cy - b * 1.1) / DOT_SPACING) * DOT_SPACING

  for (let px = startX; px <= cx + a + DOT_SPACING; px += DOT_SPACING) {
    for (let py = startY; py <= cy + b * 1.1 + DOT_SPACING; py += DOT_SPACING) {
      if (!isInsideEye(px, py, cx, cy, a, b)) continue
      const nd = normalizedEyeDist(px, py, cx, cy, a, b)
      const rawDist = Math.hypot(px - cx, py - cy)
      dots.push({ px, py, nd, rawDist })
    }
  }

  return dots
}

export default function HalftoneEye() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let rafId: number
    let startTime: number | null = null
    let dots: DotData[] = []
    let canvasW = 0
    let canvasH = 0
    let ctx: CanvasRenderingContext2D | null = null

    function draw(timestamp: number) {
      if (!ctx || dots.length === 0) {
        rafId = requestAnimationFrame(draw)
        return
      }

      if (!startTime) startTime = timestamp
      const elapsed = (timestamp - startTime) / 1000 // seconds

      const W = canvasW
      const H = canvasH
      const cx = W / 2
      const cy = H / 2
      const b0 = (H * EYE_HEIGHT_RATIO) / 2

      // Blink scale
      const blinkWindow = BLINK_DURATION / BLINK_PERIOD
      const blinkPhase = ((elapsed * 1000) % BLINK_PERIOD) / BLINK_PERIOD
      let blinkScale = 1.0
      if (blinkPhase < blinkWindow) {
        const t = blinkPhase / blinkWindow
        blinkScale = Math.abs(Math.cos(t * Math.PI))
      }
      const effectiveB = b0 * blinkScale

      ctx.fillStyle = '#09090b'
      ctx.fillRect(0, 0, W, H)

      ctx.fillStyle = '#ffffff'

      for (const { px, py, nd, rawDist } of dots) {
        // Skip dots outside blinked eye shape
        if (!isInsideEye(px, py, cx, cy, (W * EYE_WIDTH_RATIO) / 2, effectiveB)) continue

        const baseR = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * (1 - nd)
        const phase = rawDist / RIPPLE_WAVELENGTH - elapsed * RIPPLE_SPEED
        const ripple = Math.sin(phase * Math.PI * 2) * RIPPLE_AMPLITUDE
        const r = Math.max(MIN_RADIUS * 0.5, baseR * (1 + ripple))

        const alpha = 0.15 + 0.85 * (1 - nd)

        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(px, py, r, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1

      rafId = requestAnimationFrame(draw)
    }

    function setup(width: number, height: number) {
      const dpr = window.devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      canvasW = width
      canvasH = height

      ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.scale(dpr, dpr)
      }

      dots = buildDotGrid(width, height)
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) {
        setup(width, height)
      }
    })

    const parent = canvas.parentElement
    if (parent) {
      observer.observe(parent)
      const rect = parent.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setup(rect.width, rect.height)
      }
    }

    rafId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block' }}
    />
  )
}
