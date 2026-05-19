import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Avatar,
  Skeleton,
} from '@mui/material'
import {
  People,
  Stars,
  TrendingUp,
  AttachMoney,
  Alarm,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../services/api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { STAGE_LABELS, STAGE_COLORS, DEAL_STAGE_LABELS, DEAL_STAGE_COLORS } from '../types'
import type { ContactStage, DealStage } from '../types'

function StatCard({
  icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  color: string
  sub?: string
}) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: color, width: 48, height: 48 }}>{icon}</Avatar>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          {sub && (
            <Typography variant="caption" color="text.secondary">
              {sub}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.stats,
    refetchInterval: 60_000,
  })

  const chartData = data
    ? Object.entries(data.stage_counts).map(([stage, count]) => ({
        stage: STAGE_LABELS[stage as ContactStage] ?? stage,
        count,
        color: STAGE_COLORS[stage as ContactStage] ?? '#94A3B8',
      }))
    : []

  const dealFunnelData = data
    ? Object.entries(data.deal_stage_values ?? {}).map(([stage, value]) => ({
        name: DEAL_STAGE_LABELS[stage as DealStage] ?? stage,
        value: value as number,
        color: DEAL_STAGE_COLORS[stage as DealStage] ?? '#94A3B8',
      }))
    : []

  const fmt = (v: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v)

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Dashboard
      </Typography>

      {/* Stat cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 4 }} />
          ) : (
            <StatCard
              icon={<People />}
              label="Toplam Kişi"
              value={data?.total_contacts ?? 0}
              color="#4F46E5"
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 4 }} />
          ) : (
            <StatCard
              icon={<Stars />}
              label="Müşteri"
              value={data?.customers ?? 0}
              color="#10B981"
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 4 }} />
          ) : (
            <StatCard
              icon={<TrendingUp />}
              label="Dönüşüm"
              value={`%${data?.conversion_rate ?? 0}`}
              color="#F59E0B"
              sub="Potansiyelden müşteriye"
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 4 }} />
          ) : (
            <StatCard
              icon={<Alarm />}
              label="Yaklaşan Hatırlatıcı"
              value={data?.upcoming_reminders ?? 0}
              color="#EF4444"
              sub="Sonraki 7 gün"
            />
          )}
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Pipeline chart */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Pipeline Dağılımı
              </Typography>
              {isLoading ? (
                <Skeleton variant="rectangular" height={220} />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} barSize={36}>
                    <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent contacts */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Son Eklenen Kişiler
              </Typography>
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} height={40} sx={{ mb: 1 }} />
                  ))
                : data?.recent_contacts.map((c) => (
                    <Box
                      key={c.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        py: 0.75,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': { borderBottom: 0 },
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {c.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {c.company ?? '—'}
                        </Typography>
                      </Box>
                      <Chip
                        label={STAGE_LABELS[c.stage]}
                        size="small"
                        sx={{
                          bgcolor: STAGE_COLORS[c.stage],
                          color: '#fff',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}
                      />
                    </Box>
                  ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Revenue forecast row */}
      <Grid container spacing={2} mt={0}>
        <Grid item xs={12} sm={6} md={3}>
          {isLoading ? <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 4 }} /> : (
            <StatCard
              icon={<AttachMoney />}
              label="Toplam Pipeline"
              value={fmt(data?.pipeline_value ?? 0)}
              color="#06B6D4"
              sub="Açık anlaşma değeri"
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {isLoading ? <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 4 }} /> : (
            <StatCard
              icon={<TrendingUp />}
              label="Ağırlıklı Tahmin"
              value={fmt(data?.weighted_forecast ?? 0)}
              color="#8B5CF6"
              sub="Olasılık × Değer"
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {isLoading ? <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 4 }} /> : (
            <StatCard
              icon={<Stars />}
              label="Bu Ay Kapanan"
              value={fmt(data?.this_month_value ?? 0)}
              color="#10B981"
              sub={new Date().toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {isLoading ? <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 4 }} /> : (
            <StatCard
              icon={<AttachMoney />}
              label="Toplam Anlaşma"
              value={fmt(data?.total_deal_value ?? 0)}
              color="#F59E0B"
              sub="Tüm zamanlar"
            />
          )}
        </Grid>
      </Grid>

      {/* Deal stage funnel */}
      {dealFunnelData.length > 0 && (
        <Box mt={2}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Anlaşma Hunisi — Aşamaya Göre Değer
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dealFunnelData} barSize={40}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => new Intl.NumberFormat('tr-TR', { notation: 'compact' }).format(v)} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {dealFunnelData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  )
}
