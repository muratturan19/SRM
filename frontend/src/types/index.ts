export type ContactStage =
  | 'lead'
  | 'contacted'
  | 'met'
  | 'demo_sent'
  | 'proposal_sent'
  | 'customer'

export type ActivityType = 'call' | 'meeting' | 'email' | 'note' | 'task' | 'outreach'

export type DealStage = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'

export type OutreachTier = 'ring1_personal' | 'ring2_referral' | 'ring3_cold'

export type OutreachChannel =
  | 'whatsapp'
  | 'email'
  | 'linkedin_note'
  | 'linkedin_dm'
  | 'phone'
  | 'email_summary'

export type OutreachOutcome =
  | 'sent'
  | 'no_response'
  | 'replied_positive'
  | 'replied_negative'
  | 'meeting_booked'

export type LostReasonCategory =
  | 'fiyat'
  | 'zamanlama'
  | 'ilgisiz'
  | 'rakip'
  | 'butce_yok'
  | 'yanlis_karar_verici'
  | 'diger'

export interface Activity {
  id: string
  contact_id: string
  type: ActivityType
  content: string
  outcome?: string
  template_code?: string
  channel?: OutreachChannel | string
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
  outreach_tier?: OutreachTier
  referred_by?: string
  common_context?: string
  is_passive?: boolean
  passive_since?: string
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
  lost_reason_category?: LostReasonCategory
  lost_reason_note?: string
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
  outreach: 'Temas',
}

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  call: '📞',
  meeting: '🤝',
  email: '✉️',
  note: '📝',
  task: '✅',
  outreach: '📨',
}

export const OUTREACH_TIER_LABELS: Record<OutreachTier, string> = {
  ring1_personal: 'Halka 1 — Kişisel Ağ',
  ring2_referral: 'Halka 2 — Referanslı',
  ring3_cold: 'Halka 3 — Soğuk Temas',
}

export const OUTREACH_CHANNEL_LABELS: Record<OutreachChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'E-posta',
  linkedin_note: 'LinkedIn Bağlantı Notu',
  linkedin_dm: 'LinkedIn Mesajı',
  phone: 'Telefon',
  email_summary: 'E-posta (Özet)',
}

export const OUTREACH_OUTCOME_LABELS: Record<OutreachOutcome, string> = {
  sent: 'Gönderildi (cevap bekleniyor)',
  no_response: 'Cevap yok',
  replied_positive: 'Olumlu cevap',
  replied_negative: 'Olumsuz cevap',
  meeting_booked: 'Görüşme planlandı',
}

export const LOST_REASON_LABELS: Record<LostReasonCategory, string> = {
  fiyat: 'Fiyat',
  zamanlama: 'Zamanlama',
  ilgisiz: 'İlgisiz',
  rakip: 'Rakip',
  butce_yok: 'Bütçe yok',
  yanlis_karar_verici: 'Yanlış karar verici',
  diger: 'Diğer',
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
  max_followups: number
  passive_after_days: number
  reactivate_after_days: number
  selin_title: string
}

// ── Temas (outreach) otomasyonu ───────────────────────────────────
export interface OutreachTemplate {
  id: string
  code: string
  title: string
  channel?: OutreachChannel
  applicable_tiers: string
  is_first_touch: boolean
  subject?: string
  body: string
  follow_up_days?: number
  follow_up_template_code?: string
  triggers_generic_followup: boolean
  active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface NextActionCandidate {
  template_code: string
  title: string
  channel?: OutreachChannel
  subject?: string
  body: string
  missing_fields: string[]
  due_date?: string
  is_overdue: boolean
}

export interface NextActionResponse {
  contact_id: string
  is_passive: boolean
  passive_since?: string
  suggest_passive: boolean
  candidates: NextActionCandidate[]
}

export interface OutreachSendResponse {
  activity: Activity
  reminder?: Reminder
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