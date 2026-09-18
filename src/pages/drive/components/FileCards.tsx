import { getFileTypeInfo, formatSize, formatDate } from "@/pages/drive/driveUtils";
import ItemMoreMenu from "@/pages/drive/components/ItemMoreMenu";
import type { DriveApi } from "@/pages/drive/useDrive";
import type { DriveFolder, DriveFile } from "@/pages/drive/types";

export function FolderCard({ drive, folder }: { drive: DriveApi; folder: DriveFolder }) {
  const isSel = !!drive.selected[folder.id];
  const isDragTarget = drive.dragOverFolderId === folder.id;
  return (
    <div
      draggable
      onDragStart={(e) => drive.handleDragStart(e, { id: folder.id, type: "folder" })}
      onDragEnd={drive.handleDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        drive.setDragOverFolderId(folder.id);
      }}
      onDragLeave={() => drive.setDragOverFolderId((v) => (v === folder.id ? null : v))}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        drive.handleDropOnFolder(folder);
      }}
      onDoubleClick={() => {
        if (!drive.selecting) drive.enterFolder(folder);
      }}
      className={`group relative rounded-lg bg-background-50 border p-4 transition-colors ${
        isDragTarget
          ? "border-primary-400 ring-2 ring-primary-200"
          : isSel
          ? "border-primary-400"
          : "border-background-200 hover:border-background-300"
      }`}
    >
      <button
        type="button"
        onClick={() => drive.toggleSelect(folder.id, "folder")}
        className={`absolute top-2 left-2 z-10 ${drive.selectionCheckboxClass(isSel)}`}
        aria-label={isSel ? "取消选择" : "选择"}
      >
        <i className="ri-check-line text-xs" />
      </button>
      <div className="flex items-center justify-between">
        <span
          onClick={() => drive.handleFolderClick(folder)}
          className="w-12 h-12 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600 cursor-pointer"
        >
          <i className="ri-folder-3-line text-2xl" />
        </span>
        <div
          className={`flex items-center gap-1 transition-opacity ${
            drive.selecting ? "hidden" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <ItemMoreMenu
            onMove={() => drive.openMove([{ id: folder.id, type: "folder" }])}
            onVersion={() => drive.setVersionTarget({ type: "folder", item: folder })}
            onDelete={() => drive.setDeleteTarget({ type: "folder", item: folder })}
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <p
          onClick={() => drive.handleFolderClick(folder)}
          className="flex-1 min-w-0 text-sm font-medium text-foreground-900 truncate cursor-pointer"
          title={folder.name}
        >
          {folder.name}
        </p>
        <button
          type="button"
          onClick={() => drive.setRenameTarget({ type: "folder", item: folder })}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 hover:text-foreground-700 cursor-pointer transition-opacity opacity-0 group-hover:opacity-100"
          aria-label="重命名"
        >
          <i className="ri-edit-line text-sm" />
        </button>
      </div>
      <p className="mt-0.5 text-xs text-foreground-400">{formatDate(folder.created_at)}</p>
    </div>
  );
}

export function FileCard({ drive, file }: { drive: DriveApi; file: DriveFile }) {
  const info = getFileTypeInfo(file.mime_type, file.name);
  const isSel = !!drive.selected[file.id];
  return (
    <div
      draggable
      onDragStart={(e) => drive.handleDragStart(e, { id: file.id, type: "file" })}
      onDragEnd={drive.handleDragEnd}
      onDoubleClick={() => {
        if (!drive.selecting) drive.handleFileOpen(file);
      }}
      className={`group relative rounded-lg bg-background-50 border p-4 transition-colors ${
        isSel ? "border-primary-400" : "border-background-200 hover:border-background-300"
      }`}
    >
      <button
        type="button"
        onClick={() => drive.toggleSelect(file.id, "file")}
        className={`absolute top-2 left-2 z-10 ${drive.selectionCheckboxClass(isSel)}`}
        aria-label={isSel ? "取消选择" : "选择"}
      >
        <i className="ri-check-line text-xs" />
      </button>
      <div className="flex items-center justify-between">
        <span
          onClick={() => drive.handleFileClick(file)}
          className={`w-12 h-12 flex items-center justify-center rounded-lg ${info.color} cursor-pointer`}
        >
          <i className={`${info.icon} text-2xl`} />
        </span>
        <div
          className={`flex items-center gap-1 transition-opacity ${
            drive.selecting ? "hidden" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <button
            type="button"
            onClick={() => drive.handleDownload(file)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 cursor-pointer"
            aria-label="下载"
          >
            <i className="ri-download-2-line" />
          </button>
          <button
            type="button"
            onClick={() => drive.setShareTarget(file)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 cursor-pointer"
            aria-label="分享"
          >
            <i className="ri-share-forward-line" />
          </button>
          <ItemMoreMenu
            onMove={() => drive.openMove([{ id: file.id, type: "file" }])}
            onVersion={() => drive.setVersionTarget({ type: "file", item: file })}
            onDelete={() => drive.setDeleteTarget({ type: "file", item: file })}
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <p
          onClick={() => drive.handleFileClick(file)}
          className="flex-1 min-w-0 text-sm font-medium text-foreground-900 truncate cursor-pointer"
          title={file.name}
        >
          {file.name}
        </p>
        <button
          type="button"
          onClick={() => drive.setRenameTarget({ type: "file", item: file })}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 hover:text-foreground-700 cursor-pointer transition-opacity opacity-0 group-hover:opacity-100"
          aria-label="重命名"
        >
          <i className="ri-edit-line text-sm" />
        </button>
      </div>
      <p className="mt-0.5 text-xs text-foreground-400">{formatSize(file.size)}</p>
    </div>
  );
}