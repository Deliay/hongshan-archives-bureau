import { useDocuments } from '../../hooks/useData'

export default function StoryOverview() {
  const { data: docs, loading, error } = useDocuments()
  if (loading) return <div className="text-archive-dust text-sm">加载中…</div>
  if (error) return <div className="text-red-400 text-sm">加载失败：{error}</div>
  if (!docs || docs.length === 0) return <div className="text-archive-dust text-sm">暂无记录</div>

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-archive-ivory mb-4">剧情记录</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {docs.map((doc) => (
          <div key={doc.id} className="p-3 rounded border border-archive-border bg-archive-file">
            <p className="text-sm text-archive-ivory">{doc.title || doc.id}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
