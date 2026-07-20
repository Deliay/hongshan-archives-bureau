import { MODULE_CODES } from '../../data/archiveMeta'
import { Badge } from '../../components/ui/Badge'
import { DetailSkeleton } from '../../components/ui/DetailSkeleton'
import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useEnemies, getEnemyTypeNameMap, getEnemyAttrNameMap } from '../../hooks/useData'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll } from '../../lib/api'
import { useLocale } from '../../lib/locale'
import { ASSET_BASE, resolveI18n, adaptEnemy } from '../../lib/adapter'
import { RichText } from '../../lib/richText'
import Rarity from '../../components/Rarity'
import { useI18n } from '../../i18n'
import type { Enemy } from '../../lib/types'

const ENEMY_STARS: Record<number, number> = { 0: 1, 1: 3, 2: 6, 3: 4, 4: 5 }

function applyModifiers(value: number, attrType: number, modifiers: any[] | undefined): number {
  if (!modifiers) return value
  let mult = 1
  for (const m of modifiers) {
    if (m.attrType !== attrType) continue
    if (m.modifierType === 1 || m.modifierType === 4) {
      mult *= (1 + m.attrValue)
    }
  }
  return Math.round(value * mult)
}

export default function EnemyDetail() {
  const { id } = useParams<{ id: string }>()
  const { locale } = useLocale()
  const { t } = useI18n()
  const { data: enemies, loading } = useEnemies()

  const [typeNameMap, setTypeNameMap] = useState<Record<number, string>>({})
  const [attrNameMap, setAttrNameMap] = useState<Record<number, string>>({})
  const [distNameMap, setDistNameMap] = useState<Record<string, string>>({})
  const [abilities, setAbilities] = useState<{ name: string; description: string }[]>([])
  const [attrTemplate, setAttrTemplate] = useState<any>(null)
  const [attrLevel, setAttrLevel] = useState(1)
  const [extraLoading, setExtraLoading] = useState(true)
  const [variants, setVariants] = useState<Enemy[]>([])
  const [variantLevels, setVariantLevels] = useState<Record<string, number>>({})
  const [modifiers, setModifiers] = useState<Record<string, any[]>>({})

  const enemy = useMemo(() => enemies?.find(e => e.id === id), [enemies, id])

  useEffect(() => {
    if (!enemy) return
    const e = enemy
    let cancelled = false
    async function load() {
      const [typeNameMap, attrNameMap, distRaw, distI18n, abilityRaw, abilityI18n, attrRaw, dispRaw, dispI18n, enemyRaw] = await Promise.all([
        getEnemyTypeNameMap(locale),
        getEnemyAttrNameMap(locale),
        getCachedData<Record<string, any>>('DistributionInfoTable', () => fetchTableAll('DistributionInfoTable')).catch(() => ({})),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_DistributionInfoTable`, () => fetchTableDictAll('DistributionInfoTable', locale)).catch(() => ({}) as Record<string, string>),
        getCachedData<Record<string, any>>('EnemyAbilityDescTable', () => fetchTableAll('EnemyAbilityDescTable')),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_EnemyAbilityDescTable`, () => fetchTableDictAll('EnemyAbilityDescTable', locale)),
        getCachedData<Record<string, any>>('EnemyAttributeTemplateTable', () => fetchTableAll('EnemyAttributeTemplateTable')),
        getCachedData<Record<string, any>>('EnemyDisplayInfoTable', () => fetchTableAll('EnemyDisplayInfoTable')).catch(() => ({})),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_EnemyDisplayInfoTable`, () => fetchTableDictAll('EnemyDisplayInfoTable', locale)).catch(() => ({}) as Record<string, string>),
        getCachedData<Record<string, any>>('EnemyTable', () => fetchTableAll('EnemyTable')).catch(() => ({}) as Record<string, any>),
      ])
      if (cancelled) return

      setTypeNameMap(typeNameMap)
      setAttrNameMap(attrNameMap)

      const dMap: Record<string, string> = {}
      for (const [, v] of Object.entries<any>(distRaw)) {
        dMap[v.areaId ?? v.$key] = resolveI18n(v.areaName, distI18n) || v.areaId || v.$key || ''
      }
      setDistNameMap(dMap)

      const abilityList: { name: string; description: string }[] = []
      for (const aid of e.abilityDescIds) {
        const entry = abilityRaw[aid]
        if (entry) {
          abilityList.push({
            name: resolveI18n(entry.name, abilityI18n),
            description: resolveI18n(entry.description, abilityI18n),
          })
        }
      }
      setAbilities(abilityList)

      const attrEntry = attrRaw[e.templateId]
      if (attrEntry) {
        const len = attrEntry.levelDependentAttributes?.length ?? 1
        setAttrTemplate(attrEntry)
        setAttrLevel(Math.min(len, 90))
      }

      const variantIds = new Set<string>()
      for (const [k, v] of Object.entries<any>(enemyRaw)) {
        if (v.templateId === e.templateId && k !== e.id) {
          variantIds.add(k)
        }
      }
      const adaptedVariants: Enemy[] = []
      for (const vid of variantIds) {
        const dispEntry = Object.values(dispRaw).find((v: any) => v.enemyId === vid)
        if (dispEntry) {
          const adapted = adaptEnemy(dispEntry, dispI18n)
          if (!adapted.name || adapted.name === adapted.id) {
            adapted.name = e.name
          }
          adaptedVariants.push(adapted)
        } else {
          adaptedVariants.push({
            id: vid,
            name: e.name,
            tags: [],
            description: '',
            displayType: e.displayType,
            nickname: '',
            wikiGroup: e.wikiGroup,
            templateId: e.templateId,
            enemyId: vid,
            distributionIds: [],
            abilityDescIds: [],
            attrTemplateId: e.templateId,
            sourceTable: 'DisplayInfo',
          })
        }
      }
      setVariants(adaptedVariants)

      const modMap: Record<string, any[]> = {}
      const baseEntry = enemyRaw[e.id]
      if (baseEntry?.attrModifiers) {
        modMap[e.id] = baseEntry.attrModifiers
      }
      for (const vid of variantIds) {
        const entry = enemyRaw[vid]
        if (entry?.attrModifiers) {
          modMap[vid] = entry.attrModifiers
        }
      }
      setModifiers(modMap)

      setExtraLoading(false)
    }
    setExtraLoading(true)
    load()
    return () => { cancelled = true }
  }, [enemy, locale])

  if (loading || !enemy) {
    if (loading) return <DetailSkeleton />
    return <div className="text-archive-dust text-sm">{t('common.notFound', { name: t('enemy.title') })}</div>
  }

  const stars = ENEMY_STARS[enemy.displayType] ?? 1
  const levelAttrs = attrTemplate?.levelDependentAttributes ?? []
  const maxLevel = levelAttrs.length >= 90 ? 90 : levelAttrs.length
  const currentLevelAttrs = levelAttrs[attrLevel - 1]?.attrs ?? []
  const fixedAttrs = attrTemplate?.levelIndependentAttributes?.attrs ?? []
  const resistMap: Record<string, string> = {
    physicalDmgResistScalar: t('enemy.physical'),
    fireDmgResistScalar: t('enemy.fire'),
    crystDmgResistScalar: t('enemy.cryst'),
    pulseDmgResistScalar: t('enemy.pulse'),
    naturalDmgResistScalar: t('enemy.natural'),
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div><Link to="/archive/enemies" className="text-xs text-archive-lead hover:text-archive-gold transition-colors">&larr; {t('common.backToList', { list: t('enemy.title') })}</Link></div>

      <div className="flex items-start gap-4">
        <img src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/monstericonbig/${enemy.templateId}.png`} alt=""
          className="w-20 h-20 object-cover bg-archive-border rounded border border-archive-border"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-xl font-bold text-archive-ivory">{enemy.name}</h2>
            <Badge variant="ghost" className="font-mono">{MODULE_CODES.enemies}</Badge>
          </div>
          {enemy.nickname && <p className="text-sm text-archive-dust mt-0.5">{enemy.nickname}</p>}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-archive-lead">{typeNameMap[enemy.displayType] || `${t('common.unknown')} ${enemy.displayType}`}</span>
            <Rarity level={stars} />
            {enemy.wikiGroup && <span className="text-xs text-archive-lead">· {enemy.wikiGroup}</span>}
          </div>
          {enemy.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {enemy.tags.map((t, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-archive-border text-archive-dust">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {enemy.description && (
        <div className="p-3 rounded border border-archive-border bg-archive-file">
          <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('enemy.description')}</div>
          <div className="text-xs text-archive-ivory leading-relaxed"><RichText text={enemy.description} /></div>
        </div>
      )}

      {enemy.distributionIds.length > 0 && Object.keys(distNameMap).length > 0 && (
        <div className="p-3 rounded border border-archive-border bg-archive-file">
          <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1.5">{t('enemy.distribution')}</div>
          <div className="flex flex-wrap gap-1.5">
            {enemy.distributionIds.map(did => (
              <span key={did} className="text-[10px] px-1.5 py-0.5 rounded bg-archive-border text-archive-dust">
                {distNameMap[did] || did}
              </span>
            ))}
          </div>
        </div>
      )}

      {!extraLoading && abilities.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-archive-gold mb-2">{t('enemy.skill')}</h3>
          <div className="space-y-2">
            {abilities.map((ab, i) => (
              <div key={i} className="p-3 rounded border border-archive-border bg-archive-file">
                {ab.name && <div className="text-xs font-medium text-archive-ivory mb-1">{ab.name}</div>}
                {ab.description && <div className="text-xs text-archive-dust leading-relaxed"><RichText text={ab.description} /></div>}
              </div>
            ))}
          </div>
        </div>
      )}

          {!extraLoading && attrTemplate && levelAttrs.length > 0 && (
        <div className="p-3 rounded border border-archive-border bg-archive-file">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium text-archive-gold">{t('enemy.attrs', { level: attrLevel })}</h3>
            {modifiers[enemy.id]?.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#3A2A1A] text-archive-gold">{t('enemy.fixed')}</span>
            )}
          </div>
          <input type="range" min={1} max={maxLevel} value={attrLevel}
            onChange={(e) => setAttrLevel(Number(e.target.value))}
            className="w-full h-1 accent-archive-gold mb-3" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {currentLevelAttrs.map((attr: any) => {
              const val = applyModifiers(attr.attrValue, attr.attrType, modifiers[enemy.id])
              return (
              <div key={attr.attrType} className="flex justify-between text-xs">
                <span className="text-archive-lead">{attrNameMap[attr.attrType] || `${t('common.unknown')} ${attr.attrType}`}</span>
                <span className="text-archive-ivory font-mono">{attr.attrType >= 80 && attr.attrType <= 85 ? `${(attr.attrValue * 100).toFixed(0)}%` : val.toLocaleString()}</span>
              </div>
              )
            })}
          </div>

          {modifiers[enemy.id]?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-archive-border">
              <div className="text-[10px] text-archive-lead mb-1">{t('enemy.fixedAttrs')}</div>
              <div className="space-y-1">
                {modifiers[enemy.id].map((m: any, i: number) => {
                  const name = attrNameMap[m.attrType] || `${t('common.unknown')} ${m.attrType}`
                  const mult = (1 + m.attrValue)
                  const pct = (m.attrValue * 100).toFixed(0)
                  return (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-archive-lead">{name}</span>
                      <span className="text-archive-ivory font-mono">×{mult.toLocaleString()} <span className="text-archive-gold">(+{pct}%)</span></span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {fixedAttrs.length > 0 && (
            <>
              <div className="text-[10px] text-archive-lead mt-3 mb-1">{t('enemy.fixedAttrs')}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {fixedAttrs.map((attr: any) => (
                  <div key={attr.attrType} className="flex justify-between text-xs">
                    <span className="text-archive-lead">{attrNameMap[attr.attrType] || `${t('common.unknown')} ${attr.attrType}`}</span>
                    <span className="text-archive-ivory font-mono">{attr.attrValue}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {attrTemplate.physicalDmgResistScalar !== undefined && (
            <div className="mt-3 pt-3 border-t border-archive-border">
              <div className="text-[10px] text-archive-lead mb-1">{t('enemy.resist')}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(resistMap).map(([key, label]) => {
                  const val = attrTemplate[key]
                  if (val === undefined) return null
                  const pct = ((1 - val) * 100).toFixed(0)
                  return (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-archive-lead">{label}</span>
                      <span className="text-archive-ivory font-mono">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {attrTemplate.maxResilience !== undefined && (
            <div className="mt-3 pt-3 border-t border-archive-border">
              <div className="text-[10px] text-archive-lead mb-1">{t('enemy.resilience')}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between"><span className="text-archive-lead">{t('enemy.maxResilience')}</span><span className="text-archive-ivory font-mono">{attrTemplate.maxResilience}</span></div>
                <div className="flex justify-between"><span className="text-archive-lead">{t('enemy.resilienceDecreaseWhenHurt')}</span><span className="text-archive-ivory font-mono">{attrTemplate.resilienceDecreaseWhenHurt}</span></div>
                <div className="flex justify-between"><span className="text-archive-lead">{t('enemy.resilienceRecover')}</span><span className="text-archive-ivory font-mono">{attrTemplate.resilienceRecover}</span></div>
                <div className="flex justify-between"><span className="text-archive-lead">{t('enemy.resilienceRecoverInterval')}</span><span className="text-archive-ivory font-mono">{attrTemplate.resilienceRecoverInterval}s</span></div>
              </div>
            </div>
          )}
        </div>
      )}

      {variants.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-archive-gold mb-2">{t('enemy.variants', { count: variants.length })}</h3>
          <div className="space-y-3">
            {variants.map(v => {
              const vl = variantLevels[v.id] ?? maxLevel
              const vAttrs = levelAttrs[vl - 1]?.attrs ?? []
              return (
                <div key={v.id} className="p-3 rounded border border-archive-border bg-archive-file">
                  <div className="text-xs text-archive-ivory font-mono mb-2">{v.id}</div>
                  {v.distributionIds.length > 0 && Object.keys(distNameMap).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {v.distributionIds.map(did => (
                        <span key={did} className="text-[10px] px-1.5 py-0.5 rounded bg-archive-border text-archive-dust">
                          {distNameMap[did] || did}
                        </span>
                      ))}
                    </div>
                  )}
                  {!extraLoading && attrTemplate && levelAttrs.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-archive-lead">{t('enemy.attrs', { level: vl })}</span>
                        {modifiers[v.id]?.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#3A2A1A] text-archive-gold">{t('enemy.fixed')}</span>
                        )}
                      </div>
                      <input type="range" min={1} max={maxLevel} value={vl}
                        onChange={(e) => setVariantLevels(p => ({ ...p, [v.id]: Number(e.target.value) }))}
                        className="w-full h-1 accent-archive-gold mb-2" />
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {vAttrs.map((attr: any) => {
                          const val = applyModifiers(attr.attrValue, attr.attrType, modifiers[v.id])
                          return (
                          <div key={attr.attrType} className="flex justify-between text-xs">
                            <span className="text-archive-lead">{attrNameMap[attr.attrType] || `${t('common.unknown')} ${attr.attrType}`}</span>
                            <span className="text-archive-ivory font-mono">{attr.attrType >= 80 && attr.attrType <= 85 ? `${(attr.attrValue * 100).toFixed(0)}%` : val.toLocaleString()}</span>
                          </div>
                          )
                        })}
                      </div>
                      {modifiers[v.id]?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-archive-border">
                          <div className="text-[10px] text-archive-lead mb-1">{t('enemy.fixedAttrs')}</div>
                          <div className="space-y-1">
                            {modifiers[v.id].map((m: any, i: number) => {
                              const name = attrNameMap[m.attrType] || `${t('common.unknown')} ${m.attrType}`
                              const mult = (1 + m.attrValue)
                              const pct = (m.attrValue * 100).toFixed(0)
                              return (
                                <div key={i} className="flex justify-between text-xs">
                                  <span className="text-archive-lead">{name}</span>
                                  <span className="text-archive-ivory font-mono">×{mult.toLocaleString()} <span className="text-archive-gold">(+{pct}%)</span></span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {fixedAttrs.length > 0 && (
                        <>
                          <div className="text-[10px] text-archive-lead mt-2 mb-1">{t('enemy.fixedAttrs')}</div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {fixedAttrs.map((attr: any) => (
                              <div key={attr.attrType} className="flex justify-between text-xs">
                                <span className="text-archive-lead">{attrNameMap[attr.attrType] || `${t('common.unknown')} ${attr.attrType}`}</span>
                                <span className="text-archive-ivory font-mono">{attr.attrValue}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      {attrTemplate.physicalDmgResistScalar !== undefined && (
                        <div className="mt-2 pt-2 border-t border-archive-border">
                          <div className="text-[10px] text-archive-lead mb-1">{t('enemy.resist')}</div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {Object.entries(resistMap).map(([key, label]) => {
                              const val = attrTemplate[key]
                              if (val === undefined) return null
                              const pct = ((1 - val) * 100).toFixed(0)
                              return (
                                <div key={key} className="flex justify-between text-xs">
                                  <span className="text-archive-lead">{label}</span>
                                  <span className="text-archive-ivory font-mono">{pct}%</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      {attrTemplate.maxResilience !== undefined && (
                        <div className="mt-2 pt-2 border-t border-archive-border">
                          <div className="text-[10px] text-archive-lead mb-1">{t('enemy.resilience')}</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between"><span className="text-archive-lead">{t('enemy.maxResilience')}</span><span className="text-archive-ivory font-mono">{attrTemplate.maxResilience}</span></div>
                            <div className="flex justify-between"><span className="text-archive-lead">{t('enemy.resilienceDecreaseWhenHurt')}</span><span className="text-archive-ivory font-mono">{attrTemplate.resilienceDecreaseWhenHurt}</span></div>
                            <div className="flex justify-between"><span className="text-archive-lead">{t('enemy.resilienceRecover')}</span><span className="text-archive-ivory font-mono">{attrTemplate.resilienceRecover}</span></div>
                            <div className="flex justify-between"><span className="text-archive-lead">{t('enemy.resilienceRecoverInterval')}</span><span className="text-archive-ivory font-mono">{attrTemplate.resilienceRecoverInterval}s</span></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!extraLoading && (
        <div className="p-3 rounded border border-archive-border bg-archive-file">
          <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('enemy.basicInfo')}</div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <dt className="text-archive-lead">{t('enemy.id')}</dt>
            <dd className="text-archive-ivory font-mono">{enemy.id}</dd>
            <dt className="text-archive-lead">{t('enemy.templateId')}</dt>
            <dd className="text-archive-ivory font-mono text-[10px]">{enemy.templateId}</dd>
            {enemy.enemyId && <><dt className="text-archive-lead">{t('enemy.enemyId')}</dt><dd className="text-archive-ivory font-mono text-[10px]">{enemy.enemyId}</dd></>}
            {attrTemplate && <><dt className="text-archive-lead">{t('enemy.maxLevel')}</dt><dd className="text-archive-ivory">{maxLevel}</dd></>}
          </dl>
        </div>
      )}
    </div>
  )
}
