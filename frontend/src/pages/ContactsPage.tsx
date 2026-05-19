import { useRef, useState } from 'react'
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Tooltip,
  Checkbox,
  Alert,
  Snackbar,
  List,
  ListItem,
  ListItemText,
  Collapse,
} from '@mui/material'
import {
  Add,
  Search,
  CameraAlt,
  Delete,
  OpenInNew,
  FileDownload,
  FileUpload,
  WarningAmber,
  FilterList,
  LocalOffer,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { contactsApi } from '../services/api'
import { STAGE_LABELS, STAGE_COLORS, PIPELINE_STAGES } from '../types'
import type { Contact, ContactStage } from '../types'
import CardScannerModal from '../components/CardScannerModal'
import ContactFormFields from '../components/ContactForm'
import type { ContactFormValues } from '../components/ContactForm'

const ALL_STAGES = [...PIPELINE_STAGES, 'customer' as ContactStage]

const STAGE_ORDER: ContactStage[] = ['lead', 'contacted', 'met', 'demo_sent', 'proposal_sent', 'customer']

const MILESTONE_STAGES: Record<string, ContactStage> = {
  is_contacted: 'contacted',
  is_met: 'met',
  is_demo_sent: 'demo_sent',
  is_proposal_sent: 'proposal_sent',
}

function buildCheckPatch(contact: Contact, field: string, newValue: boolean): Partial<Contact> {
  const patch: Partial<Contact> = { [field]: newValue }
  if (newValue && field in MILESTONE_STAGES) {
    const targetStage = MILESTONE_STAGES[field]
    const currentIdx = STAGE_ORDER.indexOf(contact.stage)
    const targetIdx = STAGE_ORDER.indexOf(targetStage)
    if (targetIdx > currentIdx) patch.stage = targetStage
  }
  return patch
}

const DEFAULT_VALUES: ContactFormValues = {
  name: '',
  stage: 'lead',
  is_contacted: false,
  is_met: false,
  is_demo_sent: false,
  is_proposal_sent: false,
}

export default function ContactsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<ContactStage | ''>('')
  const [tagsFilter, setTagsFilter] = useState('')
  const [noContactDays, setNoContactDays] = useState<number | ''>('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null)
  const [snackMsg, setSnackMsg] = useState<string | null>(null)
  const [duplicates, setDuplicates] = useState<{ id: string; name: string; company?: string; email?: string; phone?: string }[] | null>(null)
  const [pendingCreate, setPendingCreate] = useState<ContactFormValues | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', search, stageFilter, tagsFilter, noContactDays],
    queryFn: () =>
      contactsApi.list({
        search: search || undefined,
        stage: stageFilter || undefined,
        tags: tagsFilter || undefined,
        no_contact_days: noContactDays || undefined,
      }),
  })

  const { control, handleSubmit, reset, setValue } = useForm<ContactFormValues>({
    defaultValues: DEFAULT_VALUES,
  })

  const createMut = useMutation({
    mutationFn: contactsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setAddOpen(false)
      setDuplicates(null)
      setPendingCreate(null)
      reset(DEFAULT_VALUES)
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail
      if (detail?.duplicates) {
        setDuplicates(detail.duplicates)
        setPendingCreate(null)
      }
    },
  })

  const deleteMut = useMutation({
    mutationFn: contactsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  const checkMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Contact> }) =>
      contactsApi.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })

  const handleExport = async () => {
    try {
      const blob = await contactsApi.exportCsv()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `srm_contacts_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setSnackMsg('Dışa aktarma başarısız.')
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const result = await contactsApi.importCsv(file)
      setImportResult(result)
      qc.invalidateQueries({ queryKey: ['contacts'] })
    } catch {
      setSnackMsg('İçe aktarma başarısız.')
    } finally {
      e.target.value = ''
    }
  }

  const onScanResult = (data: Partial<ContactFormValues>) => {
    Object.entries(data).forEach(([k, v]) =>
      setValue(k as keyof ContactFormValues, v as never)
    )
    setAddOpen(true)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Kişiler
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="CSV olarak dışa aktar">
            <Button variant="outlined" startIcon={<FileDownload />} onClick={handleExport} size="small">
              Dışa Aktar
            </Button>
          </Tooltip>
          <Tooltip title="CSV'den içe aktar">
            <Button
              variant="outlined"
              startIcon={<FileUpload />}
              onClick={() => importInputRef.current?.click()}
              size="small"
            >
              İçe Aktar
            </Button>
          </Tooltip>
          <input ref={importInputRef} type="file" accept=".csv" hidden onChange={handleImportFile} />
          <Button
            variant="outlined"
            startIcon={<CameraAlt />}
            onClick={() => setScanOpen(true)}
          >
            Kartvizit Tara
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => { reset(DEFAULT_VALUES); setAddOpen(true) }}>
            Yeni Kişi
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="İsim, şirket, e-posta ara…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          sx={{ width: 300 }}
        />
        <TextField
          select
          size="small"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as ContactStage | '')}
          sx={{ width: 180 }}
          label="Aşama"
        >
          <MenuItem value="">Tümü</MenuItem>
          {ALL_STAGES.map((s) => (
            <MenuItem key={s} value={s}>{STAGE_LABELS[s]}</MenuItem>
          ))}
        </TextField>
        <Tooltip title={showAdvanced ? 'Gelişmiş filtreyi gizle' : 'Gelişmiş filtre'}>
          <Button
            size="small"
            variant={showAdvanced || tagsFilter || noContactDays ? 'contained' : 'outlined'}
            startIcon={<FilterList />}
            onClick={() => setShowAdvanced(v => !v)}
          >
            Filtre
          </Button>
        </Tooltip>
        {(tagsFilter || noContactDays) && (
          <Button size="small" color="error" onClick={() => { setTagsFilter(''); setNoContactDays('') }}>
            Temizle
          </Button>
        )}
      </Box>

      <Collapse in={showAdvanced}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
          <TextField
            size="small"
            placeholder="Etiket ara (ör: EdTech)"
            value={tagsFilter}
            onChange={(e) => setTagsFilter(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><LocalOffer fontSize="small" /></InputAdornment> }}
            sx={{ width: 220 }}
            label="Etiket"
          />
          <TextField
            select
            size="small"
            value={noContactDays}
            onChange={(e) => setNoContactDays(e.target.value === '' ? '' : Number(e.target.value))}
            sx={{ width: 240 }}
            label="Son iletişim yok (gün)"
          >
            <MenuItem value="">Filtre yok</MenuItem>
            <MenuItem value={7}>7 gündür iletişim yok</MenuItem>
            <MenuItem value={14}>14 gündür iletişim yok</MenuItem>
            <MenuItem value={30}>30 gündür iletişim yok</MenuItem>
            <MenuItem value={60}>60 gündür iletişim yok</MenuItem>
            <MenuItem value={90}>90 gündür iletişim yok</MenuItem>
          </TextField>
        </Box>
      </Collapse>

      {/* Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Kişi</TableCell>
              <TableCell>Şirket</TableCell>
              <TableCell>E-posta</TableCell>
              <TableCell>Telefon</TableCell>
              <TableCell>Aşama</TableCell>
              <TableCell>Temas</TableCell>
              <TableCell align="right">İşlem</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  Yükleniyor…
                </TableCell>
              </TableRow>
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Kayıt bulunamadı
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((c) => (
                <TableRow
                  key={c.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/contacts/${c.id}`)}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar
                        src={c.avatar_path ?? undefined}
                        sx={{ width: 32, height: 32, fontSize: 14, bgcolor: 'primary.light' }}
                      >
                        {c.name[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
                        {c.title && (
                          <Typography variant="caption" color="text.secondary">{c.title}</Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{c.company ?? '—'}</TableCell>
                  <TableCell>{c.email ?? '—'}</TableCell>
                  <TableCell>{c.phone ?? '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={STAGE_LABELS[c.stage]}
                      size="small"
                      sx={{ bgcolor: STAGE_COLORS[c.stage], color: '#fff', fontWeight: 600, fontSize: '0.7rem' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0, flexWrap: 'nowrap' }}>
                      {(
                        [
                          { field: 'is_contacted' as const, label: 'Temas' },
                          { field: 'is_met' as const, label: 'Görüşme' },
                          { field: 'is_demo_sent' as const, label: 'Tanıtım' },
                          { field: 'is_proposal_sent' as const, label: 'Teklif' },
                        ] as { field: keyof Contact; label: string }[]
                      ).map(({ field, label }) => (
                        <Tooltip key={field} title={label}>
                          <Checkbox
                            size="small"
                            checked={!!c[field]}
                            onClick={(e) => {
                              e.stopPropagation()
                              checkMut.mutate({ id: c.id, patch: buildCheckPatch(c, field, !c[field]) })
                            }}
                            sx={{ p: 0.5 }}
                          />
                        </Tooltip>
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Detay">
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); navigate(`/contacts/${c.id}`) }}
                      >
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sil">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`${c.name} silinsin mi?`)) deleteMut.mutate(c.id)
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Card Scanner Modal */}
      <CardScannerModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onResult={onScanResult}
      />

      {/* Add Contact Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Yeni Kişi Ekle</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <ContactFormFields control={control} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>İptal</Button>
          <Button
            variant="contained"
            onClick={handleSubmit((data) => { setPendingCreate(data); createMut.mutate(data) })}
            disabled={createMut.isPending}
          >
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      {/* Duplicate Warning Dialog */}
      <Dialog open={!!duplicates} onClose={() => setDuplicates(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmber color="warning" /> Benzer Kişi Bulundu
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Aynı e-posta veya telefona sahip kişi(ler) mevcut:
          </Typography>
          <List disablePadding>
            {(duplicates ?? []).map((d) => (
              <ListItem key={d.id} disablePadding sx={{ mb: 0.5 }}>
                <ListItemText
                  primary={`${d.name}${d.company ? ` — ${d.company}` : ''}`}
                  secondary={[d.email, d.phone].filter(Boolean).join(' · ')}
                />
                <Button size="small" onClick={() => { navigate(`/contacts/${d.id}`); setDuplicates(null) }}>
                  Görüntüle
                </Button>
              </ListItem>
            ))}
          </List>
          <Alert severity="warning" sx={{ mt: 1 }}>
            Yine de kaydetmek istiyor musunuz?
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDuplicates(null)}>İptal</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => {
              if (pendingCreate) createMut.mutate(pendingCreate)
              setDuplicates(null)
            }}
          >
            Yine de Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Result Dialog */}
      <Dialog open={!!importResult} onClose={() => setImportResult(null)} maxWidth="xs" fullWidth>
        <DialogTitle>İçe Aktarma Sonucu</DialogTitle>
        <DialogContent>
          <Typography>✅ Eklendi: <strong>{importResult?.created}</strong></Typography>
          <Typography>⏭ Atlandı (duplicate): <strong>{importResult?.skipped}</strong></Typography>
          {(importResult?.errors ?? []).length > 0 && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              {importResult!.errors.join('\n')}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportResult(null)}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={!!snackMsg}
        autoHideDuration={4000}
        onClose={() => setSnackMsg(null)}
        message={snackMsg}
      />
    </Box>
  )
}
