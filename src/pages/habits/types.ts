export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequency: string;
  target_days: number;
  reminder_time: string | null;
  archived: boolean;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  log_date: string;
}
