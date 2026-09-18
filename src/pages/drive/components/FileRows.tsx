import { getFileTypeInfo, formatSize, formatDate } from "@/pages/drive/driveUtils";
import ItemMoreMenu from "@/pages/drive/components/ItemMoreMenu";
import type { DriveApi } from "@/pages/drive/useDrive";
import type { DriveFolder, DriveFile } from "@/pages/drive/types";

export function FolderRow({ drive, folder }: { drive: DriveApi; folder: DriveFolder }) {
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
      className={`group flex items-center gap-3 px-4 py-3 hover:bg-background-100 transition-colors cursor-pointer ${
        isDragTarget ? "bg-primary-50" : isSel ? "bg-primary-50" : ""
      }`}
      onClick={() => drive.handleFolderClick(folder)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          drive.toggleSelect(folder.id, "folder");
        }}
        className={drive.selectionCheckboxClass(isSel)}
        aria-label={isSel ? "取消选择" : "选择"}
      >
        <i className="ri-check-line text-xs" />
      </button>
      <span className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600 shrink-0">
        <i className="ri-folder-3-line text-xl" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-foreground-900 truncate">{folder.name}</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              drive.setRenameTarget({ type: "folder", item: folder });
            }}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-200 hover:text-foreground-700 cursor-pointer transition-opacity opacity-0 group-hover:opacity-100"
            aria-label="重命名"
          >
            <i className="ri-edit-line text-sm" />
          </button>
        </div>
        <p className="text-xs text-foreground-400 mt-0.5">{formatDate(folder.created_at)}</p>
      </div>
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
  );
}

export function FileRow({ drive, file }: { drive: DriveApi; file: DriveFile }) {
  const info = getFileTypeInfo(file.mime_type, file.name);
  const isSel = !!drive.selected[file.id];
  return (
    <div
      draggable
      onDragStart={(e) => drive.handleDragStart(e, { id: file.id, type: "file" })}
      onDragEnd={drive.handleDragEnd}
      className={`group flex items-center gap-3 px-4 py-3 hover:bg-background-100 transition-colors cursor-pointer ${
        isSel ? "bg-primary-50" : ""
      }`}
      onClick={() => drive.handleFileClick(file)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          drive.toggleSelect(file.id, "file");
        }}
        className={drive.selectionCheckboxClass(isSel)}
        aria-label={isSel ? "取消选择" : "选择"}
      >
        <i className="ri-check-line text-xs" />
      </button>
      <span className={`w-10 h-10 flex items-center justify-center rounded-lg ${info.color} shrink-0`}>
        <i className={`${info.icon} text-xl`} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-foreground-900 truncate">{file.name}</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              drive.setRenameTarget({ type: "file", item: file });
            }}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-200 hover:text-foreground-700 cursor-pointer transition-opacity opacity-0 group-hover:opacity-100"
            aria-label="重命名"
          >
            <i className="ri-edit-line text-sm" />
          </button>
        </div>
        <p className="text-xs text-foreground-400 mt-0.5">
          {formatSize(file.size)} · {formatDate(file.updated_at ?? file.created_at)}
        </p>
      </div>
      <div
        className={`flex items-center gap-1 transition-opacity ${
          drive.selecting ? "hidden" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            drive.handleDownload(file);
          }}
          className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-200 cursor-pointer"
          aria-label="下载"
        >
          <i className="ri-download-2-line" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            drive.setShareTarget(file);
          }}
          className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-200 cursor-pointer"
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
  );
}