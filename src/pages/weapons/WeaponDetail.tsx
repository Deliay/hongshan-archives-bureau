import { MODULE_CODES } from '../../data/archiveMeta'
import { Badge } from '../../components/ui/Badge'
import { DetailSkeleton } from '../../components/ui/DetailSkeleton'
import { useParams, Link } from 'react-router-dom'
import { useWeapon } from '../../hooks/useData'
import { ASSET_BASE } from '../../lib/adapter'
import { RichText } from '../../lib/richText'
import WeaponSkillPanel from '../../components/Weapons/WeaponSkillPanel'
import { useI18n } from '../../i18n'

const RARITY_COLORS: Record<number, string> = {
  3: '#26BBFD',
  4: '#9452FA',
  5: '#FFBB03',
  6: '#fe5a00',
}

function getItemIconUrl(iconId: string): string {
  return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/itemicon/${iconId}.png`
}

export default function WeaponDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useI18n()
  const { data: weapon, loading, error } = useWeapon(id ?? '')

  if (loading) return <DetailSkeleton />
  if (error) return <div className="text-red-400 text-sm">{t('common.loadFailed')}：{error}</div>
  if (!weapon) return <div className="text-archive-dust text-sm">{t('common.notFound', { name: t('weapon.title') })}</div>

  return (
    <div>
      <div className="mb-4">
        <Link to="/archive/weapons" className="text-xs text-archive-lead hover:text-archive-gold transition-colors">&larr; {t('common.backToList', { list: t('weapon.title') })}</Link>
      </div>

      <div className="flex items-start gap-4 mb-6">
        <img
          src={getItemIconUrl(weapon.iconId)}
          alt=""
          className="w-20 h-20 object-cover bg-archive-border rounded border border-archive-border"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-xl font-bold text-archive-ivory">{weapon.name}</h2>
            <Badge variant="ghost" className="font-mono">{MODULE_CODES.weapons}</Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-archive-dust">{weapon.type}</span>
            <span className="text-xs text-archive-lead">·</span>
            <span className="text-sm" style={{ color: RARITY_COLORS[weapon.rarity] || '#888' }}>
              {'★'.repeat(weapon.rarity)}
            </span>
          </div>
          <div className="h-0.5 w-24 rounded-full mt-2" style={{ backgroundColor: RARITY_COLORS[weapon.rarity] || '#a0a0a0' }} />
        </div>
      </div>

      {weapon.lore && (
        <div className="mb-4 p-3 rounded border border-archive-border bg-archive-file">
          <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('weapon.itemDesc')}</div>
          <div className="text-xs text-archive-dust italic leading-relaxed">
            <RichText text={weapon.lore} />
          </div>
        </div>
      )}

      {weapon.itemDesc && (
        <div className="mb-4 p-3 rounded border border-archive-border bg-archive-file">
          <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('weapon.itemExplain')}</div>
          <div className="text-xs text-archive-ivory leading-relaxed">
            <RichText text={weapon.itemDesc} />
          </div>
        </div>
      )}

      <WeaponSkillPanel skillIds={weapon.skills} showLevelSlider />

      <div className="p-3 rounded border border-archive-border bg-archive-file">
        <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">基本信息</div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <dt className="text-archive-lead">{t('weapon.weaponId')}</dt>
          <dd className="text-archive-ivory font-mono">{weapon.id}</dd>
          <dt className="text-archive-lead">{t('weapon.maxLevel')}</dt>
          <dd className="text-archive-ivory">{weapon.maxLevel}</dd>
          <dt className="text-archive-lead">{t('weapon.breakTemplate')}</dt>
          <dd className="text-archive-ivory font-mono text-[10px]">{weapon.breakthroughTemplateId}</dd>
          <dt className="text-archive-lead">{t('weapon.levelTemplate')}</dt>
          <dd className="text-archive-ivory font-mono text-[10px]">{weapon.levelTemplateId}</dd>
        </dl>
      </div>

      {weapon.description && (
        <div className="mb-4 p-3 rounded border border-archive-border bg-archive-file">
          <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('weapon.weaponDesc')}</div>
          <div className="text-xs text-archive-ivory leading-relaxed">
            <RichText text={weapon.description} />
          </div>
        </div>
      )}
    </div>
  )
}
