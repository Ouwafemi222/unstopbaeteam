export type AccountStatus =
  | "active" | "new" | "pending_setup" | "verification_pending"
  | "verified" | "restricted" | "disabled" | "suspended" | "closed" | "archived";

export type MessageStatus =
  | "new" | "replied" | "qualified" | "not_qualified"
  | "converted_to_order" | "follow_up" | "closed";

export type MemberStatus = "active" | "inactive" | "on_leave" | "archived";

export type ActivityAction =
  | "create" | "update" | "delete" | "archive" | "restore"
  | "login" | "logout" | "export" | "import";

export interface Profile {
  id: string;
  full_name: string;
  preferred_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_system: boolean;
  created_at?: string;
}

export interface Permission {
  id: string;
  name: string;
  slug: string;
  module: string;
  description: string | null;
  created_at?: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
  role?: Role;
}

export interface Country {
  id: string;
  name: string;
  code: string;
  flag_emoji: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface TeamMember {
  id: string;
  full_name: string;
  preferred_name: string | null;
  phone: string | null;
  email: string | null;
  role_in_team: string | null;
  date_joined: string | null;
  status: MemberStatus;
  avatar_url: string | null;
  notes: string | null;
  user_id: string | null;
  sponsor_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  created_by?: string | null;
}

export interface FiverrAccount {
  id: string;
  team_member_id: string;
  display_name: string | null;
  username: string;
  email: string | null;
  phone: string | null;
  country_id: string | null;
  opening_date: string | null;
  opening_time: string | null;
  status: AccountStatus;
  account_type: string | null;
  rate_amount: number | null;
  rate_currency: string | null;
  rate_type: string | null;
  rate_effective_date: string | null;
  rate_notes: string | null;
  phone_verified: boolean | null;
  email_verified: boolean | null;
  verification_completed_at: string | null;
  verified_by: string | null;
  verification_notes: string | null;
  verification_code: string | null;
  verification_screenshot_paths: string[];
  info_supplied_by: string | null;
  notes: string | null;
  archived_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  team_member?: TeamMember | { full_name: string; id?: string };
  country?: Country | { name: string; flag_emoji: string; code?: string } | null;
}

export interface Message {
  id: string;
  team_member_id: string;
  fiverr_account_id: string | null;
  service_id: string | null;
  received_date: string;
  received_time: string | null;
  gig_name: string | null;
  prospect_name: string | null;
  country_id: string | null;
  message_source: string;
  status: MessageStatus;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
  team_member?: TeamMember | { full_name: string };
  fiverr_account?: FiverrAccount | { username: string };
  service?: Service | { name: string };
  country?: Country;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: ActivityAction;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  profile?: Profile | { full_name: string };
}

export interface DateRange {
  from: Date;
  to: Date;
}

export type DateFilter = "today" | "this_week" | "this_month" | "last_month" | "custom" | "all";

export interface MemberMonthlyPlan {
  id: string;
  team_member_id: string;
  year_month: string;
  goals: string | null;
  goals_image_path: string | null;
  evaluation: string | null;
  evaluation_image_path: string | null;
  income_goal: number | null;
  prospects_target: number | null;
  office_prospects_expected: number | null;
  contacts_expected: number | null;
  skills_to_learn: string | null;
  weekly_income_goal: number | null;
  accounts_daily_target: number | null;
  personal_pv_target: number | null;
  group_pv_target: number | null;
  neolife_team_structure: string | null;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemberWeeklyEarning {
  id: string;
  team_member_id: string;
  year_month: string;
  week_number: number;
  amount: number;
  currency: string;
  notes: string | null;
  prospects_count: number;
  office_prospects_count: number;
  contacts_count: number;
  activities_done: string | null;
  skills_progress: string | null;
  personal_pv: number;
  group_pv: number;
  created_at: string;
  updated_at: string;
}

export interface MemberDailyEarning {
  id: string;
  team_member_id: string;
  earned_date: string;
  amount: number;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FineOnGroundBatch {
  id: string;
  title: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface FineOnGroundEntry {
  id: string;
  batch_id: string;
  input_name: string;
  team_member_id: string | null;
  fiverr_account_id: string | null;
  match_label: string | null;
  is_active: boolean;
  seen_at: string | null;
  created_at: string;
  team_member?: { id: string; full_name: string } | null;
  fiverr_account?: { id: string; username: string } | null;
}

export interface SearchResult {
  result_type: string;
  result_id: string;
  title: string;
  subtitle: string;
  meta: Record<string, unknown>;
  rank: number;
}
