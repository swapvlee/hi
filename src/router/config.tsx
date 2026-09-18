import type { RouteObject } from "react-router-dom";
import { lazy } from "react";
import HomeGate from "@/components/feature/HomeGate";
import AdminGuard from "@/components/feature/AdminGuard";

const NotFound = lazy(() => import("@/pages/NotFound"));
const Auth = lazy(() => import("@/pages/auth/page"));
const Dashboard = lazy(() => import("@/pages/dashboard/page"));
const Todos = lazy(() => import("@/pages/todos/page"));
const Habits = lazy(() => import("@/pages/habits/page"));
const Goals = lazy(() => import("@/pages/goals/page"));
const Focus = lazy(() => import("@/pages/focus/page"));
const Notes = lazy(() => import("@/pages/notes/page"));
const Calendar = lazy(() => import("@/pages/calendar/page"));
const Review = lazy(() => import("@/pages/review/page"));
const Drive = lazy(() => import("@/pages/drive/page"));
const Apps = lazy(() => import("@/pages/apps/page"));
const ModuleDetail = lazy(() => import("@/pages/apps/components/ModuleDetail"));
const Pricing = lazy(() => import("@/pages/pricing/page"));
const Marketing = lazy(() => import("@/pages/marketing/page"));
const Settings = lazy(() => import("@/pages/settings/page"));
const Admin = lazy(() => import("@/pages/admin/page"));
const Landing = lazy(() => import("@/pages/landing/page"));
const Share = lazy(() => import("@/pages/share/page"));

const routes: RouteObject[] = [
  {
    path: "/welcome",
    element: <Landing />,
  },
  {
    path: "/auth",
    element: <Auth />,
  },
  {
    path: "/share/:token",
    element: <Share />,
  },
  {
    path: "/",
    element: <HomeGate />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "todos", element: <Todos /> },
      { path: "habits", element: <Habits /> },
      { path: "goals", element: <Goals /> },
      { path: "focus", element: <Focus /> },
      { path: "notes", element: <Notes /> },
      { path: "calendar", element: <Calendar /> },
      { path: "review", element: <Review /> },
      { path: "drive", element: <Drive /> },
      { path: "apps", element: <Apps /> },
      { path: "apps/:id", element: <ModuleDetail /> },
      { path: "pricing", element: <Pricing /> },
      { path: "marketing", element: <Marketing /> },
      { path: "settings", element: <Settings /> },
      { path: "admin", element: <AdminGuard><Admin /></AdminGuard> },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;