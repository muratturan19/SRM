import {
  Grid,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Typography,
  Divider,
  Box,
} from '@mui/material'
import { Controller, type Control } from 'react-hook-form'
import type { ContactStage } from '../types'
import { STAGE_LABELS, PIPELINE_STAGES } from '../types'

export interface ContactFormValues {
  name: string
  company?: string
  title?: string
  email?: string
  phone?: string
  phone2?: string
  linkedin?: string
  website?: string
  address?: string
  notes?: string
  source?: string
  tags?: string
  stage: ContactStage
  is_contacted: boolean
  is_met: boolean
  is_demo_sent: boolean
  is_proposal_sent: boolean
}

interface Props {
  control: Control<ContactFormValues>
}

const MILESTONES = [
  { field: 'is_contacted' as const, label: '✅ Temas Edildi' },
  { field: 'is_met' as const, label: '🤝 Görüşüldü' },
  { field: 'is_demo_sent' as const, label: '📊 Tanıtım Yollandı' },
  { field: 'is_proposal_sent' as const, label: '📋 Teklif Verildi' },
]

export default function ContactFormFields({ control }: Props) {
  return (
    <Grid container spacing={2}>
      {/* Basic info */}
      <Grid item xs={12} sm={6}>
        <Controller
          name="name"
          control={control}
          rules={{ required: 'İsim zorunludur' }}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="Ad Soyad *"
              fullWidth
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="company"
          control={control}
          render={({ field }) => <TextField {...field} label="Şirket" fullWidth />}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="title"
          control={control}
          render={({ field }) => <TextField {...field} label="Pozisyon / Ünvan" fullWidth />}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="email"
          control={control}
          render={({ field }) => <TextField {...field} label="E-posta" fullWidth type="email" />}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="phone"
          control={control}
          render={({ field }) => <TextField {...field} label="Telefon" fullWidth />}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="phone2"
          control={control}
          render={({ field }) => <TextField {...field} label="Telefon 2" fullWidth />}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="linkedin"
          control={control}
          render={({ field }) => <TextField {...field} label="LinkedIn" fullWidth />}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="website"
          control={control}
          render={({ field }) => <TextField {...field} label="Website" fullWidth />}
        />
      </Grid>
      <Grid item xs={12}>
        <Controller
          name="address"
          control={control}
          render={({ field }) => (
            <TextField {...field} label="Adres" fullWidth multiline rows={2} />
          )}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="source"
          control={control}
          render={({ field }) => (
            <TextField {...field} label="Kaynak (Fuar, Referans…)" fullWidth />
          )}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Controller
          name="tags"
          control={control}
          render={({ field }) => (
            <TextField {...field} label="Etiketler (virgülle)" fullWidth />
          )}
        />
      </Grid>
      <Grid item xs={12}>
        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <TextField {...field} label="Notlar" fullWidth multiline rows={3} />
          )}
        />
      </Grid>

      {/* Stage */}
      <Grid item xs={12} sm={6}>
        <Controller
          name="stage"
          control={control}
          render={({ field }) => (
            <TextField {...field} select label="Aşama" fullWidth>
              {[...PIPELINE_STAGES, 'customer' as ContactStage].map((s) => (
                <MenuItem key={s} value={s}>
                  {STAGE_LABELS[s]}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
      </Grid>

      {/* Milestones */}
      <Grid item xs={12}>
        <Divider sx={{ mb: 1 }} />
        <Typography variant="subtitle2" gutterBottom>
          Temas Aşamaları
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
          {MILESTONES.map(({ field, label }) => (
            <Controller
              key={field}
              name={field}
              control={control}
              render={({ field: f }) => (
                <FormControlLabel
                  control={<Checkbox {...f} checked={f.value} />}
                  label={label}
                  sx={{ mr: 2 }}
                />
              )}
            />
          ))}
        </Box>
      </Grid>
    </Grid>
  )
}
