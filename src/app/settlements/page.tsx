import ComingSoon from "@/components/ComingSoon";

export default function SettlementsPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-bold text-pitch-50">🧾 정산 내역</h1>
        <p className="text-sm text-pitch-50/60">
          정답 입력 후 자동 계산된 정산 결과.
        </p>
      </header>
      <ComingSoon
        stage="Stage 5~6"
        items={[
          "카테고리/매치별 결과 카드 (정답 표시 · 풀 사이즈 · 배율)",
          "누가 따고(녹색) 누가 잃었는지(빨강) 표시",
          "정산 대기 섹션 (아직 결과 안 나온 카테고리)",
        ]}
      />
    </div>
  );
}
