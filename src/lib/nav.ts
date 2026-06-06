/** 하단 탭 4개 (CLAUDE.md §7 화면 구성). 메인(조별 명단)은 헤더 로고로 진입. */
export type NavItem = {
  href: string;
  label: string;
  emoji: string;
};

export const TABS: NavItem[] = [
  { href: "/bet", label: "베팅하기", emoji: "⚽" },
  { href: "/live", label: "라이브 현황", emoji: "🔴" },
  { href: "/ranking", label: "순위표", emoji: "🏆" },
  { href: "/settlements", label: "정산 내역", emoji: "🧾" },
];
