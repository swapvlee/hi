import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { CustomModule } from "@/pages/apps/appsUtils";

interface FieldReminder {
  fieldId: string;
  fieldLabel: string;
  moduleName: string;
  moduleId: string;
  reminderTime: string;
  repeatType: "none" | "daily" | "weekly" | "monthly";
  repeatDays?: number[];
}

export function useFieldReminders(modules: CustomModule[], enabled: boolean = true) {
  const { user } = useAuth();
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !user || modules.length === 0) return;

    const extractReminders = (): FieldReminder[] => {
      const reminders: FieldReminder[] = [];
      const now = new Date();
      const currentDay = now.getDay();

      for (const mod of modules) {
        for (const field of mod.fields) {
          if (!field.reminder_time) continue;
          if (field.repeat_type === "none" || !field.repeat_type) continue;

          if (field.repeat_type === "weekly" && field.repeat_days) {
            if (!field.repeat_days.includes(currentDay)) continue;
          }

          reminders.push({
            fieldId: field.id,
            fieldLabel: field.label,
            moduleName: mod.name,
            moduleId: mod.id,
            reminderTime: field.reminder_time,
            repeatType: field.repeat_type,
            repeatDays: field.repeat_days,
          });
        }
      }
      return reminders;
    };

    const checkAndNotify = () => {
      const reminders = extractReminders();
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      for (const reminder of reminders) {
        if (reminder.reminderTime !== currentTime) continue;

        const notificationKey = `${reminder.moduleId}-${reminder.fieldId}-${now.toDateString()}`;
        if (notifiedRef.current.has(notificationKey)) continue;

        if (Notification.permission === "granted") {
          new Notification("提醒：该记录了", {
            body: `「${reminder.moduleName}」的${reminder.fieldLabel}提醒您记录啦`,
            icon: "/favicon.ico",
          });
          notifiedRef.current.add(notificationKey);
        }
      }
    };

    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    const interval = setInterval(checkAndNotify, 60000);
    checkAndNotify();

    return () => clearInterval(interval);
  }, [modules, enabled, user]);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  
  const permission = await Notification.requestPermission();
  return permission === "granted";
}