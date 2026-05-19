import { useState } from 'react'
import {
  Box, Typography, IconButton, Chip, Tooltip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, FormControlLabel, Checkbox,
  Stack, Divider, Paper, CircularProgress,
} from '@mui/material'
import {
  Add, Delete, Edit, CheckCircle, RadioButtonUnchecked,
  Phone, Groups, Email, Notes, TaskAlt,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import dayjs from 'dayjs'
import 'dayjs/locale/tr'
import relativeTime from 'dayjs/plugin/relativeTime'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { activitiesApi } from '../services/api'
import { ACTIVITY_LABELS, ACTIVITY_ICONS } from '../types'
import type { Activity, ActivityType } from '../types'

dayjs.extend(relativeTime)
dayjs.locale('tr')

const TYPE_ICON: Record<ActivityType, React.ReactNode> = {
  call: <Phone fontSize="small" />,
  meeting: <Groups fontSize="small" />,
  email: <Email fontSize="small" />,
  note: <Notes fontSize="small" />,
  task: <TaskAlt fontSize="small" />,
}

const TYPE_COLOR: Record<ActivityType, string> = {
  call: '#3B82F6',
  meeting: '#8B5CF6',
  email: '#06B6D4',
  note: '#F59E0B',
  task: '#10B981',
}

interface FormValues {
  type: ActivityType
  content: string
  outcome: string
  due_at: dayjs.Dayjs | null
  is_done: boolean
}

interface Props {
  contactId: string
}

export default function ActivityTimeline({ contactId }: Props) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Activity | null>(null)

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activities', contactId],
    queryFn: () => activitiesApi.byContact(contactId),
  })

  const { register, control, handleSubmit, reset, watch, setValue } = useForm<FormValues>({
    defaultValues: { type: 'note', content: '', outcome: '', due_at: null, is_done: false },
  })
  const watchType = watch('type')

  const createMut = useMutation({
    mutationFn: (data: FormValues) =>
      activitiesApi.create({
        contact_id: contactId,
        type: data.type,
        content: data.content,
        outcome: data.outcome || undefined,
        due_at: data.due_at ? data.due_at.toISOString() : undefined,
        is_done: data.is_done,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities', contactId] })
      handleClose()
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormValues }) =>
      activitiesApi.update(id, {
        type: data.type,
        content: data.content,
        outcome: data.outcome || undefined,
        due_at: data.due_at ? data.due_at.toISOString() : undefined,
        is_done: data.is_done,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities', contactId] })
      handleClose()
    },
  })

  const toggleDoneMut = useMutation({
    mutationFn: ({ id, is_done }: { id: string; is_done: boolean }) =>
      activitiesApi.update(id, { is_done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities', contactId] }),
  })

  const deleteMut = useMutation({
    mutationFn: activitiesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities', contactId] }),
  })

  const openNew = () => {
    setEditing(null)
    reset({ type: 'note', content: '', outcome: '', due_at: dayjs(), is_done: false })
    setOpen(true)
  }

  const openEdit = (a: Activity) => {
    setEditing(a)
    reset({
      type: a.type,
      content: a.content,
      outcome: a.outcome ?? '',
      due_at: a.due_at ? dayjs(a.due_at) : null,
      is_done: a.is_done,
    })
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setEditing(null)
  }

  const onSubmit = (data: FormValues) => {
    if (editing) {
      updateMut.mutate({ id: editing.id, data })
    } else {
      createMut.mutate(data)
    }
  }

  // Group by date
  const grouped: { label: string; items: Activity[] }[] = []
  const seen = new Set<string>()
  for (const a of activities) {
    const label = dayjs(a.created_at).format('DD MMMM YYYY')
    if (!seen.has(label)) {
      seen.add(label)
      grouped.push({ label, items: [] })
    }
    grouped[grouped.length - 1].items.push(a)
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="tr">
      <Box>
        <Button startIcon={<Add />} variant="contained" size="small" onClick={openNew} sx={{ mb: 2 }}>
          Aktivite Ekle
        </Button>

        {isLoading && <CircularProgress size={24} />}

        {activities.length === 0 && !isLoading && (
          <Typography color="text.secondary" variant="body2" sx={{ ml: 1 }}>
            Henüz aktivite yok. İlk aramayı veya notu ekle.
          </Typography>
        )}

        {grouped.map(({ label, items }) => (
          <Box key={label} sx={{ mb: 2 }}>
            {/* Tarih ayraç */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Divider sx={{ flexGrow: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                {label}
              </Typography>
              <Divider sx={{ flexGrow: 1 }} />
            </Box>

            <Stack spacing={1}>
              {items.map((a) => (
                <Paper
                  key={a.id}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'flex-start',
                    opacity: a.is_done && a.type === 'task' ? 0.6 : 1,
                    borderLeft: `3px solid ${TYPE_COLOR[a.type]}`,
                    borderRadius: '0 8px 8px 0',
                  }}
                >
                  {/* Tip ikonu */}
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: `${TYPE_COLOR[a.type]}22`,
                      color: TYPE_COLOR[a.type],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {TYPE_ICON[a.type]}
                  </Box>

                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                      <Chip
                        label={ACTIVITY_LABELS[a.type]}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          bgcolor: `${TYPE_COLOR[a.type]}22`,
                          color: TYPE_COLOR[a.type],
                          fontWeight: 700,
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {a.due_at && a.type !== 'task'
                          ? dayjs(a.due_at).format('DD.MM.YYYY HH:mm')
                          : dayjs(a.created_at).format('HH:mm')}
                      </Typography>
                      {a.due_at && a.type === 'task' && (
                        <Chip
                          label={`Son: ${dayjs(a.due_at).format('DD.MM HH:mm')}`}
                          size="small"
                          color={dayjs(a.due_at).isBefore(dayjs()) && !a.is_done ? 'error' : 'default'}
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      )}
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{ textDecoration: a.is_done && a.type === 'task' ? 'line-through' : 'none' }}
                    >
                      {a.content}
                    </Typography>
                    {a.outcome && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                        Sonuç: {a.outcome}
                      </Typography>
                    )}
                  </Box>

                  {/* Görev tamamla butonu */}
                  {a.type === 'task' && (
                    <Tooltip title={a.is_done ? 'Tamamlandı' : 'Tamamlandı olarak işaretle'}>
                      <IconButton
                        size="small"
                        onClick={() => toggleDoneMut.mutate({ id: a.id, is_done: !a.is_done })}
                        sx={{ color: a.is_done ? 'success.main' : 'action.disabled' }}
                      >
                        {a.is_done ? <CheckCircle fontSize="small" /> : <RadioButtonUnchecked fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  )}

                  <Tooltip title="Düzenle">
                    <IconButton size="small" onClick={() => openEdit(a)}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Sil">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        if (confirm('Bu aktivite silinsin mi?')) deleteMut.mutate(a.id)
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Paper>
              ))}
            </Stack>
          </Box>
        ))}

        {/* Add/Edit Dialog */}
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle>{editing ? 'Aktivite Düzenle' : 'Aktivite Ekle'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2}>
              <TextField
                select
                label="Tür"
                value={watchType}
                onChange={(e) => setValue('type', e.target.value as ActivityType)}
                size="small"
                fullWidth
              >
                {(['call', 'meeting', 'email', 'note', 'task'] as ActivityType[]).map((t) => (
                  <MenuItem key={t} value={t}>
                    {ACTIVITY_ICONS[t]} {ACTIVITY_LABELS[t]}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                {...register('content', { required: true })}
                label={watchType === 'task' ? 'Görev açıklaması *' : 'İçerik *'}
                multiline
                rows={3}
                size="small"
                fullWidth
              />

              {(watchType === 'call' || watchType === 'meeting') && (
                <TextField
                  {...register('outcome')}
                  label="Sonuç / Özet"
                  size="small"
                  fullWidth
                  placeholder="Görüşme nasıl geçti?"
                />
              )}

              <Controller
                name="due_at"
                control={control}
                render={({ field }) => (
                  <DateTimePicker
                    label={watchType === 'task' ? 'Son tarih (teslim)' : 'Tarih & Saat'}
                    value={field.value}
                    onChange={field.onChange}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                )}
              />

              {watchType === 'task' && (
                <Controller
                  name="is_done"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                      label="Tamamlandı"
                    />
                  )}
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>İptal</Button>
            <Button
              variant="contained"
              onClick={handleSubmit(onSubmit)}
              disabled={createMut.isPending || updateMut.isPending}
            >
              {editing ? 'Güncelle' : 'Ekle'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  )
}
