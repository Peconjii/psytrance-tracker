import { useEffect, useRef } from 'react'

function CymaticsBackground({ analyser, mode = 1 }) {
    const canvasRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        let animationFrameId

        const handleResize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        handleResize()
        window.addEventListener('resize', handleResize)

        const render = () => {
            animationFrameId = requestAnimationFrame(render)

            ctx.fillStyle = 'rgba(15, 23, 42, 0.2)'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            let subBass = 20
            let bass = 30
            let mid = 20
            let treble = 10

            if (analyser) {
                const bufferLength = analyser.frequencyBinCount
                const dataArray = new Uint8Array(bufferLength)
                analyser.getByteFrequencyData(dataArray)

                subBass = dataArray.slice(0, 4).reduce((a, b) => a + b, 0) / 4
                bass = dataArray.slice(4, 12).reduce((a, b) => a + b, 0) / 8
                mid = dataArray.slice(12, 40).reduce((a, b) => a + b, 0) / 28
                treble = dataArray.slice(40, 90).reduce((a, b) => a + b, 0) / 50
            } else {
                const time = Date.now() * 0.002
                subBass = 25 + Math.sin(time) * 10
                bass = 30 + Math.cos(time * 0.8) * 15
                mid = 20 + Math.sin(time * 1.2) * 10
                treble = 15 + Math.cos(time * 1.5) * 8
            }

            const centerX = canvas.width / 2
            const centerY = canvas.height / 2
            const hue = (bass * 2.5) % 360

            ctx.save()
            ctx.translate(centerX, centerY)

            // Laserske linije uvek idu u pozadini
            const lineCount = 10
            const maxRadius = Math.max(canvas.width, canvas.height)
            for (let i = 0; i < lineCount; i++) {
                const angle = (i / lineCount) * Math.PI * 2 + (Date.now() * 0.0002)
                const length = (maxRadius * 0.4) + (subBass * 1.2)
                ctx.beginPath()
                ctx.moveTo(0, 0)
                ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length)
                ctx.strokeStyle = `hsla(${(hue + i * 20) % 360}, 100%, 60%, 0.15)`
                ctx.lineWidth = 1
                ctx.stroke()
            }

            // PROMENA VIZUALA NA OSNOVU MODA (1, 2 ili 3)
            if (mode === 1) {
                // MOD 1: Geometrijski cvet + Sub-bass prsten
                ctx.beginPath()
                ctx.arc(0, 0, 100 + subBass * 1.2, 0, Math.PI * 2)
                ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.2)`
                ctx.lineWidth = 1.5
                ctx.stroke()

                const baseRadius = 70 + bass * 0.8
                const petals = Math.max(4, Math.floor(6 + (mid / 15)))
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

            } else if (mode === 2) {
                // MOD 2: Spiralni Tunnel / Mandala
                const rings = 5
                for (let r = 0; r < rings; r++) {
                    ctx.beginPath()
                    const radius = (r + 1) * 35 + bass * 0.5
                    const points = 8 + r * 4
                    for (let i = 0; i <= points; i++) {
                        const angle = (i / points) * Math.PI * 2 + (Date.now() * 0.001 * (r % 2 === 0 ? 1 : -1))
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

            } else if (mode === 3) {
                // MOD 3: Eksplozivne Treble čestice i pulsirajući kristal
                const particleCount = 20
                for (let p = 0; p < particleCount; p++) {
                    const angle = (p / particleCount) * Math.PI * 2 + (Date.now() * 0.0008)
                    const dist = 50 + (bass * 0.5) + Math.sin(p * 2 + Date.now() * 0.004) * (treble * 1.5)
                    const px = Math.cos(angle) * dist
                    const py = Math.sin(angle) * dist

                    ctx.beginPath()
                    ctx.arc(px, py, 2 + (mid / 20), 0, Math.PI * 2)
                    ctx.fillStyle = `hsla(${(hue + p * 15) % 360}, 100%, 75%, 0.7)`
                    ctx.fill()
                }
            }

            ctx.restore()
        }

        render()

        return () => {
            cancelAnimationFrame(animationFrameId)
            window.removeEventListener('resize', handleResize)
        }
    }, [analyser, mode])

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0 opacity-60"
        />
    )
}

export default CymaticsBackground