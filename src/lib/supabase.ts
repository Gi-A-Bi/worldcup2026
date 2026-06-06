import { createClient } from "@supabase/supabase-js";

/**
 * Supabase 클라이언트 (브라우저/서버 공용).
 *
 * 환경변수:
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * 이 앱은 Supabase Auth 를 사용하지 않고 "방 코드 + 닉네임" 방식이라
 * anon(공개) 키만 있으면 된다. 실시간 구독(Realtime)을 쓰므로 그대로 활성화.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase 환경변수가 없습니다. .env.local 에 NEXT_PUBLIC_SUPABASE_URL 과 " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY 를 설정하세요. (.env.example 참고)"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // 자체 세션(localStorage roomCode/playerId)을 쓰므로 불필요
  },
});
