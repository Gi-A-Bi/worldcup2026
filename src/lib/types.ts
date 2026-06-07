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

export type SettlementType = "parimutuel" | "pool_share" | "rarity_share";

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

export type Bet = {
  id: string;
  player_id: string;
  category_id: string;
  option_id: string;
  amount: number;
  created_at: string;
};

/** 베팅 + 참가자 닉네임 + 옵션 라벨 (라이브/배당 표시용) */
export type BetWithNames = Bet & {
  players: { nickname: string } | null;
  options: { label: string } | null;
};

export type Settlement = {
  id: string;
  player_id: string;
  category_id: string;
  payout: number;
  net: number;
  created_at: string;
};

export type SettlementWithNames = Settlement & {
  players: { nickname: string } | null;
};

/** 개인 베팅 확정(개인 마감) */
export type BetLock = {
  id: string;
  player_id: string;
  category_id: string;
  created_at: string;
};

/** localStorage 에 저장하는 세션 (닉네임+비밀번호 로그인) */
export type Session = {
  playerId: string;
  nickname: string;
};
