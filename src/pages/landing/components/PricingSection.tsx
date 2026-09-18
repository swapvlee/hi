import { Link } from "react-router-dom";

const PLANS = [
  {
    name: "免费版",
    desc: "开启个人成长之旅，核心功能全免费",
    price: "0",
    interval: "永久",
    popular: false,
    cta: "免费开始",
    features: ["待办 · 习惯 · 目标 · 专注", "笔记 · 日程 · 复盘", "自定义应用模块", "数据导出备份"],
  },
  {
    name: "会员版",
    desc: "解锁更强大的成长工具与体验",
    price: "15",
    interval: "/月",
    popular: true,
    cta: "立即开通",
    features: ["免费版全部功能", "无限自定义模块", "高级数据统计", "优先体验新功能", "专属客服支持"],
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="py-16 md:py-24 bg-background-100">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600">
            <i className="ri-vip-crown-line" />
            套餐价格
          </span>
          <h2 className="mt-3 font-heading font-bold text-3xl md:text-4xl text-foreground-950">
            简单透明的定价
          </h2>
          <p className="mt-3 text-base text-foreground-500 leading-relaxed">
            免费版即可满足日常需求，需要更多功能时再随时升级。
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-lg border p-7 flex flex-col ${
                p.popular
                  ? "border-primary-300 bg-primary-50/40"
                  : "border-background-200 bg-background-50"
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent-500 text-white text-xs font-medium whitespace-nowrap">
                  最受欢迎
                </span>
              )}
              <h3 className="font-heading font-bold text-xl text-foreground-900">{p.name}</h3>
              <p className="mt-1 text-sm text-foreground-500">{p.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-heading font-bold text-4xl text-foreground-950">
                  <span className="text-2xl align-top">¥</span>
                  {p.price}
                </span>
                <span className="text-sm text-foreground-500">{p.interval}</span>
              </div>
              <ul className="mt-6 space-y-3 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground-600">
                    <i className="ri-check-line text-primary-500 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className={`mt-7 w-full py-3 rounded-md text-sm font-semibold text-center transition-colors cursor-pointer whitespace-nowrap ${
                  p.popular
                    ? "bg-primary-500 text-white hover:bg-primary-600"
                    : "bg-background-100 text-foreground-700 hover:bg-background-200"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}