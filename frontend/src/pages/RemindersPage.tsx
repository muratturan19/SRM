import { useState } from 'react'
import {
  Box, Typography, Card, CardContent, List, ListItem,
  ListItemText, ListItemIcon, Chip, IconButton, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, FormControlLabel, Checkbox, Divider,
  Tooltip,
} from '@mui/material'
import { Add, Alarm, Delete, CheckCircle, RadioButtonUnchecked } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import dayjs from 'dayjs'
import 'dayjs/locale/tr'
import relativeTime from 'dayjs/plugin/relativeTime'
import { remindersApi, contactsApi } from '../services/api'
import type { Reminder } from '../types'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { TextField as MuiTextField } from '@mui/material'

dayjs.extend(relativeTime)
dayjs.locale('tr')

export default function RemindersPage() {
  const qc = useQueryClient()
  const [showDone, setShowDone] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders', showDone],
    queryFn: () => remindersApi.list(showDone),
    refetchInterval: 30_000,
  })

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', '', ''],
    queryFn: () => contactsApi.list(),
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
  } = useForm<{
    title: string
    description?: string
    remind_at: dayjs.Dayjs | null
    contact_id?: string
  }>({ defaultValues: { remind_at: dayjs().add(1, 'day') } })

  const createMut = useMutation({
    mutationFn: remindersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] })
      setAddOpen(false)
      reset({ remind_at: dayjs().add(1, 'day') })
    },
  })

  const doneMut = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      remindersApi.update(id, { is_done: done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
  })

  const deleteMut = useMutation({
    mutationFn: remindersApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
  })

  const upcoming = reminders.filter((r) => !r.is_done && dayjs(r.remind_at).isAfter(dayjs()))
  const overdue = reminders.filter((r) => !r.is_done && dayjs(r.remind_at).isBefore(dayjs()))
  const done = reminders.filter((r) => r.is_done)

  const ReminderRow = ({ r, color }: { r: Reminder; color?: string }) => (
    <ListItem
      divider
      sx={{
        borderRadius: 2,
        mb: 0.5,
        bgcolor: r.is_done ? 'action.hover' : 'background.default',
        opacity: r.is_done ? 0.7 : 1,
        borderLeft: color ? `4px solid ${color}` : undefined,
      }}
      secondaryAction={
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title={r.is_done ? 'Tamamlandı olarak işaretlendi' : 'Tamamlandı olarak işaretle'}>
            <IconButton
              size="small"
              onClick={() => doneMut.mutate({ id: r.id, done: !r.is_done })}
            >
              {r.is_done ? (
                <CheckCircle fontSize="small" color="success" />
              ) : (
                <RadioButtonUnchecked fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip title="Sil">
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                if (confirm('Hatırlatıcı silinsin mi?')) deleteMut.mutate(r.id)
              }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      }
    >
      <ListItemIcon sx={{ minWidth: 36 }}>
        <Alarm color={color === '#EF4444' ? 'error' : 'action'} />
      </ListItemIcon>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" fontWeight={600}>{r.title}</Typography>
            {r.contact_name && (
              <Chip label={r.contact_name} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
            )}
          </Box>
        }
        secondary={
          <Box sx={{ display: 'flex', gap: 1, mt: 0.25 }}>
            <Typography variant="caption" color={color === '#EF4444' ? 'error' : 'text.secondary'}>
              {dayjs(r.remind_at).format('DD.MM.YYYY HH:mm')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ({dayjs(r.remind_at).fromNow()})
            </Typography>
            {r.description && (
              <Typography variant="caption" color="text.secondary">— {r.description}</Typography>
            )}
          </Box>
        }
      />
    </ListItem>
  )

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight={700}>Hatırlatıcılar</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControlLabel
              control={<Checkbox checked={showDone} onChange={(e) => setShowDone(e.target.checked)} size="small" />}
              label={<Typography variant="body2">Tamamlananları göster</Typography>}
            />
            <Button variant="contained" startIcon={<Add />} onClick={() => setAddOpen(true)}>
              Yeni
            </Button>
          </Box>
        </Box>

        {/* Overdue */}
        {overdue.length > 0 && (
          <Card sx={{ mb: 2, border: '1px solid', borderColor: 'error.main' }}>
            <CardContent>
              <Typography variant="subtitle2" color="error" fontWeight={700} mb={1}>
                ⚠️ Gecikmiş ({overdue.length})
              </Typography>
              <List disablePadding>
                {overdue.map((r) => <ReminderRow key={r.id} r={r} color="#EF4444" />)}
              </List>
            </CardContent>
          </Card>
        )}

        {/* Upcoming */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              🔔 Yaklaşan ({upcoming.length})
            </Typography>
            {upcoming.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Yaklaşan hatırlatıcı yok.</Typography>
            ) : (
              <List disablePadding>
                {upcoming.map((r) => <ReminderRow key={r.id} r={r} />)}
              </List>
            )}
          </CardContent>
        </Card>

        {/* Done */}
        {showDone && done.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={700} mb={1}>
                ✅ Tamamlananlar ({done.length})
              </Typography>
              <List disablePadding>
                {done.map((r) => <ReminderRow key={r.id} r={r} />)}
              </List>
            </CardContent>
          </Card>
        )}

        {/* Add Dialog */}
        <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Hatırlatıcı Ekle</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField {...register('title', { required: true })} label="Başlık *" fullWidth size="small" />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="remind_at"
                  control={control}
                  render={({ field }) => (
                    <DateTimePicker
                      label="Hatırlatma Zamanı"
                      value={field.value}
                      onChange={field.onChange}
                      slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  {...register('contact_id')}
                  select
                  label="Kişi (opsiyonel)"
                  fullWidth
                  size="small"
                  SelectProps={{ native: true }}
                  InputLabelProps={{ shrink: true }}
                >
                  <option value="">— Seçin —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </option>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField {...register('description')} label="Açıklama" fullWidth size="small" multiline rows={2} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddOpen(false)}>İptal</Button>
            <Button
              variant="contained"
              onClick={handleSubmit((data) =>
                createMut.mutate({
                  title: data.title,
                  description: data.description,
                  remind_at: data.remind_at?.toISOString() ?? new Date().toISOString(),
                  contact_id: data.contact_id || undefined,
                })
              )}
              disabled={createMut.isPending}
            >
              Kaydet
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  )
}
