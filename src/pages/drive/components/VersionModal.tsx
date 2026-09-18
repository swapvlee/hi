import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";
import { formatDate } from "@/pages/drive/driveUtils";

interface Version {
  id: string;
  item_id: string;
  item_type: string;
  change_type: string;
  name: string;
  parent_id: string | null;
  parent_name: string | null;
  created_at: string;
}

interface VersionModalProps {
  itemId: string;
  itemType: "file" | "folder";
  itemName: string;
  onRestored: () => void;
  onClose: () => void;
}

export default function VersionModal({
  itemId,
  itemType,
  itemName,
  onRestored,
  onClose,
}: VersionModalProps) {
  const { user } = useAuth();
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    supabase
      .from("drive_item_versions")
      .select("*")
      .eq("item_id", itemId)
      .order("created_at", { ascending: false })
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err) setError(getErrorMessage(err, "加载版本历史失败，请稍后重试"));
        else setVersions((data ?? []) as Version[]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, itemId]);

  const restore = async (version: Version) => {
    setRestoringId(version.id);
    setError("");
    try {
      if (version.item_type === "file") {
        const { error: err } = await supabase
          .from("drive_files")
          .update({
            name: version.name,
            folder_id: version.parent_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", version.item_id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from("drive_folders")
          .update({ name: version.name, parent_id: version.parent_id })
          .eq("id", version.item_id);
        if (err) throw err;
      }
      onRestored();
    } catch (e) {
      setError(getErrorMessage(e, "恢复版本失败，请稍后重试"));
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground-950/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-background-50 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-lg text-foreground-900">版本历史</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 transition-colors cursor-pointer"
            aria-label="关闭"
          >
            <i className="ri-close-line" />
          </button>
        </div>
        <p className="mt-1 text-sm text-foreground-500 truncate">
          {itemType === "folder" ? "文件夹" : "文件"} · {itemName}
        </p>

        {error && (
          <p className="mt-3 text-sm text-accent-700 bg-accent-100/70 rounded-md px-3 py-2">{error}</p>
        )}

        <div className="mt-4 max-h-80 overflow-y-auto rounded-md border border-background-200">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : versions.length === 0 ? (
            <p className="py-10 text-center text-sm text-foreground-400">暂无历史版本</p>
          ) : (
            <div className="divide-y divide-background-200">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-secondary-100 text-secondary-700 shrink-0">
                    <i className={v.change_type === "rename" ? "ri-edit-line" : "ri-folder-transfer-line"} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          v.change_type === "rename"
                            ? "bg-primary-100 text-primary-700"
                            : "bg-accent-100 text-accent-700"
                        }`}
                      >
                        {v.change_type === "rename" ? "重命名" : "移动"}
                      </span>
                      <span className="text-xs text-foreground-400">{formatDate(v.created_at)}</span>
                    </div>
                    <p className="mt-1 text-sm text-foreground-700 truncate">
                      {v.change_type === "rename" ? `名称：${v.name}` : `位置：${v.parent_name ?? "全部文件"}`}
                    </p>
                  </div>
                  <button
                    onClick={() => restore(v)}
                    disabled={restoringId === v.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm text-primary-600 hover:bg-primary-100 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {restoringId === v.id ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        恢复中
                      </>
                    ) : (
                      <>
                        <i className="ri-arrow-go-back-line" />
                        恢复
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}