"use client";

/** 되돌릴 수 없는 동작(마감/정산 등) 확인 모달 (CLAUDE.md §3) */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = "확인",
  cancelText = "취소",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-pitch-700/50 bg-[#06180f] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-pitch-50">{title}</h3>
        <p className="mt-2 whitespace-pre-line text-sm text-pitch-50/70">
          {message}
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-lg border border-pitch-700/50 py-2.5 text-sm font-medium text-pitch-50/70 hover:text-pitch-50 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={[
              "flex-1 rounded-lg py-2.5 text-sm font-bold disabled:opacity-50",
              danger
                ? "bg-red-500 text-white hover:bg-red-400"
                : "bg-gold-500 text-[#1a1205] hover:bg-gold-400",
            ].join(" ")}
          >
            {busy ? "처리 중…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
