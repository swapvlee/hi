import type { ReactNode } from "react";

interface ConfirmDialogProps {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "确认",
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground-950/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-background-50 p-6">
        <h3 className="font-heading font-bold text-lg text-foreground-900">{title}</h3>
        <div className="mt-2 text-sm text-foreground-600 leading-relaxed">{message}</div>
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-md bg-background-100 text-foreground-600 text-sm font-medium hover:bg-background-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-md bg-accent-500 text-background-50 text-sm font-medium hover:bg-accent-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}