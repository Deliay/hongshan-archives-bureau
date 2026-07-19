import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useFolderManifest } from '../../hooks/useUpdateDiff'
import OperatorChangePanel from '../../components/DiffViewer/OperatorChangePanel'
import WeaponChangePanel from '../../components/DiffViewer/WeaponChangePanel'
import EnemyChangePanel from '../../components/DiffViewer/EnemyChangePanel'
import ItemChangePanel from '../../components/DiffViewer/ItemChangePanel'
import { useI18n } from '../../i18n'

function sumTableStats(
  fn: (s: { added: number; removed: number; changed: number }) => number,
  obj: Record<string, { added: number; removed: number; changed: number }>,
): number {
  let total = 0
  for (const v of Object.values(obj)) total += fn(v)
  return total
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-4 rounded border border-archive-border bg-archive-file text-center">
      <div className="text-2xl font-bold" style={{ color }}>{value.toLocaleString()}</div>
      <div className="text-xs text-archive-dust mt-1">{label}</div>
    </div>
  )
}

function DiffBadge({ label, count, color }: { label: string; count: number; color: string }) {
  if (count === 0) return <span className="w-16 text-right text-xs text-archive-lead">—</span>
  return <span className="text-xs font-mono" style={{ color }}>{label}{count}</span>
}

export default function UpdateSummary() {
  const { versionName } = useParams<{ versionName: string }>()
  const { t } = useI18n()
  const folder = useFolderManifest(versionName ?? '')
  const [maxTables, setMaxTables] = useState(50)

  if (!versionName) return <div className="text-red-400 text-sm">{t('common.missingParam')}</div>

  if (!folder) {
    return (
      <div>
        <p className="text-archive-dust text-sm mb-4">{t('update.loadingVersion')}</p>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="h-10 rounded border border-archive-border bg-archive-file animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return <SummaryContent folder={folder} versionName={versionName} maxTables={maxTables} setMaxTables={setMaxTables} />
}

function SummaryContent({
  folder,
  versionName,
  maxTables,
  setMaxTables,
}: {
  folder: NonNullable<ReturnType<typeof useFolderManifest>>
  versionName: string
  maxTables: number
  setMaxTables: (n: number) => void
}) {
  const tableStats = folder.tableStats
  const totalAdded = tableStats ? sumTableStats(v => v.added, tableStats) : 0
  const totalRemoved = tableStats ? sumTableStats(v => v.removed, tableStats) : 0
  const totalChanged = tableStats ? sumTableStats(v => v.changed, tableStats) : 0

  const PINNED_TABLES = [
    'CharacterTable',
    'CharGrowthTable',
    'SkillPatchTable',
    'SpaceshipSkillTable',
    'SpaceshipCharSkillTable',
    'PotentialTalentEffectTable',
    'WeaponBasicTable',
    'ItemTable',
    'EnemyTemplateDisplayInfoTable',
    'EnemyTable',
    'EnemyAttributeTemplateTable',
    'ItemTable',
    'UsableItemChestTable',
  ]

  const tables = useMemo(() => {
    const entries = Object.entries(tableStats ?? {}).filter(
      ([, s]) => s.added + s.removed + s.changed > 0,
    )
    const pinned: typeof entries = []
    const rest: typeof entries = []
    const pinnedSet = new Set(PINNED_TABLES.map(n => `${n}.json`))
    for (const entry of entries) {
      if (pinnedSet.has(entry[0])) pinned.push(entry)
      else rest.push(entry)
    }
    pinned.sort((a, b) => PINNED_TABLES.indexOf(a[0].replace('.json', '')) - PINNED_TABLES.indexOf(b[0].replace('.json', '')))
    rest.sort((a, b) => (b[1].added + b[1].removed + b[1].changed) - (a[1].added + a[1].removed + a[1].changed))
    return [...rest, ...pinned].slice(0, maxTables)
  }, [tableStats, maxTables])

  const { t } = useI18n()

  return (
    <div>
      <div className="mb-6">
        <Link to="/archive/updates" className="text-sm text-archive-dust hover:text-archive-gold transition-colors">
          ← {t('update.backToList')}
        </Link>
        <h2 className="text-xl font-bold text-archive-ivory mt-2 mb-1 font-mono break-all">
          {versionName.replace(/__/g, '  →  ')}
        </h2>
        {folder.description && (
          <p className="text-sm text-archive-lead">{folder.description}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label={t('update.added')} value={totalAdded} color="#26bbfd" />
        <StatCard label={t('update.removed')} value={totalRemoved} color="#ef4444" />
        <StatCard label={t('update.changed')} value={totalChanged} color="#ffbb03" />
      </div>

      <OperatorChangePanel versionName={versionName} />

      <WeaponChangePanel versionName={versionName} />

      <EnemyChangePanel versionName={versionName} />

      <ItemChangePanel versionName={versionName} />

      <h3 className="text-sm font-medium text-archive-ivory mb-3">
        {t('update.tableList', { count: tables.length })}
      </h3>
      <div className="space-y-1">
        {tables.map(([file, stats]) => (
          <Link
            key={file}
            to={`/archive/updates/${versionName}/${encodeURIComponent(file)}`}
            className="flex items-center gap-3 px-3 py-2 rounded border border-archive-border bg-archive-file
                       hover:border-archive-gold/40 transition-all duration-200 group"
          >
            <span className="flex-1 text-sm text-archive-ivory group-hover:text-archive-gold transition-colors font-mono truncate">
              {file.replace('.json', '')}
            </span>
            <DiffBadge label="+" count={stats.added} color="#26bbfd" />
            <DiffBadge label="-" count={stats.removed} color="#ef4444" />
            <DiffBadge label="~" count={stats.changed} color="#ffbb03" />
          </Link>
        ))}
      </div>
      {tables.length > maxTables && (
        <button
          type="button"
          onClick={() => setMaxTables(Infinity)}
          className="mt-3 text-sm text-archive-gold hover:text-[#d4b87a] transition-colors"
        >
          {t('update.showAll', { count: tables.length })}
        </button>
      )}
    </div>
  )
}
