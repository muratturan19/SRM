import { useState } from 'react'
import {
  Box, Typography, Paper, Card, CardContent,
  Chip, Avatar, CircularProgress, Tabs, Tab,
} from '@mui/material'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { contactsApi, dealsApi } from '../services/api'
import {
  STAGE_LABELS, STAGE_COLORS, PIPELINE_STAGES,
  DEAL_STAGE_LABELS, DEAL_STAGE_COLORS, DEAL_PIPELINE_STAGES, DEAL_STAGE_PROBABILITY,
} from '../types'
import type { Contact, ContactStage, Deal, DealStage } from '../types'

// ── Draggable Contact Card ────────────────────────────────────────
function SortableCard({ contact }: { contact: Contact }) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: contact.id })

  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => navigate(`/contacts/${contact.id}`)}
      sx={{
        mb: 1,
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
        '&:hover': { boxShadow: 4 },
      }}
    >
      <CardContent sx={{ p: '10px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar
            src={contact.avatar_path ?? undefined}
            sx={{ width: 32, height: 32, fontSize: 14, bgcolor: 'primary.light' }}
          >
            {contact.name[0]}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {contact.name}
            </Typography>
            {contact.company && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {contact.company}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

// ── Droppable Column ──────────────────────────────────────────────
function Column({
  stage,
  contacts,
}: {
  stage: ContactStage
  contacts: Contact[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <Box
      sx={{
        width: 220,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Column header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
          px: 0.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: STAGE_COLORS[stage],
            }}
          />
          <Typography variant="subtitle2" fontWeight={600}>
            {STAGE_LABELS[stage]}
          </Typography>
        </Box>
        <Chip
          label={contacts.length}
          size="small"
          sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
        />
      </Box>

      {/* Cards */}
      <Paper
        ref={setNodeRef}
        variant="outlined"
        sx={{
          flexGrow: 1,
          minHeight: 120,
          p: 1,
          bgcolor: isOver
            ? (stage === 'customer' ? 'success.lighter' : 'action.hover')
            : (stage === 'customer' ? 'success.50' : 'background.default'),
          borderColor: isOver
            ? (stage === 'customer' ? 'success.main' : 'primary.main')
            : (stage === 'customer' ? 'success.light' : 'divider'),
          borderStyle: stage === 'customer' ? 'solid' : 'dashed',
          transition: 'all 0.15s',
        }}
      >
        <SortableContext
          items={contacts.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {contacts.map((c) => (
            <SortableCard key={c.id} contact={c} />
          ))}
        </SortableContext>
        {contacts.length === 0 && (
          <Typography
            variant="caption"
            color={stage === 'customer' ? 'success.main' : 'text.secondary'}
            sx={{ display: 'block', textAlign: 'center', mt: 3 }}
          >
            {stage === 'customer' ? 'Buraya sürükle → Müşteri' : 'Boş'}
          </Typography>
        )}
      </Paper>
    </Box>
  )
}

// ── Deal Card (non-sortable, drag by stage) ───────────────────────
function DealCard({ deal }: { deal: Deal & { contact?: { name: string; company?: string } } }) {
  const navigate = useNavigate()
  return (
    <Card
      onClick={() => deal.contact_id && navigate(`/contacts/${deal.contact_id}`)}
      sx={{
        mb: 1, cursor: 'pointer',
        borderLeft: `3px solid ${DEAL_STAGE_COLORS[deal.stage]}`,
        '&:hover': { boxShadow: 4 },
      }}
    >
      <CardContent sx={{ p: '10px !important' }}>
        <Typography variant="body2" fontWeight={600} noWrap>{deal.product_name}</Typography>
        {deal.amount && (
          <Typography variant="caption" color="success.main" fontWeight={700}>
            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: deal.currency }).format(deal.amount)}
          </Typography>
        )}
        {deal.contact && (
          <Typography variant="caption" color="text.secondary" display="block" noWrap>
            {deal.contact.name}{deal.contact.company ? ` · ${deal.contact.company}` : ''}
          </Typography>
        )}
        {deal.probability !== null && deal.probability !== undefined && (
          <Chip label={`%${deal.probability}`} size="small" sx={{ height: 16, fontSize: '0.6rem', mt: 0.5 }} />
        )}
      </CardContent>
    </Card>
  )
}

// ── Deal Column ───────────────────────────────────────────────────
function DealColumn({
  stage, deals,
}: {
  stage: DealStage
  deals: Deal[]
  onDrop: (dealId: string, stage: DealStage) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `deal-${stage}` })
  const totalValue = deals.reduce((s, d) => s + (d.amount ? Number(d.amount) : 0), 0)

  return (
    <Box sx={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, px: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: DEAL_STAGE_COLORS[stage] }} />
          <Typography variant="subtitle2" fontWeight={600}>{DEAL_STAGE_LABELS[stage]}</Typography>
        </Box>
        <Chip label={deals.length} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
      </Box>
      {totalValue > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ px: 0.5, mb: 1 }}>
          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(totalValue)}
        </Typography>
      )}
      <Paper
        ref={setNodeRef}
        variant="outlined"
        sx={{
          flexGrow: 1, minHeight: 120, p: 1,
          bgcolor: isOver ? 'action.hover' : 'background.default',
          borderColor: isOver ? 'primary.main' : 'divider',
          borderStyle: 'dashed',
          transition: 'all 0.15s',
        }}
      >
        {deals.map((d) => <DealCard key={d.id} deal={d} />)}
        {deals.length === 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>Boş</Typography>
        )}
      </Paper>
    </Box>
  )
}

// ── Pipeline Page ─────────────────────────────────────────────────
export default function PipelinePage() {
  const qc = useQueryClient()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pipelineTab, setPipelineTab] = useState(0)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', '', ''],
    queryFn: () => contactsApi.list(),
  })

  const { data: deals = [] } = useQuery({
    queryKey: ['deals'],
    queryFn: () => dealsApi.list(),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: ContactStage }) =>
      contactsApi.update(id, { stage }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  const updateDealMut = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: DealStage }) =>
      dealsApi.update(id, { stage, probability: DEAL_STAGE_PROBABILITY[stage] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deals'] }),
  })

  // Group contacts by stage (including customer — shown as final column)
  const ALL_CONTACT_STAGES: ContactStage[] = [...PIPELINE_STAGES, 'customer']
  const byStage: Record<ContactStage, Contact[]> = {} as Record<ContactStage, Contact[]>
  ALL_CONTACT_STAGES.forEach((s) => {
    byStage[s] = contacts.filter((c) => c.stage === s)
  })

  // Group deals by stage
  const dealsByStage: Record<DealStage, Deal[]> = {} as Record<DealStage, Deal[]>
  DEAL_PIPELINE_STAGES.forEach((s) => {
    dealsByStage[s] = deals.filter((d) => d.stage === s)
  })

  const activeContact = activeId ? contacts.find((c) => c.id === activeId) : null

  const onDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id))

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    if (!over) return
    const overId = String(over.id)
    // Contact kanban
    if (!overId.startsWith('deal-')) {
      const newStage = overId as ContactStage
      const contact = contacts.find((c) => c.id === String(active.id))
      if (contact && contact.stage !== newStage && ALL_CONTACT_STAGES.includes(newStage)) {
        updateMut.mutate({ id: contact.id, stage: newStage })
      }
    }
    // Deal kanban handled via onDrop prop
  }

  const handleDealDrop = (dealId: string, stage: DealStage) => {
    const deal = deals.find((d) => d.id === dealId)
    if (deal && deal.stage !== stage) {
      updateDealMut.mutate({ id: dealId, stage })
    }
  }

  if (isLoading)
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>Pipeline</Typography>

      <Tabs value={pipelineTab} onChange={(_, v) => setPipelineTab(v)} sx={{ mb: 3 }}>
        <Tab label="Kişi Hattı" />
        <Tab label={`Anlaşma Hattı (${deals.length})`} />
      </Tabs>

      {/* ── Kişi Pipeline ─────────────────────────────────── */}
      {pipelineTab === 0 && (
        <>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Kartları sürükleyerek aşama değiştirin. Müşteriye dönenler <strong>Müşteriler</strong> sayfasına taşınır.
          </Typography>
          <Box sx={{ overflowX: 'auto', pb: 2 }}>
            <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
              <Box sx={{ display: 'flex', gap: 2, minWidth: 'max-content' }}>
                {ALL_CONTACT_STAGES.map((stage) => (
                  <Column key={stage} stage={stage} contacts={byStage[stage]} />
                ))}
              </Box>
              <DragOverlay>
                {activeContact && (
                  <Card sx={{ width: 210, boxShadow: 8 }}>
                    <CardContent sx={{ p: '10px !important' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', fontSize: 14 }}>
                          {activeContact.name[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{activeContact.name}</Typography>
                          {activeContact.company && (
                            <Typography variant="caption" color="text.secondary">{activeContact.company}</Typography>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </DragOverlay>
            </DndContext>
          </Box>
        </>
      )}

      {/* ── Anlaşma Pipeline ──────────────────────────────── */}
      {pipelineTab === 1 && (
        <>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Anlaşmaları sürükleyerek aşama değiştirin.{' '}
            <strong>
              Toplam:{' '}
              {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(
                deals.filter((d) => d.stage !== 'lost').reduce((s, d) => s + (d.amount ? Number(d.amount) : 0), 0)
              )}
            </strong>
          </Typography>
          <Box sx={{ overflowX: 'auto', pb: 2 }}>
            <DndContext
              sensors={sensors}
              onDragEnd={({ active, over }) => {
                if (!over) return
                const overId = String(over.id)
                if (overId.startsWith('deal-')) {
                  const stage = overId.replace('deal-', '') as DealStage
                  handleDealDrop(String(active.id), stage)
                }
              }}
            >
              <Box sx={{ display: 'flex', gap: 2, minWidth: 'max-content' }}>
                {DEAL_PIPELINE_STAGES.map((stage) => (
                  <DealColumn key={stage} stage={stage} deals={dealsByStage[stage]} onDrop={handleDealDrop} />
                ))}
              </Box>
            </DndContext>
          </Box>
        </>
      )}
    </Box>
  )
}
