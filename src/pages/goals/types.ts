export interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: string;
  start_date: string | null;
  target_date: string | null;
  status: string;
  progress: number;
  color: string;
}

export interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  completed: boolean;
  sort_order: number;
}
