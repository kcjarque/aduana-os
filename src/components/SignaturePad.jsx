import { useRef, useState } from 'react'
import { Button } from './ui'

export default function SignaturePad({ onSave, onCancel }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [dirty, setDirty] = useState(false)

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const down = (e) => {
    e.preventDefault()
    try { canvasRef.current.setPointerCapture(e.pointerId) } catch { /* capture is best-effort */ }
    drawing.current = true
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = pos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }
  const move = (e) => {
    if (!drawing.current) return
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0f172a'
    const { x, y } = pos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setDirty(true)
  }
  const up = () => { drawing.current = false }
  const clear = () => {
    const c = canvasRef.current
    c.getContext('2d').clearRect(0, 0, c.width, c.height)
    setDirty(false)
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={560}
        height={180}
        className="w-full border-2 border-dashed border-slate-300 rounded-xl bg-white touch-none"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
      />
      <p className="text-xs text-slate-500 mt-2">Sign above using mouse or touch.</p>
      <div className="flex justify-end gap-2 mt-3">
        <Button tone="ghost" size="sm" onClick={clear}>Clear</Button>
        {onCancel && <Button tone="ghost" size="sm" onClick={onCancel}>Cancel</Button>}
        <Button tone="gold" size="sm" disabled={!dirty} onClick={() => onSave(canvasRef.current.toDataURL('image/png'))}>
          Accept & Sign Quotation
        </Button>
      </div>
    </div>
  )
}
