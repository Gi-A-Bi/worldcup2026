import { supabase } from "./supabase";
import { teamOptionLabel } from "./flags";
import type {
  CategoryType,
  CategoryWithOptions,
  SettlementType,
  Team,
} from "./types";

/** 카테고리 + 옵션을 함께 조회 (생성순) */
export async function fetchCategories(
  roomId: string
): Promise<CategoryWithOptions[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*, options(*)")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as CategoryWithOptions[]) ?? [];
}

async function logActivity(
  roomId: string,
  playerId: string,
  action: string,
  meta: Record<string, unknown>
) {
  await supabase
    .from("activity_log")
    .insert({ room_id: roomId, player_id: playerId, action, meta });
}

export type NewOption = { label: string; team_id?: string | null };

export type CreateCategoryInput = {
  roomId: string;
  playerId: string;
  name: string;
  type: CategoryType;
  settlementType: SettlementType;
  multiSelect: boolean;
  kickoffAt?: string | null;
  options?: NewOption[];
};

/** 카테고리 생성 (+옵션) → activity_log 기록 → 옵션 포함해 다시 조회 */
export async function createCategory(
  input: CreateCategoryInput
): Promise<CategoryWithOptions> {
  const name = input.name.trim();
  if (!name) throw new Error("카테고리 이름을 입력해주세요.");

  const { data: cat, error } = await supabase
    .from("categories")
    .insert({
      room_id: input.roomId,
      name,
      type: input.type,
      settlement_type: input.settlementType,
      multi_select: input.multiSelect,
      kickoff_at: input.kickoffAt ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  if (input.options && input.options.length > 0) {
    const payload = input.options.map((o) => ({
      category_id: cat.id,
      label: o.label,
      team_id: o.team_id ?? null,
    }));
    const { error: oe } = await supabase.from("options").insert(payload);
    if (oe) throw oe;
  }

  await logActivity(input.roomId, input.playerId, "create_category", {
    name,
    type: input.type,
  });

  const { data: full, error: fe } = await supabase
    .from("categories")
    .select("*, options(*)")
    .eq("id", cat.id)
    .single();
  if (fe) throw fe;
  return full as CategoryWithOptions;
}

/** 팀들을 옵션으로 추가 (teams 에서 생성: 라벨 = 국기 + 팀명, team_id 연결) */
export async function addTeamOptions(categoryId: string, teams: Team[]) {
  if (teams.length === 0) return;
  const payload = teams.map((t) => ({
    category_id: categoryId,
    team_id: t.id,
    label: teamOptionLabel(t),
  }));
  const { error } = await supabase.from("options").insert(payload);
  if (error) throw error;
}

/** 직접 입력 옵션 추가 (예: 득점왕 선수명) */
export async function addCustomOption(categoryId: string, label: string) {
  const trimmed = label.trim();
  if (!trimmed) throw new Error("옵션 이름을 입력해주세요.");
  const { error } = await supabase
    .from("options")
    .insert({ category_id: categoryId, label: trimmed });
  if (error) throw error;
}

export async function removeOption(optionId: string) {
  const { error } = await supabase.from("options").delete().eq("id", optionId);
  if (error) throw error;
}

/** 카테고리 삭제 (건 칩 전액 환불 후 삭제). 정산된 카테고리는 삭제 불가. */
export async function deleteCategory(categoryId: string, playerId: string) {
  const { error } = await supabase.rpc("delete_category", {
    p_category_id: categoryId,
    p_player_id: playerId,
  });
  if (error) {
    if (error.message.includes("ALREADY_RESOLVED")) {
      throw new Error("정산된 카테고리는 삭제할 수 없어요.");
    }
    if (error.message.includes("delete_category")) {
      throw new Error(
        "삭제 함수가 아직 없어요. supabase/cancel_and_delete.sql 을 실행해주세요."
      );
    }
    throw error;
  }
}

/** 카테고리 마감 (열림 → 마감). 되돌릴 수 없는 동작이라 호출부에서 확인 모달 사용. */
export async function lockCategory(
  category: { id: string; name: string },
  roomId: string,
  playerId: string
) {
  const { error } = await supabase
    .from("categories")
    .update({ status: "locked", locked_at: new Date().toISOString() })
    .eq("id", category.id)
    .eq("status", "open"); // 이미 마감/정산이면 변경 안 함
  if (error) throw error;
  await logActivity(roomId, playerId, "lock_category", { name: category.name });
}

// ---- 월드컵 카테고리 템플릿 (CLAUDE.md §4) ----

export type OptionStrategy =
  | "all-teams" // 48팀 자동 옵션
  | "match" // 두 팀 선택 → 승/무/패
  | "pick-teams" // 팀 골라서 옵션 (라운드 진출팀)
  | "manual"; // 직접 입력 (득점왕 등)

export type CategoryTemplate = {
  key: string;
  name: string;
  type: CategoryType;
  settlementType: SettlementType;
  multiSelect: boolean;
  optionStrategy: OptionStrategy;
  settleWhen: string;
  description: string;
};

/** 득점왕 기본 후보 (생성 시 자동 옵션, 카드에서 추가/삭제 가능) */
export const TOPSCORER_CANDIDATES: string[] = [
  "음바페 (프랑스)",
  "홀란 (노르웨이)",
  "해리 케인 (잉글랜드)",
  "비니시우스 (브라질)",
  "메시 (아르헨티나)",
  "라우타로 (아르헨티나)",
  "호날두 (포르투갈)",
  "루카쿠 (벨기에)",
  "라민 야말 (스페인)",
  "손흥민 (대한민국)",
];

export const CATEGORY_TEMPLATES: CategoryTemplate[] = [
  {
    key: "winner",
    name: "우승팀",
    type: "winner",
    settlementType: "parimutuel",
    multiSelect: false,
    optionStrategy: "all-teams",
    settleWhen: "대회 종료 후",
    description: "우승할 한 팀을 맞혀요. 48팀이 옵션으로 자동 생성돼요.",
  },
  {
    key: "advance",
    name: "조별리그 진출팀",
    type: "advance",
    settlementType: "rarity_share",
    multiSelect: true,
    optionStrategy: "all-teams",
    settleWhen: "조별리그 종료 후",
    description: "진출할 32팀을 골라요. 남이 안 고른 진출팀일수록 더 큰 이익(희소성 보너스).",
  },
  {
    key: "topscorer",
    name: "득점왕",
    type: "topscorer",
    settlementType: "parimutuel",
    multiSelect: false,
    optionStrategy: "manual",
    settleWhen: "대회 종료 후",
    description: "유력 후보 10명이 기본 제공돼요. 카드에서 더 추가/삭제할 수 있어요.",
  },
  {
    key: "match",
    name: "빅매치 승무패",
    type: "match",
    settlementType: "parimutuel",
    multiSelect: false,
    optionStrategy: "match",
    settleWhen: "매치 종료 즉시",
    description: "두 팀을 골라 승 / 무 / 패 옵션을 만들어요.",
  },
  {
    key: "knockout",
    name: "토너먼트 라운드별 승리팀",
    type: "knockout",
    settlementType: "parimutuel",
    multiSelect: false,
    optionStrategy: "pick-teams",
    settleWhen: "라운드 종료 후",
    description: "해당 라운드에 진출한 팀들을 옵션으로 골라요.",
  },
];

export function settlementLabel(type: SettlementType): string {
  if (type === "parimutuel") return "파리뮤추얼";
  if (type === "rarity_share") return "희소성 분배";
  return "풀셰어";
}

export function statusLabel(status: string): { text: string; cls: string } {
  switch (status) {
    case "open":
      return { text: "열림", cls: "border-pitch-500/40 bg-pitch-500/15 text-pitch-300" };
    case "locked":
      return { text: "마감", cls: "border-amber-500/40 bg-amber-500/15 text-amber-300" };
    case "resolved":
      return { text: "정산됨", cls: "border-sky-500/40 bg-sky-500/15 text-sky-300" };
    default:
      return { text: status, cls: "border-pitch-700/40 bg-white/5 text-pitch-50/60" };
  }
}
