import { useMemo } from 'react'
import ItemPanel from './ItemPanel'

interface ItemBundle {
  id: string
  count: number
}

interface RewardPanelProps {
  rewardIds: string[]
  rewardTable: Record<string, any>
}

function rollup(bundles: ItemBundle[]): ItemBundle[] {
  const map = new Map<string, number>()
  for (const b of bundles) {
    map.set(b.id, (map.get(b.id) ?? 0) + b.count)
  }
  return [...map.entries()].map(([id, count]) => ({ id, count }))
}

export default function RewardPanel({ rewardIds, rewardTable }: RewardPanelProps) {
  const { fixed, prob } = useMemo(() => {
    const fixedBundles: ItemBundle[] = []
    const probBundles: ItemBundle[] = []
    for (const rid of rewardIds) {
      const entry = rewardTable[rid]
      if (!entry) continue
      if (entry.itemBundles) {
        for (const b of entry.itemBundles) {
          if (b.id) fixedBundles.push({ id: b.id, count: b.count ?? 1 })
        }
      }
      if (entry.probItemBundles) {
        for (const b of entry.probItemBundles) {
          if (b.id) probBundles.push({ id: b.id, count: b.count ?? 1 })
        }
      }
    }
    return { fixed: rollup(fixedBundles), prob: rollup(probBundles) }
  }, [rewardIds, rewardTable])

  if (fixed.length === 0 && prob.length === 0) return null

  return (
    <div>
      <div className="text-[10px] text-[#8B8982] uppercase tracking-wide mb-1">包含内容</div>
      <div className="space-y-2">
        {fixed.length > 0 && (
          <div>
            <div className="text-[10px] text-[#E8E6E3] mb-1">固定奖励</div>
            <div className="flex flex-wrap gap-1.5">
              {fixed.map(item => (
                <ItemPanel key={item.id} itemId={item.id} amount={item.count} className="min-w-[80px]" />
              ))}
            </div>
          </div>
        )}
        {fixed.length > 0 && prob.length > 0 && (
          <div className="h-px bg-[#2A2A32]" />
        )}
        {prob.length > 0 && (
          <div>
            <div className="text-[10px] text-[#E8E6E3] mb-1">随机奖励</div>
            <div className="flex flex-wrap gap-1.5">
              {prob.map(item => (
                <ItemPanel key={item.id} itemId={item.id} amount={item.count} className="min-w-[80px]" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
