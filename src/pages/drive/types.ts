export interface DriveFolder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface DriveFile {
  id: string;
  name: string;
  folder_id: string | null;
  storage_path: string;
  size: number;
  mime_type: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

export type ItemType = "file" | "folder";
export type DeleteTarget = { type: "file"; item: DriveFile } | { type: "folder"; item: DriveFolder };
export type SortKey = "name" | "size" | "time";

export const sortOptions: { key: SortKey; label: string }[] = [
  { key: "name", label: "名称" },
  { key: "size", label: "大小" },
  { key: "time", label: "修改时间" },
];