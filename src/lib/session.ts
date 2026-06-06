import type { Session } from "./types";

// localStorage 세션 저장/복원 (CLAUDE.md §2 재접속용)
const STORAGE_KEY = "wc2026:session";

export function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (parsed.playerId && parsed.nickname) {
      return { playerId: parsed.playerId, nickname: parsed.nickname };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
