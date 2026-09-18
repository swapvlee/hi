import { useState } from "react";

interface NameModalProps {
  title: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
}

export default function NameModal({
  title,
  placeholder = "请输入名称",
  initialValue = "",
  submitLabel = "确定",
  onSubmit,
  onClose,
}: NameModalProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const name = value.trim();
    if (!name) {
      setError("名称不能为空");
      return;
    }
    if (name.includes("/")) {
      setError("名称不能包含 / 字符");
      return;
    }
    onSubmit(name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground-950/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-background-50 p-6">
        <h3 className="font-heading font-bold text-lg text-foreground-900">{title}</h3>

        <div className="mt-4">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            placeholder={placeholder}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") onClose();
            }}
            className="w-full px-4 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm text-foreground-900 outline-none focus:border-primary-400 transition-colors"
          />
        </div>

        {error && (
          <p className="mt-3 text-sm text-accent-700 bg-accent-100/70 rounded-md px-3 py-2">{error}</p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-md bg-background-100 text-foreground-600 text-sm font-medium hover:bg-background-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}