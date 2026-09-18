import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Features from "./components/Features";
import PricingSection from "./components/PricingSection";
import SocialProof from "./components/SocialProof";

const NAV_LINKS = [
  { href: "#features", label: "功能亮点" },
  { href: "#how", label: "使用场景" },
  { href: "#pricing", label: "套餐价格" },
  { href: "#reviews", label: "用户评价" },
  { href: "#faq", label: "常见问题" },
];

function Logo({ light }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary-500 text-white">
        <i className="ri-sparkling-2-line text-lg" />
      </div>
      <span className={`font-heading font-bold text-xl ${light ? "text-white" : "text-foreground-900"}`}>
        拾光
      </span>
    </div>
  );
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${
        scrolled ? "bg-background-50/95 backdrop-blur border-b border-background-200" : "bg-transparent"
      }`}
    >
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        <Link to="/welcome" className="cursor-pointer">
          <Logo light={!scrolled} />
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                scrolled
                  ? "text-foreground-600 hover:text-foreground-900"
                  : "text-white/85 hover:text-white"
              }`}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/auth"
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              scrolled
                ? "text-foreground-700 hover:bg-background-100"
                : "text-white hover:bg-white/10"
            }`}
          >
            登录
          </Link>
          <Link
            to="/auth"
            className="px-4 py-2 rounded-md bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            免费开始
          </Link>
        </div>

        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={`md:hidden w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer ${
            scrolled ? "text-foreground-900" : "text-white"
          }`}
          aria-label="打开菜单"
        >
          <i className={`text-xl ${menuOpen ? "ri-close-line" : "ri-menu-line"}`} />
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-background-50 border-b border-background-200 px-4 pb-4 pt-2">
          <nav className="flex flex-col">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="py-3 text-sm font-medium text-foreground-700 hover:text-foreground-900 cursor-pointer whitespace-nowrap"
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/auth"
              onClick={() => setMenuOpen(false)}
              className="mt-2 flex items-center justify-center py-3 rounded-md bg-primary-500 text-white text-sm font-medium cursor-pointer whitespace-nowrap"
            >
              免费开始
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="relative min-h-[620px] md:min-h-[760px] flex items-center justify-center overflow-hidden">
      <img
        src="https://readdy.ai/api/search-image?query=Minimalist%20abstract%20background%20with%20soft%20warm%20green%20and%20amber%20gradient%2C%20gentle%20flowing%20organic%20shapes%20and%20subtle%20light%20rays%2C%20calm%20peaceful%20atmosphere%20for%20a%20personal%20growth%20productivity%20app%2C%20clean%20modern%20aesthetic%2C%20high%20detail%2C%20harmonious%20composition%2C%20no%20text&width=1600&height=900&seq=landing-hero-01&orientation=landscape"
        alt="拾光 - 个人成长管理平台"
        title="拾光 · 个人成长管理"
        className="absolute inset-0 w-full h-full object-cover object-top"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/45"></div>

      <div className="relative z-10 w-full max-w-3xl mx-auto px-4 md:px-6 text-center text-white">
        <div className="animate-fade-up inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-4 py-1.5 text-sm text-white/90">
          <i className="ri-sparkling-2-line" />
          个人成长 · 一站式自我管理
        </div>
        <h1 className="animate-fade-up font-heading font-extrabold text-4xl md:text-6xl leading-tight mt-6" style={{ animationDelay: "0.1s" }}>
          把每一天，过成
          <br />
          想要的样子
        </h1>
        <p className="animate-fade-up mt-5 text-base md:text-lg text-white/85 leading-relaxed" style={{ animationDelay: "0.2s" }}>
          拾光帮你把待办、习惯、目标、专注、笔记、复盘都装进一个地方，
          专注当下，记录成长，让每一次努力都看得见。
        </p>
        <div className="animate-fade-up mt-8 flex flex-col sm:flex-row items-center justify-center gap-3" style={{ animationDelay: "0.3s" }}>
          <Link
            to="/auth"
            className="w-full sm:w-auto px-8 py-3.5 rounded-md bg-primary-500 text-white text-base font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            免费开始使用
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto px-8 py-3.5 rounded-md bg-white/10 backdrop-blur text-white text-base font-medium hover:bg-white/20 transition-colors cursor-pointer whitespace-nowrap"
          >
            了解功能
          </a>
        </div>
        <p className="animate-fade-up mt-6 text-sm text-white/70" style={{ animationDelay: "0.4s" }}>
          无需信用卡 · 免费版即可使用全部核心功能
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-background-900 text-background-100">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <Logo light />
            <p className="mt-4 text-sm text-background-300 leading-relaxed max-w-xs">
              专注个人成长与自我管理的轻量应用，让记录、专注与复盘成为习惯，见证更好的自己。
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-background-50 mb-4">产品</h4>
            <ul className="space-y-2.5">
              <li><a href="#features" className="text-sm text-background-300 hover:text-background-50 transition-colors cursor-pointer">功能亮点</a></li>
              <li><a href="#pricing" className="text-sm text-background-300 hover:text-background-50 transition-colors cursor-pointer">套餐价格</a></li>
              <li><a href="#faq" className="text-sm text-background-300 hover:text-background-50 transition-colors cursor-pointer">常见问题</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-background-50 mb-4">开始使用</h4>
            <ul className="space-y-2.5">
              <li><Link to="/auth" className="text-sm text-background-300 hover:text-background-50 transition-colors cursor-pointer">注册账号</Link></li>
              <li><Link to="/auth" className="text-sm text-background-300 hover:text-background-50 transition-colors cursor-pointer">登录</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-background-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-background-400">© {new Date().getFullYear()} 拾光 · 让成长有迹可循</p>
          <p className="text-xs text-background-400">用心记录，温柔以待每一天</p>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  useEffect(() => {
    const base = __BASE_PATH__ === "/" ? "" : __BASE_PATH__;
    const canonical = `${window.location.origin}${base}/welcome`;

    document.querySelector('link[rel="canonical"]')?.setAttribute("href", canonical);
    document.querySelector('meta[property="og:url"]')?.setAttribute("content", canonical);
  }, []);

  return (
    <div className="min-h-screen bg-background-50">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <PricingSection />
        <SocialProof />
      </main>
      <Footer />
    </div>
  );
}