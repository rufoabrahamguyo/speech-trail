export type User = {
  id: string;
  name: string;
  email: string;
  aim: string;
  date_joined: string;
};

export type AuthResponse = {
  access: string;
  refresh: string;
  user: User;
};

export type RubricItem = { key: string; label: string };

export type RubricCategory = {
  key: string;
  label: string;
  description: string;
  items: RubricItem[];
};

export type Score = { category: string; label: string; score: number };

export type Check = {
  category: string;
  item_key: string;
  label: string;
  checked: boolean;
};

export type Evaluation = {
  id: string;
  kind: "peer" | "self";
  evaluator_name: string;
  strengths: string;
  improvements: string;
  comments: string;
  submitted_at: string;
  scores: Score[];
  checks: Check[];
  average: number | null;
};

export type AssessmentLink = {
  id: string;
  token: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  active: boolean;
  submission_count: number;
};

export type SessionSummary = {
  id: string;
  topic: string;
  prompt_tag: string;
  prompt_label: string | null;
  duration_minutes: number;
  practiced_on: string;
  focus: string;
  created_at: string;
  status: "ready" | "awaiting" | "reviewed";
  peer_average: number | null;
  peer_count: number;
  self_count: number;
};

export type SessionDetail = SessionSummary & {
  notes: string;
  links: AssessmentLink[];
  evaluations: Evaluation[];
};

export type TopicSuggestion = {
  topic: string;
  tag: string;
  tag_label: string;
};

export type CategoryStat = {
  key: string;
  label: string;
  average: number | null;
  count: number;
  delta: number | null;
};

export type WatchItem = {
  category: string;
  category_label: string;
  item_key: string;
  label: string;
  checked: number;
  missed: number;
  total: number;
};

export type TimelinePoint = {
  id: string;
  session_id: string;
  topic: string;
  evaluator_name: string;
  submitted_at: string;
  average: number | null;
};

export type RecentReview = {
  id: string;
  session_id: string;
  topic: string;
  kind: "peer" | "self";
  evaluator_name: string;
  submitted_at: string;
  average: number | null;
  strengths: string;
  improvements: string;
  scores: Score[];
};

export type Progress = {
  sessions: number;
  peer_reviews: number;
  self_reviews: number;
  categories: CategoryStat[];
  strongest: { key: string; label: string; average: number } | null;
  next_focus: { key: string; label: string; average: number; advice: string | null } | null;
  categories_close: boolean;
  timeline: TimelinePoint[];
  watch_mode: "latest" | "recurring" | "none";
  watchouts: WatchItem[];
  strengths: WatchItem[];
  recent: RecentReview[];
};

export type PublicAssessment = {
  speaker_name: string;
  topic: string;
  duration_minutes: number;
  practiced_on: string;
  focus: string;
  active: boolean;
  closed_reason: "revoked" | "expired" | null;
  viewer_is_owner: boolean;
  session_id: string | null;
  rubric: RubricCategory[];
};

export type ReviewPayload = {
  evaluator_name?: string;
  strengths: string;
  improvements: string;
  comments: string;
  scores: { category: string; score: number }[];
  checks: { category: string; item_key: string; checked: boolean }[];
};
