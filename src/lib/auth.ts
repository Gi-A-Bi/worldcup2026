import { supabase } from "./supabase";
import type { Player } from "./types";

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  NICKNAME_REQUIRED: "닉네임을 입력해주세요.",
  PASSWORD_REQUIRED: "비밀번호를 입력해주세요.",
  WRONG_PASSWORD: "비밀번호가 일치하지 않아요.",
  NO_GAME: "게임이 아직 준비되지 않았어요. (single_game_setup.sql 실행 필요)",
};

/**
 * 닉네임 + 비밀번호 로그인 (RPC login_player).
 * 처음 보는 닉네임이면 그 비밀번호로 계정이 자동 생성된다.
 */
export async function loginPlayer(
  nickname: string,
  password: string
): Promise<Player> {
  const { data, error } = await supabase.rpc("login_player", {
    p_nickname: nickname,
    p_password: password,
  });
  if (error) {
    const code = Object.keys(LOGIN_ERROR_MESSAGES).find((c) =>
      error.message.includes(c)
    );
    if (code) throw new Error(LOGIN_ERROR_MESSAGES[code]);
    if (error.message.includes("login_player")) {
      throw new Error(
        "로그인 함수가 아직 없어요. supabase/single_game_setup.sql 을 실행해주세요."
      );
    }
    throw error;
  }
  return data as Player;
}
