import { Link } from 'react-router-dom'
import { useManifest } from '../../hooks/useUpdateDiff'

export default function UpdateHome() {
  const { data: manifest, loading, error } = useManifest()

  if (loading) return <div className="text-[#8B8982] text-sm">加载中…</div>
  if (error) return <div className="text-red-400 text-sm">加载失败：{error}</div>
  if (!manifest || manifest.folders.length === 0) return <div className="text-[#8B8982] text-sm">暂无更新记录</div>

  return (
    <div>
      <h2 className="text-xl font-bold text-[#E8E6E3] mb-4">更新日志</h2>
      <p className="text-sm text-[#8B8982] mb-6">
        共 {manifest.folders.length} 个版本对 · 最后一次生成 {manifest.generatedAt}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {manifest.folders.toReversed().map((folder) => (
          <Link
            key={folder.name}
            to={`/archive/updates/${folder.name}`}
            className="block p-4 rounded border border-[#2A2A32] bg-[#1A1B23]
                       hover:border-[#C9A96E]/40 transition-all duration-200 group"
          >
            <h3 className="text-sm font-medium text-[#E8E6E3] group-hover:text-[#C9A96E] transition-colors font-mono">
              {folder.name.replace(/__/g, '  →  ')}
            </h3>
            {folder.description && (
              <p className="text-xs text-[#5A5A62] mt-1">{folder.description}</p>
            )}
            <p className="text-xs text-[#8B8982] mt-2">
              {folder.fileCount} 个表有变更
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
