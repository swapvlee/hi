import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/feature/AppShell";
import { lazy } from "react";

const Landing = lazy(() => import("@/pages/landing/page"));

export default function HomeGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-50">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return <AppShell />;
}