import { useState } from 'react'
import { Box, Typography, Button, Snackbar } from '@mui/material'
import { Mic } from '@mui/icons-material'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import VoiceInputModal from './VoiceInputModal'

const SIDEBAR_W = 240

export default function Layout() {
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [snack, setSnack] = useState<string | null>(null)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar width={SIDEBAR_W} />
      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* ── SRM Header ─────────────────────────────── */}
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            px: 3,
            height: 64,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexShrink: 0,
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ color: 'text.primary', fontWeight: 700 }}
          >
            CRM değil,&nbsp;
            <Box component="span" sx={{ color: 'primary.main' }}>SRM</Box>
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            — Selin Relations Management
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <Button
            variant="contained"
            startIcon={<Mic />}
            onClick={() => setVoiceOpen(true)}
            sx={{ borderRadius: 5 }}
          >
            Sesli Giriş
          </Button>
        </Box>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            p: 3,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Box>

      </Box>

      <VoiceInputModal
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onSaved={(msg) => setSnack(msg)}
      />
      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}
