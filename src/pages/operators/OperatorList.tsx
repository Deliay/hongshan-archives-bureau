import { MODULE_CODES } from '../../data/archiveMeta'
import { Badge } from '../../components/ui/Badge'
import { ListSkeleton } from '../../components/ui/ListSkeleton'
import { useState, useMemo } from 'react'
import { useOperators } from '../../hooks/useData'
import OperatorPortraitCard from '../../components/Operators/OperatorPortraitCard'
import { useI18n } from '../../i18n'

type SortKey = 'profession' | 'rarity' | 'element' | 'race' | 'faction'
type GroupKey = '' | 'element' | 'profession' | 'rarity' | 'race' | 'faction' | 'mainAttr'

export default function OperatorList() {
  const { t } = useI18n()
  const { data: operators, loading, error } = useOperators()

  const [filterElement, setFilterElement] = useState('')
  const [filterProfession, setFilterProfession] = useState('')
  const [filterRarity, setFilterRarity] = useState<number | ''>('')
  const [filterTag, setFilterTag] = useState('')
  const [filterRace, setFilterRace] = useState('')
  const [filterFaction, setFilterFaction] = useState('')
  const [filterMainAttr, setFilterMainAttr] = useState('')
  const [filterSubAttr, setFilterSubAttr] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('rarity')
  const [sortDesc, setSortDesc] = useState(true)
  const [groupKey, setGroupKey] = useState<GroupKey>('')

  const elementOptions = useMemo(() => {
    if (!operators) return []
    return [...new Set(operators.map((o) => o.element).filter(Boolean))].sort()
  }, [operators])

  const professionOptions = useMemo(() => {
    if (!operators) return []
    return [...new Set(operators.map((o) => o.profession).filter(Boolean))].sort()
  }, [operators])

  const tagOptions = useMemo(() => {
    if (!operators) return []
    const tags = new Set<string>()
    operators.forEach((o) => o.tags.forEach((t) => tags.add(t)))
    return [...tags].sort()
  }, [operators])

  const raceOptions = useMemo(() => {
    if (!operators) return []
    return [...new Set(operators.map((o) => o.race).filter(Boolean))].sort()
  }, [operators])

  const factionOptions = useMemo(() => {
    if (!operators) return []
    return [...new Set(operators.map((o) => o.faction).filter(Boolean))].sort()
  }, [operators])

  const attrOptions = useMemo(() => {
    if (!operators) return []
    const seen = new Set<number>()
    const result: { id: number; name: string; icon: string }[] = []
    operators.forEach((o) => {
      ;[o.mainAttr, o.subAttr].forEach((a) => {
        if (a.id && !seen.has(a.id)) {
          seen.add(a.id)
          result.push(a)
        }
      })
    })
    return result.sort((a, b) => a.id - b.id)
  }, [operators])

  const visible = useMemo(() => {
    if (!operators) return []
    let list = [...operators]

    if (filterElement) list = list.filter((o) => o.element === filterElement)
    if (filterProfession) list = list.filter((o) => o.profession === filterProfession)
    if (filterRarity !== '') list = list.filter((o) => o.rarity === filterRarity)
    if (filterTag) list = list.filter((o) => o.tags.includes(filterTag))
    if (filterRace) list = list.filter((o) => o.race === filterRace)
    if (filterFaction) list = list.filter((o) => o.faction === filterFaction)
    if (filterMainAttr) list = list.filter((o) => o.mainAttr.name === filterMainAttr)
    if (filterSubAttr) list = list.filter((o) => o.subAttr.name === filterSubAttr)

    const dir = sortDesc ? -1 : 1
    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'profession') cmp = a.profession.localeCompare(b.profession)
      else if (sortKey === 'rarity') cmp = a.rarity - b.rarity
      else if (sortKey === 'element') cmp = a.element.localeCompare(b.element)
      else if (sortKey === 'race') cmp = a.race.localeCompare(b.race)
      else if (sortKey === 'faction') cmp = a.faction.localeCompare(b.faction)
      return cmp * dir
    })

    return list
  }, [operators, filterElement, filterProfession, filterRarity, filterTag, filterRace, filterFaction, filterMainAttr, filterSubAttr, sortKey, sortDesc])

  const grouped = useMemo(() => {
    if (!groupKey || !visible.length) return null
    const groups: Record<string, typeof visible> = {}
    for (const op of visible) {
      const k = groupKey === 'mainAttr' ? op.mainAttr.name
              : groupKey === 'rarity' ? String(op.rarity)
              : String((op as any)[groupKey] ?? t('common.unknown'))
      if (!groups[k]) groups[k] = []
      groups[k].push(op)
    }
    return Object.entries(groups).sort(([a], [b]) => {
      if (groupKey === 'rarity') return Number(b) - Number(a)
      return a.localeCompare(b)
    })
  }, [visible, groupKey])

  if (loading) return <ListSkeleton filters={8} cards={8} />
  if (error) return <div className="text-red-400 text-sm">{t('common.loadFailed')}：{error}</div>
  if (!operators || operators.length === 0) return <div className="text-archive-dust text-sm">{t('common.empty')}</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-display text-xl font-bold text-archive-ivory">{t('operator.title')}</h2>
        <Badge variant="ghost" className="font-mono">{MODULE_CODES.operators}</Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
        <select value={filterElement} onChange={(e) => setFilterElement(e.target.value)}
          className="bg-archive-file border border-archive-border rounded px-2 py-1.5 text-archive-ivory outline-none focus:border-archive-gold/40">
          <option value="">{t('operator.allElements')}</option>
          {elementOptions.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>

        <select value={filterProfession} onChange={(e) => setFilterProfession(e.target.value)}
          className="bg-archive-file border border-archive-border rounded px-2 py-1.5 text-archive-ivory outline-none focus:border-archive-gold/40">
          <option value="">{t('operator.allProfessions')}</option>
          {professionOptions.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>

        <select value={filterRarity} onChange={(e) => setFilterRarity(e.target.value ? Number(e.target.value) : '')}
          className="bg-archive-file border border-archive-border rounded px-2 py-1.5 text-archive-ivory outline-none focus:border-archive-gold/40">
          <option value="">{t('operator.allRarities')}</option>
          {[0, 1, 2, 3, 4, 5, 6].map((v) => <option key={v} value={v}>{t('operator.rarityLevel', { level: v })}</option>)}
        </select>

        <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}
          className="bg-archive-file border border-archive-border rounded px-2 py-1.5 text-archive-ivory outline-none focus:border-archive-gold/40">
          <option value="">{t('operator.allTags')}</option>
          {tagOptions.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>

        <select value={filterRace} onChange={(e) => setFilterRace(e.target.value)}
          className="bg-archive-file border border-archive-border rounded px-2 py-1.5 text-archive-ivory outline-none focus:border-archive-gold/40">
          <option value="">{t('operator.allRaces')}</option>
          {raceOptions.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>

        <select value={filterFaction} onChange={(e) => setFilterFaction(e.target.value)}
          className="bg-archive-file border border-archive-border rounded px-2 py-1.5 text-archive-ivory outline-none focus:border-archive-gold/40">
          <option value="">{t('operator.allFactions')}</option>
          {factionOptions.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>

        <select value={filterMainAttr} onChange={(e) => setFilterMainAttr(e.target.value)}
          className="bg-archive-file border border-archive-border rounded px-2 py-1.5 text-archive-ivory outline-none focus:border-archive-gold/40">
          <option value="">{t('operator.allMainAttrs')}</option>
          {attrOptions.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
        </select>

        <select value={filterSubAttr} onChange={(e) => setFilterSubAttr(e.target.value)}
          className="bg-archive-file border border-archive-border rounded px-2 py-1.5 text-archive-ivory outline-none focus:border-archive-gold/40">
          <option value="">{t('operator.allSubAttrs')}</option>
          {attrOptions.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
        </select>

        <span className="text-archive-lead">|</span>

        {/* Sort */}
        <span className="text-archive-dust">{t('common.sort')}：</span>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="bg-archive-file border border-archive-border rounded px-2 py-1.5 text-archive-ivory outline-none focus:border-archive-gold/40">
          <option value="profession">{t('operator.sortByProfession')}</option>
          <option value="rarity">{t('operator.sortByRarity')}</option>
          <option value="element">{t('operator.sortByElement')}</option>
          <option value="race">{t('operator.sortByRace')}</option>
          <option value="faction">{t('operator.sortByFaction')}</option>
        </select>

        <button onClick={() => setSortDesc((d) => !d)}
          className="px-2 py-1.5 rounded border border-archive-border bg-archive-file text-archive-ivory hover:border-archive-gold/40 transition-colors">
          {sortDesc ? t('common.desc') : t('common.asc')}
        </button>

        <span className="text-archive-lead">|</span>

        {/* Group */}
        <span className="text-archive-dust">{t('common.group')}：</span>
        <select value={groupKey} onChange={(e) => setGroupKey(e.target.value as GroupKey)}
          className="bg-archive-file border border-archive-border rounded px-2 py-1.5 text-archive-ivory outline-none focus:border-archive-gold/40">
          <option value="">{t('common.noGroup')}</option>
          <option value="element">{t('operator.groupByElement')}</option>
          <option value="profession">{t('operator.groupByProfession')}</option>
          <option value="rarity">{t('operator.groupByRarity')}</option>
          <option value="race">{t('operator.groupByRace')}</option>
          <option value="faction">{t('operator.groupByFaction')}</option>
          <option value="mainAttr">{t('operator.groupByMainAttr')}</option>
        </select>
      </div>

      {grouped ? (
        <div className="flex flex-col gap-6">
          {grouped.map(([groupLabel, ops]) => (
            <div key={groupLabel}>
              <h3 className="text-sm font-medium text-archive-ivory mb-2">{groupLabel} · {ops.length}</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {ops.map((op) => (
                  <OperatorPortraitCard
                    key={op.id}
                    id={op.id}
                    name={op.name}
                    portrait={op.portrait}
                    rarity={op.rarity}
                    professionIcon={op.professionIcon}
                    elementIcon={op.elementIcon}
                    elementColor={op.elementColor}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {visible.map((op) => (
            <OperatorPortraitCard
              key={op.id}
              id={op.id}
              name={op.name}
              portrait={op.portrait}
              rarity={op.rarity}
              professionIcon={op.professionIcon}
              elementIcon={op.elementIcon}
              elementColor={op.elementColor}
            />
          ))}
        </div>
      )}
    </div>
  )
}
