export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface School {
  id: string;
  name: string;
  email_domain: string;
  center_lat: number;
  center_lng: number;
  bounds: Json | null;
  is_active: boolean;
  created_at: string;
}

export interface CampusPlace {
  id: string;
  school_id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  is_active: boolean;
  created_at: string;
}

export interface AppUser {
  id: string;
  school_id: string;
  email: string;
  department: string | null;
  nickname: string;
  nickname_changed_at: string;
  profile_image_url: string | null;
  campus_temp: number;
  point_balance: number;
  completed_count: number;
  status: "active" | "restricted" | "suspended" | "banned";
  restricted_until: string | null;
  role: "user" | "admin";
  created_at: string;
}

export interface PublicProfile {
  id: string;
  school_id: string;
  nickname: string;
  profile_image_url: string | null;
  campus_temp: number;
  completed_count: number;
}

export interface Errand {
  id: string;
  school_id: string;
  requester_id: string;
  title: string;
  body: string;
  raw_input: string | null;
  category: string;
  from_place_id: string | null;
  from_lat: number | null;
  from_lng: number | null;
  from_label: string | null;
  from_detail: string | null;
  to_place_id: string | null;
  to_lat: number | null;
  to_lng: number | null;
  to_label: string | null;
  to_detail: string | null;
  desired_at: string;
  price: number;
  ai_suggested_price: number | null;
  urgent_level: number;
  urgent_until: string | null;
  status: string;
  recruit_deadline_at: string;
  select_deadline_at: string | null;
  confirm_deadline_at: string | null;
  runner_id: string | null;
  selected_application_id: string | null;
  confirm_method: string | null;
  moderation_status: string;
  applicant_count: number;
  view_count: number;
  completed_at: string | null;
  created_at: string;
}

export interface ErrandImage {
  id: string;
  errand_id: string;
  url: string;
  sort_order: number;
}

export interface Application {
  id: string;
  school_id: string;
  errand_id: string;
  applicant_id: string;
  message: string;
  status: string;
  decided_at: string | null;
  created_at: string;
}

export interface CompletionProof {
  id: string;
  errand_id: string;
  runner_id: string;
  photo_url: string | null;
  memo: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  errand_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  tags: string[];
  comment: string | null;
  created_at: string;
}

export interface Escrow {
  id: string;
  errand_id: string;
  payer_id: string;
  payee_id: string | null;
  amount: number;
  fee_rate: number;
  fee_amount: number | null;
  status: string;
  payout_method: string | null;
  released_at: string | null;
  refunded_at: string | null;
  created_at: string;
}

export interface PointTransaction {
  id: string;
  user_id: string | null;
  errand_id: string | null;
  type: string;
  amount: number;
  balance_after: number | null;
  pg_payment_key: string | null;
  created_at: string;
}

export interface UrgentPurchase {
  id: string;
  errand_id: string;
  user_id: string;
  level: number;
  price: number;
  starts_at: string;
  ends_at: string;
  refunded_amount: number;
  created_at: string;
}

export interface Inquiry {
  id: string;
  school_id: string;
  errand_id: string;
  author_id: string;
  content: string;
  is_secret: boolean;
  answer: string | null;
  answered_at: string | null;
  moderation_status: string;
  created_at: string;
}

/** inquiries_feed 뷰: 비밀 문의는 제3자에게 content가 null로 내려온다. */
export interface InquiryFeedRow {
  id: string;
  school_id: string;
  errand_id: string;
  author_id: string;
  is_secret: boolean;
  content: string | null;
  answer: string | null;
  answered_at: string | null;
  moderation_status: string;
  created_at: string;
}

export interface ChatRoom {
  id: string;
  school_id: string;
  errand_id: string;
  requester_id: string;
  partner_id: string;
  last_message: string | null;
  last_message_at: string | null;
  requester_unread: number;
  partner_unread: number;
  left_by: string[];
  created_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string | null;
  type: "text" | "image" | "system";
  content: string;
  image_url: string | null;
  is_masked: boolean;
  read_at: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  school_id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  target_user_id: string;
  reason: string;
  detail: string | null;
  ai_category: string | null;
  ai_severity: string | null;
  status: string;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
}

export interface AiModeration {
  id: string;
  user_id: string;
  target_type: string;
  target_id: string | null;
  detected_lang: string;
  verdict: string;
  categories: string[];
  reason: string;
  original_text: string;
  created_at: string;
}

export interface AiAssist {
  id: string;
  user_id: string;
  errand_id: string | null;
  raw_input: string;
  result: Json;
  accepted: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}
