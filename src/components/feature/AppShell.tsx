import { useState } from "react";
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { navItems, bottomNavItems } from "@/components/feature/navItems";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary-500 text-background-50">
        <i className="ri-sparkling-2-line text-lg" />
      </div>
      <span className="font-heading font-bold text-xl text-foreground-900">拾光</span>
    </div>
  );
}

export default function AppShell() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  const username = user?.user_metadata?.username as string | undefined
    ?? user?.email?.split("@")[0]
    ?? "朋友";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMoreOpen(false);
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background-50">
      {/* 桌面端侧边栏 */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-background-200 bg-background-50 px-4 py-6 z-20">
        <div className="px-2 mb-8">
          <Logo />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-primary-100 text-primary-700"
                    : "text-foreground-600 hover:bg-background-100"
                }`
              }
            >
              <span className={`w-8 h-8 flex items-center justify-center rounded-lg ${item.accent}`}>
                <i className={`${item.icon} text-base`} />
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* 用户信息 */}
        <div className="mt-6 pt-4 border-t border-background-200">
          <div className="flex items-center gap-3 px-3 mb-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary-500 text-background-50 font-heading font-bold text-sm">
              {username.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground-900 truncate">{username}</p>
              <p className="text-xs text-foreground-500 truncate">{user?.email}</p>
            </div>
          </div>
          <Link
            to="/welcome"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap mb-1"
          >
            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-background-100 text-foreground-500">
              <i className="ri-earth-line text-base" />
            </span>
            返回官网
          </Link>
          {isAdmin && (
            <NavLink
              to="/admin"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap mb-1"
            >
              <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-background-100 text-foreground-500">
                <i className="ri-shield-keyhole-line text-base" />
              </span>
              后台管理
            </NavLink>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-background-100 text-foreground-500">
              <i className="ri-logout-box-r-line text-base" />
            </span>
            退出登录
          </button>
        </div>
      </aside>

      {/* 移动端顶部栏 */}
      <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-background-50/90 backdrop-blur border-b border-background-200">
        <Logo />
        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary-500 text-background-50 font-heading font-bold text-sm cursor-pointer">
          {username.slice(0, 1).toUpperCase()}
        </div>
      </header>

      {/* 主内容区 */}
      <main className="lg:pl-64 pb-24 lg:pb-0">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <Outlet />
        </div>
      </main>

      {/* 移动端底部导航 */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 flex items-stretch justify-around bg-background-50/95 backdrop-blur border-t border-background-200 px-2 pb-[env(safe-area-inset-bottom)]">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 flex-1 py-2 text-xs font-medium transition-colors cursor-pointer ${
                isActive ? "text-primary-600" : "text-foreground-500"
              }`
            }
          >
            <span className="w-8 h-8 flex items-center justify-center">
              <i className={`${item.icon} text-xl`} />
            </span>
            {item.label}
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center gap-1 flex-1 py-2 text-xs font-medium text-foreground-500 cursor-pointer whitespace-nowrap"
        >
          <span className="w-8 h-8 flex items-center justify-center">
            <i className="ri-menu-line text-xl" />
          </span>
          更多
        </button>
      </nav>

      {/* 更多底部弹层 */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground-950/40 lg:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-0 inset-x-0 bg-background-50 rounded-t-2xl px-4 pt-3 pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 mx-auto rounded-full bg-background-300 mb-4" />
            <div className="grid grid-cols-4 gap-2">
              {navItems.slice(4).map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-2 py-3 rounded-lg hover:bg-background-100 transition-colors cursor-pointer"
                >
                  <span className={`w-11 h-11 flex items-center justify-center rounded-xl ${item.accent}`}>
                    <i className={`${item.icon} text-xl`} />
                  </span>
                  <span className="text-xs text-foreground-700">{item.label}</span>
                </NavLink>
              ))}
            </div>
            <Link
              to="/welcome"
              onClick={() => setMoreOpen(false)}
              className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-background-200 text-sm text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-earth-line" />
              返回官网
            </Link>
            <button
              onClick={handleLogout}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-background-200 text-sm text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-logout-box-r-line" />
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}