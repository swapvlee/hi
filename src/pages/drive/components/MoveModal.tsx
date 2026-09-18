import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface DriveFolder {
  id: string;
  name: string;
  parent_id: string | null;
}

interface MoveModalProps {
  /** 要移动的项目数量（用于文案） */
  count: number;
  /** 当前所在文件夹（用于「当前位置」判断） */
  currentFolderId: string | null;
  /** 不可作为目标的位置：被移动文件夹自身及其所有子文件夹 */
  excludedFolderIds: string[];
  /** 正在移动中 */
  busy?: boolean;
  onMove: (targetFolderId: string | null) => void;
  onClose: () => void;
}

export default function MoveModal({
  count,
  currentFolderId,
  excludedFolderIds,
  busy = false,
  onMove,
  onClose,
}: MoveModalProps) {
  const { user } = useAuth();
  const [stack, setStack] = useState<{ id: string; name: string }[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loading, setLoading] = useState(true);

  const currentId = stack.length > 0 ? stack[stack.length - 1].id : null;

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    const query = supabase.from("drive_folders").select("*").order("name", { ascending: true });
    if (currentId) query.eq("parent_id", currentId);
    else query.is("parent_id", null);
    query.then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setFolders([]);
      } else {
        setFolders(
          ((data ?? []) as DriveFolder[]).filter((f) => !excludedFolderIds.includes(f.id))
        );
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user, currentId, excludedFolderIds]);

  const isCurrentLocation = currentFolderId === currentId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground-950/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-background-50 p-6">
        <h3 className="font-heading font-bold text-lg text-foreground-900">
          {count > 1 ? `移动 ${count} 个项目` : "移动到文件夹"}
        </h3>
        <p className="mt-1 text-sm text-foreground-500">选择一个目标文件夹</p>

        <nav className="mt-4 flex items-center gap-1 flex-wrap text-sm">
          <button
            onClick={() => setStack([])}
            className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              stack.length === 0
                ? "font-medium text-foreground-900 bg-background-100"
                : "text-foreground-500 hover:bg-background-100"
            }`}
          >
            全部文件
          </button>
          {stack.map((item, idx) => (
            <span key={item.id} className="flex items-center gap-1">
              <i className="ri-arrow-right-s-line text-foreground-300" />
              <button
                onClick={() => setStack((prev) => prev.slice(0, idx + 1))}
                className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  idx === stack.length - 1
                    ? "font-medium text-foreground-900 bg-background-100"
                    : "text-foreground-500 hover:bg-background-100"
                }`}
              >
                {item.name}
              </button>
            </span>
          ))}
        </nav>

        <div className="mt-3 max-h-64 overflow-y-auto rounded-md border border-background-200">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : folders.length === 0 ? (
            <p className="py-8 text-center text-sm text-foreground-400">此文件夹下暂无子文件夹</p>
          ) : (
            folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setStack((prev) => [...prev, { id: folder.id, name: folder.name }])}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-background-100 transition-colors cursor-pointer border-b border-background-200 last:border-b-0"
              >
                <span className="w-8 h-8 flex items-center justify-center rounded-md bg-primary-100 text-primary-600 shrink-0">
                  <i className="ri-folder-3-line" />
                </span>
                <span className="flex-1 text-sm text-foreground-800 truncate">{folder.name}</span>
                <i className="ri-arrow-right-s-line text-foreground-300" />
              </button>
            ))
          )}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-2.5 rounded-md bg-background-100 text-foreground-600 text-sm font-medium hover:bg-background-200 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
          >
            取消
          </button>
          <button
            onClick={() => onMove(currentId)}
            disabled={isCurrentLocation || busy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            {busy ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-background-50 border-t-transparent rounded-full animate-spin" />
                移动中...
              </>
            ) : isCurrentLocation ? (
              "当前位置"
            ) : count > 1 ? (
              `移动 ${count} 项到这里`
            ) : (
              "移动到这里"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}