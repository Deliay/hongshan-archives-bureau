---
description: 装备图鉴验收修复实现方案：属性链路、套装技能名、精锻分组、交互与视觉的可执行清单
type: Fleeting
---

# 装备图鉴验收修复 - 实现方案

**对应产品文档**: [[20260721-equipment-archive|装备图鉴产品方案（docs/product/draft，v1.1）]]
**对应技术方案**: [[20260721-equipment-archive-acceptance|装备图鉴验收修复技术方案]]
**实现方案版本**: v1.0
**创建日期**: 2026-07-21
**作者**: 前端工程
**开发分支**: `feat/equipment-archive-acceptance`（stacked on `feat/equipment-archive`，含 PR #18 实现代码）

## 1. 概述

### 1.1 目标

将验收修复技术方案转化为可执行清单，修复 7 项验收问题：

1. 属性名称统一走 `AttributeShowConfigTable` / `CompositeAttributeShowConfigTable` → I18n 链路，消除「属性0」占位并修复百分比格式。
2. 套装技能无名称（全部 23 个 `skillName.id=0`，已实测）时隐藏名称。
3. 卷宗页内点击装备弹 `ItemTooltip`，不直接跳转。
4. 精锻材料按可精锻属性词条分组。
5. 材料卡片展示词条数值并按数值降序。
6. 配方卡片 fit-content。
7. 套组徽记改用白色变体 + 原始宽高比。

### 1.2 范围

- **做**：下表全部文件变更；2 个 i18n key × 14 语言；单测/组件测试/E2E；`data-pitfalls.md` 陷阱登记。
- **不做**：干员/敌人/DiffViewer 中旧属性链路的迁移（技术方案 4.1.4 已列为跟进项）；工厂模块接入 `RecipePanel`；缓存与 API 层契约改动。

## 2. 代码变更总览

### 2.1 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/lib/attributeShow.ts` | 属性显示共享工具：ShowConfig → I18n 解析（含组合属性） |
| `src/lib/__tests__/attributeShow.test.ts` | 属性解析纯函数单测 |
| `src/components/Equipment/SuitLogo.tsx` | 套组徽记组件（白色变体 + 原始比例） |

### 2.2 修改文件

| 文件路径 | 说明 |
|----------|------|
| `src/lib/types.ts` | `EquipAttr` 增加 `compositeAttr`；新增 `EnhanceMaterialItem`/`EnhanceMaterialGroup`；`EquipDetail.enhanceMaterials` → `enhanceMaterialGroups` |
| `src/lib/adapter.ts` | `adaptAttr` 透传 `compositeAttr`；新增纯函数 `buildEnhanceMaterialGroups` |
| `src/hooks/useData.ts` | `useEquipDetail` 改用 `buildEnhanceMaterialGroups` |
| `src/pages/equipment/EquipmentDetail.tsx` | 删除本地 `useAttrMap` 改用共享工具；套装技能传 `hideNameWhenMissing`；装备点击改 tooltip 模式；精锻区分组渲染 |
| `src/pages/equipment/EquipmentList.tsx` | 组头徽记替换为 `SuitLogo` |
| `src/components/Equipment/EquipCard.tsx` | 新增 `interactive: 'link' \| 'tooltip'` 双模式 |
| `src/components/Equipment/EquipTooltipPanel.tsx` | 删除内联属性链路，改用共享工具 |
| `src/components/skills/SkillReferenceCard.tsx` | 新增 `hideNameWhenMissing` prop |
| `src/components/Craft/RecipePanel.tsx` | 容器 `flex flex-wrap`，卡片 `w-fit max-w-full` |
| `src/lib/__tests__/adapter.test.ts` | 增补 `compositeAttr` 透传与精锻分组用例 |
| `src/components/Craft/RecipePanel.test.tsx` | 增补 fit-content class 断言 |
| `tests/e2e/src/equipment.spec.ts` | 增补 7 项验收断言 |
| `scripts/i18n-custom.json` | +2 key（`common.unknownAttr`、`equipment.noEnhanceMaterialForAttr`）× 14 语言 |
| `docs/engineering/references/data-pitfalls.md` | 登记组合属性与徽记变体两条陷阱 |

### 2.3 删除文件

无。

## 3. 详细实现

### 3.1 类型 `src/lib/types.ts`

```ts
export interface EquipAttr {
  attrType: number
  compositeAttr: string        // 新增：组合属性 key，非空时优先于 attrType
  value: number
  enhancedValues: number[]
  modifierType: number
}

export interface EnhanceMaterialItem {
  equip: Equip
  attrValue: number            // 材料同词条的 attrValue（展示与排序用）
}

export interface EnhanceMaterialGroup {
  attr: EquipAttr              // 目标装备的可精锻词条（名称/格式经 attributeShow 解析）
  materials: EnhanceMaterialItem[]  // 按 attrValue 降序
}

export interface EquipDetail {
  equip: Equip
  suit: Suit | null
  suitEquips: Equip[]
  enhanceMaterialGroups: EnhanceMaterialGroup[]  // 替换原 enhanceMaterials: Equip[]
  enhanceCost: RecipeMaterial | null
  recipes: RecipeEntry[]
}
```

`EquipDetail` 仅 `useEquipDetail` + `EquipmentDetail` 两个消费方，直接替换签名。

### 3.2 属性显示共享工具 `src/lib/attributeShow.ts`

#### 3.2.1 接口

```ts
export interface AttrShowInfo {
  name: string          // 已解析的本地化名称；解析失败为 ''
  valueFormat: string
  showPercent: boolean
}

interface AttrShowConfigEntry extends AttrShowInfo {
  attributeModifier: number
  nameId: string
}

type AttrShowMap = Record<string, AttrShowConfigEntry[]>  // key: compositeAttr 或 String(attrType)

export function attrKeyOf(attr: { attrType: number; compositeAttr?: string }): string
export function getAttrShowMap(locale: string): Promise<AttrShowMap>
export function resolveAttrShow(map: AttrShowMap, attr: EquipAttr): AttrShowInfo | null
```

#### 3.2.2 实现要点

- `attrKeyOf`：`attr.compositeAttr || String(attr.attrType)`（compositeAttr 优先，**禁止**拆解组合属性的构成子属性做匹配）。
- `getAttrShowMap`：模块级 per-locale Promise 缓存（照搬 `useData.ts:144-169` `getAttributeMap` 的缓存模式）：
  1. 并行加载 `AttributeShowConfigTable`、`CompositeAttributeShowConfigTable` 两张原始表 + 两张表的 `I18nDict_{locale}_*`（`getCachedData` + `fetchTableAll`/`fetchTableDictAll`，缓存键沿用现有惯例）。
  2. 普通表按数字 key、组合表按字符串 key 写入同一 map；保留每个 `list[]` 条目的 `attributeModifier` / `name.id` / `valueFormat` / `showPercent`。
  3. 名称构建期先查 dict；dict 缺失的 id 收集后统一 `fetchI18nText(locale, id)` 全局回退（模式照搬 `SkillReferenceCard.tsx:93-102`）；仍失败 `name: ''`。
- `resolveAttrShow`：`entries = map[attrKeyOf(attr)]`；条目匹配 `entries.find(e => e.attributeModifier === attr.modifierType) ?? entries[0]`；无 entries 返回 `null`。
- **不引用** `AttributeMetaTable`；调用方对 `null` 或空 `name` 兜底 `t('common.unknownAttr')`，禁止出现「属性N」占位。

### 3.3 适配器 `src/lib/adapter.ts`

#### 3.3.1 `adaptAttr` 透传 `compositeAttr`

```ts
function adaptAttr(raw: any): EquipAttr {
  return {
    attrType: raw.attrType ?? 0,
    compositeAttr: raw.compositeAttr ?? '',
    value: raw.attrValue ?? 0,
    enhancedValues: raw.enhancedAttrValues ?? [],
    modifierType: raw.modifierType ?? 0,
  }
}
```

#### 3.3.2 新增纯函数 `buildEnhanceMaterialGroups`

```ts
export function buildEnhanceMaterialGroups(
  equip: Equip,
  allEquips: Equip[],
  enhanceRarity: number,
): EnhanceMaterialGroup[] {
  const enhanceable = equip.attrs.filter((a) => a.enhancedValues.length > 0)
  const pool = allEquips.filter(
    (e) => e.id !== equip.id && e.partType === equip.partType && e.rarity >= enhanceRarity,
  )
  return enhanceable.map((attr) => {
    const key = attrKeyOf(attr)
    const materials = pool
      .flatMap((e) => {
        const m = e.attrs.find((a) => attrKeyOf(a) === key)
        return m ? [{ equip: e, attrValue: m.value }] : []
      })
      .sort((a, b) =>
        b.attrValue - a.attrValue || b.equip.rarity - a.equip.rarity || b.equip.minWearLv - a.equip.minWearLv,
      )
    return { attr, materials }
  })
}
```

放 `adapter.ts`（数据组装职责），`attrKeyOf` 从 `attributeShow.ts` 导入；纯函数便于单测。

### 3.4 Hook `src/hooks/useData.ts`

`useEquipDetail`（612-658 行）改动：

- 删除现有 `enhanceMaterials` 过滤/排序逻辑（639-642 行），改为：
  ```ts
  const enhanceRarity = constRaw.enhanceEquipRarity ?? 5
  const enhanceMaterialGroups = buildEnhanceMaterialGroups(equip, allEquips, enhanceRarity)
  ```
- 返回值中 `enhanceMaterials` 替换为 `enhanceMaterialGroups`；其余（suit/suitEquips/enhanceCost/recipes）不变。
- `getAttributeMap`（干员用）**不动**。

### 3.5 卷宗页 `src/pages/equipment/EquipmentDetail.tsx`

1. **删除**本地 `useAttrMap`（45-75 行）与 `AttrInfo` 接口；改为：
   ```ts
   const [attrShowMap, setAttrShowMap] = useState<AttrShowMap>({})
   useEffect(() => {
     let cancelled = false
     getAttrShowMap(locale).then((m) => { if (!cancelled) setAttrShowMap(m) })
     return () => { cancelled = true }
   }, [locale])
   ```
2. `AttrRow` 改为接收 `info: AttrShowInfo | null`：名称 `info?.name || t('common.unknownAttr')`；格式化 `formatAttributeShow(info ?? { valueFormat: '{value}', showPercent: false }, value)`。调用处 `resolveAttrShow(attrShowMap, attr)`。
3. 套装区：
   - 徽记 `<SuitLogo logoName={suit.logoName} />` 替换 184-191 行的 `<img>`。
   - `<SkillReferenceCard skillId defaultLevel hideNameWhenMissing />`（197-200 行追加 prop）。
   - `suitEquips` 卡片 `<EquipCard interactive="tooltip" />`（205-207 行）。
4. 精锻材料区（213-232 行重写为分组渲染）：
   - 标题与 hint、`enhanceCost` 展示不变。
   - `enhanceMaterialGroups.length === 0` → 整体空态 `t('equipment.noEnhanceMaterial')`。
   - 否则逐组渲染：
     - 组标题：`resolveAttrShow(attrShowMap, group.attr)` 的名称（空则 `t('common.unknownAttr')`），样式沿用区域小标题（`text-[10px] text-archive-dust uppercase tracking-wide`）。
     - 组内材料：`EquipCard interactive="tooltip"` 网格（沿用 `grid-cols-4 sm:grid-cols-6 gap-2`），每张卡片下方追加一行数值：`<span className="text-[10px] text-archive-gold font-mono">{formatAttributeShow(info, item.attrValue)}</span>`（`info` 每组解析一次复用）。
     - `materials.length === 0` 的组展示 `t('equipment.noEnhanceMaterialForAttr')`。

### 3.6 `EquipCard` 双模式 `src/components/Equipment/EquipCard.tsx`

```tsx
interface EquipCardProps {
  equip: Equip
  interactive?: 'link' | 'tooltip'  // 默认 'link'
}
```

- `link`：现有 `<Link>` 行为不变（列表页）。
- `tooltip`：渲染同样的卡片内容为 `<button type="button">`，本地 `useState(false)` 控制 `<ItemTooltipOverlay itemId={equip.id} onClose={() => setShow(false)} />`；交互模式照搬 `ItemPanel.tsx:94-114`。
- 卡片内容（图标/色条/名称/部位）抽取为组件内 `content` 片段，两模式复用。

### 3.7 `SkillReferenceCard` 名称隐藏 `src/components/skills/SkillReferenceCard.tsx`

- props 新增 `hideNameWhenMissing?: boolean`（默认 `false`，不影响武器/干员等现有调用方）。
- 137 行名称渲染改为：
  ```tsx
  const displayName = current.skillName || skillGroupName || (hideNameWhenMissing ? '' : skillId)
  ```
  `displayName` 非空才渲染 `<span>`；头部其余（图标、等级徽标）不变。套装技能 `iconId` 亦为空，头部自然只剩右侧等级徽标。

### 3.8 `EquipTooltipPanel` 迁共享工具 `src/components/Equipment/EquipTooltipPanel.tsx`

- 删除内联属性解析（70-90 行中 `AttributeMetaTable`/`AttributeShowConfigTable` 加载与 map 构建），改为 `getAttrShowMap(locale)` + `resolveAttrShow`。
- `AttributeMetaTable` 不再加载；表加载从 7 项减为 6 项。名称兜底 `t('common.unknownAttr')`。

### 3.9 `RecipePanel` fit-content `src/components/Craft/RecipePanel.tsx`

- 容器（16 行）：`space-y-3` → `flex flex-wrap items-start gap-3`。
- 卡片（18 行）：追加 `w-fit max-w-full`。
- 其余结构不变；`max-w-full` 保证窄屏不横向溢出。

### 3.10 套组徽记 `src/components/Equipment/SuitLogo.tsx`

```tsx
export default function SuitLogo({ logoName, className }: { logoName: string; className?: string }) {
  if (!logoName) return null
  return (
    <img
      src={`${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/equipmentlogobigwhite/${logoName}.png`}
      alt=""
      className={`h-7 w-auto object-contain ${className ?? ''}`}
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
    />
  )
}
```

- `EquipmentList.tsx`（168-175 行）与 `EquipmentDetail.tsx`（184-191 行）统一替换；列表组头 `h-7 w-auto`，卷宗套装区可传 `className="h-8"` 微调。
- 资源结论（已实测）：`equipmentlogobig` 为 256×148 黑色字标（深色主题不可见），`equipmentlogobigwhite` 为白色变体；`equipmentlogo/` 仅 11 个通用图标、无按套组资源，不可用。

### 3.11 i18n（`scripts/i18n-custom.json`，14 语言全量）

新增 2 个 key。经游戏数据 API 检索（`/i18n/search/all/未知属性`、`/i18n/search/all/精锻`），**均无可用官方文案**，两个 key 全部为自译；术语与各语言官方「精锻」译名对齐（`equipment.enhancedValue` 已收录：EN Artifice / JP 精密加工 / KR 정밀 단조 / RU Доработка / MX Elaborar / BR Aprimorar / DE Veredeln / FR Renforcer / VN Chế Tác / TH อาร์ติไฟซ์ / ID Tingkatkan / IT Artificio）。

#### key × CN/TC/EN/JP/KR/RU/MX

| key | CN | TC | EN | JP | KR | RU | MX |
|-----|----|----|----|----|----|----|----|
| `common.unknownAttr` | 未知属性 | 未知屬性 | Unknown Attribute | 不明な属性 | 알 수 없는 속성 | Неизвестный параметр | Atributo desconocido |
| `equipment.noEnhanceMaterialForAttr` | 暂无适配该词条的精锻材料 | 暫無適配該詞條的精鍛材料 | No artifice materials for this stat | この効果に適した精密加工素材がありません | 해당 속성에 맞는 정밀 단조 재료 없음 | Нет материалов доработки для этого параметра | No hay materiales de elaboración para este atributo |

#### key × BR/DE/FR/VN/TH/ID/IT

| key | BR | DE | FR | VN | TH | ID | IT |
|-----|----|----|----|----|----|----|----|
| `common.unknownAttr` | Atributo desconhecido | Unbekannter Wert | Attribut inconnu | Thuộc tính không xác định | คุณสมบัติที่ไม่ทราบ | Atribut tidak diketahui | Attributo sconosciuto |
| `equipment.noEnhanceMaterialForAttr` | Nenhum material de aprimoramento para este atributo | Keine Veredelungsmaterialien für diesen Wert | Aucun matériau de renforcement pour cette stat | Chưa có nguyên liệu chế tác cho chỉ số này | ไม่มีวัสดุอาร์ติไฟซ์สำหรับค่าสถานะนี้ | Belum ada bahan penyempurnaan untuk atribut ini | Nessun materiale di artificio per questo attributo |

流程：写入 `scripts/i18n-custom.json` → `node scripts/generate-i18n-dicts.ts` → `node scripts/verify-i18n.ts` → `npm run lint && npm run test && npm run build`。

### 3.12 陷阱登记 `docs/engineering/references/data-pitfalls.md`

追加两条（格式沿用该文件现有条目）：

1. **装备组合属性**：`displayAttrModifiers` 中组合属性 `attrType=0`，名称必须经 `CompositeAttributeShowConfigTable[compositeAttr]` 解析；`AttributeShowConfigTable` 按数字 attrType 查不到，且禁止按 `CompositeAttributeTable` 的构成子属性做词条匹配。
2. **套组徽记变体**：`equipmentlogobig` 为 256×148 黑色字标（深色背景不可见、不可压方形框），深色主题必须用 `equipmentlogobigwhite` 并保持原始宽高比。

## 4. 实现顺序

### 阶段一：数据层（第 1 轮提交）

- `types.ts`（compositeAttr、EnhanceMaterialGroup、EquipDetail 签名）。
- `attributeShow.ts` + `attributeShow.test.ts`（单测先行）。
- `adapter.ts`（`adaptAttr` 透传 + `buildEnhanceMaterialGroups`）+ `adapter.test.ts` 增补。
- `useData.ts`（`useEquipDetail` 分组接入）。

### 阶段二：组件层（第 2 轮提交）

- `EquipCard` 双模式、`SuitLogo`、`SkillReferenceCard.hideNameWhenMissing`、`RecipePanel` fit-content（含组件测试更新）。

### 阶段三：页面接入（第 3 轮提交）

- `EquipmentDetail`（属性链路/技能名/tooltip 点击/精锻分组）、`EquipmentList`（SuitLogo）、`EquipTooltipPanel` 迁共享工具。

### 阶段四：多语言（第 4 轮提交）

- `i18n-custom.json` +2 key × 14 语言 → `generate-i18n-dicts.ts` → `verify-i18n.ts`。

### 阶段五：测试、文档与全量验证（第 5 轮提交）

- E2E 增补、`data-pitfalls.md` 登记；`npm run lint && npm run test && npm run build`。

## 5. 测试计划

### 5.1 单元测试

`src/lib/__tests__/attributeShow.test.ts`：

- `attrKeyOf`：compositeAttr 优先；空 compositeAttr 回退 String(attrType)。
- `resolveAttrShow`：按 `modifierType` 匹配条目；无匹配回退 `list[0]`；key 不存在返回 `null`；组合属性 key（`AllSkillDamageIncrease`）解析出名称与 `{value:0.0%}` 格式。
- 格式化联动：`formatAttributeShow({ valueFormat: '{value:0.0%}', showPercent: true }, 0.276)` → `27.6%`（`formatText.ts:35-45` 已支持 `:0.0%`，回归断言即可）。

`src/lib/__tests__/adapter.test.ts` 增补：

- `adaptEquip`：`compositeAttr` 透传（含缺省 → `''`）。
- `buildEnhanceMaterialGroups`：
  - 仅 `enhancedValues` 非空的词条成组；
  - 候选池过滤（同部位、稀有度阈值、排除自身）；
  - 匹配按 `attrKeyOf`（构造「材料含 attrType=33 普通词条、目标含 AllSkillDamageIncrease 组合词条」用例，断言**不**误匹配）；
  - 组内 attrValue 降序、同值 tie-break；
  - 空材料组保留。

### 5.2 组件测试

- `SkillReferenceCard`：`hideNameWhenMissing` 且 skillName 缺失时不渲染名称与 skillId；默认行为不变（仍回退 skillId）。
- `EquipCard`：tooltip 模式点击弹出 `ItemTooltipOverlay`；link 模式仍为 `<Link>`。
- `RecipePanel`：卡片含 `w-fit` class（更新现有 `RecipePanel.test.tsx`）。

### 5.3 E2E（`tests/e2e/src/equipment.spec.ts` 增补）

- `item_equip_t4_suit_atk02_edc_05` 卷宗：
  - 属性区出现「所有技能伤害加成」且不出现「属性0」；该词条数值含 `%`。
  - 套装区不出现 `passive_equipsuit_` 文本。
  - 精锻材料区出现「智识」「力量」「所有技能伤害加成」三个分组标题；任一分组内首个材料数值 ≥ 后续。
  - 点击套组内装备卡片：弹出 Tooltip（含「查看卷宗」），URL 不变。
- 列表页：分组徽记 `img` 的 `src` 含 `equipmentlogobigwhite`。

## 6. 验收标准

- [ ] 任意装备卷宗属性区无「属性N」占位；组合属性名称与百分比格式正确（`0.276` → `27.6%`）。
- [ ] 套装效果无名称时不展示名称与 skillId；武器技能卡片行为不变。
- [ ] 卷宗内点击装备（套组/精锻材料）弹 ItemTooltip 且不跳转；列表页卡片跳转行为不变。
- [ ] 精锻材料按可精锻词条分组，组内展示材料词条数值且降序；空组/整体空态文案正确。
- [ ] 配方卡片 fit-content，窄屏不溢出。
- [ ] 分组徽记为白色变体、原始宽高比，深色背景清晰可辨。
- [ ] 2 个新 key 14 语言全量，`verify-i18n.ts` 通过。
- [ ] `npm run lint`、`npm run test`、`npm run build` 通过。

## 7. 风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| `CompositeAttributeShowConfigTable` i18n 字典覆盖不全 | 组合属性名为空 | `fetchI18nText` 回退 + `common.unknownAttr` 兜底；E2E 断言关键词条 |
| 个别词条 `modifierType` 与配置 `attributeModifier` 不匹配 | 选错条目 | 匹配失败回退 `list[0]`；单测覆盖 |
| `EquipDetail` 签名变更遗漏消费方 | 运行时空值 | 仅两个消费方，TypeScript 编译期全量兜底 |
| `equipmentlogobigwhite` 个别徽记缺失 | 组头缺图 | `onError` 隐藏，仅展示套组名 |
| 共享工具引入循环依赖（attributeShow ↔ adapter） | 构建失败 | `attributeShow.ts` 不依赖 `adapter.ts`（`ASSET_BASE` 不需要）；`adapter.ts` 单向导入 `attrKeyOf` |

回滚策略：全部为增量修改，可回滚至 `feat/equipment-archive` 当前 HEAD（`9353f5a`），不影响其他模块。

## 8. 相关文档

- [[20260721-equipment-archive|装备图鉴产品方案（docs/product/draft，v1.1）]]
- [[20260721-equipment-archive-acceptance|装备图鉴验收修复技术方案]]
- [装备图鉴实现方案 v1.0](./20260721-equipment-archive-plan.md)
- [数据表映射参考](../references/data-mapping-tables.md)
- [数据层常见陷阱](../references/data-pitfalls.md)
- [国际化规范](../references/i18n-spec.md)
