import { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import type { Referral, ReferralCode } from "@/types/billing";

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return "SG" + code;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function Marketing() {
  const { user } = useAuth();
  const [refCode, setRefCode] = useState<ReferralCode | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [exporting, setExporting] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const { data: codes, error: cErr } = await supabase
        .from("referral_codes")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cErr) throw cErr;

      let code = codes as ReferralCode | null;
      if (!code) {
        const newCode = genCode();
        const { data: inserted, error: iErr } = await supabase
          .from("referral_codes")
          .insert({ user_id: user.id, code: newCode })
          .select()
          .single();
        if (iErr) throw iErr;
        code = inserted as ReferralCode;
      }
      setRefCode(code);

      const { data: refs, error: rErr } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });
      if (rErr) throw rErr;
      setReferrals((refs ?? []) as Referral[]);
    } catch (e) {
      setError(getErrorMessage(e, "加载失败，请稍后重试"));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const basePath = __BASE_PATH__.split("/").filter(Boolean).join("/");
  const pathPrefix = basePath ? `/${basePath}` : "";
  const inviteLink = `${window.location.origin}${pathPrefix}/auth?ref=${refCode?.code ?? ""}`;

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setError("复制失败，请手动复制");
    }
  };

  const exportPoster = async () => {
    if (!posterRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(posterRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `拾光邀请海报-${refCode?.code ?? ""}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      setError(getErrorMessage(e, "导出失败"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground-900">推广中心</h1>
        <p className="mt-1 text-sm text-foreground-500">邀请好友一起使用拾光，一起成长</p>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg bg-accent-100/70 text-accent-800 px-4 py-3 text-sm">
          <span>{error}</span>
          <button onClick={load} className="font-medium underline cursor-pointer whitespace-nowrap">
            重试
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 邀请码 */}
          <div className="rounded-lg bg-background-50 border border-background-200 p-5">
            <h4 className="text-sm font-semibold text-foreground-700 mb-4">
              <a href="#" className="text-inherit hover:text-primary-600 transition-colors">我的邀请码</a>
            </h4>

            <div className="flex items-center gap-3 rounded-lg bg-primary-50 border border-primary-100 p-4">
              <span className="flex-1 font-heading font-bold text-2xl tracking-widest text-foreground-900">
                {refCode?.code}
              </span>
              <button
                onClick={() => copy(refCode?.code ?? "", "code")}
                className="px-4 py-2 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                {copied === "code" ? "已复制" : "复制"}
              </button>
            </div>

            <p className="mt-3 text-sm text-foreground-600 leading-relaxed">
              好友注册时填写你的邀请码，即可建立邀请关系。邀请成功后可获得返利奖励。
            </p>

            <div className="mt-4 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="flex-1 px-3 py-2.5 rounded-md border border-background-300 bg-background-50 text-sm text-foreground-600 outline-none"
              />
              <button
                onClick={() => copy(inviteLink, "link")}
                className="px-4 py-2.5 rounded-md bg-background-100 text-foreground-700 text-sm font-medium hover:bg-background-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                {copied === "link" ? "已复制" : "复制链接"}
              </button>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-lg bg-background-100 p-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-accent-100 text-accent-600">
                <i className="ri-team-line text-lg" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground-900">已邀请 {referrals.length} 位好友</p>
                <p className="text-xs text-foreground-500">好友开通会员后即可获得返利</p>
              </div>
            </div>
          </div>

          {/* 分享海报 */}
          <div className="rounded-lg bg-background-50 border border-background-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-foreground-700">
                <a href="#" className="text-inherit hover:text-primary-600 transition-colors">分享海报</a>
              </h4>
              <button
                onClick={exportPoster}
                disabled={exporting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-download-2-line" />
                {exporting ? "生成中..." : "导出图片"}
              </button>
            </div>

            <div ref={posterRef} className="rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-background-50 text-primary-600">
                  <i className="ri-sparkling-2-line text-base" />
                </div>
                <span className="font-heading font-bold text-xl text-background-50">拾光</span>
              </div>
              <p className="text-sm text-background-50/90 leading-relaxed">
                专注个人成长与自我管理<br />待办 · 习惯 · 目标 · 专注 · 复盘
              </p>
              <div className="mt-4 mx-auto w-fit rounded-lg bg-background-50 px-5 py-3">
                <p className="text-xs text-foreground-500">我的邀请码</p>
                <p className="font-heading font-bold text-2xl tracking-widest text-foreground-900">
                  {refCode?.code}
                </p>
              </div>
              <p className="mt-3 text-xs text-background-50/80">扫码或输入邀请码，加入拾光</p>
            </div>
          </div>
        </div>
      )}

      {/* 邀请记录 */}
      {!loading && referrals.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground-700 mb-3">
            <a href="#" className="text-inherit hover:text-primary-600 transition-colors">邀请记录</a>
          </h4>
          <ul className="space-y-2">
            {referrals.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-lg bg-background-50 border border-background-200 p-4"
              >
                <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-secondary-100 text-secondary-700 shrink-0">
                  <i className="ri-user-add-line" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground-800">邀请码 {r.code}</p>
                  <p className="text-xs text-foreground-400 mt-0.5">{formatDate(r.created_at)}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                    r.reward_status === "rewarded"
                      ? "bg-accent-100 text-accent-700"
                      : "bg-background-100 text-foreground-500"
                  }`}
                >
                  {r.reward_status === "rewarded" ? "已返利" : "待返利"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}