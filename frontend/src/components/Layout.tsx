import { Box, Typography } from '@mui/material'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

const SIDEBAR_W = 240

export default function Layout() {
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
    </Box>
  )
}
