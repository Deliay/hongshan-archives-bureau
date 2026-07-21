import { MODULE_CODES } from '../../data/archiveMeta'
import { Badge } from '../../components/ui/Badge'
import { DetailSkeleton } from '../../components/ui/DetailSkeleton'
import { useParams, Link } from 'react-router-dom'
import { useEquipDetail } from '../../hooks/useData'
import { ASSET_BASE } from '../../lib/adapter'
import { getCachedData } from '../../lib/cache'
import { fetchTableAll, fetchTableDictAll } from '../../lib/api'
import { useLocale } from '../../lib/locale'
import { RichText } from '../../lib/richText'
import { formatAttributeShow } from '../../lib/formatText'
import SkillReferenceCard from '../../components/skills/SkillReferenceCard'
import RecipePanel from '../../components/Craft/RecipePanel'
import EquipCard from '../../components/Equipment/EquipCard'
import ItemPanel from '../../components/Items/ItemPanel'
import { useI18n } from '../../i18n'
import { useState, useEffect } from 'react'
import type { EquipAttr } from '../../lib/types'

const RARITY_COLORS: Record<number, string> = {
  3: '#26BBFD',
  4: '#9452FA',
  5: '#FFBB03',
  6: '#fe5a00',
}

const PART_NAMES: Record<number, string> = {
  0: 'equipment.partBody',
  1: 'equipment.partHand',
  2: 'equipment.partEdc',
}

function getItemIconUrl(iconId: string): string {
  return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/itemicon/${iconId}.png`
}

interface AttrInfo {
  id: number
  name: string
  icon: string
  valueFormat: string
  showPercent: boolean
}

function useAttrMap(locale: string) {
  const [attrMap, setAttrMap] = useState<Record<number, AttrInfo>>({})
  useEffect(() => {
    let cancelled = false
    async function load() {
      const [metaRaw, showRaw, i18nMap] = await Promise.all([
        getCachedData<Record<string, any>>('AttributeMetaTable', () => fetchTableAll('AttributeMetaTable')),
        getCachedData<Record<string, any>>('AttributeShowConfigTable', () => fetchTableAll('AttributeShowConfigTable')),
        getCachedData<Record<string, string>>(`I18nDict_${locale}_AttributeShowConfigTable`, () => fetchTableDictAll('AttributeShowConfigTable', locale)),
      ])
      if (cancelled) return
      const map: Record<number, AttrInfo> = {}
      for (const [k, v] of Object.entries(metaRaw)) {
        const attrType = Number(k)
        const configItem = showRaw[k]?.list?.[0]
        const nameId = String(configItem?.name?.id ?? '')
        map[attrType] = {
          id: attrType,
          name: (nameId && i18nMap[nameId]) || v.iconName?.replace('icon_attribute_', '') || `属性${k}`,
          icon: `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/attributeicon/${v.iconName}.png`,
          valueFormat: configItem?.valueFormat ?? '{value}',
          showPercent: configItem?.showPercent ?? false,
        }
      }
      setAttrMap(map)
    }
    load()
    return () => { cancelled = true }
  }, [locale])
  return attrMap
}

function AttrRow({ attr, attrMap, t }: { attr: EquipAttr; attrMap: Record<number, AttrInfo>; t: (key: string) => string }) {
  const info = attrMap[attr.attrType]
  const name = info?.name ?? String(attr.attrType)
  const valueFormat = info?.valueFormat ?? '{value}'
  const showPercent = info?.showPercent ?? false
  const formattedValue = formatAttributeShow({ valueFormat, showPercent }, attr.value)
  const formattedEnhanced = attr.enhancedValues.map(v => formatAttributeShow({ valueFormat, showPercent }, v))
  return (
    <div className="flex items-center gap-2 text-xs text-archive-ivory">
      <span className="text-archive-dust min-w-[60px]">{name}</span>
      <span className="text-archive-ivory">{formattedValue}</span>
      {attr.enhancedValues.length > 0 && (
        <span className="text-archive-gold text-[10px] ml-2">
          {t('equipment.enhancedValue')}：{formattedEnhanced.join(' / ')}
        </span>
      )}
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

  const { equip, suit, suitEquips, enhanceMaterials, enhanceCost, recipes } = detail

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
            <span className="text-sm text-archive-dust">{t(PART_NAMES[equip.partType] ?? '')}</span>
            <span className="text-xs text-archive-lead">·</span>
            <span className="text-sm" style={{ color: RARITY_COLORS[equip.rarity] || '#888' }}>
              {'★'.repeat(equip.rarity)}
            </span>
            {equip.minWearLv > 0 && (
              <>
                <span className="text-xs text-archive-lead">·</span>
                <span className="text-sm text-archive-dust">{t('equipment.wearLevel', { level: equip.minWearLv })}</span>
              </>
            )}
          </div>
          <div className="h-0.5 w-24 rounded-full mt-2" style={{ backgroundColor: RARITY_COLORS[equip.rarity] || '#a0a0a0' }} />
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
            {suit.logoName && (
              <img
                src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/equipmentlogobig/${suit.logoName}.png`}
                alt=""
                className="w-6 h-6 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
            <span className="text-sm font-medium text-archive-gold">{suit.name}</span>
          </div>
          {suit.effects.map((effect, i) => (
            <div key={i} className="mb-2">
              <div className="text-[10px] text-archive-dust mb-1">{t('equipment.suitPieces', { count: effect.equipCnt })}</div>
              <SkillReferenceCard
                skillId={effect.skillId}
                defaultLevel={effect.skillLv}
              />
            </div>
          ))}
          {suitEquips.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
              {suitEquips.map(e => (
                <EquipCard key={e.id} equip={e} />
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
          <div className="mb-2">
            <ItemPanel itemId={enhanceCost.itemId} amount={enhanceCost.count} showName />
          </div>
        )}
        {enhanceMaterials.length > 0 ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {enhanceMaterials.map(e => (
              <EquipCard key={e.id} equip={e} />
            ))}
          </div>
        ) : (
          <div className="text-xs text-archive-lead">{t('equipment.noEnhanceMaterial')}</div>
        )}
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
