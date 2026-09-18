const FEATURES = [
  { icon: "ri-checkbox-circle-line", color: "bg-primary-100 text-primary-600", title: "待办清单", desc: "管理每日任务，优先级与截止日期一目了然，告别遗漏。" },
  { icon: "ri-repeat-line", color: "bg-accent-100 text-accent-600", title: "习惯打卡", desc: "记录每日习惯，用连续打卡培养自律，坚持看得见。" },
  { icon: "ri-flag-line", color: "bg-primary-100 text-primary-600", title: "目标管理", desc: "长期目标拆分里程碑，进度实时追踪，方向不再模糊。" },
  { icon: "ri-timer-line", color: "bg-accent-100 text-accent-600", title: "专注计时", desc: "番茄钟沉浸式计时，远离分心，高效进入心流状态。" },
  { icon: "ri-sticky-note-line", color: "bg-secondary-100 text-secondary-700", title: "日记笔记", desc: "富文本记录点滴，沉淀思考与灵感，留住每个瞬间。" },
  { icon: "ri-calendar-line", color: "bg-primary-100 text-primary-600", title: "日程日历", desc: "日 / 周视图安排日程，重要事项不再遗漏，从容应对。" },
  { icon: "ri-history-line", color: "bg-accent-100 text-accent-600", title: "复盘回顾", desc: "每日 / 每周复盘，回望走过的路，看见自己的成长轨迹。" },
  { icon: "ri-apps-2-line", color: "bg-secondary-100 text-secondary-700", title: "自定义应用", desc: "灵活扩展专属模块，打造只属于你的私人工作台。" },
];

const STEPS = [
  { num: "01", icon: "ri-edit-line", title: "记录", desc: "把任务、习惯、目标一一记下来，让想法落地。" },
  { num: "02", icon: "ri-focus-3-line", title: "专注", desc: "用番茄钟沉浸式投入，把时间用在刀刃上。" },
  { num: "03", icon: "ri-refresh-line", title: "复盘", desc: "每日回顾、每周总结，持续迭代，越来越好。" },
];

const STATS = [
  { value: "8+", label: "核心功能模块" },
  { value: "3 步", label: "轻松上手" },
  { value: "0 门槛", label: "免费开始" },
  { value: "100%", label: "数据可导出" },
];

export default function Features() {
  return (
    <>
      {/* 功能亮点 */}
      <section id="features" className="py-16 md:py-24 bg-background-50">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600">
              <i className="ri-apps-line" />
              功能亮点
            </span>
            <h2 className="mt-3 font-heading font-bold text-3xl md:text-4xl text-foreground-950">
              一个平台，装下你的全部成长
            </h2>
            <p className="mt-3 text-base text-foreground-500 leading-relaxed">
              从记录到专注再到复盘，拾光把自我管理的每个环节都做得简单而贴心。
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-lg bg-background-100/70 border border-background-200 p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-background-50"
              >
                <span className={`w-11 h-11 flex items-center justify-center rounded-lg ${f.color}`}>
                  <i className={`${f.icon} text-xl`} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground-900">{f.title}</h3>
                <p className="mt-1.5 text-sm text-foreground-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 数据带 */}
      <section className="bg-background-100 border-y border-background-200">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-heading font-bold text-3xl md:text-4xl text-accent-600">{s.value}</p>
                <p className="mt-1 text-sm text-foreground-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 使用场景 */}
      <section id="how" className="py-16 md:py-24 bg-background-50">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600">
              <i className="ri-compass-3-line" />
              使用场景
            </span>
            <h2 className="mt-3 font-heading font-bold text-3xl md:text-4xl text-foreground-950">
              三步，开启你的成长循环
            </h2>
            <p className="mt-3 text-base text-foreground-500 leading-relaxed">
              无需复杂配置，注册后即可开始记录，让成长成为一种日常习惯。
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((s) => (
              <div key={s.num} className="rounded-lg bg-background-100/70 border border-background-200 p-6">
                <div className="flex items-center justify-between">
                  <span className="w-12 h-12 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                    <i className={`${s.icon} text-2xl`} />
                  </span>
                  <span className="font-heading font-bold text-3xl text-background-300">{s.num}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground-900">{s.title}</h3>
                <p className="mt-2 text-sm text-foreground-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}