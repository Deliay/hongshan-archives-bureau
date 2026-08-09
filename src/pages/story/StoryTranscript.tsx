import { useState } from 'react'
import { useStoryScriptBundle } from '../../hooks/useData'
import { useI18n } from '../../i18n'
import { RichText } from '../../lib/richText'

export function StoryTranscript({ missionId }: { missionId: string }) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const { data, loading, error } = useStoryScriptBundle(missionId)

  const lines = data?.transcript ?? []

  if (loading) {
    return (
      <div className="border border-archive-border rounded-md p-4 bg-archive-file/40">
        <div className="h-5 w-24 bg-archive-border animate-pulse rounded" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-archive-border rounded-md p-4 bg-archive-file/40">
        <p className="text-sm text-red-400">{t('common.loadFailed')}</p>
      </div>
    )
  }

  if (lines.length === 0) {
    return (
      <div className="border border-archive-border rounded-md p-4 bg-archive-file/40">
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 text-sm text-archive-ivory hover:text-archive-gold transition-colors"
        >
          <span className="text-xs font-mono text-archive-gold uppercase">{t('story.transcript')}</span>
          <span className="text-archive-dust">(0)</span>
          <svg className={`w-3 h-3 text-archive-dust transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6,9 12,15 18,9" />
          </svg>
        </button>
        {expanded && (
          <p className="text-sm text-archive-dust italic mt-2">{t('story.noTranscript')}</p>
        )}
      </div>
    )
  }

  const groupedByScene = groupByScene(lines)

  return (
    <div className="border border-archive-border rounded-md p-4 bg-archive-file/40">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2 text-sm text-archive-ivory hover:text-archive-gold transition-colors"
      >
        <span className="text-xs font-mono text-archive-gold uppercase">{t('story.transcript')}</span>
        <span className="text-archive-dust">({lines.length})</span>
        <svg className={`w-3 h-3 text-archive-dust transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="currentColor">
          <polygon points="6,9 12,15 18,9" />
        </svg>
      </button>
      {expanded && (
        <div className="mt-3 space-y-4">
          {groupedByScene.map(([sceneKey, sceneLines]) => (
            <div key={sceneKey}>
              <div className="text-[10px] font-mono text-archive-lead/70 mb-1">{sceneKey}</div>
              <div className="space-y-2 pl-3 border-l border-archive-gold/20">
                {sceneLines.map(line => (
                  <div key={line.key} className="flex gap-3">
                    <div className="w-20 shrink-0 pt-0.5 text-right">
                      <span className="text-xs font-medium text-archive-gold">{line.actorName}</span>
                    </div>
                    <div className="min-w-0 flex-1 border-l border-archive-gold/30 pl-3">
                      <p className="text-sm text-archive-ivory leading-relaxed">
                        <RichText text={line.dialogText} />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function groupByScene(lines: { key: string; actorName: string; dialogText: string }[]): [string, typeof lines][] {
  const map = new Map<string, typeof lines>()
  for (const line of lines) {
    const parts = line.key.split('_')
    const sceneKey = parts.slice(0, -1).join('_')
    const arr = map.get(sceneKey) ?? []
    arr.push(line)
    map.set(sceneKey, arr)
  }
  return Array.from(map.entries())
}
