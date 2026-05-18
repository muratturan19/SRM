import { useState } from 'react'
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
  FormControlLabel,
} from '@mui/material'
import {
  Add,
  Search,
  CameraAlt,
  Delete,
  OpenInNew,
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
  const [addOpen, setAddOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', search, stageFilter],
    queryFn: () =>
      contactsApi.list({
        search: search || undefined,
        stage: stageFilter || undefined,
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
      reset(DEFAULT_VALUES)
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
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
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
      </Box>

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
            onClick={handleSubmit((data) => createMut.mutate(data))}
            disabled={createMut.isPending}
          >
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
