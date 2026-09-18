import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errors";

type Mode = "login" | "signup";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        });
        if (signUpError) throw signUpError;
        const refCode = searchParams.get("ref");
        if (refCode && data.user) {
          try {
            const { data: rc } = await supabase.from("referral_codes").select("user_id").eq("code", refCode).maybeSingle();
            if (rc) {
              await supabase.from("referrals").insert({ referrer_id: rc.user_id, referee_id: data.user.id, code: refCode });
            }
          } catch {
            // 邀请记录失败不影响注册
          }
        }
        if (!data.session) {
          setError("注册成功！请前往邮箱完成验证后登录。");
          setLoading(false);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "操作失败，请重试"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-50 px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-primary-500 text-background-50 mb-4">
            <i className="ri-sparkling-2-line text-3xl" />
          </div>
          <h1 className="font-heading font-bold text-2xl text-foreground-900">拾光</h1>
          <p className="mt-1 text-sm text-foreground-500">专注个人成长与自我管理</p>
        </div>

        {/* 切换登录/注册 */}
        <div className="flex p-1 rounded-full bg-background-100 mb-6">
          <button
            onClick={() => { setMode("login"); setError(""); }}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              mode === "login" ? "bg-background-50 text-foreground-900" : "text-foreground-500"
            }`}
          >
            登录
          </button>
          <button
            onClick={() => { setMode("signup"); setError(""); }}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              mode === "signup" ? "bg-background-50 text-foreground-900" : "text-foreground-500"
            }`}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium text-foreground-700 mb-1.5">昵称</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="给自己取个名字"
                className="w-full px-4 py-3 rounded-lg border border-background-300 bg-background-50 text-sm text-foreground-900 outline-none focus:border-primary-400 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground-700 mb-1.5">邮箱</label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="w-full px-4 py-3 rounded-lg border border-background-300 bg-background-50 text-sm text-foreground-900 outline-none focus:border-primary-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground-700 mb-1.5">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="w-full px-4 py-3 rounded-lg border border-background-300 bg-background-50 text-sm text-foreground-900 outline-none focus:border-primary-400 transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-accent-700 bg-accent-100/70 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-primary-500 text-background-50 text-sm font-semibold hover:bg-primary-600 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
          >
            {loading ? "请稍候..." : mode === "login" ? "登录" : "创建账号"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-foreground-400">
          登录即表示你同意我们安全地保存你的数据
        </p>
      </div>
    </div>
  );
}