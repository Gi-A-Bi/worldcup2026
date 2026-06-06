import { supabase } from "./supabase";
import type { Player, Room, Team } from "./types";

// 비밀번호 해시는 절대 클라이언트로 가져오지 않도록 컬럼을 명시한다.
const PLAYER_COLS = "id, room_id, nickname, chips, created_at";

export async function fetchRoomById(roomId: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw error;
  return (data as Room) ?? null;
}

export async function fetchPlayer(playerId: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_COLS)
    .eq("id", playerId)
    .maybeSingle();
  if (error) throw error;
  return (data as Player) ?? null;
}

export async function fetchPlayers(roomId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_COLS)
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as Player[]) ?? [];
}

export async function fetchTeams(roomId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("room_id", roomId)
    .order("group_label", { ascending: true });
  if (error) throw error;
  return (data as Team[]) ?? [];
}
