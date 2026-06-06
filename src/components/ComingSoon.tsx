/**
 * Stage 1 스켈레톤용 안내 카드.
 * 각 탭에서 "이 화면에 무엇이 들어올지"를 보여주는 자리표시자.
 */
export default function ComingSoon({
  stage,
  items,
}: {
  stage: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-dashed border-pitch-700/50 bg-pitch-900/30 p-5">
      <span className="inline-block rounded-full bg-pitch-600/20 px-2.5 py-0.5 text-[11px] font-semibold text-pitch-400">
        {stage} 예정
      </span>
      <ul className="mt-3 space-y-2">
        {items.map((it) => (
          <li
            key={it}
            className="flex items-start gap-2 text-sm text-pitch-50/70"
          >
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
