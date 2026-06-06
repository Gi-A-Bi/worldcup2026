// 2026 FIFA 월드컵 조 편성 (CLAUDE.md §14)
// 방 생성 시 이 48팀을 teams 테이블에 시드로 삽입한다.

export type SeedTeam = {
  name: string;
  group_label: string;
  flag_emoji: string;
  fifa_code: string;
};

export const WORLD_CUP_2026_TEAMS: SeedTeam[] = [
  // A조
  { name: "멕시코", group_label: "A", flag_emoji: "🇲🇽", fifa_code: "MEX" },
  { name: "남아공", group_label: "A", flag_emoji: "🇿🇦", fifa_code: "RSA" },
  { name: "대한민국", group_label: "A", flag_emoji: "🇰🇷", fifa_code: "KOR" },
  { name: "체코", group_label: "A", flag_emoji: "🇨🇿", fifa_code: "CZE" },
  // B조
  { name: "캐나다", group_label: "B", flag_emoji: "🇨🇦", fifa_code: "CAN" },
  { name: "보스니아", group_label: "B", flag_emoji: "🇧🇦", fifa_code: "BIH" },
  { name: "카타르", group_label: "B", flag_emoji: "🇶🇦", fifa_code: "QAT" },
  { name: "스위스", group_label: "B", flag_emoji: "🇨🇭", fifa_code: "SUI" },
  // C조
  { name: "브라질", group_label: "C", flag_emoji: "🇧🇷", fifa_code: "BRA" },
  { name: "모로코", group_label: "C", flag_emoji: "🇲🇦", fifa_code: "MAR" },
  { name: "아이티", group_label: "C", flag_emoji: "🇭🇹", fifa_code: "HAI" },
  { name: "스코틀랜드", group_label: "C", flag_emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", fifa_code: "SCO" },
  // D조
  { name: "미국", group_label: "D", flag_emoji: "🇺🇸", fifa_code: "USA" },
  { name: "파라과이", group_label: "D", flag_emoji: "🇵🇾", fifa_code: "PAR" },
  { name: "호주", group_label: "D", flag_emoji: "🇦🇺", fifa_code: "AUS" },
  { name: "튀르키예", group_label: "D", flag_emoji: "🇹🇷", fifa_code: "TUR" },
  // E조
  { name: "독일", group_label: "E", flag_emoji: "🇩🇪", fifa_code: "GER" },
  { name: "쿠라소", group_label: "E", flag_emoji: "🇨🇼", fifa_code: "CUW" },
  { name: "코트디부아르", group_label: "E", flag_emoji: "🇨🇮", fifa_code: "CIV" },
  { name: "에콰도르", group_label: "E", flag_emoji: "🇪🇨", fifa_code: "ECU" },
  // F조
  { name: "네덜란드", group_label: "F", flag_emoji: "🇳🇱", fifa_code: "NED" },
  { name: "일본", group_label: "F", flag_emoji: "🇯🇵", fifa_code: "JPN" },
  { name: "스웨덴", group_label: "F", flag_emoji: "🇸🇪", fifa_code: "SWE" },
  { name: "튀니지", group_label: "F", flag_emoji: "🇹🇳", fifa_code: "TUN" },
  // G조
  { name: "벨기에", group_label: "G", flag_emoji: "🇧🇪", fifa_code: "BEL" },
  { name: "이집트", group_label: "G", flag_emoji: "🇪🇬", fifa_code: "EGY" },
  { name: "이란", group_label: "G", flag_emoji: "🇮🇷", fifa_code: "IRN" },
  { name: "뉴질랜드", group_label: "G", flag_emoji: "🇳🇿", fifa_code: "NZL" },
  // H조
  { name: "스페인", group_label: "H", flag_emoji: "🇪🇸", fifa_code: "ESP" },
  { name: "카보베르데", group_label: "H", flag_emoji: "🇨🇻", fifa_code: "CPV" },
  { name: "사우디아라비아", group_label: "H", flag_emoji: "🇸🇦", fifa_code: "KSA" },
  { name: "우루과이", group_label: "H", flag_emoji: "🇺🇾", fifa_code: "URU" },
  // I조
  { name: "프랑스", group_label: "I", flag_emoji: "🇫🇷", fifa_code: "FRA" },
  { name: "세네갈", group_label: "I", flag_emoji: "🇸🇳", fifa_code: "SEN" },
  { name: "이라크", group_label: "I", flag_emoji: "🇮🇶", fifa_code: "IRQ" },
  { name: "노르웨이", group_label: "I", flag_emoji: "🇳🇴", fifa_code: "NOR" },
  // J조
  { name: "아르헨티나", group_label: "J", flag_emoji: "🇦🇷", fifa_code: "ARG" },
  { name: "알제리", group_label: "J", flag_emoji: "🇩🇿", fifa_code: "ALG" },
  { name: "오스트리아", group_label: "J", flag_emoji: "🇦🇹", fifa_code: "AUT" },
  { name: "요르단", group_label: "J", flag_emoji: "🇯🇴", fifa_code: "JOR" },
  // K조
  { name: "포르투갈", group_label: "K", flag_emoji: "🇵🇹", fifa_code: "POR" },
  { name: "DR콩고", group_label: "K", flag_emoji: "🇨🇩", fifa_code: "COD" },
  { name: "우즈베키스탄", group_label: "K", flag_emoji: "🇺🇿", fifa_code: "UZB" },
  { name: "콜롬비아", group_label: "K", flag_emoji: "🇨🇴", fifa_code: "COL" },
  // L조
  { name: "잉글랜드", group_label: "L", flag_emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", fifa_code: "ENG" },
  { name: "크로아티아", group_label: "L", flag_emoji: "🇭🇷", fifa_code: "CRO" },
  { name: "가나", group_label: "L", flag_emoji: "🇬🇭", fifa_code: "GHA" },
  { name: "파나마", group_label: "L", flag_emoji: "🇵🇦", fifa_code: "PAN" },
];

export const WORLD_CUP_GROUPS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
] as const;
