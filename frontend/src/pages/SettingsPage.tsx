import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  Stack,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
} from '@mui/material'
import {
  Save,
  Download,
  Upload,
  DeleteOutline,
  BackupOutlined,
} from '@mui/icons-material'
import { settingsApi, outreachApi } from '../services/api'
import type { ReminderRule, SystemSettings, OutreachTemplate } from '../types'

const TRIGGER_LABELS: Record<string, string> = {
  is_contacted: 'Temas sonrası hatırlatma',
  is_met: 'Görüşme sonrası hatırlatma',
  is_demo_sent: 'Tanıtım sonrası hatırlatma',
  is_proposal_sent: 'Teklif sonrası hatırlatma',
}

const DEFAULT_RULES: ReminderRule[] = [
  { trigger: 'is_contacted',    days: 2, enabled: true },
  { trigger: 'is_met',          days: 1, enabled: true },
  { trigger: 'is_demo_sent',    days: 5, enabled: false },
  { trigger: 'is_proposal_sent',days: 7, enabled: true },
]

export default function SettingsPage() {
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)

  // ── Backup/Restore state ───────────────────────────────────────
  const [backupLoading, setBackupLoading] = useState(false)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [backupMsg, setBackupMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [confirmRestore, setConfirmRestore] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: backupList, refetch: refetchBackups } = useQuery({
    queryKey: ['backups'],
    queryFn: async () => {
      const r = await fetch('/api/admin/backups')
      if (!r.ok) throw new Error('Liste alınamadı')
      return r.json() as Promise<{ name: string; size_kb: number; created: string }[]>
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  })

  const [rules, setRules] = useState<ReminderRule[] | null>(null)
  const [snoozeEnabled, setSnoozeEnabled] = useState<boolean | null>(null)
  const [snoozeDays, setSnoozeDays] = useState<number | null>(null)
  const [maxFollowups, setMaxFollowups] = useState<number | null>(null)
  const [passiveAfterDays, setPassiveAfterDays] = useState<number | null>(null)
  const [reactivateAfterDays, setReactivateAfterDays] = useState<number | null>(null)
  const [senderTitle, setSenderTitle] = useState<string | null>(null)

  const effectiveRules: ReminderRule[] = rules ?? data?.reminder_rules ?? DEFAULT_RULES
  const effectiveSnooze: boolean = snoozeEnabled ?? data?.snooze_enabled ?? false
  const effectiveDays: number = snoozeDays ?? data?.snooze_days ?? 2
  const effectiveMaxFollowups: number = maxFollowups ?? data?.max_followups ?? 2
  const effectivePassiveAfterDays: number = passiveAfterDays ?? data?.passive_after_days ?? 14
  const effectiveReactivateAfterDays: number = reactivateAfterDays ?? data?.reactivate_after_days ?? 90
  const effectiveSenderTitle: string = senderTitle ?? data?.sender_title ?? 'İş Geliştirme Ortağı'

  const updateMut = useMutation({
    mutationFn: (payload: Partial<SystemSettings>) => settingsApi.update(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  // ── Yaklaşım Şablonları (T1-T8) ─────────────────────────────────
  const { data: templatesData } = useQuery({
    queryKey: ['outreach-templates'],
    queryFn: outreachApi.templates,
  })
  const [templates, setTemplates] = useState<OutreachTemplate[] | null>(null)
  const [templatesSaved, setTemplatesSaved] = useState(false)
  const effectiveTemplates: OutreachTemplate[] = templates ?? templatesData ?? []

  const saveTemplatesMut = useMutation({
    mutationFn: async (list: OutreachTemplate[]) => {
      await Promise.all(
        list.map((t) =>
          outreachApi.updateTemplate(t.id, {
            subject: t.subject,
            body: t.body,
            follow_up_days: t.follow_up_days,
            active: t.active,
          }),
        ),
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach-templates'] })
      setTemplatesSaved(true)
      setTimeout(() => setTemplatesSaved(false), 3000)
    },
  })

  const handleTemplateField = (idx: number, field: keyof OutreachTemplate, value: any) => {
    const next = effectiveTemplates.map((t, i) => (i === idx ? { ...t, [field]: value } : t))
    setTemplates(next)
  }

  const handleToggle = (idx: number, enabled: boolean) => {
    const next = effectiveRules.map((r, i) => (i === idx ? { ...r, enabled } : r))
    setRules(next)
  }

  const handleDays = (idx: number, days: number) => {
    const next = effectiveRules.map((r, i) => (i === idx ? { ...r, days } : r))
    setRules(next)
  }

  const handleSave = () => {
    updateMut.mutate({
      reminder_rules: effectiveRules,
      snooze_enabled: effectiveSnooze,
      snooze_days: effectiveDays,
      max_followups: effectiveMaxFollowups,
      passive_after_days: effectivePassiveAfterDays,
      reactivate_after_days: effectiveReactivateAfterDays,
      sender_title: effectiveSenderTitle,
    })
  }

  const handleSaveTemplates = () => {
    saveTemplatesMut.mutate(effectiveTemplates)
  }

  // ── Backup handlers ────────────────────────────────────────────
  const handleBackup = async () => {
    setBackupLoading(true)
    setBackupMsg(null)
    try {
      const r = await fetch('/api/admin/backup')
      if (!r.ok) {
        const err = await r.json()
        throw new Error(err.detail ?? 'Yedekleme hatası')
      }
      const blob = await r.blob()
      const cd = r.headers.get('Content-Disposition') ?? ''
      const match = cd.match(/filename="?([^"]+)"?/)
      const filename = match?.[1] ?? `operon_crm_backup_${Date.now()}.sql`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
      setBackupMsg({ type: 'success', text: `${filename} indirildi` })
      refetchBackups()
    } catch (e: any) {
      setBackupMsg({ type: 'error', text: e.message })
    } finally {
      setBackupLoading(false)
    }
  }

  const handleRestoreFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setConfirmRestore(f)
    e.target.value = ''
  }

  const handleRestoreConfirm = async () => {
    if (!confirmRestore) return
    setConfirmRestore(null)
    setRestoreLoading(true)
    setBackupMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', confirmRestore)
      const r = await fetch('/api/admin/restore', { method: 'POST', body: fd })
      const body = await r.json()
      if (!r.ok) throw new Error(body.detail ?? 'Geri yükleme hatası')
      setBackupMsg({ type: 'success', text: 'Veritabanı başarıyla geri yüklendi' })
      qc.invalidateQueries()
    } catch (e: any) {
      setBackupMsg({ type: 'error', text: e.message })
    } finally {
      setRestoreLoading(false)
    }
  }

  const handleDeleteBackup = async (name: string) => {
    await fetch(`/api/admin/backups/${name}`, { method: 'DELETE' })
    refetchBackups()
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', p: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Parametreler / Ayarlar
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
          Otomatik Hatırlatıcı
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
          İşaret kutusu işaretlendiğinde kişi adı + firma adı ile otomatik hatırlatıcı oluşturulur.
        </Typography>

        <Stack spacing={0}>
          {effectiveRules.map((rule, idx) => (
            <Box key={rule.trigger}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1.5 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={rule.enabled}
                      onChange={(e) => handleToggle(idx, e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2" fontWeight={500}>
                      {TRIGGER_LABELS[rule.trigger] ?? rule.trigger}
                    </Typography>
                  }
                  sx={{ m: 0 }}
                />
                {rule.enabled && (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <TextField
                      size="small"
                      type="number"
                      value={rule.days}
                      onChange={(e) => handleDays(idx, parseInt(e.target.value, 10) || 1)}
                      inputProps={{ min: 1, max: 365 }}
                      sx={{ width: 80 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      gün sonra
                    </Typography>
                  </Stack>
                )}
              </Stack>
              {idx < effectiveRules.length - 1 && <Divider />}
            </Box>
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={2}>
          Erteleme (Snooze)
        </Typography>
        <Stack spacing={2}>
          <FormControlLabel
            control={
              <Switch
                checked={effectiveSnooze}
                onChange={(e) => setSnoozeEnabled(e.target.checked)}
              />
            }
            label="Hatırlatıcılarda 'Ertele' butonu göster"
          />
          {effectiveSnooze && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <TextField
                type="number"
                size="small"
                value={effectiveDays}
                onChange={(e) => setSnoozeDays(parseInt(e.target.value, 10) || 1)}
                inputProps={{ min: 1, max: 30 }}
                sx={{ width: 80 }}
              />
              <Typography variant="body2" color="text.secondary">
                gün ertele
              </Typography>
            </Stack>
          )}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
          Temas (Outreach) Otomasyonu
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
          Varsayilan temas surecindeki takip zamanlamalari - belgedeki sureler burada
          değiştirilebilir, kodda sabit değildir.
        </Typography>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="body2">İlk mesaj + en fazla kaç takip</Typography>
            <TextField
              size="small"
              type="number"
              value={effectiveMaxFollowups}
              onChange={(e) => setMaxFollowups(parseInt(e.target.value, 10) || 1)}
              inputProps={{ min: 1, max: 10 }}
              sx={{ width: 90 }}
            />
          </Stack>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="body2">Cevapsız kalırsa kaç gün sonra pasife alınsın</Typography>
            <TextField
              size="small"
              type="number"
              value={effectivePassiveAfterDays}
              onChange={(e) => setPassiveAfterDays(parseInt(e.target.value, 10) || 1)}
              inputProps={{ min: 1, max: 365 }}
              sx={{ width: 90 }}
            />
          </Stack>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="body2">Pasiften kaç gün sonra "yeniden temas" hatırlatılsın</Typography>
            <TextField
              size="small"
              type="number"
              value={effectiveReactivateAfterDays}
              onChange={(e) => setReactivateAfterDays(parseInt(e.target.value, 10) || 1)}
              inputProps={{ min: 1, max: 365 }}
              sx={{ width: 90 }}
            />
          </Stack>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="body2">Gonderen unvani ({'{{gonderen_unvani}}'})</Typography>
            <TextField
              size="small"
              value={effectiveSenderTitle}
              onChange={(e) => setSenderTitle(e.target.value)}
              sx={{ width: 220 }}
            />
          </Stack>
        </Stack>
      </Paper>

      {saved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Ayarlar kaydedildi.
        </Alert>
      )}
      {updateMut.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Kaydetme hatası. Lütfen tekrar deneyin.
        </Alert>
      )}
      <Button
        variant="contained"
        startIcon={updateMut.isPending ? <CircularProgress size={16} color="inherit" /> : <Save />}
        onClick={handleSave}
        disabled={updateMut.isPending}
      >
        Kaydet
      </Button>

      {/* ── Yaklaşım Şablonları (T1-T8) ─────────────────────── */}
      <Paper variant="outlined" sx={{ p: 3, mt: 4, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
          Yaklaşım Şablonları (T1-T8)
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
          Varsayilan ilk temas ve takip mesajlari - metinler burada duzenlenir, kod
          değişikliği gerekmez.
        </Typography>

        <Stack spacing={2}>
          {effectiveTemplates.map((tpl, idx) => (
            <Box key={tpl.id}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="body2" fontWeight={600}>
                  {tpl.code} — {tpl.title}
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={tpl.active}
                      onChange={(e) => handleTemplateField(idx, 'active', e.target.checked)}
                    />
                  }
                  label={<Typography variant="caption">Aktif</Typography>}
                  sx={{ m: 0 }}
                />
              </Stack>
              {tpl.subject !== undefined && tpl.subject !== null && (
                <TextField
                  fullWidth
                  size="small"
                  label="Konu (e-posta)"
                  value={tpl.subject ?? ''}
                  onChange={(e) => handleTemplateField(idx, 'subject', e.target.value)}
                  sx={{ mb: 1 }}
                />
              )}
              <TextField
                fullWidth
                multiline
                minRows={3}
                size="small"
                label="Mesaj metni"
                value={tpl.body}
                onChange={(e) => handleTemplateField(idx, 'body', e.target.value)}
                sx={{ mb: 1 }}
              />
              {tpl.follow_up_template_code && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="caption" color="text.secondary">
                    Cevapsızsa {tpl.follow_up_template_code} takibi
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={tpl.follow_up_days ?? ''}
                    onChange={(e) =>
                      handleTemplateField(idx, 'follow_up_days', parseInt(e.target.value, 10) || null)
                    }
                    inputProps={{ min: 1, max: 90 }}
                    sx={{ width: 80 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    gün sonra
                  </Typography>
                </Stack>
              )}
              {idx < effectiveTemplates.length - 1 && <Divider sx={{ mt: 2 }} />}
            </Box>
          ))}
        </Stack>

        {templatesSaved && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Şablonlar kaydedildi.
          </Alert>
        )}
        {saveTemplatesMut.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Kaydetme hatası. Lütfen tekrar deneyin.
          </Alert>
        )}
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          startIcon={saveTemplatesMut.isPending ? <CircularProgress size={16} color="inherit" /> : <Save />}
          onClick={handleSaveTemplates}
          disabled={saveTemplatesMut.isPending || effectiveTemplates.length === 0}
        >
          Şablonları Kaydet
        </Button>
      </Paper>

      {/* ── Yedekleme & Geri Yükleme ───────────────────────── */}
      <Paper variant="outlined" sx={{ p: 3, mt: 4 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <BackupOutlined color="primary" />
          <Typography variant="subtitle1" fontWeight={700}>
            Yedekleme & Geri Yükleme
          </Typography>
        </Stack>

        {backupMsg && (
          <Alert severity={backupMsg.type} sx={{ mb: 2 }} onClose={() => setBackupMsg(null)}>
            {backupMsg.text}
          </Alert>
        )}

        <Stack direction="row" spacing={2} mb={3}>
          <Button
            variant="outlined"
            startIcon={backupLoading ? <CircularProgress size={16} /> : <Download />}
            onClick={handleBackup}
            disabled={backupLoading || restoreLoading}
          >
            Şimdi Yedekle
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={restoreLoading ? <CircularProgress size={16} /> : <Upload />}
            onClick={() => fileInputRef.current?.click()}
            disabled={backupLoading || restoreLoading}
          >
            Yedekten Yükle
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".sql"
            style={{ display: 'none' }}
            onChange={handleRestoreFileSelect}
          />
        </Stack>

        {backupList && backupList.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" mb={1} display="block">
              Kaydedilmiş yedekler
            </Typography>
            <List dense disablePadding>
              {backupList.map((b) => (
                <ListItem key={b.name} divider sx={{ px: 0 }}>
                  <ListItemText
                    primary={b.name}
                    secondary={b.created}
                    primaryTypographyProps={{ variant: 'body2', fontFamily: 'monospace' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  <ListItemSecondaryAction>
                    <Chip label={`${b.size_kb} KB`} size="small" sx={{ mr: 1 }} />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteBackup(b.name)}
                      title="Yedeği sil"
                    >
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Paper>

      {/* ── Geri Yükleme Onay Dialog ────────────────────────── */}
      <Dialog open={!!confirmRestore} onClose={() => setConfirmRestore(null)}>
        <DialogTitle>Geri Yüklemeyi Onayla</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{confirmRestore?.name}</strong> dosyasından geri yükleme yapılacak.
            <br /><br />
            ⚠️ Mevcut tüm veriler (kişiler, müşteriler, anlaşmalar) bu yedekle
            <strong> kalıcı olarak değiştirilecek</strong>. Devam etmek istiyor musunuz?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRestore(null)}>İptal</Button>
          <Button color="warning" variant="contained" onClick={handleRestoreConfirm}>
            Evet, Geri Yükle
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
