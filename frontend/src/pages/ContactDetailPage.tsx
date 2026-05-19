import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Card, CardContent, Grid, Chip, Avatar,
  Button, Divider, FormControlLabel, Checkbox, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Tab, Tabs, Tooltip, CircularProgress,
} from '@mui/material'
import {
  ArrowBack, Edit, Add, Delete, UploadFile,
  Email, Phone, LinkedIn, Language, LocationOn, Map, Timeline,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import dayjs from 'dayjs'
import { contactsApi, dealsApi, remindersApi, activitiesApi } from '../services/api'
import { STAGE_LABELS, STAGE_COLORS } from '../types'
import type { Contact, Deal, Reminder, Activity } from '../types'
import ContactFormFields from '../components/ContactForm'
import type { ContactFormValues } from '../components/ContactForm'
import ActivityTimeline from '../components/ActivityTimeline'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'

interface TabPanelProps { children: React.ReactNode; value: number; index: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [dealOpen, setDealOpen] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [_contractDealId, setContractDealId] = useState<string | null>(null)

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => contactsApi.get(id!),
    enabled: !!id,
  })

  const { data: meetingNotes = [] } = useQuery({
    queryKey: ['activities', id, 'note'],
    queryFn: () => activitiesApi.byContact(id!, 'note'),
    enabled: !!id,
  })

  const addNoteMut = useMutation({
    mutationFn: () => activitiesApi.create({ contact_id: id!, type: 'note', content: noteText }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities', id, 'note'] })
      setNoteOpen(false)
      setNoteText('')
    },
  })

  const deleteNoteMut = useMutation({
    mutationFn: (actId: string) => activitiesApi.delete(actId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities', id, 'note'] }),
  })

  const { control: editControl, handleSubmit: handleEdit, reset: resetEdit } =
    useForm<ContactFormValues>()

  const updateMut = useMutation({
    mutationFn: (data: Partial<Contact>) => contactsApi.update(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact', id] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
      setEditOpen(false)
    },
  })

  const checkboxMut = useMutation({
    mutationFn: (data: Partial<Contact>) => contactsApi.update(id!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact', id] }),
  })

  // Deal form
  const {
    register: regDeal,
    handleSubmit: handleDeal,
    reset: resetDeal,
  } = useForm<{ product_name: string; amount?: number; currency: string; contract_date?: string; notes?: string }>({
    defaultValues: { currency: 'TRY' },
  })

  const createDealMut = useMutation({
    mutationFn: (data: Parameters<typeof dealsApi.create>[0]) => dealsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact', id] })
      setDealOpen(false)
      resetDeal({ currency: 'TRY' })
    },
  })

  const deleteDealMut = useMutation({
    mutationFn: dealsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact', id] }),
  })

  // Reminder form
  const {
    register: regRem,
    handleSubmit: handleRem,
    control: remControl,
    reset: resetRem,
  } = useForm<{ title: string; description?: string; remind_at: dayjs.Dayjs | null }>({
    defaultValues: { remind_at: dayjs().add(1, 'day') },
  })

  const createRemMut = useMutation({
    mutationFn: (data: Parameters<typeof remindersApi.create>[0]) =>
      remindersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact', id] })
      qc.invalidateQueries({ queryKey: ['reminders'] })
      setReminderOpen(false)
      resetRem({ remind_at: dayjs().add(1, 'day') })
    },
  })

  const doneRemMut = useMutation({
    mutationFn: ({ rid, done }: { rid: string; done: boolean }) =>
      remindersApi.update(rid, { is_done: done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact', id] }),
  })

  const uploadContract = async (dealId: string, file: File) => {
    await dealsApi.uploadContract(dealId, file)
    qc.invalidateQueries({ queryKey: ['contact', id] })
    setContractDealId(null)
  }

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
  if (!contact) return <Typography>Kişi bulunamadı.</Typography>

  const openEdit = () => {
    resetEdit({
      name: contact.name,
      company: contact.company ?? '',
      title: contact.title ?? '',
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      phone2: contact.phone2 ?? '',
      linkedin: contact.linkedin ?? '',
      website: contact.website ?? '',
      address: contact.address ?? '',
      notes: contact.notes ?? '',
      source: contact.source ?? '',
      tags: contact.tags ?? '',
      stage: contact.stage,
      is_contacted: contact.is_contacted,
      is_met: contact.is_met,
      is_demo_sent: contact.is_demo_sent,
      is_proposal_sent: contact.is_proposal_sent,
    })
    setEditOpen(true)
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => navigate('/contacts')}>
            <ArrowBack />
          </IconButton>
          <Avatar
            src={contact.avatar_path ?? undefined}
            sx={{ width: 56, height: 56, bgcolor: 'primary.light', fontSize: 22 }}
          >
            {contact.name[0]}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5" fontWeight={700}>{contact.name}</Typography>
            <Typography color="text.secondary">
              {[contact.title, contact.company].filter(Boolean).join(' — ')}
            </Typography>
          </Box>
          <Chip
            label={STAGE_LABELS[contact.stage]}
            sx={{ bgcolor: STAGE_COLORS[contact.stage], color: '#fff', fontWeight: 700 }}
          />
          <Button variant="outlined" startIcon={<Edit />} onClick={openEdit}>
            Düzenle
          </Button>
        </Box>

        {/* Contact info */}
        <Grid container spacing={2} mb={2}>
          <Grid item xs={12} md={5}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} mb={1}>İletişim</Typography>
                <Divider sx={{ mb: 1.5 }} />
                {contact.email && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.75 }}>
                    <Email fontSize="small" color="action" />
                    <Typography variant="body2">{contact.email}</Typography>
                  </Box>
                )}
                {contact.phone && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.75 }}>
                    <Phone fontSize="small" color="action" />
                    <Typography variant="body2">{contact.phone}</Typography>
                  </Box>
                )}
                {contact.phone2 && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.75 }}>
                    <Phone fontSize="small" color="action" />
                    <Typography variant="body2">{contact.phone2}</Typography>
                  </Box>
                )}
                {contact.linkedin && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.75 }}>
                    <LinkedIn fontSize="small" sx={{ color: '#0A66C2' }} />
                    <Box
                      component="a"
                      href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://linkedin.com/in/${contact.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ color: '#0A66C2', fontSize: '0.875rem', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                      {contact.linkedin}
                    </Box>
                  </Box>
                )}
                {contact.website && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.75 }}>
                    <Language fontSize="small" color="action" />
                    <Box
                      component="a"
                      href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ color: 'primary.main', fontSize: '0.875rem', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                      {contact.website}
                    </Box>
                  </Box>
                )}
                {contact.address && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 0.75 }}>
                    <LocationOn fontSize="small" color="action" sx={{ mt: 0.3 }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2">{contact.address}</Typography>
                      <Box
                        component="a"
                        href={`https://maps.google.com/?q=${encodeURIComponent(contact.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          mt: 0.5,
                          color: 'primary.main',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        <Map sx={{ fontSize: 14 }} />
                        Google Maps'te Aç
                      </Box>
                    </Box>
                  </Box>
                )}
                {contact.notes && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="caption" color="text.secondary" display="block">NOTLAR</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{contact.notes}</Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={7}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} mb={1}>Temas Aşamaları</Typography>
                <Divider sx={{ mb: 1.5 }} />
                <Grid container>
                  {[
                    { key: 'is_contacted' as const, label: '✅ Temas Edildi' },
                    { key: 'is_met' as const, label: '🤝 Görüşüldü' },
                    { key: 'is_demo_sent' as const, label: '📊 Tanıtım Yollandı' },
                    { key: 'is_proposal_sent' as const, label: '📋 Teklif Verildi' },
                  ].map(({ key, label }) => (
                    <Grid item xs={12} sm={6} key={key}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={contact[key]}
                            onChange={(e) => checkboxMut.mutate({ [key]: e.target.checked })}
                          />
                        }
                        label={label}
                      />
                    </Grid>
                  ))}
                </Grid>
                {contact.tags && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {contact.tags.split(',').map((t) => (
                        <Chip key={t} label={t.trim()} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </>
                )}
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="caption" color="text.secondary">
                  Eklenme: {dayjs(contact.created_at).format('DD.MM.YYYY HH:mm')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs: Deals & Reminders */}
        <Card>
          <CardContent>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label={`Aktiviteler (${contact.activities?.length ?? 0})`} icon={<Timeline fontSize="small" />} iconPosition="start" />
              <Tab label={`Anlaşmalar (${contact.deals?.length ?? 0})`} />
              <Tab label={`Hatırlatıcılar (${contact.reminders?.length ?? 0})`} />
            </Tabs>

            {/* Activities tab */}
            <TabPanel value={tab} index={0}>
              <ActivityTimeline contactId={id!} />
            </TabPanel>

            {/* Deals tab */}
            <TabPanel value={tab} index={1}>
              <Button startIcon={<Add />} variant="contained" size="small" onClick={() => setDealOpen(true)} sx={{ mb: 2 }}>
                Anlaşma Ekle
              </Button>
              <List disablePadding>
                {(contact.deals ?? []).map((d: Deal) => (
                  <ListItem
                    key={d.id}
                    divider
                    sx={{ borderRadius: 2, bgcolor: 'background.default', mb: 1 }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography fontWeight={600}>{d.product_name}</Typography>
                          {d.amount && (
                            <Chip
                              label={new Intl.NumberFormat('tr-TR', { style: 'currency', currency: d.currency }).format(d.amount)}
                              size="small"
                              color="success"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <>
                          {d.contract_date && `Sözleşme: ${dayjs(d.contract_date).format('DD.MM.YYYY')}`}
                          {d.contract_pdf_path && (
                            <Button
                              size="small"
                              href={d.contract_pdf_path}
                              target="_blank"
                              sx={{ ml: 1 }}
                            >
                              PDF Görüntüle
                            </Button>
                          )}
                          {d.notes && <Typography variant="caption" display="block">{d.notes}</Typography>}
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Sözleşme Yükle">
                        <IconButton
                          size="small"
                          component="label"
                        >
                          <UploadFile fontSize="small" />
                          <input
                            type="file"
                            accept=".pdf,.docx,.doc"
                            hidden
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) uploadContract(d.id, f)
                            }}
                          />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sil">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            if (confirm('Anlaşma silinsin mi?')) deleteDealMut.mutate(d.id)
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </TabPanel>

            {/* Reminders tab */}
            <TabPanel value={tab} index={2}>
              <Button startIcon={<Add />} variant="contained" size="small" onClick={() => setReminderOpen(true)} sx={{ mb: 2 }}>
                Hatırlatıcı Ekle
              </Button>
              <List disablePadding>
                {(contact.reminders ?? []).map((r: Reminder) => (
                  <ListItem
                    key={r.id}
                    divider
                    sx={{
                      borderRadius: 2,
                      bgcolor: r.is_done ? 'action.hover' : 'background.default',
                      mb: 1,
                      opacity: r.is_done ? 0.6 : 1,
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={r.is_done}
                          onChange={(e) => doneRemMut.mutate({ rid: r.id, done: e.target.checked })}
                        />
                      }
                      label=""
                    />
                    <ListItemText
                      primary={<Typography fontWeight={r.is_done ? 400 : 600}>{r.title}</Typography>}
                      secondary={
                        <>
                          <Typography variant="caption" color="text.secondary">
                            {dayjs(r.remind_at).format('DD.MM.YYYY HH:mm')}
                          </Typography>
                          {r.description && (
                            <Typography variant="caption" display="block">{r.description}</Typography>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </TabPanel>
          </CardContent>
        </Card>

        {/* Meeting Notes */}
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>Görüşme Notları</Typography>
              <Button startIcon={<Add />} size="small" variant="outlined" onClick={() => setNoteOpen(true)}>
                Ekle
              </Button>
            </Box>
            <Divider sx={{ mb: 1.5 }} />
            {meetingNotes.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                Henüz görüşme notu eklenmemiş.
              </Typography>
            ) : (
              <List disablePadding>
                {meetingNotes.map((note: Activity) => (
                  <ListItem
                    key={note.id}
                    alignItems="flex-start"
                    divider
                    sx={{ px: 0, gap: 1 }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {note.content}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {dayjs(note.created_at).format('DD.MM.YYYY HH:mm')}
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Sil">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            if (confirm('Bu not silinsin mi?')) deleteNoteMut.mutate(note.id)
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        {/* Note Dialog */}
        <Dialog open={noteOpen} onClose={() => { setNoteOpen(false); setNoteText('') }} maxWidth="sm" fullWidth>
          <DialogTitle>Görüşme Notu Ekle</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField
              label="Not"
              multiline
              rows={5}
              fullWidth
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Bugünkü görüşmede neler konuşuldu..."
              autoFocus
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setNoteOpen(false); setNoteText('') }}>İptal</Button>
            <Button
              variant="contained"
              onClick={() => addNoteMut.mutate()}
              disabled={!noteText.trim() || addNoteMut.isPending}
            >
              Kaydet
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Kişiyi Düzenle</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <ContactFormFields control={editControl} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>İptal</Button>
            <Button
              variant="contained"
              onClick={handleEdit((data) => updateMut.mutate(data))}
              disabled={updateMut.isPending}
            >
              Kaydet
            </Button>
          </DialogActions>
        </Dialog>

        {/* Deal Dialog */}
        <Dialog open={dealOpen} onClose={() => setDealOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Anlaşma Ekle</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField {...regDeal('product_name', { required: true })} label="Ürün / Hizmet *" fullWidth size="small" />
              </Grid>
              <Grid item xs={6}>
                <TextField {...regDeal('amount')} label="Tutar" fullWidth size="small" type="number" />
              </Grid>
              <Grid item xs={6}>
                <TextField {...regDeal('currency')} label="Para Birimi" fullWidth size="small" />
              </Grid>
              <Grid item xs={12}>
                <TextField {...regDeal('contract_date')} label="Sözleşme Tarihi" fullWidth size="small" type="date" InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12}>
                <TextField {...regDeal('notes')} label="Notlar" fullWidth size="small" multiline rows={2} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDealOpen(false)}>İptal</Button>
            <Button
              variant="contained"
              onClick={handleDeal((data) =>
                createDealMut.mutate({ ...data, contact_id: id! })
              )}
              disabled={createDealMut.isPending}
            >
              Kaydet
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reminder Dialog */}
        <Dialog open={reminderOpen} onClose={() => setReminderOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Hatırlatıcı Ekle</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField {...regRem('title', { required: true })} label="Başlık *" fullWidth size="small" />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="remind_at"
                  control={remControl}
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
                <TextField {...regRem('description')} label="Açıklama" fullWidth size="small" multiline rows={2} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReminderOpen(false)}>İptal</Button>
            <Button
              variant="contained"
              onClick={handleRem((data) =>
                createRemMut.mutate({
                  title: data.title,
                  description: data.description,
                  remind_at: data.remind_at?.toISOString() ?? new Date().toISOString(),
                  contact_id: id,
                })
              )}
              disabled={createRemMut.isPending}
            >
              Kaydet
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  )
}
