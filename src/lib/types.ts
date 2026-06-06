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

/** localStorage 에 저장하는 세션 (CLAUDE.md §2) */
export type Session = {
  roomCode: string;
  playerId: string;
  nickname: string;
};
