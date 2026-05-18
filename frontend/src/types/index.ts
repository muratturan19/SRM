export type ContactStage =
  | 'lead'
  | 'contacted'
  | 'met'
  | 'demo_sent'
  | 'proposal_sent'
  | 'customer'

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
}

export interface Deal {
  id: string
  contact_id: string
  product_name: string
  amount?: number
  currency: string
  contract_date?: string
  contract_pdf_path?: string
  notes?: string
  created_at: string
  updated_at: string
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

export const PIPELINE_STAGES: ContactStage[] = [
  'lead',
  'contacted',
  'met',
  'demo_sent',
  'proposal_sent',
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
