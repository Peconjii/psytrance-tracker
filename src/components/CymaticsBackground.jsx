import { useEffect, useRef } from 'react'

const MODE_COUNT = 5
const MODE_DURATION = 14000 // ms per mode before auto-cycling
const TRANSITION_DURATION = 2200 // ms crossfade between modes

function drawFlower(ctx, { hue, subBass, bass, mid }) {
    // Geometric flower + sub-bass ring
    ctx.beginPath()
    ctx.arc(0, 0, 100 + subBass * 1.2, 0, Math.PI * 2)
    ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.2)`
    ctx.lineWidth = 1.5
    ctx.stroke()

    const baseRadius = 70 + bass * 0.8
    const petals = Math.max(4, Math.floor(6 + mid / 15))
    ctx.beginPath()
    for (let i = 0; i <= 360; i += 2) {
        const angle = (i * Math.PI) / 180
        const radiusOffset = Math.sin(angle * petals) * (mid * 0.4)
        const r = baseRadius + radiusOffset
        const x = r * Math.cos(angle)
        const y = r * Math.sin(angle)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.strokeStyle = `hsla(${hue}, 100%, 65%, 0.45)`
    ctx.lineWidth = 2
    ctx.stroke()
}

function drawSpiral(ctx, { hue, bass, treble }) {
    // Spiral tunnel / mandala
    const rings = 6
    for (let r = 0; r < rings; r++) {
        ctx.beginPath()
        const radius = (r + 1) * 32 + bass * 0.5
        const points = 8 + r * 4
        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2 + Date.now() * 0.001 * (r % 2 === 0 ? 1 : -1)
            const wave = Math.sin(angle * 4 + Date.now() * 0.003) * (treble * 0.3)
            const x = (radius + wave) * Math.cos(angle)
            const y = (radius + wave) * Math.sin(angle)
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.strokeStyle = `hsla(${(hue + r * 40) % 360}, 100%, 60%, 0.35)`
        ctx.lineWidth = 1.5
        ctx.stroke()
    }
}

function drawBurst(ctx, { hue, subBass, bass, mid, treble }) {
    // Exploding particle burst around a pulsing crystal core
    const particleCount = 28
    for (let p = 0; p < particleCount; p++) {
        const angle = (p / particleCount) * Math.PI * 2 + Date.now() * 0.0008
        const dist = 50 + bass * 0.5 + Math.sin(p * 2 + Date.now() * 0.004) * (treble * 1.6)
        const px = Math.cos(angle) * dist
        const py = Math.sin(angle) * dist

        ctx.beginPath()
        ctx.arc(px, py, 2 + mid / 20, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${(hue + p * 15) % 360}, 100%, 75%, 0.7)`
        ctx.fill()

        // Trailing spark toward the core
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(px * 0.6, py * 0.6)
        ctx.strokeStyle = `hsla(${(hue + p * 15) % 360}, 100%, 75%, 0.2)`
        ctx.lineWidth = 1
        ctx.stroke()
    }

    ctx.beginPath()
    ctx.arc(0, 0, 30 + subBass * 0.6, 0, Math.PI * 2)
    ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.5)`
    ctx.lineWidth = 2
    ctx.stroke()
}

function drawWormhole(ctx, { hue, subBass, mid, maxRadius }) {
    // Warp-speed wormhole tunnel
    const rings = 12
    for (let r = 0; r < rings; r++) {
        const t = (r / rings + (Date.now() * 0.0004) % 1) % 1
        const radius = t * maxRadius * 0.55
        const wobble = Math.sin(t * 10 + Date.now() * 0.002) * (mid * 0.5)
        ctx.beginPath()
        ctx.arc(0, 0, Math.max(0, radius + wobble), 0, Math.PI * 2)
        ctx.strokeStyle = `hsla(${(hue + r * 25) % 360}, 100%, 60%, ${0.5 * (1 - t)})`
        ctx.lineWidth = 2 + subBass * 0.05
        ctx.stroke()
    }
}

function drawHelix(ctx, { hue, bass, mid, treble }) {
    // Double-helix strands weaving around a shared axis, like a DNA rave visual
    const length = 220 + bass * 1.5
    const steps = 60
    const strands = [0, Math.PI]

    for (const offset of strands) {
        ctx.beginPath()
        for (let i = 0; i <= steps; i++) {
            const yPos = -length / 2 + (i / steps) * length
            const angle = (i / steps) * Math.PI * 6 + Date.now() * 0.0015 + offset
            const x = Math.sin(angle) * (60 + mid * 0.8)
            if (i === 0) ctx.moveTo(x, yPos)
            else ctx.lineTo(x, yPos)
        }
        ctx.strokeStyle = `hsla(${(hue + (offset === 0 ? 0 : 180)) % 360}, 100%, 65%, 0.55)`
        ctx.lineWidth = 2.5
        ctx.stroke()
    }

    // Rungs connecting the two strands
    const rungCount = 14
    for (let i = 0; i <= rungCount; i++) {
        const yPos = -length / 2 + (i / rungCount) * length
        const angle = (i / rungCount) * Math.PI * 6 + Date.now() * 0.0015
        const x1 = Math.sin(angle) * (60 + mid * 0.8)
        const x2 = Math.sin(angle + Math.PI) * (60 + mid * 0.8)
        ctx.beginPath()
        ctx.moveTo(x1, yPos)
        ctx.lineTo(x2, yPos)
        ctx.strokeStyle = `hsla(${(hue + i * 20) % 360}, 100%, 70%, ${0.15 + treble / 200})`
        ctx.lineWidth = 1
        ctx.stroke()
    }
}

const MODE_DRAWERS = [drawFlower, drawSpiral, drawBurst, drawWormhole, drawHelix]

function makeStarfield(width, height) {
    const count = 140
    const stars = []
    for (let i = 0; i < count; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.4 + 0.3,
            phase: Math.random() * Math.PI * 2,
            speed: 0.5 + Math.random() * 1.5,
        })
    }
    return stars
}

function CymaticsBackground() {
    const canvasRef = useRef(null)
    const starsRef = useRef([])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        let animationFrameId
        const startTime = Date.now()

        const handleResize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
            starsRef.current = makeStarfield(canvas.width, canvas.height)
        }
        handleResize()
        window.addEventListener('resize', handleResize)

        const drawStarfield = (t) => {
            for (const star of starsRef.current) {
                const twinkle = 0.4 + Math.sin(t * star.speed + star.phase) * 0.35
                ctx.beginPath()
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(200, 230, 255, ${Math.max(0, twinkle)})`
                ctx.fill()
            }
        }

        const render = () => {
            animationFrameId = requestAnimationFrame(render)

            const elapsed = Date.now() - startTime
            const modeIndex = Math.floor(elapsed / MODE_DURATION) % MODE_COUNT
            const prevModeIndex = (modeIndex - 1 + MODE_COUNT) % MODE_COUNT
            const timeIntoMode = elapsed % MODE_DURATION
            const transitionProgress = Math.min(1, timeIntoMode / TRANSITION_DURATION)

            ctx.fillStyle = 'rgba(15, 23, 42, 0.18)'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            const time = Date.now() * 0.002
            const subBass = 25 + Math.sin(time) * 12
            const bass = 32 + Math.cos(time * 0.8) * 16
            const mid = 22 + Math.sin(time * 1.3) * 12
            const treble = 16 + Math.cos(time * 1.7) * 9

            const centerX = canvas.width / 2
            const centerY = canvas.height / 2
            const hue = (Date.now() * 0.015 + bass * 2.5) % 360
            const maxRadius = Math.max(canvas.width, canvas.height)

            drawStarfield(time)

            // Soft pulsing glow behind everything for depth
            const glowRadius = maxRadius * 0.5
            const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius)
            glow.addColorStop(0, `hsla(${hue}, 100%, 55%, 0.10)`)
            glow.addColorStop(1, 'hsla(0, 0%, 0%, 0)')
            ctx.fillStyle = glow
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            ctx.save()
            ctx.translate(centerX, centerY)

            // Laser lines always in the background
            const lineCount = 14
            for (let i = 0; i < lineCount; i++) {
                const angle = (i / lineCount) * Math.PI * 2 + Date.now() * 0.0002
                const length = maxRadius * 0.4 + subBass * 1.4
                ctx.beginPath()
                ctx.moveTo(0, 0)
                ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length)
                ctx.strokeStyle = `hsla(${(hue + i * 18) % 360}, 100%, 60%, 0.13)`
                ctx.lineWidth = 1
                ctx.stroke()
            }

            const params = { hue, subBass, bass, mid, treble, maxRadius }

            if (transitionProgress < 1) {
                ctx.save()
                ctx.globalAlpha = 1 - transitionProgress
                MODE_DRAWERS[prevModeIndex](ctx, params)
                ctx.restore()

                ctx.save()
                ctx.globalAlpha = transitionProgress
                MODE_DRAWERS[modeIndex](ctx, params)
                ctx.restore()
            } else {
                MODE_DRAWERS[modeIndex](ctx, params)
            }

            ctx.restore()
        }

        render()

        return () => {
            cancelAnimationFrame(animationFrameId)
            window.removeEventListener('resize', handleResize)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0 opacity-60"
        />
    )
}

export default CymaticsBackground
