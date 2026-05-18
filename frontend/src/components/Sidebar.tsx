import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Chip,
} from '@mui/material'
import {
  Dashboard,
  People,
  ViewKanban,
  Stars,
  Alarm,
  Settings,
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'

interface SidebarProps { width: number }

const NAV = [
  { label: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { label: 'Kişiler', icon: <People />, path: '/contacts' },
  { label: 'Pipeline', icon: <ViewKanban />, path: '/pipeline' },
  { label: 'Müşteriler', icon: <Stars />, path: '/customers' },
  { label: 'Hatırlatıcılar', icon: <Alarm />, path: '/reminders' },
  { label: 'Ayarlar', icon: <Settings />, path: '/settings' },
]

export default function Sidebar({ width }: SidebarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Logo */}
      <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center' }}>
        <Box
          component="img"
          src="/kolektif_acik.png"
          alt="Kolektif360"
          sx={{ height: 36, width: 'auto', objectFit: 'contain' }}
        />
        <Chip
          label="CRM"
          size="small"
          sx={{
            ml: 1,
            height: 20,
            fontSize: 10,
            fontWeight: 700,
            bgcolor: 'primary.main',
            color: '#fff',
          }}
        />
      </Box>

      <Divider />

      <List sx={{ px: 1.5, pt: 1.5, flexGrow: 1 }}>
        {NAV.map((item) => (
          <ListItemButton
            key={item.path}
            selected={pathname.startsWith(item.path)}
            onClick={() => navigate(item.path)}
            sx={{ mb: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
            />
          </ListItemButton>
        ))}
      </List>

      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          © 2026 Kolektif360
        </Typography>
      </Box>
    </Drawer>
  )
}
