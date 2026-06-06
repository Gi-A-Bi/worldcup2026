// Supabase 테이블 행 타입 (CLAUDE.md §6 스키마 기준)

export type Room = {
  id: string;
  code: string;
  name: string;
  tournament_name: string | null;
  initial_chips: number;
  created_at: string;
};

export type Player = {
  id: string;
  room_id: string;
  nickname: string;
  chips: number;
  created_at: string;
};

export type Team = {
  id: string;
  room_id: string;
  name: string;
  group_label: string;
  flag_emoji: string | null;
  fifa_code: string | null;
};

export type CategoryType =
  | "winner"
  | "advance"
  | "topscorer"
  | "match"
  | "knockout"
  | "custom";

export type SettlementType = "parimutuel" | "pool_share";

export type CategoryStatus = "open" | "locked" | "resolved";

export type Category = {
  id: string;
  room_id: string;
  name: string;
  type: CategoryType;
  settlement_type: SettlementType;
  multi_select: boolean;
  kickoff_at: string | null;
  status: CategoryStatus;
  created_at: string;
  locked_at: string | null;
  resolved_at: string | null;
};

export type Option = {
  id: string;
  category_id: string;
  team_id: string | null;
  label: string;
  is_correct: boolean;
};

export type CategoryWithOptions = Category & { options: Option[] };

/** localStorage 에 저장하는 세션 (CLAUDE.md §2) */
export type Session = {
  roomCode: string;
  playerId: string;
  nickname: string;
};
