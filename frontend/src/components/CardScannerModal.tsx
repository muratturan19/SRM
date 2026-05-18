import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material'
import { CameraAlt, CloudUpload } from '@mui/icons-material'
import { useDropzone } from 'react-dropzone'
import { scanApi } from '../services/api'
import type { Contact } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  onResult: (data: Partial<Contact>) => void
}

export default function CardScannerModal({ open, onClose, onResult }: Props) {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<string | null>(null)

  const processFile = async (file: File) => {
    setError(null)
    setProvider(null)
    const url = URL.createObjectURL(file)
    setPreview(url)
    setLoading(true)

    try {
      const raw = await scanApi.scanCard(file)
      const { _provider, ...fields } = raw as Record<string, string | null>
      setProvider(_provider ?? null)

      // Map to Contact fields (null → undefined)
      const contact: Partial<Contact> = {}
      const mapping: Record<string, keyof Contact> = {
        name: 'name',
        company: 'company',
        title: 'title',
        email: 'email',
        phone: 'phone',
        phone2: 'phone2',
        linkedin: 'linkedin',
        website: 'website',
        address: 'address',
      }
      for (const [key, field] of Object.entries(mapping)) {
        if (fields[key]) (contact as Record<string, unknown>)[field] = fields[key]
      }
      onResult(contact)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tarama başarısız'
      setError(`Kartvizit taranamadı: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) processFile(accepted[0])
    },
    []
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxFiles: 1,
    disabled: loading,
  })

  const handleClose = () => {
    setPreview(null)
    setError(null)
    setProvider(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CameraAlt color="primary" />
        Kartvizit Tara
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Kartvizit fotoğrafını yükleyin — yapay zeka bilgileri otomatik dolduracak.
          <br />
          <strong>Claude Sonnet 4.6</strong> veya <strong>GPT-5.5</strong> vision kullanılır.
        </Typography>

        {/* Drop zone */}
        <Box
          {...getRootProps()}
          sx={{
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'divider',
            borderRadius: 3,
            p: 4,
            textAlign: 'center',
            cursor: loading ? 'not-allowed' : 'pointer',
            bgcolor: isDragActive ? 'primary.50' : 'background.default',
            transition: 'all 0.2s',
            '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
          }}
        >
          <input {...getInputProps()} />
          {loading ? (
            <Box>
              <CircularProgress size={36} sx={{ mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Yapay zeka analiz ediyor…
              </Typography>
            </Box>
          ) : preview ? (
            <Box
              component="img"
              src={preview}
              alt="Kartvizit önizleme"
              sx={{ maxHeight: 200, maxWidth: '100%', borderRadius: 2 }}
            />
          ) : (
            <Box>
              <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body1" fontWeight={500}>
                {isDragActive ? 'Bırakın!' : 'Sürükleyin veya tıklayın'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                JPEG, PNG veya WebP — maksimum 10 MB
              </Typography>
            </Box>
          )}
        </Box>

        {provider && (
          <Chip
            label={`${provider === 'claude' ? 'Claude Sonnet 4.6' : 'GPT-5.5'} ile tarandı`}
            color="success"
            size="small"
            sx={{ mt: 1.5 }}
          />
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          İptal
        </Button>
      </DialogActions>
    </Dialog>
  )
}
