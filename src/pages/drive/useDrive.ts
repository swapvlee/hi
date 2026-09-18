import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import { getErrorMessage } from "@/lib/errors";
import {
  getPreviewType,
  getContentType,
  TRASH_RETENTION_DAYS,
  FREE_QUOTA,
  PRO_QUOTA,
} from "@/pages/drive/driveUtils";
import type { DriveFolder, DriveFile, ItemType, DeleteTarget, SortKey } from "@/pages/drive/types";

export function useDrive() {
  const { user } = useAuth();
  const { isPro } = usePlan();

  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [usedBytes, setUsedBytes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [dragOver, setDragOver] = useState(false);

  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const [showTrash, setShowTrash] = useState(false);
  const [trashFolders, setTrashFolders] = useState<DriveFolder[]>([]);
  const [trashFiles, setTrashFiles] = useState<DriveFile[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);

  const [dragItem, setDragItem] = useState<{ id: string; type: ItemType } | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const [stack, setStack] = useState<{ id: string; name: string }[]>([]);
  const currentFolderId = stack.length > 0 ? stack[stack.length - 1].id : null;

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<
    { type: ItemType; item: DriveFile | DriveFolder } | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  const [excludedFolders, setExcludedFolders] = useState<string[]>([]);
  const [selected, setSelected] = useState<Record<string, ItemType>>({});
  const [previewTarget, setPreviewTarget] = useState<DriveFile | null>(null);
  const [shareTarget, setShareTarget] = useState<DriveFile | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ files: DriveFile[]; folders: DriveFolder[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [folderNameMap, setFolderNameMap] = useState<Record<string, string>>({});

  const [versionTarget, setVersionTarget] = useState<
    { type: ItemType; item: DriveFile | DriveFolder } | null
  >(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const quota = isPro ? PRO_QUOTA : FREE_QUOTA;

  const selectedEntries = Object.entries(selected).map(([id, type]) => ({ id, type }));
  const selecting = selectedEntries.length > 0;
  const isSearching = !showTrash && searchQuery.trim().length > 0;

  // 搜索（跨文件夹匹配文件名）
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    if (!user) return;
    let active = true;
    setSearching(true);
    Promise.all([
      supabase.from("drive_files").select("*").is("deleted_at", null).ilike("name", `%${q}%`),
      supabase.from("drive_folders").select("*").is("deleted_at", null),
    ]).then(([fileRes, folderRes]) => {
      if (!active) return;
      if (fileRes.error || folderRes.error) {
        setError(getErrorMessage(fileRes.error ?? folderRes.error, "搜索失败，请稍后重试"));
        setSearchResults({ files: [], folders: [] });
        setFolderNameMap({});
      } else {
        const allFolders = (folderRes.data ?? []) as DriveFolder[];
        const lowerQ = q.toLowerCase();
        const matchingFolders = allFolders.filter((f) => f.name.toLowerCase().includes(lowerQ));
        setSearchResults({
          files: (fileRes.data ?? []) as DriveFile[],
          folders: matchingFolders,
        });
        setFolderNameMap(Object.fromEntries(allFolders.map((f) => [f.id, f.name])));
      }
      setSearching(false);
    });
    return () => {
      active = false;
    };
  }, [searchQuery, user]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const folderQuery = supabase
        .from("drive_folders")
        .select("*")
        .is("deleted_at", null)
        .order("name", { ascending: true });
      const fileQuery = supabase
        .from("drive_files")
        .select("*")
        .is("deleted_at", null);
      const usageQuery = supabase.from("drive_files").select("size");

      if (currentFolderId) {
        folderQuery.eq("parent_id", currentFolderId);
        fileQuery.eq("folder_id", currentFolderId);
      } else {
        folderQuery.is("parent_id", null);
        fileQuery.is("folder_id", null);
      }

      const [folderRes, fileRes, usageRes] = await Promise.all([
        folderQuery,
        fileQuery,
        usageQuery,
      ]);

      if (folderRes.error) throw folderRes.error;
      if (fileRes.error) throw fileRes.error;
      if (usageRes.error) throw usageRes.error;

      setFolders((folderRes.data ?? []) as DriveFolder[]);
      setFiles((fileRes.data ?? []) as DriveFile[]);
      const total = (usageRes.data ?? []).reduce((sum, f) => sum + (Number(f.size) || 0), 0);
      setUsedBytes(total);
    } catch (e) {
      setError(getErrorMessage(e, "加载失败，请稍后重试"));
    } finally {
      setLoading(false);
    }
  }, [user, currentFolderId]);

  useEffect(() => {
    load();
  }, [load]);

  const collectSubFolderIds = useCallback(async (folderId: string): Promise<string[]> => {
    const ids = [folderId];
    const { data: children } = await supabase
      .from("drive_folders")
      .select("id")
      .eq("parent_id", folderId);
    for (const child of children ?? []) {
      const sub = await collectSubFolderIds(child.id);
      ids.push(...sub);
    }
    return ids;
  }, []);

  // 清除回收站中已超过保留期限的项目（彻底删除）
  const purgeExpiredTrash = useCallback(async () => {
    const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 86400000).toISOString();

    const { data: trashFoldersAll } = await supabase
      .from("drive_folders")
      .select("id")
      .not("deleted_at", "is", null);
    const trashedFolderIdSet = new Set((trashFoldersAll ?? []).map((f) => f.id));

    const { data: expFolders } = await supabase
      .from("drive_folders")
      .select("id, parent_id")
      .lt("deleted_at", cutoff);
    const topExpFolders = (expFolders ?? []).filter(
      (f) => f.parent_id === null || !trashedFolderIdSet.has(f.parent_id)
    );
    for (const folder of topExpFolders) {
      const folderIds = await collectSubFolderIds(folder.id);
      const { data: innerFiles } = await supabase
        .from("drive_files")
        .select("storage_path")
        .in("folder_id", folderIds);
      const paths = (innerFiles ?? []).map((f) => f.storage_path);
      if (paths.length > 0) await supabase.storage.from("private").remove(paths);
      await supabase.from("drive_files").delete().in("folder_id", folderIds);
      await supabase.from("drive_folders").delete().in("id", folderIds);
      await supabase.from("drive_item_versions").delete().in("item_id", folderIds);
    }

    const { data: expFiles } = await supabase
      .from("drive_files")
      .select("id, storage_path, folder_id")
      .lt("deleted_at", cutoff);
    const topExpFiles = (expFiles ?? []).filter(
      (f) => f.folder_id === null || !trashedFolderIdSet.has(f.folder_id)
    );
    const filePaths = topExpFiles.map((f) => f.storage_path);
    if (filePaths.length > 0) await supabase.storage.from("private").remove(filePaths);
    const fileIds = topExpFiles.map((f) => f.id);
    if (fileIds.length > 0) {
      await supabase.from("drive_files").delete().in("id", fileIds);
      await supabase.from("drive_item_versions").delete().in("item_id", fileIds);
    }
  }, [collectSubFolderIds]);

  const loadTrash = useCallback(async () => {
    if (!user) return;
    setTrashLoading(true);
    setError("");
    try {
      try {
        await purgeExpiredTrash();
      } catch {
        // 忽略清理错误
      }
      const [folderRes, fileRes] = await Promise.all([
        supabase.from("drive_folders").select("*").not("deleted_at", "is", null),
        supabase.from("drive_files").select("*").not("deleted_at", "is", null),
      ]);
      if (folderRes.error) throw folderRes.error;
      if (fileRes.error) throw fileRes.error;
      setTrashFolders((folderRes.data ?? []) as DriveFolder[]);
      setTrashFiles((fileRes.data ?? []) as DriveFile[]);
    } catch (e) {
      setError(getErrorMessage(e, "加载回收站失败，请稍后重试"));
    } finally {
      setTrashLoading(false);
    }
  }, [user, purgeExpiredTrash]);

  // 打开回收站时加载
  useEffect(() => {
    if (showTrash) loadTrash();
  }, [showTrash, loadTrash]);

  // 切换文件夹时清空选择
  useEffect(() => {
    setSelected({});
  }, [currentFolderId]);

  const enterFolder = (folder: DriveFolder) => {
    setStack((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const goToIndex = (index: number) => {
    setStack((prev) => prev.slice(0, index + 1));
  };

  const toggleSelect = (id: string, type: ItemType) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = type;
      return next;
    });
  };

  const clearSelection = () => setSelected({});

  const handleFolderClick = (folder: DriveFolder) => {
    if (selecting) toggleSelect(folder.id, "folder");
    else enterFolder(folder);
  };

  const handleDownload = async (file: DriveFile) => {
    const { data, error: err } = await supabase.storage
      .from("private")
      .createSignedUrl(file.storage_path, 3600, { download: file.name });
    if (err || !data?.signedUrl) {
      setError(getErrorMessage(err, "获取下载链接失败，请稍后重试"));
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleFileOpen = (file: DriveFile) => {
    if (getPreviewType(file.mime_type, file.name) !== "none") {
      setPreviewTarget(file);
    } else {
      handleDownload(file);
    }
  };

  const handleFileClick = (file: DriveFile) => {
    if (selecting) toggleSelect(file.id, "file");
    else handleFileOpen(file);
  };

  const handleCreateFolder = async (name: string) => {
    if (!user) return;
    const { error: err } = await supabase.from("drive_folders").insert({
      user_id: user.id,
      name,
      parent_id: currentFolderId,
    });
    if (err) {
      setError(getErrorMessage(err, "新建文件夹失败，请稍后重试"));
      return;
    }
    setNewFolderOpen(false);
    load();
  };

  const handleRename = async (name: string) => {
    if (!renameTarget) return;
    const oldName = renameTarget.item.name;
    const locationName = stack.length > 0 ? stack[stack.length - 1].name : "全部文件";
    if (user) {
      try {
        await supabase.from("drive_item_versions").insert({
          user_id: user.id,
          item_id: renameTarget.item.id,
          item_type: renameTarget.type,
          change_type: "rename",
          name: oldName,
          parent_id: currentFolderId,
          parent_name: locationName,
        });
      } catch {
        // 版本记录失败不影响重命名
      }
    }
    const { error: err } =
      renameTarget.type === "folder"
        ? await supabase.from("drive_folders").update({ name }).eq("id", renameTarget.item.id)
        : await supabase
            .from("drive_files")
            .update({ name, updated_at: new Date().toISOString() })
            .eq("id", renameTarget.item.id);
    if (err) {
      setError(getErrorMessage(err, "重命名失败，请稍后重试"));
      return;
    }
    setRenameTarget(null);
    load();
  };

  const handleUpload = async (fileList: FileList | File[]) => {
    if (!user || fileList.length === 0) return;
    setUploading(true);
    setError("");
    const filesArr = Array.from(fileList);
    try {
      for (const file of filesArr) {
        if (usedBytes + file.size > quota) {
          throw new Error(
            isPro ? "存储空间不足，请删除部分文件后重试" : "免费版空间已满（100MB），升级会员可获得更大容量"
          );
        }
        const id = crypto.randomUUID();
        const storagePath = `${user.id}/${id}`;
        const { error: upErr } = await supabase.storage
          .from("private")
          .upload(storagePath, file, {
            cacheControl: "3600",
            contentType: getContentType(file.name, file.type),
          });
        if (upErr) throw upErr;

        const { error: dbErr } = await supabase.from("drive_files").insert({
          id,
          user_id: user.id,
          folder_id: currentFolderId,
          name: file.name,
          storage_path: storagePath,
          size: file.size,
          mime_type: file.type,
        });
        if (dbErr) throw dbErr;
      }
      load();
    } catch (e) {
      setError(getErrorMessage(e, "上传失败，请稍后重试"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 打开移动弹窗：选中要移动的项目，并计算不可作为目标的文件夹
  const openMove = async (items: { id: string; type: ItemType }[]) => {
    if (items.length === 0) return;
    setSelected(Object.fromEntries(items.map((i) => [i.id, i.type])) as Record<string, ItemType>);
    const folderIds = items.filter((i) => i.type === "folder").map((i) => i.id);
    const excluded: string[] = [];
    for (const fid of folderIds) {
      const ids = await collectSubFolderIds(fid);
      excluded.push(...ids);
    }
    setExcludedFolders(excluded);
    setMoveOpen(true);
  };

  // 核心移动逻辑（文件 + 文件夹，批量）
  const performMove = async (fileIds: string[], folderIds: string[], targetFolderId: string | null) => {
    if (fileIds.length > 0) {
      const { error: e1 } = await supabase
        .from("drive_files")
        .update({ folder_id: targetFolderId, updated_at: new Date().toISOString() })
        .in("id", fileIds);
      if (e1) throw e1;
    }
    if (folderIds.length > 0) {
      const { error: e2 } = await supabase
        .from("drive_folders")
        .update({ parent_id: targetFolderId })
        .in("id", folderIds);
      if (e2) throw e2;
    }
  };

  // 记录移动前的版本快照（旧位置 = 当前文件夹）
  const recordMoveVersions = async (items: { id: string; type: ItemType }[]) => {
    if (!user || items.length === 0) return;
    const locationName = stack.length > 0 ? stack[stack.length - 1].name : "全部文件";
    const rows = items.map(({ id, type }) => {
      const found = type === "file" ? files.find((f) => f.id === id) : folders.find((f) => f.id === id);
      return {
        user_id: user.id,
        item_id: id,
        item_type: type,
        change_type: "move",
        name: found?.name ?? "",
        parent_id: currentFolderId,
        parent_name: locationName,
      };
    });
    try {
      await supabase.from("drive_item_versions").insert(rows);
    } catch {
      // 版本记录失败不影响移动
    }
  };

  // 移动（通过弹窗）
  const handleMove = async (targetFolderId: string | null) => {
    if (selectedEntries.length === 0) return;
    setMoving(true);
    setError("");
    try {
      const fileIds = selectedEntries.filter((i) => i.type === "file").map((i) => i.id);
      const folderIds = selectedEntries.filter((i) => i.type === "folder").map((i) => i.id);
      await recordMoveVersions(selectedEntries);
      await performMove(fileIds, folderIds, targetFolderId);
      setMoveOpen(false);
      setSelected({});
      load();
    } catch (e) {
      setError(getErrorMessage(e, "移动失败，请稍后重试"));
    } finally {
      setMoving(false);
    }
  };

  // 拖拽：把单个项目直接拖到文件夹上移动
  const handleDragStart = (e: DragEvent<HTMLDivElement>, item: { id: string; type: ItemType }) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.id);
    setDragItem(item);
  };

  const handleDropOnFolder = async (folder: DriveFolder) => {
    const dragging = dragItem;
    setDragOverFolderId(null);
    setDragItem(null);
    if (!dragging) return;

    if (dragging.type === "folder" && dragging.id === folder.id) return;
    if (dragging.type === "folder") {
      const excluded = await collectSubFolderIds(dragging.id);
      if (excluded.includes(folder.id)) {
        setError("不能把文件夹移动到它自己或它的子文件夹里");
        return;
      }
    }

    setMoving(true);
    setError("");
    try {
      if (dragging.type === "file") {
        await recordMoveVersions([{ id: dragging.id, type: dragging.type }]);
        await performMove([dragging.id], [], folder.id);
      } else {
        await recordMoveVersions([{ id: dragging.id, type: dragging.type }]);
        await performMove([], [dragging.id], folder.id);
      }
      load();
    } catch (e) {
      setError(getErrorMessage(e, "移动失败，请稍后重试"));
    } finally {
      setMoving(false);
    }
  };

  const handleDragEnd = () => {
    setDragItem(null);
    setDragOverFolderId(null);
  };

  // 软删除单个项目（移入回收站）
  const softDelete = async (target: DeleteTarget) => {
    setError("");
    try {
      if (target.type === "file") {
        await supabase
          .from("drive_files")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", target.item.id);
      } else {
        const folderIds = await collectSubFolderIds(target.item.id);
        await supabase
          .from("drive_folders")
          .update({ deleted_at: new Date().toISOString() })
          .in("id", folderIds);
        await supabase
          .from("drive_files")
          .update({ deleted_at: new Date().toISOString() })
          .in("folder_id", folderIds);
      }
      setDeleteTarget(null);
      load();
    } catch (e) {
      setError(getErrorMessage(e, "删除失败，请稍后重试"));
    }
  };

  const confirmDelete = () => {
    if (deleteTarget) softDelete(deleteTarget);
  };

  // 软删除批量项目
  const confirmBatchDelete = async () => {
    if (selectedEntries.length === 0) return;
    setError("");
    try {
      const fileIds = selectedEntries.filter((i) => i.type === "file").map((i) => i.id);
      const folderIds = selectedEntries.filter((i) => i.type === "folder").map((i) => i.id);

      const allFolderIds: string[] = [];
      for (const fid of folderIds) {
        const ids = await collectSubFolderIds(fid);
        allFolderIds.push(...ids);
      }

      if (fileIds.length > 0) {
        await supabase
          .from("drive_files")
          .update({ deleted_at: new Date().toISOString() })
          .in("id", fileIds);
      }
      if (allFolderIds.length > 0) {
        await supabase
          .from("drive_folders")
          .update({ deleted_at: new Date().toISOString() })
          .in("id", allFolderIds);
        await supabase
          .from("drive_files")
          .update({ deleted_at: new Date().toISOString() })
          .in("folder_id", allFolderIds);
      }

      setBatchDeleteOpen(false);
      setSelected({});
      load();
    } catch (e) {
      setError(getErrorMessage(e, "删除失败，请稍后重试"));
    }
  };

  // 从回收站恢复
  const restoreItem = async (item: { type: ItemType; item: DriveFile | DriveFolder }) => {
    setError("");
    try {
      if (item.type === "file") {
        await supabase.from("drive_files").update({ deleted_at: null }).eq("id", item.item.id);
      } else {
        const folderIds = await collectSubFolderIds(item.item.id);
        await supabase.from("drive_folders").update({ deleted_at: null }).in("id", folderIds);
        await supabase.from("drive_files").update({ deleted_at: null }).in("folder_id", folderIds);
      }
      loadTrash();
      load();
    } catch (e) {
      setError(getErrorMessage(e, "恢复失败，请稍后重试"));
    }
  };

  // 彻底删除（不可恢复）
  const permanentDelete = async (item: { type: ItemType; item: DriveFile | DriveFolder }) => {
    setError("");
    try {
      if (item.type === "file") {
        const file = item.item as DriveFile;
        await supabase.storage.from("private").remove([file.storage_path]);
        await supabase.from("drive_files").delete().eq("id", file.id);
        await supabase.from("drive_item_versions").delete().eq("item_id", file.id);
      } else {
        const folderIds = await collectSubFolderIds(item.item.id);
        const { data: innerFiles } = await supabase
          .from("drive_files")
          .select("storage_path")
          .in("folder_id", folderIds);
        const paths = (innerFiles ?? []).map((f) => f.storage_path);
        if (paths.length > 0) await supabase.storage.from("private").remove(paths);
        await supabase.from("drive_files").delete().in("folder_id", folderIds);
        await supabase.from("drive_folders").delete().in("id", folderIds);
        await supabase.from("drive_item_versions").delete().in("item_id", folderIds);
      }
      loadTrash();
      load();
    } catch (e) {
      setError(getErrorMessage(e, "删除失败，请稍后重试"));
    }
  };

  // 清空回收站
  const emptyTrash = async () => {
    setError("");
    try {
      const { data: allFiles } = await supabase
        .from("drive_files")
        .select("id, storage_path")
        .not("deleted_at", "is", null);
      const { data: allFolders } = await supabase
        .from("drive_folders")
        .select("id")
        .not("deleted_at", "is", null);
      const paths = (allFiles ?? []).map((f) => f.storage_path);
      if (paths.length > 0) await supabase.storage.from("private").remove(paths);
      await supabase.from("drive_files").delete().not("deleted_at", "is", null);
      await supabase.from("drive_folders").delete().not("deleted_at", "is", null);
      const allItemIds = [
        ...(allFiles ?? []).map((f) => f.id),
        ...(allFolders ?? []).map((f) => f.id),
      ];
      if (allItemIds.length > 0) {
        await supabase.from("drive_item_versions").delete().in("item_id", allItemIds);
      }
      loadTrash();
      load();
    } catch (e) {
      setError(getErrorMessage(e, "清空回收站失败，请稍后重试"));
    }
  };

  const usedPercent = Math.min(100, Math.round((usedBytes / quota) * 100));
  const isEmpty = !loading && folders.length === 0 && files.length === 0;

  // 排序后的文件列表
  const sortedFiles = [...files].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortBy === "name") return a.name.localeCompare(b.name, "zh") * dir;
    if (sortBy === "size") return (a.size - b.size) * dir;
    const ta = new Date(a.updated_at ?? a.created_at).getTime();
    const tb = new Date(b.updated_at ?? b.created_at).getTime();
    return (ta - tb) * dir;
  });

  // 预览时可按顺序切换的同目录文件列表
  const previewableFiles = (() => {
    if (!previewTarget) return [];
    if (isSearching && searchResults) {
      return searchResults.files.filter(
        (f) => f.folder_id === previewTarget.folder_id && getPreviewType(f.mime_type, f.name) !== "none"
      );
    }
    return sortedFiles.filter((f) => getPreviewType(f.mime_type, f.name) !== "none");
  })();

  // 回收站：只显示「顶层」被删除项（父级未被删除的）
  const deletedFolderIds = new Set(trashFolders.map((f) => f.id));
  const topTrashFolders = trashFolders.filter(
    (f) => f.parent_id === null || !deletedFolderIds.has(f.parent_id)
  );
  const topTrashFiles = trashFiles.filter(
    (f) => f.folder_id === null || !deletedFolderIds.has(f.folder_id)
  );
  const trashCount = topTrashFolders.length + topTrashFiles.length;

  const selectionCheckboxClass = (active: boolean) =>
    `shrink-0 w-5 h-5 flex items-center justify-center rounded border transition-all cursor-pointer ${
      active
        ? "bg-primary-500 border-primary-500 text-background-50 opacity-100"
        : "bg-background-50 border-background-300 text-transparent opacity-0 group-hover:opacity-100"
    }`;

  return {
    user,
    isPro,
    quota,
    folders,
    files,
    usedBytes,
    usedPercent,
    loading,
    error,
    uploading,
    view,
    setView,
    dragOver,
    setDragOver,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    sortMenuOpen,
    setSortMenuOpen,
    showTrash,
    setShowTrash,
    trashFolders,
    trashFiles,
    trashLoading,
    dragItem,
    dragOverFolderId,
    setDragOverFolderId,
    stack,
    setStack,
    currentFolderId,
    newFolderOpen,
    setNewFolderOpen,
    renameTarget,
    setRenameTarget,
    deleteTarget,
    setDeleteTarget,
    batchDeleteOpen,
    setBatchDeleteOpen,
    moveOpen,
    setMoveOpen,
    moving,
    excludedFolders,
    selected,
    selectedEntries,
    selecting,
    previewTarget,
    setPreviewTarget,
    shareTarget,
    setShareTarget,
    searchQuery,
    setSearchQuery,
    searchResults,
    searching,
    folderNameMap,
    versionTarget,
    setVersionTarget,
    fileInputRef,
    isSearching,
    sortedFiles,
    previewableFiles,
    topTrashFolders,
    topTrashFiles,
    trashCount,
    isEmpty,
    load,
    loadTrash,
    enterFolder,
    goToIndex,
    toggleSelect,
    clearSelection,
    handleFolderClick,
    handleFileOpen,
    handleFileClick,
    handleCreateFolder,
    handleRename,
    handleUpload,
    handleDownload,
    openMove,
    handleMove,
    handleDragStart,
    handleDropOnFolder,
    handleDragEnd,
    confirmDelete,
    confirmBatchDelete,
    restoreItem,
    permanentDelete,
    emptyTrash,
    selectionCheckboxClass,
  };
}

export type DriveApi = ReturnType<typeof useDrive>;