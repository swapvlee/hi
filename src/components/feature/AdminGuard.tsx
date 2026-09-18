import type { ReactNode } from "react";
import { useAdmin } from "@/hooks/useAdmin";

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAdmin();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-accent-100 text-accent-600 mb-4">
          <i className="ri-shield-keyhole-line text-2xl" />
        </div>
        <h2 className="font-heading font-bold text-lg text-foreground-900">无访问权限</h2>
        <p className="mt-2 text-sm text-foreground-500 max-w-sm leading-relaxed">
          当前账号不是管理员。如需访问后台，请在 Backend 数据库中将你的 profiles 记录的 is_admin 字段设为 true。
        </p>
      </div>
    );
  }

  return <>{children}</>;
}