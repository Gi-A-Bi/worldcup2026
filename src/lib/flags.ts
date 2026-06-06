// 국기 이모지 처리 헬퍼
//
// 잉글랜드/스코틀랜드/웨일스 같은 "서브디비전 플래그"는 🏴(U+1F3F4) + 태그 문자
// 조합이라 윈도우/일부 안드로이드 등 폰트 미지원 환경에서 깨져 보인다.
// 이런 경우엔 이모지 대신 국가코드(ENG/SCO) 배지로 대체한다.

export function isSubdivisionFlag(emoji?: string | null): boolean {
  return !!emoji && emoji.codePointAt(0) === 0x1f3f4; // 🏴 + tags
}

/** 팀 옵션 라벨: 서브디비전 국기는 깨지므로 이름만, 그 외는 "국기 이름". */
export function teamOptionLabel(team: {
  name: string;
  flag_emoji?: string | null;
}): string {
  if (isSubdivisionFlag(team.flag_emoji)) return team.name;
  return `${team.flag_emoji ?? ""} ${team.name}`.trim();
}
