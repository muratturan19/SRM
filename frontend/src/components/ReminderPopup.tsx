import { useEffect, useRef, useState } from 'react'
import {
  Snackbar,
  Alert,
  AlertTitle,
  Stack,
  IconButton,
  Button,
} from '@mui/material'
import { Close, Alarm, Snooze } from '@mui/icons-material'
import { remindersApi, settingsApi } from '../services/api'
import type { Reminder, SystemSettings } from '../types'

const POLL_MS = 30_000

export default function ReminderPopup() {
  const [queue, setQueue] = useState<Reminder[]>([])
  const [appSettings, setAppSettings] = useState<SystemSettings | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load settings once on mount
  useEffect(() => {
    settingsApi.get().then(setAppSettings).catch(() => {})
  }, [])

  const requestBrowserPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  const showBrowserToast = (r: Reminder) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Kolektif360 CRM — Hatırlatıcı', {
        body: `${r.title}${r.contact_name ? ' — ' + r.contact_name : ''}`,
        icon: '/favicon.svg',
      })
    }
  }

  const poll = async () => {
    try {
      const due = await remindersApi.due()
      if (due.length > 0) {
        due.forEach(showBrowserToast)
        setQueue((prev) => [...prev, ...due])
      }
    } catch {
      // silent — backend might not be ready
    }
  }

  useEffect(() => {
    requestBrowserPermission()
    poll()
    timerRef.current = setInterval(poll, POLL_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const dismiss = (id: string) =>
    setQueue((prev) => prev.filter((r) => r.id !== id))

  const handleSnooze = async (id: string) => {
    try {
      await remindersApi.snooze(id)
    } catch {
      // best-effort
    }
    dismiss(id)
  }

  return (
    <Stack
      spacing={1}
      sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, maxWidth: 360 }}
    >
      {queue.map((r) => (
        <Snackbar key={r.id} open anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert
            severity="warning"
            icon={<Alarm />}
            action={
              <Stack direction="row" spacing={0.5} alignItems="center">
                {appSettings?.snooze_enabled && (
                  <Button
                    size="small"
                    color="inherit"
                    startIcon={<Snooze fontSize="small" />}
                    onClick={() => handleSnooze(r.id)}
                    sx={{ fontSize: '0.75rem', textTransform: 'none' }}
                  >
                    Ertele
                  </Button>
                )}
                <IconButton size="small" onClick={() => dismiss(r.id)}>
                  <Close fontSize="small" />
                </IconButton>
              </Stack>
            }
            sx={{ width: '100%', boxShadow: 4 }}
          >
            <AlertTitle sx={{ fontWeight: 700 }}>Hatırlatıcı</AlertTitle>
            {r.title}
            {r.contact_name && (
              <> — <strong>{r.contact_name}</strong></>
            )}
          </Alert>
        </Snackbar>
      ))}
    </Stack>
  )
}
