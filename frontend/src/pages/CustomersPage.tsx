import { useState } from 'react'
import {
  Box, Typography, Card, CardContent, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, Avatar, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Grid, IconButton, Tooltip,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material'
import {
  Stars, Add, ExpandMore, UploadFile, OpenInNew,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import dayjs from 'dayjs'
import { contactsApi, dealsApi } from '../services/api'
import type { Contact, Deal } from '../types'

export default function CustomersPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [dealOpen, setDealOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['contacts', '', 'customer'],
    queryFn: () => contactsApi.list({ stage: 'customer' }),
  })

  const {
    register,
    handleSubmit,
    reset,
  } = useForm<{
    product_name: string
    amount?: number
    currency: string
    contract_date?: string
    notes?: string
  }>({ defaultValues: { currency: 'TRY' } })

  const createDealMut = useMutation({
    mutationFn: dealsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
      setDealOpen(false)
      reset({ currency: 'TRY' })
    },
  })

  const uploadContract = async (dealId: string, file: File) => {
    await dealsApi.uploadContract(dealId, file)
    qc.invalidateQueries({ queryKey: ['contacts'] })
  }

  const totalValue = customers.reduce((sum, c) => {
    return sum + (c.deals ?? []).reduce((s, d) => s + (d.amount ?? 0), 0)
  }, 0)

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Müşteriler
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {customers.length} aktif müşteri
          </Typography>
        </Box>
        {totalValue > 0 && (
          <Chip
            icon={<Stars />}
            label={`Toplam: ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalValue)}`}
            color="success"
            sx={{ fontWeight: 700, fontSize: '0.85rem', height: 32 }}
          />
        )}
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>Yükleniyor…</Box>
          ) : customers.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
              <Stars sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
              <Typography>Henüz müşteri yok.</Typography>
              <Typography variant="body2">
                Pipeline'da bir kişinin aşamasını "Müşteri" yapın.
              </Typography>
            </Box>
          ) : (
            customers.map((c: Contact) => (
              <Accordion key={c.id} disableGutters elevation={0}>
                <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
                    <Avatar
                      src={c.avatar_path ?? undefined}
                      sx={{ width: 40, height: 40, bgcolor: 'success.main', fontSize: 16 }}
                    >
                      {c.name[0]}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography fontWeight={600}>{c.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {[c.title, c.company].filter(Boolean).join(' — ')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                      {(c.deals ?? []).length > 0 && (
                        <Chip
                          label={`${(c.deals ?? []).length} anlaşma`}
                          size="small"
                          color="primary"
                        />
                      )}
                      {(c.deals ?? []).reduce((s, d) => s + (d.amount ?? 0), 0) > 0 && (
                        <Chip
                          label={new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(
                            (c.deals ?? []).reduce((s, d) => s + (d.amount ?? 0), 0)
                          )}
                          size="small"
                          color="success"
                        />
                      )}
                    </Box>
                  </Box>
                </AccordionSummary>

                <AccordionDetails sx={{ px: 2, pb: 2 }}>
                  {/* Deals table */}
                  <Box sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600}>Anlaşmalar</Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          startIcon={<Add />}
                          onClick={() => { setSelectedContact(c); setDealOpen(true) }}
                        >
                          Ekle
                        </Button>
                        <Tooltip title="Kişi detayı">
                          <IconButton size="small" onClick={() => navigate(`/contacts/${c.id}`)}>
                            <OpenInNew fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    {(c.deals ?? []).length === 0 ? (
                      <Typography variant="body2" color="text.secondary">Henüz anlaşma yok</Typography>
                    ) : (
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Ürün / Hizmet</TableCell>
                              <TableCell>Tutar</TableCell>
                              <TableCell>Tarih</TableCell>
                              <TableCell>Sözleşme</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(c.deals ?? []).map((d: Deal) => (
                              <TableRow key={d.id}>
                                <TableCell>{d.product_name}</TableCell>
                                <TableCell>
                                  {d.amount
                                    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: d.currency }).format(d.amount)
                                    : '—'}
                                </TableCell>
                                <TableCell>
                                  {d.contract_date
                                    ? dayjs(d.contract_date).format('DD.MM.YYYY')
                                    : '—'}
                                </TableCell>
                                <TableCell>
                                  {d.contract_pdf_path ? (
                                    <Button size="small" href={d.contract_pdf_path} target="_blank">
                                      PDF
                                    </Button>
                                  ) : (
                                    <Button
                                      size="small"
                                      startIcon={<UploadFile fontSize="small" />}
                                      component="label"
                                    >
                                      Yükle
                                      <input
                                        type="file"
                                        accept=".pdf,.docx"
                                        hidden
                                        onChange={(e) => {
                                          const f = e.target.files?.[0]
                                          if (f) uploadContract(d.id, f)
                                        }}
                                      />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>

                  {c.notes && (
                    <Box sx={{ bgcolor: 'background.default', p: 1.5, borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">NOT</Typography>
                      <Typography variant="body2">{c.notes}</Typography>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </CardContent>
      </Card>

      {/* Add Deal Dialog */}
      <Dialog open={dealOpen} onClose={() => setDealOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Anlaşma Ekle
          {selectedContact && <Typography variant="body2" color="text.secondary">{selectedContact.name}</Typography>}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField {...register('product_name', { required: true })} label="Ürün / Hizmet *" fullWidth size="small" />
            </Grid>
            <Grid item xs={6}>
              <TextField {...register('amount')} label="Tutar" fullWidth size="small" type="number" />
            </Grid>
            <Grid item xs={6}>
              <TextField {...register('currency')} label="Para Birimi" fullWidth size="small" />
            </Grid>
            <Grid item xs={12}>
              <TextField {...register('contract_date')} label="Sözleşme Tarihi" fullWidth size="small" type="date" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <TextField {...register('notes')} label="Notlar" fullWidth size="small" multiline rows={2} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDealOpen(false)}>İptal</Button>
          <Button
            variant="contained"
            onClick={handleSubmit((data) =>
              createDealMut.mutate({ ...data, contact_id: selectedContact!.id })
            )}
            disabled={createDealMut.isPending}
          >
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
