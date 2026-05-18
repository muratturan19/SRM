import { createTheme, alpha } from '@mui/material/styles'

const PRIMARY = '#F47C20'   // Kolektif360 orange
const DARK    = '#1C2536'   // Kolektif360 navy

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: PRIMARY,
      light: '#F9A05A',
      dark: '#C45E0A',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: DARK,
      light: '#2E3D57',
      dark: '#111928',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F4F5F7',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1C2536',
      secondary: '#4A5568',
    },
    divider: '#E2E8F0',
    success: { main: '#10B981', contrastText: '#fff' },
    warning: { main: '#F59E0B', contrastText: '#fff' },
    error:   { main: '#EF4444', contrastText: '#fff' },
    info:    { main: '#3B82F6', contrastText: '#fff' },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 500 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          borderRadius: 16,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 16 },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: '#F8FAFC',
          color: '#475569',
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          marginBottom: 2,
          '&.Mui-selected': {
            backgroundColor: alpha(PRIMARY, 0.12),
            color: PRIMARY,
            '& .MuiListItemIcon-root': { color: PRIMARY },
            '&:hover': { backgroundColor: alpha(PRIMARY, 0.18) },
          },
        },
      },
    },
  },
})
