export type ContactStage =
  | 'lead'
  | 'contacted'
  | 'met'
  | 'demo_sent'
  | 'proposal_sent'
  | 'customer'

export type ActivityType = 'call' | 'meeting' | 'email' | 'note' | 'task'

export type DealStage = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'

export interface Activity {
  id: string
  contact_id: string
  type: ActivityType
  content: string
  outcome?: string
  due_at?: string
  is_done: boolean
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
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
  avatar_path?: string
  source?: string
  tags?: string
  stage: ContactStage
  is_contacted: boolean
  is_met: boolean
  is_demo_sent: boolean
  is_proposal_sent: boolean
  created_at: string
  updated_at: string
  deals?: Deal[]
  reminders?: Reminder[]
  activities?: Activity[]
}

export interface Deal {
  id: string
  contact_id: string
  product_name: string
  amount?: number
  currency: string
  stage: DealStage
  probability?: number
  contract_date?: string
  contract_pdf_path?: string
  notes?: string
  created_at: string
  updated_at: string
  contact?: Pick<Contact, 'id' | 'name' | 'company'>
}

export interface Reminder {
  id: string
  contact_id?: string
  contact_name?: string
  title: string
  description?: string
  remind_at: string
  is_done: boolean
  notified: boolean
  created_at: string
}

export interface DashboardStats {
  total_contacts: number
  stage_counts: Partial<Record<ContactStage, number>>
  customers: number
  conversion_rate: number
  total_deal_value: number
  pipeline_value: number
  weighted_forecast: number
  this_month_value: number
  deal_stage_values: Partial<Record<DealStage, number>>
  upcoming_reminders: number
  recent_contacts: Array<{
    id: string
    name: string
    company?: string
    stage: ContactStage
    created_at: string
  }>
}

export const STAGE_LABELS: Record<ContactStage, string> = {
  lead: 'Potansiyel',
  contacted: 'Temas Edildi',
  met: 'Görüşüldü',
  demo_sent: 'Tanıtım Yapıldı',
  proposal_sent: 'Teklif Verildi',
  customer: 'Müşteri',
}

export const STAGE_COLORS: Record<ContactStage, string> = {
  lead: '#94A3B8',
  contacted: '#60A5FA',
  met: '#818CF8',
  demo_sent: '#A78BFA',
  proposal_sent: '#F59E0B',
  customer: '#10B981',
}

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  new: 'Yeni',
  qualified: 'Nitelikli',
  proposal: 'Teklif',
  negotiation: 'Müzakere',
  won: 'Kazanıldı',
  lost: 'Kaybedildi',
}

export const DEAL_STAGE_COLORS: Record<DealStage, string> = {
  new: '#94A3B8',
  qualified: '#60A5FA',
  proposal: '#A78BFA',
  negotiation: '#F59E0B',
  won: '#10B981',
  lost: '#EF4444',
}

export const DEAL_STAGE_PROBABILITY: Record<DealStage, number> = {
  new: 10,
  qualified: 25,
  proposal: 50,
  negotiation: 75,
  won: 100,
  lost: 0,
}

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  call: 'Arama',
  meeting: 'Toplantı',
  email: 'E-posta',
  note: 'Not',
  task: 'Görev',
}

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  call: '📞',
  meeting: '🤝',
  email: '✉️',
  note: '📝',
  task: '✅',
}

export const PIPELINE_STAGES: ContactStage[] = [
  'lead',
  'contacted',
  'met',
  'demo_sent',
  'proposal_sent',
]

export const DEAL_PIPELINE_STAGES: DealStage[] = [
  'new',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
]

export interface ReminderRule {
  trigger: string
  days: number
  enabled: boolean
  title?: string
}

export interface SystemSettings {
  reminder_rules: ReminderRule[]
  snooze_enabled: boolean
  snooze_days: number
}

// ── Sesli giriş (voice input) ─────────────────────────────────────
export type VoiceIntent = 'new_contact' | 'contact_note' | 'reminder'

export interface VoiceContactMatch {
  id: string
  name: string
  company?: string | null
  phone?: string | null
  email?: string | null
}

export interface VoiceResult {
  transcript: string
  intent: VoiceIntent
  contact: Partial<Record<keyof Contact, string | null>>
  note: {
    target_name?: string | null
    type?: ActivityType | null
    content?: string | null
  }
  reminder: {
    target_name?: string | null
    title?: string | null
    remind_at?: string | null
  }
  contact_matches: VoiceContactMatch[]
}