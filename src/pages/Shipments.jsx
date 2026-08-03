import { useNavigate } from 'react-router-dom'
import { DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core'
import { useState } from 'react'
import { useDb, clientById } from '../lib/store'
import { runSelectivity } from '../lib/compute'
import { STAGES } from '../lib/seed'
import { fmtDate, peso } from '../lib/format'
import { PageHeader, LaneBadge, Badge, Icon } from '../components/ui'

function ShipmentCard({ sh, db, dragging }) {
  const client = clientById(db, sh.clientId)
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-3 card-shadow select-none ${dragging ? 'rotate-2 card-shadow-lg' : 'hover:border-navy-600/40'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="tnum text-xs font-bold text-navy-700">{sh.refNo}</span>
        <Badge tone="slate" className="!text-[10px]">{sh.containerLabel}</Badge>
      </div>
      <p className="text-sm font-semibold text-slate-800 mt-1 truncate">{client?.name}</p>
      <p className="text-[11px] text-slate-500 truncate">{sh.blNo ? `B/L ${sh.blNo}` : 'No B/L yet'}{sh.eta ? ` · ETA ${fmtDate(sh.eta)}` : ''}</p>
      <div className="flex items-center justify-between mt-2">
        <LaneBadge lane={sh.lane} />
        <span className="tnum text-[11px] font-semibold text-slate-600">{peso(sh.billing.total, 0)}</span>
      </div>
    </div>
  )
}

function DraggableCard({ sh, db, onOpen }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: sh.id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => !isDragging && onOpen(sh.id)}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}
    >
      <ShipmentCard sh={sh} db={db} />
    </div>
  )
}

function Column({ stage, items, db, onOpen }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  return (
    <div className="w-[240px] shrink-0 flex flex-col">
      <div className="flex items-center justify-between px-1 mb-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{stage.label}</p>
        <span className="tnum text-[11px] font-bold text-slate-400 bg-slate-200/70 rounded-full px-2 py-0.5">{items.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-2xl p-2 space-y-2 min-h-[420px] border-2 border-dashed transition-colors ${
          isOver ? 'border-gold-500 bg-gold-50/60' : 'border-slate-200/80 bg-slate-100/60'
        }`}
      >
        {items.map((sh) => <DraggableCard key={sh.id} sh={sh} db={db} onOpen={onOpen} />)}
      </div>
    </div>
  )
}

export default function Shipments() {
  const { db, update, toast } = useDb()
  const nav = useNavigate()
  const [activeId, setActiveId] = useState(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const onDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over) return
    const stage = over.id
    const sh = db.shipments.find((x) => x.id === active.id)
    if (!sh || sh.stage === stage) return
    // entering Assessment without a lane → run BOC selectivity
    const needsLane = stage === 'assessment' && !sh.lane
    const lane = needsLane ? runSelectivity() : sh.lane
    update((d) => {
      const x = d.shipments.find((y) => y.id === active.id)
      x.stage = stage
      const label = STAGES.find((st) => st.id === stage)?.label
      x.events.push({ ts: new Date().toISOString(), label: `Moved to ${label}` })
      if (needsLane) {
        x.lane = lane
        x.events.push({
          ts: new Date().toISOString(),
          label: `Selectivity: ${lane.toUpperCase()} lane${lane === 'red' ? ' — physical examination' : lane === 'yellow' ? ' — documentary check' : ''}`,
        })
      }
    })
    if (needsLane) toast(`Selectivity assigned: ${lane.toUpperCase()} lane`)
    else toast(`${sh.refNo} → ${STAGES.find((st) => st.id === stage)?.label}`)
  }

  const activeSh = db.shipments.find((x) => x.id === activeId)

  return (
    <div>
      <PageHeader
        title="Clearance Board"
        sub="Drag shipments through the clearance pipeline — entering Assessment runs BOC selectivity"
        right={<Badge tone="blue"><Icon name="ship" size={13} /> {db.shipments.filter((s) => s.stage !== 'delivered').length} active</Badge>}
      />
      <DndContext sensors={sensors} onDragStart={({ active }) => setActiveId(active.id)} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((st) => (
            <Column
              key={st.id}
              stage={st}
              db={db}
              items={db.shipments.filter((sh) => sh.stage === st.id)}
              onOpen={(sid) => nav(`/shipments/${sid}`)}
            />
          ))}
        </div>
        <DragOverlay>{activeSh ? <ShipmentCard sh={activeSh} db={db} dragging /> : null}</DragOverlay>
      </DndContext>
    </div>
  )
}
