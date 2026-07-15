import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTableDiff } from '../../hooks/useUpdateDiff'
import { getTableDiffComponent } from '../../components/DiffViewer/registry'

export default function UpdateTableDiff() {
  const { versionName, tableFile } = useParams<{ versionName: string; tableFile: string }>()
  const decodedFile = tableFile ? decodeURIComponent(tableFile) : ''
  const { data: diff, loading, error } = useTableDiff(versionName ?? '', decodedFile)

  const tableName = decodedFile.replace('.json', '')
  const DiffComponent = useMemo(() => getTableDiffComponent(tableName), [tableName])

  if (!versionName || !tableFile) {
    return <div className="text-red-400 text-sm">缺少参数</div>
  }

  if (loading) return <div className="text-[#8B8982] text-sm">加载中…</div>
  if (error) return <div className="text-red-400 text-sm">加载失败：{error}</div>
  if (!diff) return <div className="text-[#8B8982] text-sm">暂无数据</div>

  return (
    <div>
      <div className="mb-6">
        <Link
          to={`/archive/updates/${versionName}`}
          className="text-sm text-[#8B8982] hover:text-[#C9A96E] transition-colors"
        >
          ← 返回版本概要
        </Link>
        <h2 className="text-xl font-bold text-[#E8E6E3] mt-2 mb-1 font-mono break-all">
          {tableName}
        </h2>
        <p className="text-sm text-[#5A5A62]">
          版本：{diff.versionOld} → {diff.versionNew}
        </p>
      </div>

      <DiffComponent diff={diff} />
    </div>
  )
}
