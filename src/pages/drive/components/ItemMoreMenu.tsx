import { useState } from "react";

interface ItemMoreMenuProps {
  onMove: () => void;
  onVersion: () => void;
  onDelete: () => void;
}

export default function ItemMoreMenu({ onMove, onVersion, onDelete }: ItemMoreMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-200 hover:text-foreground-700 cursor-pointer"
        aria-label="更多操作"
      >
        <i className="ri-more-2-fill" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div className="absolute z-30 right-0 mt-1 w-32 rounded-lg bg-background-50 border border-background-200 py-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onMove();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-folder-transfer-line text-foreground-500" />
              移动
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onVersion();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-history-line text-foreground-500" />
              版本历史
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onDelete();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-accent-700 hover:bg-accent-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-delete-bin-line" />
              删除
            </button>
          </div>
        </>
      )}
    </div>
  );
}