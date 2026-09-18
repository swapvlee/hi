import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ShareModalProps {
  file: { id: string; name: string; storage_path: string; mime_type: string | null; size: number };
  onClose: () => void;
}

const SEVEN_DAYS = 7 * 24 * 60 * 60;

export default function ShareModal({ file, onClose }: ShareModalProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    const createShare = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        if (active) setError("生成链接失败，请先登录");
        setLoading(false);
        return;
      }

      const token = crypto.randomUUID();
      const { error: err } = await supabase.from("drive_shares").insert({
        id: crypto.randomUUID(),
        token,
        file_id: file.id,
        user_id: data.user.id,
        name: file.name,
        mime_type: file.mime_type,
        size: file.size,
        expires_at: new Date(Date.now() + SEVEN_DAYS * 1000).toISOString(),
      });

      if (err) {
        if (active) setError("生成链接失败，请稍后重试");
        setLoading(false);
        return;
      }

      const base = __BASE_PATH__.replace(/\/$/, "");
      const shareUrl = `${window.location.origin}${base}/share/${token}`;
      if (active) setUrl(shareUrl);
      setLoading(false);
    };

    createShare();

    return () => {
      active = false;
    };
  }, [file.id, file.name, file.mime_type, file.size]);

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("复制失败，请手动复制链接");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground-950/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-background-50 p-6">
        <h3 className="font-heading font-bold text-lg text-foreground-900">分享文件</h3>
        <p className="mt-1 text-sm text-foreground-500 truncate" title={file.name}>
          {file.name}
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="mt-4 text-sm text-accent-700 bg-accent-100/70 rounded-md px-3 py-2">{error}</p>
        ) : (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 px-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm text-foreground-700 outline-none"
              />
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <i className={copied ? "ri-check-line" : "ri-file-copy-line"} />
                {copied ? "已复制" : "复制链接"}
              </button>
            </div>
            <p className="mt-2 text-xs text-foreground-400">
              链接 7 天内有效，打开后可直接在线查看，也支持下载
            </p>
          </div>
        )}

        <div className="mt-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-md bg-background-100 text-foreground-600 text-sm font-medium hover:bg-background-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}