import { useState } from 'react'
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
} from '@mui/material'
import { Save } from '@mui/icons-material'
import { settingsApi } from '../services/api'
import type { ReminderRule, SystemSettings } from '../types'

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

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  })

  const [rules, setRules] = useState<ReminderRule[] | null>(null)
  const [snoozeEnabled, setSnoozeEnabled] = useState<boolean | null>(null)
  const [snoozeDays, setSnoozeDays] = useState<number | null>(null)

  const effectiveRules: ReminderRule[] = rules ?? data?.reminder_rules ?? DEFAULT_RULES
  const effectiveSnooze: boolean = snoozeEnabled ?? data?.snooze_enabled ?? false
  const effectiveDays: number = snoozeDays ?? data?.snooze_days ?? 2

  const updateMut = useMutation({
    mutationFn: (payload: Partial<SystemSettings>) => settingsApi.update(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

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
    })
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
    </Box>
  )
}
