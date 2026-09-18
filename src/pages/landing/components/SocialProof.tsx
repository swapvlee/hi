import { useState } from "react";
import { Link } from "react-router-dom";

const TESTIMONIALS = [
  {
    quote: "用拾光三个月，终于把拖延症治好了，每天看着习惯打卡的连续记录，特别有成就感。",
    name: "林小满",
    role: "产品设计师",
    color: "bg-primary-100 text-primary-600",
  },
  {
    quote: "目标拆分加每周复盘这套组合拳太实用了，年初定的目标第一次真的在稳步推进。",
    name: "陈默",
    role: "自由职业者",
    color: "bg-accent-100 text-accent-600",
  },
  {
    quote: "最喜欢自定义模块，我把阅读书单、健身计划都做成自己的应用，一个平台全搞定。",
    name: "阿哲",
    role: "创业者",
    color: "bg-secondary-100 text-secondary-700",
  },
];

const FAQS = [
  {
    q: "拾光免费吗？",
    a: "完全免费版即可使用待办、习惯、目标、专注、笔记、日程、复盘等全部核心功能。会员版额外提供无限自定义模块、高级数据统计等增值能力，按需升级即可。",
  },
  {
    q: "我的数据安全吗？",
    a: "所有数据都存储在你的专属账号下，只有你自己能看到。你随时可以在「设置」中一键导出全部个人数据作为本地备份，数据始终归你所有。",
  },
  {
    q: "支持哪些设备？",
    a: "拾光是网页应用，手机、平板、电脑都能直接使用，数据实时同步，随时随地记录与复盘。",
  },
  {
    q: "如何邀请好友一起使用？",
    a: "注册登录后进入「推广中心」，即可获取你的专属邀请码和邀请链接，分享给好友即可建立邀请关系，还能获得返利奖励。",
  },
];

function Testimonials() {
  return (
    <section id="reviews" className="py-16 md:py-24 bg-background-50">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600">
            <i className="ri-heart-line" />
            用户评价
          </span>
          <h2 className="mt-3 font-heading font-bold text-3xl md:text-4xl text-foreground-950">
            他们，都在拾光里慢慢变好
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="rounded-lg bg-background-100/70 border border-background-200 p-6 flex flex-col">
              <div className="flex gap-0.5 text-accent-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <i key={i} className="ri-star-fill text-sm" />
                ))}
              </div>
              <blockquote className="mt-4 text-sm text-foreground-700 leading-relaxed flex-1">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span className={`w-10 h-10 flex items-center justify-center rounded-full ${t.color} font-heading font-bold text-sm`}>
                  {t.name.slice(0, 1)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground-900">{t.name}</p>
                  <p className="text-xs text-foreground-500">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-16 md:py-24 bg-background-100">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600">
            <i className="ri-question-line" />
            常见问题
          </span>
          <h2 className="mt-3 font-heading font-bold text-3xl md:text-4xl text-foreground-950">
            你可能想了解
          </h2>
        </div>

        <div className="mt-10 space-y-3">
          {FAQS.map((f, i) => (
            <div key={f.q} className="rounded-lg bg-background-50 border border-background-200 overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer"
              >
                <span className="text-sm font-semibold text-foreground-900">{f.q}</span>
                <span className="w-6 h-6 flex items-center justify-center text-foreground-400 shrink-0">
                  <i className={`text-lg transition-transform ${open === i ? "ri-subtract-line rotate-180" : "ri-add-line"}`} />
                </span>
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-sm text-foreground-600 leading-relaxed">{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-primary-600 to-accent-600">
      <div className="max-w-3xl mx-auto px-4 md:px-6 text-center text-white">
        <h2 className="font-heading font-bold text-3xl md:text-4xl leading-tight">
          现在就开始，把每一天过成想要的样子
        </h2>
        <p className="mt-4 text-base text-white/85 leading-relaxed">
          注册免费账号，三分钟上手，让记录与复盘成为你的成长加速器。
        </p>
        <Link
          to="/auth"
          className="mt-8 inline-flex items-center gap-2 px-8 py-3.5 rounded-md bg-white text-primary-700 text-base font-semibold hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
        >
          免费开始使用
          <i className="ri-arrow-right-line" />
        </Link>
      </div>
    </section>
  );
}

export default function SocialProof() {
  return (
    <>
      <Testimonials />
      <Faq />
      <Cta />
    </>
  );
}