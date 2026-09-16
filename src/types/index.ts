export interface Group {
  id: string;
  name: string;
  invite_token: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  display_name: string;
  role: 'admin' | 'member';
  created_at: string;
}

export interface EventItem {
  id: string;
  group_id: string;
  title: string;
  event_date: string;
  ticket_price: number;
  system_fee: number;
  ticketing_fee: number;
  created_at: string;
}

export interface EventSession {
  id: string;
  event_id: string;
  name: string;
  created_at: string;
}

export interface Application {
  id: string;
  event_id: string;
  session_id: string;
  applicant_user_id: string;
  pair_user_id: string | null;
  ticket_count: number;
  status: 'pending' | 'won' | 'lost';
  is_paid?: boolean;
  payment_method?: string | null; // ★ここを追加
  created_at: string;
}

export interface MemberDemand {
  id: string;
  event_id: string;
  user_id: string;
  session_id: string;
  created_at: string;
}