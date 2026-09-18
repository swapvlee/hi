import { Link } from "react-router-dom";

interface ComingSoonProps {
  name: string;
  icon: string;
}

export default function ComingSoon({ name, icon }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-primary-100 text-primary-600 mb-4">
        <i className={`${icon} text-3xl`} />
      </div>
      <h1 className="font-heading font-bold text-xl text-foreground-900">{name}</h1>
      <p className="mt-2 text-sm text-foreground-500">这个功能正在开发中，很快就能用上啦</p>
      <Link
        to="/"
        className="mt-6 px-5 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
      >
        返回首页
      </Link>
    </div>
  );
}