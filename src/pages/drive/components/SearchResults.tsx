import EmptyState from "@/components/base/EmptyState";
import { getFileTypeInfo, formatSize } from "@/pages/drive/driveUtils";
import type { DriveApi } from "@/pages/drive/useDrive";

export function SearchResults({ drive }: { drive: DriveApi }) {
  return (
    <div className="rounded-lg border border-background-200">
      {drive.searching ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : (drive.searchResults?.folders.length ?? 0) === 0 && (drive.searchResults?.files.length ?? 0) === 0 ? (
        <div className="py-6">
          <EmptyState
            icon="ri-search-line"
            accent="bg-secondary-100 text-secondary-700"
            title="没有找到相关文件"
            description="换个关键词试试，或检查文件名拼写"
          />
        </div>
      ) : (
        <div className="divide-y divide-background-200">
          {drive.searchResults?.folders.map((folder) => (
            <div
              key={folder.id}
              onClick={() => {
                drive.setSearchQuery("");
                drive.setStack([{ id: folder.id, name: folder.name }]);
              }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-background-100 transition-colors cursor-pointer"
            >
              <span className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600 shrink-0">
                <i className="ri-folder-3-line text-xl" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground-900 truncate">{folder.name}</p>
                <p className="text-xs text-foreground-400 mt-0.5">文件夹</p>
              </div>
              <i className="ri-arrow-right-s-line text-foreground-300" />
            </div>
          ))}
          {drive.searchResults?.files.map((file) => {
            const info = getFileTypeInfo(file.mime_type, file.name);
            const loc = file.folder_id ? drive.folderNameMap[file.folder_id] ?? "未知文件夹" : "全部文件";
            return (
              <div
                key={file.id}
                onClick={() => drive.handleFileOpen(file)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-background-100 transition-colors cursor-pointer"
              >
                <span className={`w-10 h-10 flex items-center justify-center rounded-lg ${info.color} shrink-0`}>
                  <i className={`${info.icon} text-xl`} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground-900 truncate">{file.name}</p>
                  <p className="text-xs text-foreground-400 mt-0.5">{formatSize(file.size)} · {loc}</p>
                </div>
                <i className="ri-arrow-right-s-line text-foreground-300" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}