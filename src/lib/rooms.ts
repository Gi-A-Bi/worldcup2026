import { supabase } from "./supabase";
import { WORLD_CUP_2026_TEAMS } from "./worldcupTeams";
import type { Player, Room, Session, Team } from "./types";

// 혼동되는 글자(0,O,1,I,L) 제외한 6자리 코드
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

async function generateUniqueCode(maxTries = 8): Promise<string> {
  for (let i = 0; i < maxTries; i++) {
    const code = randomCode();
    const { data, error } = await supabase
      .from("rooms")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (error) throw error;
    if (!data) return code;
  }
  throw new Error("방 코드 생성에 실패했어요. 다시 시도해주세요.");
}

export async function fetchRoomByCode(code: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return (data as Room) ?? null;
}

export async function fetchPlayer(playerId: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .maybeSingle();
  if (error) throw error;
  return (data as Player) ?? null;
}

export async function fetchPlayers(roomId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
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

export type RoomEntry = { session: Session; room: Room; player: Player };

/** 방 만들기: 코드 생성 → 방 생성 → 48팀 시드 → 방장(첫 참가자) 생성 */
export async function createRoom(input: {
  roomName: string;
  tournamentName: string;
  nickname: string;
}): Promise<RoomEntry> {
  const roomName = input.roomName.trim();
  const tournamentName = input.tournamentName.trim();
  const nickname = input.nickname.trim();
  if (!roomName) throw new Error("방 이름을 입력해주세요.");
  if (!nickname) throw new Error("닉네임을 입력해주세요.");

  const code = await generateUniqueCode();

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({
      code,
      name: roomName,
      tournament_name: tournamentName || null,
    })
    .select()
    .single();
  if (roomError) throw roomError;

  // 48팀 템플릿 시드
  const teamsPayload = WORLD_CUP_2026_TEAMS.map((t) => ({
    room_id: room.id,
    name: t.name,
    group_label: t.group_label,
    flag_emoji: t.flag_emoji,
    fifa_code: t.fifa_code,
  }));
  const { error: teamsError } = await supabase.from("teams").insert(teamsPayload);
  if (teamsError) throw teamsError;

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({ room_id: room.id, nickname, chips: room.initial_chips })
    .select()
    .single();
  if (playerError) throw playerError;

  await supabase.from("activity_log").insert({
    room_id: room.id,
    player_id: player.id,
    action: "create_room",
    meta: { code, nickname },
  });

  return {
    room: room as Room,
    player: player as Player,
    session: { roomCode: room.code, playerId: player.id, nickname },
  };
}

/** 방 입장: 같은 방+같은 닉네임이면 기존 플레이어로 복귀, 아니면 새로 생성 */
export async function joinRoom(input: {
  code: string;
  nickname: string;
}): Promise<RoomEntry> {
  const nickname = input.nickname.trim();
  if (!nickname) throw new Error("닉네임을 입력해주세요.");

  const room = await fetchRoomByCode(input.code);
  if (!room) {
    throw new Error("해당 코드의 방을 찾을 수 없어요. 코드를 다시 확인해주세요.");
  }

  // 기존 닉네임이면 복귀
  const { data: existing, error: existingError } = await supabase
    .from("players")
    .select("*")
    .eq("room_id", room.id)
    .eq("nickname", nickname)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    return {
      room,
      player: existing as Player,
      session: { roomCode: room.code, playerId: existing.id, nickname },
    };
  }

  // 신규 참가자
  const { data: created, error: createError } = await supabase
    .from("players")
    .insert({ room_id: room.id, nickname, chips: room.initial_chips })
    .select()
    .single();

  if (createError) {
    // 동시 입장으로 unique(room_id, nickname) 충돌 시 → 기존 행으로 복귀
    const retry = await supabase
      .from("players")
      .select("*")
      .eq("room_id", room.id)
      .eq("nickname", nickname)
      .maybeSingle();
    if (retry.data) {
      return {
        room,
        player: retry.data as Player,
        session: { roomCode: room.code, playerId: retry.data.id, nickname },
      };
    }
    throw createError;
  }

  await supabase.from("activity_log").insert({
    room_id: room.id,
    player_id: created.id,
    action: "join_room",
    meta: { nickname },
  });

  return {
    room,
    player: created as Player,
    session: { roomCode: room.code, playerId: created.id, nickname },
  };
}
