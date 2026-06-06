import ComingSoon from "@/components/ComingSoon";

export default function BetPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-bold text-pitch-50">⚽ 베팅하기</h1>
        <p className="text-sm text-pitch-50/60">
          카테고리별로 옵션을 골라 가상 칩을 건다.
        </p>
      </header>
      <ComingSoon
        stage="Stage 3~4"
        items={[
          "카테고리 카드 (우승팀 · 진출팀 · 득점왕 · 빅매치 · 토너먼트)",
          "상태 뱃지(열림/마감/정산됨) + 풀 사이즈 표시",
          "옵션별 예상 배당률 + 분포 막대그래프",
          "칩 스테퍼(−/+) 입력 후 베팅 (잔액 검사 · 원자적 차감)",
          "match 카테고리 한국시간(KST) 킥오프 표시",
        ]}
      />
    </div>
  );
}
