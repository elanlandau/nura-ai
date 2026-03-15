export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OAuthAccount {
  id: string;
  user_id: string;
  provider: 'google' | 'microsoft';
  provider_account_id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  start: string;
  end: string;
  timezone: string;
}

export interface MeetingThread {
  id: string;
  user_id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  proposed_slots: TimeSlot[];
  selected_slot: TimeSlot | null;
  status: 'proposed' | 'confirmed' | 'cancelled';
  email_thread_id: string | null;
  calendar_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarAvailability {
  date: string;
  slots: TimeSlot[];
}
