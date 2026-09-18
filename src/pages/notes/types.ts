export interface Note {
  id: string;
  title: string;
  content: string | null;
  mood: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}
