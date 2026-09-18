import { useDrive } from "@/pages/drive/useDrive";
import { formatSize } from "@/pages/drive/driveUtils";
import type { DriveFile } from "@/pages/drive/types";
import NameModal from "@/pages/drive/components/NameModal";
import MoveModal from "@/pages/drive/components/MoveModal";
import PreviewModal from "@/pages/drive/components/PreviewModal";
import ShareModal from "@/pages/drive/components/ShareModal";
import VersionModal from "@/pages/drive/components/VersionModal";
import ConfirmDialog from "@/pages/drive/components/ConfirmDialog";
import { Toolbar, TrashToolbar, SearchToolbar } from "@/pages/drive/components/Toolbar";
import { FolderCard, FileCard } from "@/pages/drive/components/FileCards";
import { FolderRow, FileRow } from "@/pages/drive/components/FileRows";
import { TrashList } from "@/pages/drive/components/TrashList";
import { SearchResults } from "@/pages/drive/components/SearchResults";
import EmptyState from "@/components/base/EmptyState";

export default function Drive() {
  const drive = useDrive();

  return (
    <div className="space-y-5">
      {/* 标题与容量 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground-900">
            {drive.showTrash ? "回收站" : "网盘"}
          </h1>
          <p className="mt-1 text-sm text-foreground-500">
            {drive.showTrash ? "删除的文件会先放到这里，可随时恢复" : "安全存储你的文件，随时下载查看"}
          </p>
        </div>
        <div className="w-40 shrink-0">
          <div className="flex items-center justify-between text-xs text-foreground-500 mb-1.5">
            <span>已用 {formatSize(drive.usedBytes)}</span>
            <span>{drive.isPro ? "会员" : "免费"}</span>
          </div>
          <div className="h-2 rounded-full bg-background-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-500 transition-all"
              style={{ width: `${drive.usedPercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-foreground-400 text-right">
            {formatSize(drive.quota)} 总量
          </p>
        </div>
      </div>

      {/* 错误提示 */}
      {drive.error && (
        <div className="flex items-center justify-between rounded-lg bg-accent-100/70 text-accent-800 px-4 py-3 text-sm">
          <span className="break-all">{drive.error}</span>
          <button
            onClick={() => (drive.showTrash ? drive.loadTrash() : drive.load())}
            className="font-medium underline cursor-pointer whitespace-nowrap ml-3"
          >
            重试
          </button>
        </div>
      )}

      {/* 搜索栏 */}
      {!drive.showTrash && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm" />
            <input
              type="text"
              value={drive.searchQuery}
              onChange={(e) => drive.setSearchQuery(e.target.value)}
              placeholder="搜索文件名，快速定位…"
              className="w-full pl-9 pr-9 py-2.5 rounded-md border border-background-200 bg-background-50 text-sm text-foreground-900 outline-none focus:border-primary-400 transition-colors"
            />
            {drive.searchQuery && (
              <button
                onClick={() => drive.setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-foreground-400 hover:bg-background-100 cursor-pointer"
                aria-label="清除搜索"
              >
                <i className="ri-close-line" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 工具栏 */}
      {drive.showTrash ? (
        <TrashToolbar drive={drive} />
      ) : drive.isSearching ? (
        <SearchToolbar drive={drive} />
      ) : (
        <Toolbar drive={drive} />
      )}

      {/* 多选操作栏 */}
      {drive.selecting && !drive.showTrash && (
        <div className="flex items-center justify-between rounded-lg bg-secondary-100/80 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-medium text-secondary-900">
            <i className="ri-checkbox-multiple-line text-lg" />
            已选 {drive.selectedEntries.length} 项
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => drive.openMove(drive.selectedEntries)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary-500 text-background-50 text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-folder-transfer-line" />
              批量移动
            </button>
            <button
              onClick={() => drive.setBatchDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-accent-300 text-accent-700 text-sm font-medium hover:bg-accent-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-delete-bin-line" />
              删除
            </button>
            <button
              onClick={drive.clearSelection}
              className="px-3 py-2 rounded-md text-sm text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 内容区 */}
      {drive.showTrash ? (
        <TrashList drive={drive} />
      ) : drive.isSearching ? (
        <SearchResults drive={drive} />
      ) : (
        <div
          className={`rounded-lg border-2 border-dashed transition-colors ${
            drive.dragOver ? "border-primary-400 bg-primary-50/50" : "border-background-200"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            drive.setDragOver(true);
          }}
          onDragLeave={() => drive.setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            drive.setDragOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              drive.handleUpload(e.dataTransfer.files);
            }
          }}
        >
          {drive.loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : drive.isEmpty ? (
            <div className="py-6">
              <EmptyState
                icon="ri-hard-drive-2-line"
                accent="bg-secondary-100 text-secondary-700"
                title="这里还空空的"
                description="上传文件或新建文件夹，开始整理你的网盘"
                actionLabel="上传文件"
                onAction={() => drive.fileInputRef.current?.click()}
              />
            </div>
          ) : drive.view === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-3">
              {drive.folders.map((folder) => (
                <FolderCard key={folder.id} drive={drive} folder={folder} />
              ))}
              {drive.sortedFiles.map((file) => (
                <FileCard key={file.id} drive={drive} file={file} />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-background-200">
              {drive.folders.map((folder) => (
                <FolderRow key={folder.id} drive={drive} folder={folder} />
              ))}
              {drive.sortedFiles.map((file) => (
                <FileRow key={file.id} drive={drive} file={file} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 新建文件夹弹窗 */}
      {drive.newFolderOpen && (
        <NameModal
          title="新建文件夹"
          placeholder="请输入文件夹名称"
          submitLabel="创建"
          onSubmit={drive.handleCreateFolder}
          onClose={() => drive.setNewFolderOpen(false)}
        />
      )}

      {/* 重命名弹窗 */}
      {drive.renameTarget && (
        <NameModal
          title={drive.renameTarget.type === "folder" ? "重命名文件夹" : "重命名文件"}
          placeholder="请输入新名称"
          initialValue={drive.renameTarget.item.name}
          submitLabel="保存"
          onSubmit={drive.handleRename}
          onClose={() => drive.setRenameTarget(null)}
        />
      )}

      {/* 删除确认弹窗（移入回收站） */}
      {drive.deleteTarget && (
        <ConfirmDialog
          title="移入回收站"
          confirmLabel="移入回收站"
          message={
            drive.deleteTarget.type === "folder" ? (
              <>
                确定把文件夹「{drive.deleteTarget.item.name}」移到回收站吗？
                文件夹内的所有内容会一并移入，可随时在回收站恢复。
              </>
            ) : (
              <>确定把文件「{drive.deleteTarget.item.name}」移到回收站吗？可随时在回收站恢复。</>
            )
          }
          onCancel={() => drive.setDeleteTarget(null)}
          onConfirm={drive.confirmDelete}
        />
      )}

      {/* 批量删除确认弹窗 */}
      {drive.batchDeleteOpen && (
        <ConfirmDialog
          title="移入回收站"
          confirmLabel="移入回收站"
          message={
            <>
              确定把已选中的 {drive.selectedEntries.length} 个项目移到回收站吗？可随时恢复。
            </>
          }
          onCancel={() => drive.setBatchDeleteOpen(false)}
          onConfirm={drive.confirmBatchDelete}
        />
      )}

      {/* 移动弹窗 */}
      {drive.moveOpen && (
        <MoveModal
          count={drive.selectedEntries.length}
          currentFolderId={drive.currentFolderId}
          excludedFolderIds={drive.excludedFolders}
          busy={drive.moving}
          onMove={drive.handleMove}
          onClose={() => drive.setMoveOpen(false)}
        />
      )}

      {/* 文件预览 */}
      {drive.previewTarget && (
        <PreviewModal
          file={drive.previewTarget}
          files={drive.previewableFiles}
          onNavigate={(f) => drive.setPreviewTarget(f as DriveFile)}
          onClose={() => drive.setPreviewTarget(null)}
        />
      )}

      {/* 分享弹窗 */}
      {drive.shareTarget && (
        <ShareModal file={drive.shareTarget} onClose={() => drive.setShareTarget(null)} />
      )}

      {/* 版本历史弹窗 */}
      {drive.versionTarget && (
        <VersionModal
          itemId={drive.versionTarget.item.id}
          itemType={drive.versionTarget.type}
          itemName={drive.versionTarget.item.name}
          onRestored={() => {
            drive.setVersionTarget(null);
            drive.load();
          }}
          onClose={() => drive.setVersionTarget(null)}
        />
      )}
    </div>
  );
}