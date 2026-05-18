import { ThemeProvider, CssBaseline } from '@mui/material'
import { Routes, Route, Navigate } from 'react-router-dom'
import { theme } from './theme'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import ContactsPage from './pages/ContactsPage'
import ContactDetailPage from './pages/ContactDetailPage'
import CustomersPage from './pages/CustomersPage'
import PipelinePage from './pages/PipelinePage'
import RemindersPage from './pages/RemindersPage'
import SettingsPage from './pages/SettingsPage'
import ReminderPopup from './components/ReminderPopup'

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ReminderPopup />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="contacts/:id" element={<ContactDetailPage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="reminders" element={<RemindersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </ThemeProvider>
  )
}
