import { useMemo, useState } from 'react'
import { useStoryScriptBundle } from '../../hooks/useData'
import { useI18n } from '../../i18n'
import { useLocale } from '../../lib/locale'
import { RichText } from '../../lib/richText'
import { useDialogAudio, type DialogAudioTrack } from '../../lib/dialogAudio'
import type { DialogLine } from '../../lib/types'
import { LinePlayButton, useAudioAvailability } from './LinePlayButton'

export function StoryTranscript({ missionId }: { missionId: string }) {
  const { t } = useI18n()
  const { locale } = useLocale()
  const [expanded, setExpanded] = useState(false)
  const { data, loading, error } = useStoryScriptBundle(missionId)

  const lines = data?.transcript ?? []
  const voIds = useMemo(
    () => lines.filter(l => l.audioOverride).map(l => l.audioOverride),
    [lines],
  )
  const available = useAudioAvailability(voIds, locale)

  const tracks = useMemo(
    () => lines
      .filter(l => l.audioOverride && available[l.audioOverride])
      .map(l => ({
        lineKey: l.key,
        voId: l.audioOverride!,
        locale,
        actorName: l.actorName,
        dialogText: l.dialogText,
      }) as DialogAudioTrack),
    [lines, available, locale],
  )

  const { tracks: globalTracks, currentIndex } = useDialogAudio()
  const currentVoId = globalTracks[currentIndex]?.voId
  const currentLineKey = currentVoId ? lines.find(l => l.audioOverride === currentVoId)?.key : undefined

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
                  <div
                    key={line.key}
                    data-active={currentLineKey === line.key}
                    className={currentLineKey === line.key ? 'flex gap-3 rounded bg-archive-gold/10 px-1.5 py-1 -mx-1.5' : 'flex gap-3'}
                  >
                    <div className="w-20 shrink-0 pt-0.5 text-right">
                      <span className="text-xs font-medium text-archive-gold">{line.actorName}</span>
                    </div>
                    <div className="min-w-0 flex-1 border-l border-archive-gold/30 pl-3">
                      <div className="flex items-center gap-1.5">
                        {line.audioOverride && available[line.audioOverride] && (
                          <LinePlayButton lineKey={line.key} voId={line.audioOverride} tracks={tracks} />
                        )}
                        <span className="font-mono text-[10px] text-archive-lead/70">{line.key}</span>
                      </div>
                      <p className="text-sm text-archive-ivory leading-relaxed mt-0.5">
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

function groupByScene(lines: DialogLine[]): [string, typeof lines][] {
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
