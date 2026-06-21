import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, CircularProgress, Alert,
  TextField, MenuItem, Stack, Autocomplete, Divider, IconButton,
  ToggleButton, ToggleButtonGroup, List, ListItem, ListItemText,
} from '@mui/material'
import { Mic, Stop, GraphicEq, Person, Notes as NotesIcon, Alarm } from '@mui/icons-material'
import { useForm } from 'react-hook-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import 'dayjs/locale/tr'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { voiceApi, contactsApi, activitiesApi, remindersApi } from '../services/api'
import ContactFormFields, { type ContactFormValues } from './ContactForm'
import { ACTIVITY_LABELS, ACTIVITY_ICONS } from '../types'
import type { VoiceResult, VoiceIntent, VoiceContactMatch, ActivityType } from '../types'

dayjs.locale('tr')

interface Props {
  open: boolean
  onClose: () => void
  onSaved?: (msg: string) => void
}

type Step = 'record' | 'processing' | 'review'

const INTENT_META: Record<VoiceIntent, { label: string; icon: ReactNode }> = {
  new_contact: { label: 'Yeni Kişi', icon: <Person fontSize="small" /> },
  contact_note: { label: 'Görüşme Notu', icon: <NotesIcon fontSize="small" /> },
  reminder: { label: 'Hatırlatıcı', icon: <Alarm fontSize="small" /> },
}

const EMPTY_CONTACT: ContactFormValues = {
  name: '', stage: 'lead',
  is_contacted: false, is_met: false, is_demo_sent: false, is_proposal_sent: false,
}

function fmtDuration(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// İsme göre kişi arayan autocomplete
function ContactPicker({
  value, onChange, initial,
}: {
  value: VoiceContactMatch | null
  onChange: (c: VoiceContactMatch | null) => void
  initial: VoiceContactMatch[]
}) {
  const [input, setInput] = useState('')
  const { data: searched = [] } = useQuery({
    queryKey: ['voice-contact-search', input],
    queryFn: () => contactsApi.list({ search: input }),
    enabled: input.trim().length >= 2,
  })
  const options: VoiceContactMatch[] = useMemo(() => {
    const map = new Map<string, VoiceContactMatch>()
    for (const c of initial) map.set(c.id, c)
    for (const c of searched) map.set(c.id, { id: c.id, name: c.name, company: c.company, phone: c.phone, email: c.email })
    if (value) map.set(value.id, value)
    return [...map.values()]
  }, [initial, searched, value])

  return (
    <Autocomplete
      size="small"
      value={value}
      onChange={(_, v) => onChange(v)}
      onInputChange={(_, v) => setInput(v)}
      options={options}
      getOptionLabel={(o) => (o.company ? `${o.name} — ${o.company}` : o.name)}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      noOptionsText={input.length < 2 ? 'Aramak için yazın…' : 'Kişi bulunamadı'}
      renderInput={(params) => <TextField {...params} label="İlgili kişi" />}
    />
  )
}

export default function VoiceInputModal({ open, onClose, onSaved }: Props) {
  const qc = useQueryClient()
  const { recording, seconds, error: recError, start, stop } = useAudioRecorder()

  const [step, setStep] = useState<Step>('record')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<VoiceResult | null>(null)
  const [intent, setIntent] = useState<VoiceIntent>('new_contact')
  const [saving, setSaving] = useState(false)
  const [duplicates, setDuplicates] = useState<VoiceContactMatch[] | null>(null)

  // new_contact form
  const { control, reset, getValues } = useForm<ContactFormValues>({ defaultValues: EMPTY_CONTACT })

  // contact_note state
  const [noteTarget, setNoteTarget] = useState<VoiceContactMatch | null>(null)
  const [noteType, setNoteType] = useState<ActivityType>('note')
  const [noteContent, setNoteContent] = useState('')

  // reminder state
  const [remTitle, setRemTitle] = useState('')
  const [remTarget, setRemTarget] = useState<VoiceContactMatch | null>(null)
  const [remDate, setRemDate] = useState<dayjs.Dayjs | null>(null)

  const resetAll = () => {
    setStep('record')
    setError(null)
    setResult(null)
    setSaving(false)
    setDuplicates(null)
    reset(EMPTY_CONTACT)
    setNoteTarget(null); setNoteType('note'); setNoteContent('')
    setRemTitle(''); setRemTarget(null); setRemDate(null)
  }

  useEffect(() => {
    if (open) resetAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Sonuç geldiğinde alanları doldur
  const applyResult = (r: VoiceResult) => {
    setResult(r)
    setIntent(r.intent)
    const matches = r.contact_matches ?? []
    const firstMatch = matches[0] ?? null

    // new_contact
    const c = r.contact ?? {}
    reset({
      ...EMPTY_CONTACT,
      name: c.name ?? '',
      company: c.company ?? undefined,
      title: c.title ?? undefined,
      email: c.email ?? undefined,
      phone: c.phone ?? undefined,
      phone2: c.phone2 ?? undefined,
      linkedin: c.linkedin ?? undefined,
      website: c.website ?? undefined,
      address: c.address ?? undefined,
      notes: c.notes ?? undefined,
      tags: c.tags ?? undefined,
    })

    // contact_note
    setNoteTarget(firstMatch)
    setNoteType((r.note?.type as ActivityType) ?? 'note')
    setNoteContent(r.note?.content ?? '')

    // reminder
    setRemTitle(r.reminder?.title ?? '')
    setRemTarget(firstMatch)
    setRemDate(r.reminder?.remind_at ? dayjs(r.reminder.remind_at) : dayjs().add(1, 'day').hour(9).minute(0))

    setStep('review')
  }

  const handleStop = async () => {
    const blob = await stop()
    if (!blob) {
      setError('Kayıt alınamadı, lütfen tekrar deneyin.')
      return
    }
    setStep('processing')
    setError(null)
    try {
      const r = await voiceApi.process(blob)
      applyResult(r)
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Ses işlenemedi.')
      setStep('record')
    }
  }

  const finish = (msg: string) => {
    qc.invalidateQueries({ queryKey: ['contacts'] })
    qc.invalidateQueries({ queryKey: ['activities'] })
    qc.invalidateQueries({ queryKey: ['reminders'] })
    qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    onSaved?.(msg)
    onClose()
  }

  const saveNewContact = async (force = false) => {
    const data = getValues()
    setSaving(true)
    setError(null)
    try {
      await contactsApi.create(data, force)
      finish(`${data.name} kişi olarak eklendi.`)
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      if (detail?.duplicates) {
        setDuplicates(detail.duplicates)
      } else {
        setError('Kişi kaydedilemedi.')
      }
    } finally {
      setSaving(false)
    }
  }

  const saveNote = async () => {
    if (!noteTarget) { setError('Lütfen ilgili kişiyi seçin.'); return }
    if (!noteContent.trim()) { setError('Not içeriği boş olamaz.'); return }
    setSaving(true); setError(null)
    try {
      await activitiesApi.create({ contact_id: noteTarget.id, type: noteType, content: noteContent.trim() })
      finish(`Not eklendi: ${noteTarget.name}`)
    } catch {
      setError('Not kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  const saveReminder = async () => {
    if (!remTitle.trim()) { setError('Hatırlatıcı başlığı boş olamaz.'); return }
    if (!remDate) { setError('Lütfen tarih/saat seçin.'); return }
    setSaving(true); setError(null)
    try {
      await remindersApi.create({
        title: remTitle.trim(),
        remind_at: remDate.toISOString(),
        contact_id: remTarget?.id,
      })
      finish(`Hatırlatıcı kuruldu: ${remDate.format('DD.MM.YYYY HH:mm')}`)
    } catch {
      setError('Hatırlatıcı kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  const handlePrimarySave = () => {
    if (intent === 'new_contact') saveNewContact()
    else if (intent === 'contact_note') saveNote()
    else saveReminder()
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Mic color="primary" /> Sesli Giriş
      </DialogTitle>

      <DialogContent>
        {/* ── Kayıt adımı ── */}
        {step === 'record' && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Konuşun — yeni kişi, görüşme notu veya hatırlatıcı oluşturabilirsiniz.<br />
              <em>"Ahmet Yılmaz, ABC Şirketi, telefonu 0532…"</em> &nbsp;·&nbsp;
              <em>"Mehmet'le görüştüm, teklifi beğendi"</em> &nbsp;·&nbsp;
              <em>"Yarın 15:00'te Ayşe'yi ara"</em>
            </Typography>

            <IconButton
              onClick={recording ? handleStop : start}
              sx={{
                width: 88, height: 88,
                bgcolor: recording ? 'error.main' : 'primary.main',
                color: '#fff',
                '&:hover': { bgcolor: recording ? 'error.dark' : 'primary.dark' },
                animation: recording ? 'pulse 1.4s infinite' : 'none',
                '@keyframes pulse': {
                  '0%': { boxShadow: '0 0 0 0 rgba(239,68,68,0.5)' },
                  '70%': { boxShadow: '0 0 0 18px rgba(239,68,68,0)' },
                  '100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0)' },
                },
              }}
            >
              {recording ? <Stop sx={{ fontSize: 40 }} /> : <Mic sx={{ fontSize: 40 }} />}
            </IconButton>

            <Typography variant="h6" sx={{ mt: 2 }}>
              {recording ? (
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <GraphicEq color="error" /> {fmtDuration(seconds)}
                </Box>
              ) : 'Kaydı başlatmak için tıklayın'}
            </Typography>
            {recording && (
              <Typography variant="caption" color="text.secondary">
                Bitince durdur düğmesine basın
              </Typography>
            )}
            {(recError || error) && <Alert severity="error" sx={{ mt: 2 }}>{recError || error}</Alert>}
          </Box>
        )}

        {/* ── İşleme adımı ── */}
        {step === 'processing' && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography color="text.secondary">Yapay zeka dinliyor ve çözümlüyor…</Typography>
          </Box>
        )}

        {/* ── Gözden geçirme adımı ── */}
        {step === 'review' && result && (
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="tr">
            <Box>
              {/* Transkript */}
              <Box sx={{ p: 1.5, mb: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">Duyulan</Typography>
                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>"{result.transcript}"</Typography>
              </Box>

              {/* Niyet seçici */}
              <Typography variant="caption" color="text.secondary">Algılanan işlem</Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                value={intent}
                onChange={(_, v) => v && setIntent(v)}
                sx={{ mb: 2, mt: 0.5 }}
              >
                {(['new_contact', 'contact_note', 'reminder'] as VoiceIntent[]).map((i) => (
                  <ToggleButton key={i} value={i} sx={{ gap: 0.5 }}>
                    {INTENT_META[i].icon} {INTENT_META[i].label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <Divider sx={{ mb: 2 }} />

              {/* new_contact */}
              {intent === 'new_contact' && <ContactFormFields control={control} />}

              {/* contact_note */}
              {intent === 'contact_note' && (
                <Stack spacing={2}>
                  <ContactPicker value={noteTarget} onChange={setNoteTarget} initial={result.contact_matches} />
                  <TextField
                    select size="small" label="Tür" value={noteType}
                    onChange={(e) => setNoteType(e.target.value as ActivityType)}
                  >
                    {(['call', 'meeting', 'email', 'note', 'task'] as ActivityType[]).map((t) => (
                      <MenuItem key={t} value={t}>{ACTIVITY_ICONS[t]} {ACTIVITY_LABELS[t]}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Not içeriği" multiline rows={4} fullWidth size="small"
                    value={noteContent} onChange={(e) => setNoteContent(e.target.value)}
                  />
                </Stack>
              )}

              {/* reminder */}
              {intent === 'reminder' && (
                <Stack spacing={2}>
                  <TextField
                    label="Hatırlatıcı" fullWidth size="small"
                    value={remTitle} onChange={(e) => setRemTitle(e.target.value)}
                  />
                  <DateTimePicker
                    label="Tarih & Saat"
                    value={remDate}
                    onChange={setRemDate}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                  <ContactPicker value={remTarget} onChange={setRemTarget} initial={result.contact_matches} />
                </Stack>
              )}

              {/* Duplicate uyarısı (new_contact) */}
              {duplicates && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight={600}>Benzer kişi(ler) zaten var:</Typography>
                  <List dense disablePadding>
                    {duplicates.map((d) => (
                      <ListItem key={d.id} disablePadding>
                        <ListItemText
                          primary={`${d.name}${d.company ? ` — ${d.company}` : ''}`}
                          secondary={[d.email, d.phone].filter(Boolean).join(' · ')}
                        />
                      </ListItem>
                    ))}
                  </List>
                  <Button size="small" color="warning" variant="contained" sx={{ mt: 1 }}
                    onClick={() => saveNewContact(true)} disabled={saving}>
                    Yine de Kaydet
                  </Button>
                </Alert>
              )}

              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </Box>
          </LocalizationProvider>
        )}
      </DialogContent>

      <DialogActions>
        {step === 'review' && (
          <Button onClick={() => resetAll()} disabled={saving}>Tekrar Kaydet</Button>
        )}
        <Button onClick={onClose} disabled={saving}>İptal</Button>
        {step === 'review' && (
          <Button variant="contained" onClick={handlePrimarySave} disabled={saving}>
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
