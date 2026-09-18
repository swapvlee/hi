import { Link } from "react-router-dom";

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  accent?: string;
  actionLabel?: string;
  actionIcon?: string;
  onAction?: () => void;
  to?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  accent = "bg-primary-100 text-primary-600",
  actionLabel,
  actionIcon = "ri-add-line",
  onAction,
  to,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center rounded-lg border border-dashed border-background-300 px-6">
      <div className={`w-14 h-14 flex items-center justify-center rounded-2xl mb-3 ${accent}`}>
        <i className={`${icon} text-2xl`} />
      </div>
      <p className="text-sm font-medium text-foreground-700">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-foreground-500 max-w-xs leading-relaxed">{description}</p>
      )}
      {actionLabel &&
        (to ? (
          <Link
            to={to}
            className="mt-5 flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className={actionIcon} />
            {actionLabel}
          </Link>
        ) : (
          <button
            onClick={onAction}
            className="mt-5 flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className={actionIcon} />
            {actionLabel}
          </button>
        ))}
    </div>
  );
}