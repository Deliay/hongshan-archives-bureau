import { Link } from 'react-router-dom'
import { useManifest } from '../../hooks/useUpdateDiff'

export default function UpdateHome() {
  const { data: manifest, loading, error } = useManifest()

  if (loading) return <div className="text-archive-dust text-sm">加载中…</div>
  if (error) return <div className="text-red-400 text-sm">加载失败：{error}</div>
  if (!manifest || manifest.folders.length === 0) return <div className="text-archive-dust text-sm">暂无更新记录</div>

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-archive-ivory mb-4">更新日志</h2>
      <p className="text-sm text-archive-dust mb-6">
        共 {manifest.folders.length} 个版本对 · 最后一次生成 {manifest.generatedAt}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {manifest.folders.toReversed().map((folder) => (
          <Link
            key={folder.name}
            to={`/archive/updates/${folder.name}`}
            className="block p-4 rounded border border-archive-border bg-archive-file
                       hover:border-archive-gold/40 transition-all duration-200 group"
          >
            <h3 className="text-sm font-medium text-archive-ivory group-hover:text-archive-gold transition-colors">
              生成于 {manifest.generatedAt}
            </h3>
            <p className="text-xs text-archive-lead mt-1 font-mono">
              {folder.name.replace(/__/g, '  →  ')}
            </p>
            {folder.description && (
              <p className="text-xs text-archive-dust mt-1">{folder.description}</p>
            )}
            <p className="text-xs text-archive-lead mt-2">
              {folder.fileCount} 个表有变更
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
