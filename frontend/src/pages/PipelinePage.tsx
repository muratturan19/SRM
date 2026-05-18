import { useState } from 'react'
import {
  Box, Typography, Paper, Card, CardContent,
  Chip, Avatar, CircularProgress,
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
import { contactsApi } from '../services/api'
import { STAGE_LABELS, STAGE_COLORS, PIPELINE_STAGES } from '../types'
import type { Contact, ContactStage } from '../types'

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
          bgcolor: isOver ? 'action.hover' : 'background.default',
          borderColor: isOver ? 'primary.main' : 'divider',
          borderStyle: 'dashed',
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
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mt: 3 }}
          >
            Boş
          </Typography>
        )}
      </Paper>
    </Box>
  )
}

// ── Pipeline Page ─────────────────────────────────────────────────
export default function PipelinePage() {
  const qc = useQueryClient()
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', '', ''],
    queryFn: () => contactsApi.list(),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: ContactStage }) =>
      contactsApi.update(id, { stage }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  // Group contacts by stage (exclude customers — they have their own page)
  const byStage: Record<ContactStage, Contact[]> = {} as Record<ContactStage, Contact[]>
  PIPELINE_STAGES.forEach((s) => {
    byStage[s] = contacts.filter((c) => c.stage === s)
  })

  const activeContact = activeId ? contacts.find((c) => c.id === activeId) : null

  const onDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id))

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    if (!over) return
    const newStage = String(over.id) as ContactStage
    const contact = contacts.find((c) => c.id === String(active.id))
    if (contact && contact.stage !== newStage && PIPELINE_STAGES.includes(newStage)) {
      updateMut.mutate({ id: contact.id, stage: newStage })
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
      <Typography variant="h5" fontWeight={700} mb={3}>
        Pipeline
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Kartları sürükleyerek aşama değiştirin. Müşteriye dönenler <strong>Müşteriler</strong> sayfasına taşınır.
      </Typography>

      <Box sx={{ overflowX: 'auto', pb: 2 }}>
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <Box sx={{ display: 'flex', gap: 2, minWidth: 'max-content' }}>
            {PIPELINE_STAGES.map((stage) => (
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
    </Box>
  )
}
