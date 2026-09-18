import { useState } from "react";
import Dashboard from "@/pages/admin/components/Dashboard";
import Users from "@/pages/admin/components/Users";
import Orders from "@/pages/admin/components/Orders";
import Plans from "@/pages/admin/components/Plans";
import Coupons from "@/pages/admin/components/Coupons";

type Tab = "dashboard" | "users" | "orders" | "plans" | "coupons";

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: "dashboard", label: "数据看板", icon: "ri-dashboard-line" },
  { key: "users", label: "用户管理", icon: "ri-user-line" },
  { key: "orders", label: "订单管理", icon: "ri-receipt-line" },
  { key: "plans", label: "套餐配置", icon: "ri-price-tag-3-line" },
  { key: "coupons", label: "优惠码", icon: "ri-coupon-3-line" },
];

export default function Admin() {
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground-900">平台后台</h1>
        <p className="mt-1 text-sm text-foreground-500">运营数据、用户与订阅管理</p>
      </div>

      <div className="flex flex-wrap gap-1 p-1 rounded-full bg-background-100 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              tab === t.key
                ? "bg-background-50 text-foreground-900"
                : "text-foreground-500 hover:text-foreground-700"
            }`}
          >
            <i className={t.icon} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <Dashboard />}
      {tab === "users" && <Users />}
      {tab === "orders" && <Orders />}
      {tab === "plans" && <Plans />}
      {tab === "coupons" && <Coupons />}
    </div>
  );
}