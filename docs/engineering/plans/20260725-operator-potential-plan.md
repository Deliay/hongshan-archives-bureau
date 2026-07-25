---
description: 干员潜能模块代码实现方案
type: Fleeting
---

# 干员潜能模块 - 实现方案

**对应产品文档**: [[20260725-operator-potential|干员潜能模块]]
**对应技术方案**: [[20260725-operator-potential|干员潜能模块技术方案]]
**实现方案版本**: v1.0
**创建日期**: 2026-07-25
**作者**: 前端工程
**开发分支**: `feat/operator-potential-module`

## 1. 概述

### 1.1 目标

将已评审通过的技术提案转化为可执行的代码实现清单：

1. 在 `types.ts` 新增 `PotentialLevel` 接口，扩展 `OperatorDetailData`。
2. 在 `useOperatorDetail` hook 中获取 `CharacterPotentialTable`，构建 `potentialLevels` 数组（复用已有 `PotentialTalentEffectTable` 数据）。
3. 新建 `PotentialSection` 组件，渲染 5 级潜能卡片（名称、效果描述、材料、立绘）。
4. 在 `OperatorDetail` 页面天赋与后勤技能之间集成该模块。
5. 新增 `operator.potential` i18n key（14 语言）。

### 1.2 范围

- **做**：潜能模块数据获取、类型定义、组件渲染、页面集成、i18n。
- **不做**：潜能升级交互、潜能对比（Diff 系统）、潜能筛选、潜能立绘 subsize 变体。

## 2. 代码变更总览

### 2.1 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/pages/operators/PotentialSection.tsx` | 潜能模块组件 |

### 2.2 修改文件

| 文件路径 | 说明 |
|----------|------|
| `src/lib/types.ts` | 新增 `PotentialLevel` 接口，`OperatorDetailData` 增加 `potentialLevels` |
| `src/hooks/useData.ts` | `useOperatorDetail` 获取 `CharacterPotentialTable`，构建 `potentialLevels` |
| `src/pages/operators/OperatorDetail.tsx` | 导入并集成 `PotentialSection` |
| `scripts/i18n-custom.json` | 新增 `operator.potential` 翻译 |
| `src/i18n/dicts/*.json` | 由 `generate-i18n-dicts.ts` 自动生成（14 个文件） |

### 2.3 删除文件

无。

## 3. 详细实现

### 3.1 类型定义

**`src/lib/types.ts`** 在 `FactorySkill` 接口之后、`OperatorDetailData` 接口之前追加：

```typescript
export interface PotentialLevel {
  level: number
  name: string           // i18n 解析后的潜能名称（如「绝影」）
  description: string    // PotentialTalentEffectTable.desc，带黑板格式化
  requiredItem: { id: string; count: number }[]
  portraitUrl: string    // 立绘 URL，无立绘时为空字符串
}
```

`OperatorDetailData` 追加字段：

```typescript
potentialLevels: PotentialLevel[]
```

### 3.2 数据获取

**`src/hooks/useData.ts`** — `useOperatorDetail()` 函数：

**import 更新**：type import 行添加 `PotentialLevel`。

**Promise.all 扩展**：在现有 `Promise.all` 末尾添加两个条目：

```typescript
// 新增解构变量
const [..., potentialRaw, potentialI18n] = await Promise.all([
  // ... existing promises ...
  getCachedData<Record<string, any>>('CharacterPotentialTable', () => fetchTableAll('CharacterPotentialTable'))
    .then(r => r[id]).catch(() => null),
  getTableI18nDict('CharacterPotentialTable', locale)
    .catch(() => ({}) as Record<string, string>),
])
```

**构建 potentialLevels**：在 `skillConditions` 构建之后、`return` 之前插入：

```typescript
const potentialLevels: PotentialLevel[] = []
if (potentialRaw?.potentialUnlockBundle) {
  for (const bundle of potentialRaw.potentialUnlockBundle) {
    const name = resolveI18n(bundle.name, potentialI18n) || ''
    let description = ''
    if (bundle.potentialEffectId && potentialTalentEffectRaw[bundle.potentialEffectId]) {
      const entry = potentialTalentEffectRaw[bundle.potentialEffectId]
      const raw = resolveI18n(entry.desc, potentialTalentEffectI18n)
      if (raw) {
        const bb: Record<string, number> = {}
        for (const dl of entry.dataList ?? []) {
          for (const b of dl.attachSkill?.blackboard ?? []) {
            if (!(b.key in bb)) bb[b.key] = b.value
          }
          for (const b of dl.attachBuff?.blackboard ?? []) {
            if (!(b.key in bb)) bb[b.key] = b.value
          }
          if (dl.skillBbModifier?.bbKey && dl.skillBbModifier.floatValue !== undefined) {
            if (!(dl.skillBbModifier.bbKey in bb)) bb[dl.skillBbModifier.bbKey] = dl.skillBbModifier.floatValue
          }
        }
        description = formatBlackboard(raw, bb)
      }
    }
    const requiredItem = (bundle.itemIds ?? []).map((itemId: string, i: number) => ({
      id: itemId,
      count: bundle.itemCnts?.[i] ?? 1,
    }))
    const pics = bundle.unlockCharPictureItemList ?? []
    const portraitUrl = pics.length > 0
      ? `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/textures/spaceship/imageposter/largesize/pic_${bundle.level}_${id}.png`
      : ''
    potentialLevels.push({ level: bundle.level, name, description, requiredItem, portraitUrl })
  }
}
```

**return 更新**：添加 `potentialLevels`：

```typescript
return { op, attributes, breakCostMap, talentNodeMap, wpnRecommend, skillGroups, skillLevelUp, skillPatchMap, factorySkills, skillConditions, potentialLevels }
```

**要点**：
- 复用已获取的 `potentialTalentEffectRaw` / `potentialTalentEffectI18n`，不重复请求 `PotentialTalentEffectTable`。
- 黑板数值解析逻辑与天赋节点（`nodeType === 4`）完全一致，提取自 `attachSkill.blackboard` + `attachBuff.blackboard` + `skillBbModifier`。
- 立绘仅在 `unlockCharPictureItemList` 非空时生成 URL，使用 largesize 路径。

### 3.3 PotentialSection 组件

**`src/pages/operators/PotentialSection.tsx`**：

```tsx
import { RichText } from '../../lib/richText'
import ItemTile from '../../components/Items/ItemTile'
import type { PotentialLevel } from '../../lib/types'

interface PotentialSectionProps {
  levels: PotentialLevel[]
}

export default function PotentialSection({ levels }: PotentialSectionProps) {
  return (
    <div className="space-y-3">
      {levels.map((pl) => (
        <div key={pl.level} className="p-3 rounded border border-archive-border bg-archive-file">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-archive-gold/20 text-archive-gold text-xs flex items-center justify-center shrink-0">
                {pl.level}
              </span>
              <span className="text-sm font-medium text-archive-ivory">
                {pl.name || `Potential ${pl.level}`}
              </span>
            </div>
            {pl.requiredItem.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {pl.requiredItem.map((item) => (
                  <ItemTile key={item.id} itemId={item.id} amount={item.count} showName={false} size="sm" />
                ))}
              </div>
            )}
          </div>
          {pl.description && (
            <p className="text-xs text-archive-dust mb-2"><RichText text={pl.description} /></p>
          )}
          {pl.portraitUrl && (
            <img
              src={pl.portraitUrl}
              alt={pl.name}
              className="w-full rounded mt-2"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
```

**要点**：
- 卡片样式与天赋、后勤技能、精英化卡片一致（`p-3 rounded border border-archive-border bg-archive-file`）。
- 等级标识：金色圆形数字徽章（`bg-archive-gold/20 text-archive-gold`）。
- 材料使用现有 `ItemTile` 组件（`size="sm" showName={false}`）。
- 效果描述使用 `<RichText>` 渲染，支持富文本标签（`<color>` 等）。
- 立绘 `onError` 隐藏，遵循项目惯例。

### 3.4 页面集成

**`src/pages/operators/OperatorDetail.tsx`**：

**import 添加**（第 15 行之后）：

```typescript
import PotentialSection from './PotentialSection'
```

**模块插入**（天赋模块 `</section>` 之后、后勤技能 `{/* 后勤技能 */}` 之前）：

```tsx
{/* 潜能 */}
{detail.potentialLevels.length > 0 && (
  <section>
    <h3 className="text-sm font-medium text-archive-gold mb-3">{t('operator.potential')}</h3>
    <PotentialSection levels={detail.potentialLevels} />
  </section>
)}
```

### 3.5 i18n

**`scripts/i18n-custom.json`** 新增 key（在 `operator.factorySkill` 之后）：

```json
"operator.potential": {
  "CN": "潜能",
  "TC": "潛能",
  "EN": "Potential",
  "JP": "潜在能力",
  "KR": "잠재력",
  "RU": "Потенциал",
  "MX": "Potencial",
  "BR": "Potencial",
  "DE": "Potenzial",
  "FR": "Potentiel",
  "VN": "Tiềm Năng",
  "TH": "ศักยภาพ",
  "ID": "Potensi",
  "IT": "Potenziale"
}
```

运行 `node scripts/generate-i18n-dicts.ts` 生成 14 个字典文件。

## 4. 实现顺序

### 阶段一：类型与数据（第 1 轮提交）

1. `src/lib/types.ts` — 新增 `PotentialLevel`，扩展 `OperatorDetailData`。
2. `src/hooks/useData.ts` — 获取 `CharacterPotentialTable`，构建 `potentialLevels`。
3. 校验：`npx tsc --noEmit` 类型通过。

### 阶段二：组件与集成（第 2 轮提交）

1. `src/pages/operators/PotentialSection.tsx` — 新建组件。
2. `src/pages/operators/OperatorDetail.tsx` — 导入并集成。
3. 校验：`npx tsc --noEmit` 类型通过。

### 阶段三：i18n（第 3 轮提交）

1. `scripts/i18n-custom.json` — 新增 `operator.potential`。
2. `node scripts/generate-i18n-dicts.ts` — 生成字典。
3. 校验：`npm run lint && npm run test && npm run build`。

## 5. 测试计划

### 5.1 类型检查

- `npx tsc --noEmit` — 无类型错误。

### 5.2 构建验证

- `npm run lint` — 无 lint 错误。
- `npm run test` — 现有测试全部通过。
- `npm run build` — 构建成功。

### 5.3 视觉验证

- 干员详情页显示「潜能」模块，位于天赋与后勤技能之间。
- 5 级潜能全部展示，每级显示名称、效果描述、材料。
- 有立绘的潜能等级（1/3/5）在卡片内展示立绘大图。
- 无立绘的潜能等级（2/4）不显示图片区域。
- 立绘加载失败时图片区域隐藏。

## 6. 验收标准

- [ ] 干员详情页显示「潜能」模块，位于天赋与后勤技能之间。
- [ ] 5 级潜能全部展示，每级显示名称、效果描述、材料。
- [ ] 有立绘的潜能等级（1/3/5）在卡片内展示立绘大图。
- [ ] 无立绘的潜能等级（2/4）不显示图片区域。
- [ ] 多语言环境下潜能名称和效果描述正确显示。
- [ ] 立绘图片加载失败时优雅降级（隐藏图片区域）。
- [ ] `npm run lint`、`npm run test`、`npm run build` 全部通过。

## 7. 风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| `CharacterPotentialTable` 数据缺失 | 部分干员无潜能数据 | `.catch(() => null)` 兜底，`potentialLevels` 为空数组，模块不渲染 |
| 潜能立绘图片 404 | 图片区域空白 | `onError` 隐藏图片，不影响其他内容 |
| `PotentialTalentEffectTable` 黑板格式化逻辑重复 | 维护成本 | 与天赋节点共用相同逻辑，后续可提取为工具函数 |
| i18n 翻译不准确 | 多语言显示问题 | 人工校验 14 语言翻译 |

回滚策略：纯展示层新增，无数据与契约变更，按阶段提交可逐阶段回滚。删除 `PotentialSection.tsx` + 回滚 `types.ts` / `useData.ts` / `OperatorDetail.tsx` 即可。

## 8. 相关文档

- [[20260725-operator-potential|干员潜能模块 PRD]]
- [[20260725-operator-potential|干员潜能模块技术方案]]
- [通用开发规范](../common-rules.md)
- [前端开发规范](../frontend-spec.md)
- [数据表映射参考](../references/data-mapping-tables.md)
- [国际化规范](../references/i18n-spec.md)
