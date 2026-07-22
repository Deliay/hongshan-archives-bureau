import { MODULE_CODES } from '../../data/archiveMeta'
import { Badge } from '../../components/ui/Badge'
import { DetailSkeleton } from '../../components/ui/DetailSkeleton'
import { useParams, Link } from 'react-router-dom'
import { useEquipDetail } from '../../hooks/useData'
import { getItemIconUrl } from '../../lib/icons'
import { formatAttributeShow } from '../../lib/formatText'
import { getAttributeShowMap, resolveAttrShow } from '../../lib/attributeShow'
import type { AttrShowMapEntry } from '../../lib/attributeShow'
import { rarityColor } from '../../data/constants'
import { useLocale } from '../../lib/locale'
import { RichText } from '../../lib/richText'
import SkillReferenceCard from '../../components/skills/SkillReferenceCard'
import RecipePanel from '../../components/Craft/RecipePanel'
import EquipCard from '../../components/Equipment/EquipCard'
import { EQUIPMENT_PART_KEYS } from '../../components/Equipment/PartBadge'
import RarityStars from '../../components/RarityStars'
import ItemTile from '../../components/Items/ItemTile'
import SuitLogo from '../../components/Equipment/SuitLogo'
import { useI18n } from '../../i18n'
import { useState, useEffect } from 'react'
import type { EquipAttr, EnhanceMaterialGroup } from '../../lib/types'

function useAttrMap(locale: string) {
  const [map, setMap] = useState<Record<string, AttrShowMapEntry>>({})
  useEffect(() => {
    let cancelled = false
    getAttributeShowMap(locale).then(m => {
      if (!cancelled) setMap(m)
    })
    return () => { cancelled = true }
  }, [locale])
  return map
}

function AttrRow({ attr, attrMap, t }: { attr: EquipAttr; attrMap: Record<string, AttrShowMapEntry>; t: (key: string, vars?: Record<string, string | number>) => string }) {
  const info = resolveAttrShow(attrMap, attr, t('common.unknownAttr'))
  const formattedValue = formatAttributeShow({ valueFormat: info.valueFormat, showPercent: info.showPercent }, attr.value)
  const formattedEnhanced = attr.enhancedValues.map(v => formatAttributeShow({ valueFormat: info.valueFormat, showPercent: info.showPercent }, v))
  return (
    <div className="flex items-center gap-2 text-xs text-archive-ivory">
      <span className="text-archive-dust min-w-[60px]">{info.name}</span>
      <span className="text-archive-ivory">{formattedValue}</span>
      {attr.enhancedValues.length > 0 && (
        <span className="text-archive-gold text-[10px] ml-2">
          {t('equipment.enhancedValue')}：{formattedEnhanced.join(' / ')}
        </span>
      )}
    </div>
  )
}

export function EnhanceMaterialSection({ groups, t }: { groups: EnhanceMaterialGroup[]; t: (key: string, vars?: Record<string, string | number>) => string }) {
  const hasAny = groups.some(g => g.materials.length > 0)
  if (!hasAny) {
    return <div className="text-xs text-archive-lead">{t('equipment.noEnhanceMaterial')}</div>
  }
  return (
    <div className="space-y-3">
      {groups.map((group) => (
          <div key={group.attrKey}>
            <div className="text-[10px] text-archive-gold uppercase tracking-wide mb-1">{group.attrName || t('common.unknownAttr')}</div>
            {group.materials.length > 0 ? (
              <div className="grid items-start grid-cols-[repeat(auto-fill,5rem)] gap-2">
                {group.materials.map((item) => {
                  const formattedValue = formatAttributeShow({ valueFormat: group.valueFormat, showPercent: group.showPercent }, item.attrValue)
                  return (
                    <ItemTile
                      key={item.equip.id}
                      itemId={item.equip.id}
                      name={item.equip.name}
                      rarity={item.equip.rarity}
                      size="lg"
                      showTips={false}
                      badge={
                        <span className="text-[8px] font-medium px-0.5 rounded bg-archive-gold/80 text-archive-ink leading-tight whitespace-nowrap">
                          {group.attrName}+{formattedValue}
                        </span>
                      }
                    />
                  )
                })}
              </div>
            ) : (
              <div className="text-[10px] text-archive-lead">{t('equipment.noEnhanceMaterialForAttr')}</div>
            )}
          </div>
      ))}
    </div>
  )
}

export default function EquipmentDetail() {
  const { id } = useParams<{ id: string }>()
  const { locale } = useLocale()
  const { t } = useI18n()
  const { data: detail, loading, error } = useEquipDetail(id ?? '')
  const attrMap = useAttrMap(locale)

  if (loading) return <DetailSkeleton />
  if (error) return <div className="text-red-400 text-sm">{t('common.loadFailed')}：{error}</div>
  if (!detail || !detail.equip.id) return <div className="text-archive-dust text-sm">{t('common.notFound', { name: t('equipment.title') })}</div>

  const { equip, suit, suitEquips, enhanceMaterialGroups, enhanceCost, recipes } = detail

  return (
    <div>
      <div className="mb-4">
        <Link to="/archive/equipment" className="text-xs text-archive-lead hover:text-archive-gold transition-colors">&larr; {t('common.backToList', { list: t('equipment.title') })}</Link>
      </div>

      <div className="flex items-start gap-4 mb-6">
        <img
          src={getItemIconUrl(equip.iconId)}
          alt=""
          className="w-20 h-20 object-cover bg-archive-border rounded border border-archive-border"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-xl font-bold text-archive-ivory">{equip.name}</h2>
            <Badge variant="ghost" className="font-mono">{MODULE_CODES.equipment}</Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-archive-dust">{t(EQUIPMENT_PART_KEYS[equip.partType] ?? '')}</span>
            <span className="text-xs text-archive-lead">·</span>
            <RarityStars level={equip.rarity} />
            {equip.minWearLv > 0 && (
              <>
                <span className="text-xs text-archive-lead">·</span>
                <span className="text-sm text-archive-dust">{t('equipment.wearLevel', { level: equip.minWearLv })}</span>
              </>
            )}
          </div>
          <div className="h-0.5 w-24 rounded-full mt-2" style={{ backgroundColor: rarityColor(equip.rarity) }} />
        </div>
      </div>

      {equip.description && (
        <div className="mb-4 p-3 rounded border border-archive-border bg-archive-file">
          <div className="text-xs text-archive-ivory leading-relaxed">
            <RichText text={equip.description} />
          </div>
        </div>
      )}

      {equip.decoDesc && (
        <div className="mb-4 p-3 rounded border border-archive-border bg-archive-file">
          <div className="text-xs text-archive-dust italic leading-relaxed">
            <RichText text={equip.decoDesc} />
          </div>
        </div>
      )}

      {(equip.baseAttr || equip.attrs.length > 0) && (
        <div className="mb-4 p-3 rounded border border-archive-border bg-archive-file">
          <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-2">{t('equipment.baseAttr')}</div>
          {equip.baseAttr && (
            <AttrRow attr={equip.baseAttr} attrMap={attrMap} t={t} />
          )}
          {equip.attrs.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('equipment.subAttrs')}</div>
              <div className="space-y-1">
                {equip.attrs.map((attr, i) => (
                  <AttrRow key={`${attr.attrType}-${i}`} attr={attr} attrMap={attrMap} t={t} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {suit && (
        <div className="mb-4 p-3 rounded border border-archive-border bg-archive-file">
          <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-2">{t('equipment.suitSection')}</div>
          <div className="flex items-center gap-2 mb-2">
            <SuitLogo logoName={suit.logoName} />
            <span className="text-sm font-medium text-archive-gold">{suit.name}</span>
          </div>
          {suit.effects.map((effect, i) => (
            <div key={i} className="mb-2">
              <div className="text-[10px] text-archive-dust mb-1">{t('equipment.suitPieces', { count: effect.equipCnt })}</div>
              <SkillReferenceCard
                skillId={effect.skillId}
                defaultLevel={effect.skillLv}
                hideNameWhenMissing
              />
            </div>
          ))}
          {suitEquips.length > 0 && (
            <div className="grid items-start grid-cols-[repeat(auto-fill,4rem)] gap-2 mt-2">
              {suitEquips.map(e => (
                <EquipCard key={e.id} equip={e} interactive="tooltip" />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mb-4 p-3 rounded border border-archive-border bg-archive-file">
        <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('equipment.enhanceMaterials')}</div>
        <div className="text-[10px] text-archive-lead mb-2">
          <RichText text={t('equipment.enhanceMaterialsHint')} />
        </div>
        {enhanceCost && (
          <div className="mb-2 flex items-center gap-2">
            <ItemTile itemId={enhanceCost.itemId} amount={enhanceCost.count} size="lg" />
          </div>
        )}
        <EnhanceMaterialSection groups={enhanceMaterialGroups} t={t} />
      </div>

      {recipes.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-2">{t('equipment.recipes')}</div>
          <RecipePanel recipes={recipes} />
        </div>
      )}
    </div>
  )
}
