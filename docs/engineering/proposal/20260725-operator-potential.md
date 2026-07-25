---
description: 干员潜能模块技术方案 — 数据获取、类型定义与组件实现
type: Permanent
---

# 干员潜能模块技术方案

## 概述

在 `OperatorDetail` 页面新增「潜能」模块，展示 5 级潜能的名称、效果描述、升级材料和解锁立绘。数据来自 `CharacterPotentialTable` 和 `PotentialTalentEffectTable`。

## 数据调研结果

### CharacterPotentialTable

按 charId 查询，返回结构：

```json
{
  "firstItemId": "item_charpotentialup_chr_0005_chen",
  "potentialUnlockBundle": [
    {
      "level": 1,
      "name": { "id": -7930799848885356140, "text": "" },
      "potentialEffectId": "chr_0005_chen_potential_1",
      "itemIds": ["item_charpotentialup_chr_0005_chen"],
      "itemCnts": [1],
      "unlockCharPictureItemList": ["item_pic_1_chr_0005_chen"]
    },
    { "level": 2, "unlockCharPictureItemList": [], ... },
    { "level": 3, "unlockCharPictureItemList": ["item_pic_3_chr_0005_chen"], ... },
    { "level": 4, "unlockCharPictureItemList": [], ... },
    { "level": 5, "unlockCharPictureItemList": ["item_pic_5_chr_0005_chen"], ... }
  ]
}
```

- 潜能 1/3/5 级通常有立绘，2/4 级无
- 部分干员潜能 1 级可能有多张立绘（如 pelica 有 `item_pic_1_chr_0004_pelica` + `item_pic_1_ex01_chr_0004_pelica`）

### PotentialTalentEffectTable

按 potentialEffectId 查询，结构：

```json
{
  "id": "chr_0005_chen_potential_1",
  "desc": { "id": -7509391714976593443, "text": "" },
  "dataList": [{
    "attachBuff": { "blackboard": [{ "key": "extra_dmg", "value": 0.2 }] },
    "attachSkill": { "blackboard": [], "skillId": "" }
  }]
}
```

### 潜能立绘路径

```
{ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/textures/spaceship/imageposter/largesize/pic_{level}_{charId}.png
```

- largesize 和 subsize 两种尺寸，详情页使用 largesize
- 已验证所有干员的 pic_1/pic_3/pic_5 图片均存在

---

## 类型定义

**文件**: `src/lib/types.ts`

新增接口：

```typescript
export interface PotentialLevel {
  level: number
  name: string           // i18n 解析后的潜能名称（如「绝影」）
  description: string    // PotentialTalentEffectTable.desc，带黑板格式化
  requiredItem: { id: string; count: number }[]
  portraitUrl: string    // 立绘 URL，无立绘时为空字符串
}
```

`OperatorDetailData` 新增字段：

```typescript
export interface OperatorDetailData {
  // ... existing fields ...
  potentialLevels: PotentialLevel[]
}
```

---

## 数据获取

**文件**: `src/hooks/useData.ts` — `useOperatorDetail()` 函数

### 新增 Promise.all 条目

在现有的 `Promise.all` 中增加 `CharacterPotentialTable` 的获取：

```typescript
const [
  // ... existing entries ...
  potentialRaw,          // CharacterPotentialTable
  potentialI18n,         // CharacterPotentialTable i18n dict
] = await Promise.all([
  // ... existing promises ...
  getCachedData<Record<string, any>>('CharacterPotentialTable', () => fetchTableAll('CharacterPotentialTable'))
    .then(r => r[id])
    .catch(() => null),
  getTableI18nDict('CharacterPotentialTable', locale)
    .catch(() => ({}) as Record<string, string>),
])
```

### 构建 potentialLevels

在 `useOperatorDetail` 的 return 之前，构建 `potentialLevels` 数组：

```typescript
const potentialLevels: PotentialLevel[] = []
if (potentialRaw?.potentialUnlockBundle) {
  for (const bundle of potentialRaw.potentialUnlockBundle) {
    // 解析名称
    const name = resolveI18n(bundle.name, potentialI18n) || ''

    // 解析效果描述（复用现有 PotentialTalentEffectTable 数据）
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

    // 材料
    const requiredItem = (bundle.itemIds ?? []).map((id: string, i: number) => ({
      id,
      count: bundle.itemCnts?.[i] ?? 1,
    }))

    // 立绘 URL（取第一张）
    const pics = bundle.unlockCharPictureItemList ?? []
    let portraitUrl = ''
    if (pics.length > 0) {
      portraitUrl = `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/textures/spaceship/imageposter/largesize/pic_${bundle.level}_${id}.png`
    }

    potentialLevels.push({ level: bundle.level, name, description, requiredItem, portraitUrl })
  }
}
```

### 更新返回值

```typescript
return {
  op, attributes, breakCostMap, talentNodeMap, wpnRecommend,
  skillGroups, skillLevelUp, skillPatchMap, factorySkills, skillConditions,
  potentialLevels,  // 新增
}
```

---

## 新组件：PotentialSection

**文件**: `src/pages/operators/PotentialSection.tsx`

### 接口

```typescript
interface PotentialSectionProps {
  levels: PotentialLevel[]
}
```

### 视觉结构

每级潜能为一个卡片，纵向排列：

```
┌─────────────────────────────────────────────┐
│ ① 绝影                          [材料×1]    │
│ 攻击时有20%概率...                           │
│ ┌───────────────────────────────────────┐   │
│ │         潜能立绘 (pic_1)              │   │
│ └───────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│ ② 家传武学                      [材料×1]    │
│ 解锁新天赋...                                │
├─────────────────────────────────────────────┤
│ ③ 绝影·改                        [材料×1]    │
│ 攻击时有25%概率...                           │
│ ┌───────────────────────────────────────┐   │
│ │         潜能立绘 (pic_3)              │   │
│ └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 实现要点

- 卡片样式复用现有 `border border-archive-border bg-archive-file` 样式（与天赋、后勤技能卡片一致）
- 等级标识：左侧金色圆点 + 等级数字
- 潜能名称：`text-sm font-medium text-archive-ivory`
- 效果描述：`text-xs text-archive-dust`，使用 `<RichText>` 渲染（支持富文本标签）
- 材料：使用现有 `<ItemTile>` 组件
- 立绘：`<img>` 宽度 100%，圆角，加载失败时隐藏

### i18n

模块标题使用新增 key `operator.potential`，需要在 `scripts/i18n-custom.json` 中添加 14 语言翻译。

---

## 页面集成

**文件**: `src/pages/operators/OperatorDetail.tsx`

在天赋模块（`{/* 干员天赋 */}`）之后、后勤技能模块（`{/* 后勤技能 */}`）之前插入：

```tsx
{/* 潜能 */}
{detail.potentialLevels.length > 0 && (
  <section>
    <h3 className="text-sm font-medium text-archive-gold mb-3">{t('operator.potential')}</h3>
    <PotentialSection levels={detail.potentialLevels} />
  </section>
)}
```

---

## 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| **新建** | `src/pages/operators/PotentialSection.tsx` | 潜能模块组件 |
| **修改** | `src/lib/types.ts` | 新增 `PotentialLevel` 接口，`OperatorDetailData` 增加 `potentialLevels` |
| **修改** | `src/hooks/useData.ts` | `useOperatorDetail` 获取 `CharacterPotentialTable` 并构建 `potentialLevels` |
| **修改** | `src/pages/operators/OperatorDetail.tsx` | 集成 `PotentialSection` |
| **修改** | `scripts/i18n-custom.json` | 新增 `operator.potential` 翻译 |
| **生成** | `src/i18n/dicts/*.json` | 由 generate-i18n-dicts.ts 自动生成 |

---

## 验证方案

1. `node scripts/generate-i18n-dicts.ts` — i18n 字典生成成功
2. `npm run lint` — 无 lint 错误
3. `npm run test` — 现有测试通过
4. `npm run build` — TypeScript 编译通过
5. 视觉验证：干员详情页显示潜能模块，5 级潜能卡片正确渲染，1/3/5 级显示立绘
