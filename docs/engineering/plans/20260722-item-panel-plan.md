---
description: 物品组件规范化（ItemPanel）代码实现方案
type: Fleeting
---

# 物品组件规范化（ItemPanel） - 实现方案

**对应产品文档**: [[20260722-item-panel|物品组件规范化（ItemPanel）]]
**对应技术方案**: [[20260722-item-panel|物品组件规范化（ItemPanel） - 技术提案]]（v1.4）
**实现方案版本**: v1.0
**创建日期**: 2026-07-22
**作者**: 前端工程
**开发分支**: `feat/item-panel`

## 1. 概述

### 1.1 目标

将已评审通过的技术提案（v1.4）转化为可执行的代码实现清单：

1. 收敛 `RARITY_COLORS`（12 处重复）与 `getItemIconUrl`（7 处重复）到公共模块，星级符号统一 `★`。
2. 新增通用渐变框架 `RarityFrame` 与物品基础件（`AmountBadge`、`ItemTile`、`ItemBar`）。
3. 以组合方式实现场景组件（`WeaponBar`、`EquipBar`、`PartBadge`、`RarityFilterSelect`）。
4. 全场景迁移：武器/装备图鉴长条化，干员材料、道具材料、搜索、宝箱、Diff 面板接入统一组件，删除旧 `ItemPanel`。
5. 稀有度筛选下拉星级化（道具材料、武器、装备）。

### 1.2 范围

- **做**：技术方案 §1.3「做」的全部内容。
- **不做**：数据模型/适配器/接口变更；干员组件重构（仅交付其可复用的 `RarityFrame`）；工厂系统；物品独立卷宗页。

## 2. 代码变更总览

### 2.1 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/lib/icons.ts` | `getItemIconUrl` 单一定义 |
| `src/components/RarityFrame.tsx` | 通用渐变框架（色条置底满宽、名称可选、有名称才有渐变、不限高宽） |
| `src/components/RarityStars.tsx` | 星级着色展示（由 `Rarity.tsx` 迁移，保留 `Rarity` 别名导出） |
| `src/components/RarityFilterSelect.tsx` | 稀有度筛选下拉（星级 + 选项着色） |
| `src/components/Items/AmountBadge.tsx` | 数量角标（右上角，k 缩写） |
| `src/components/Items/ItemTile.tsx` | 正方形物品方块（取代 ItemPanel） |
| `src/components/Items/ItemBar.tsx` | 长条外壳（左 ItemTile + 右 children） |
| `src/components/Weapons/WeaponBar.tsx` | 武器场景组合（右侧 3 个技能名，一行一个） |
| `src/components/Equipment/EquipBar.tsx` | 装备场景组合（badge 部位 + 基础/附加属性分行） |
| `src/components/Equipment/PartBadge.tsx` | 部位角标（ItemTile badge 槽位） |
| `src/components/__tests__/RarityFrame.test.tsx` | RarityFrame 组件测试 |
| `src/components/__tests__/RarityFilterSelect.test.tsx` | 筛选下拉组件测试 |
| `src/components/Items/__tests__/ItemTile.test.tsx` | ItemTile 组件测试 |
| `src/components/Items/__tests__/ItemBar.test.tsx` | ItemBar 组件测试 |
| `src/components/Items/__tests__/AmountBadge.test.tsx` | 角标与缩写测试 |
| `src/components/Weapons/__tests__/WeaponBar.test.tsx` | WeaponBar 组件测试 |
| `src/components/Equipment/__tests__/EquipBar.test.tsx` | EquipBar 组件测试 |

### 2.2 修改文件

| 文件路径 | 说明 |
|----------|------|
| `src/data/constants.ts` | 新增 `RARITY_COLORS` / `rarityColor` |
| `src/components/Rarity.tsx` | 改为 re-export `RarityStars`（兼容现有引用），色值收敛 |
| `src/components/Items/ItemIcon.tsx` | 删除本地 `getItemIconUrl`，改导入 `lib/icons` |
| `src/components/Items/ItemTooltip.tsx` | 收敛 `RARITY_COLORS` 引用 |
| `src/components/Items/RewardPanel.tsx` | `ItemPanel` → `ItemTile amount` |
| `src/components/Equipment/EquipCard.tsx` | 基于 `ItemTile` 重写（保留 link/tooltip 两种交互） |
| `src/components/Equipment/EquipTooltipPanel.tsx` | 收敛 `RARITY_COLORS` 引用 |
| `src/components/Search/EntityCards.tsx` | `ItemPanel` → `ItemTile` |
| `src/components/DiffViewer/ItemChangePanel.tsx` | 手写 `<img>` → `ItemTile`；`✦` → `RarityStars`；收敛常量 |
| `src/components/DiffViewer/WeaponChangePanel.tsx` | 同上 |
| `src/components/DiffViewer/EnemyChangePanel.tsx`、`OperatorDiff.tsx`、`CharacterDiff.tsx`、`OperatorChangePanel.tsx` | 仅收敛 `RARITY_COLORS` 引用 |
| `src/pages/items/ItemList.tsx` | `ItemPanel` → `ItemTile`；稀有度筛选 → `RarityFilterSelect` |
| `src/pages/weapons/WeaponList.tsx` | `WeaponCard` → `WeaponBar` 长条；稀有度筛选 → `RarityFilterSelect`；收敛常量 |
| `src/pages/weapons/WeaponDetail.tsx` | 头部手写 `<img>` → `RarityFrame` + `ItemIcon` + `RarityStars` 组合；收敛常量 |
| `src/pages/equipment/EquipmentList.tsx` | 列表条目 → `EquipBar` 长条；稀有度筛选 → `RarityFilterSelect` |
| `src/pages/equipment/EquipmentDetail.tsx` | 头部组合改造；强化材料费用 → `ItemTile amount`；收敛常量 |
| `src/pages/operators/OperatorDetail.tsx` | 材料/推荐武器 → `ItemTile`（`size` + `amount` / `href`） |

### 2.3 删除文件

| 文件路径 | 说明 |
|----------|------|
| `src/components/Items/ItemPanel.tsx` | 被 `ItemTile` 取代，调用方全部迁移后删除 |

## 3. 详细实现

### 3.1 常量收敛

**`src/data/constants.ts`** 追加：

```ts
export const RARITY_COLORS: readonly string[] = ['black', 'black', 'gray', '#26bbfd', '#9452fa', '#ffbb03', '#ef5a00']

export function rarityColor(rarity: number): string {
  return RARITY_COLORS[Math.min(Math.max(rarity, 1), 6)]
}
```

- 灰色系渲染：1 星 `text-archive-lead` / 2 星 `text-archive-dust`（`rarityColor` 返回的 `'black'`/`'gray'` 语义值在使用处映射为设计系统色；`RarityStars` 与 `RarityFrame` 内部统一处理）。
- 全站 12 处本地 `RARITY_COLORS` 删除并改导入；`✦` 全部替换为 `RarityStars`（`★`）。

**`src/lib/icons.ts`**：

```ts
import { ASSET_BASE } from './adapter'

export function getItemIconUrl(iconId: string): string {
  return `${ASSET_BASE}/assets/beyond/dynamicassets/gameplay/ui/sprites/itemicon/${iconId}.png`
}
```

- 7 处本地定义删除并改导入。

### 3.2 `RarityFrame`（通用渐变框架）

```tsx
interface RarityFrameProps {
  rarity: number
  name?: string
  children: ReactNode
  className?: string
}
```

```tsx
export default function RarityFrame({ rarity, name, children, className }: RarityFrameProps) {
  const color = rarityColor(rarity)
  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      {children}
      {name && (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
            style={{ background: `linear-gradient(to top, ${color}59, transparent)` }}
          />
          <span className="absolute inset-x-0 bottom-0.5 px-0.5 text-center text-[10px] leading-tight text-archive-ivory line-clamp-2">
            {name}
          </span>
        </>
      )}
      <div className="absolute inset-x-0 bottom-0 h-0.5" style={{ backgroundColor: color }} />
    </div>
  )
}
```

要点：

- 不限高宽，容器尺寸由调用方 `className` 决定；色条 `inset-x-0` 保证满宽置底。
- 不传 `name` 时不渲染渐变与名称，仅保留色条。
- 渐变不透明度（`59` hex ≈ 35%）实现时按视觉走查微调。
- 灰色系稀有度（1–2 星）色值取 `archive-lead`/`archive-dust` 对应 hex。

### 3.3 物品基础件

**`AmountBadge`**（`src/components/Items/AmountBadge.tsx`）：

```tsx
interface AmountBadgeProps { amount: number }

export function toCountString(amount: number): string {
  return amount > 10000 ? `${(amount / 1000).toFixed(1)}k` : `${amount}`
}

export default function AmountBadge({ amount }: AmountBadgeProps) {
  return (
    <span className="absolute top-0.5 right-0.5 rounded bg-archive-ink/80 px-0.5 text-[9px] font-mono text-archive-ivory">
      ×{toCountString(amount)}
    </span>
  )
}
```

**`ItemTile`**（`src/components/Items/ItemTile.tsx`）：

```tsx
export type ItemTileSize = 'sm' | 'md' | 'lg' | 'xl'
// sm: w-12 / md: w-16 / lg: w-20 / xl: w-24

interface ItemTileProps {
  itemId: string
  size?: ItemTileSize
  name?: string
  rarity?: number
  amount?: number
  badge?: ReactNode
  showName?: boolean
  showTips?: boolean
  href?: string
  className?: string
}
```

- 结构：`<RarityFrame rarity name={showName ? name : undefined} className="aspect-square w-{size}">` 包裹 `<ItemIcon>`（`w-full h-full object-cover`），叠加 `<AmountBadge>`（`amount` 传入时）与 `badge`（左上角 `absolute top-0.5 left-0.5`）。
- 名称/稀有度解析逻辑迁移自现有 `ItemPanel`（ItemTable + 词典缓存的 useEffect）。
- 交互：`href` → `<Link>`；否则 `<button>` 点击切换 `ItemTooltipOverlay`（保留 `DISABLED_TIP_ITEMS`）。遵循 frontend-spec：禁止 Link 嵌套。
- 外层卡片样式（`rounded border bg-archive-file hover:border-archive-gold/40`）仅用于网格/独立展示场景；嵌入 `ItemBar` 时通过 `className` 去除边框（边框由 ItemBar 外壳提供）。

**`ItemBar`**（`src/components/Items/ItemBar.tsx`）：

```tsx
interface ItemBarProps {
  itemId: string
  href: string
  size?: ItemTileSize          // 默认 lg；窄屏由调用方响应式处理
  badge?: ReactNode            // 透传给 ItemTile
  children: ReactNode
}
```

```tsx
<Link to={href} className="flex items-center gap-3 p-2 rounded border border-archive-border bg-archive-file hover:border-archive-gold/40 transition-colors">
  <ItemTile itemId={itemId} size={size} badge={badge} showTips={false} className="border-0 bg-transparent p-0 shrink-0" />
  <div className="flex-1 min-w-0">{children}</div>
</Link>
```

- ItemTile 在 Bar 内禁用自身 tooltip 与边框，点击行为由 Bar 的 Link 统一承担。
- 名称由 ItemTile 展示，children 不放名称。

### 3.4 场景组合组件

**`WeaponBar`**（`src/components/Weapons/WeaponBar.tsx`）：

```tsx
interface WeaponBarProps {
  weapon: Weapon
  skillNames: string[]
}
```

```tsx
<ItemBar itemId={weapon.id} href={`/archive/weapons/${weapon.id}`}>
  <div className="flex flex-col gap-0.5">
    {skillNames.slice(0, 3).map((n, i) => (
      <span key={i} className={`truncate text-[11px] ${i === 2 ? 'text-archive-gold' : 'text-archive-dust'}`}>{n}</span>
    ))}
  </div>
</ItemBar>
```

- 技能名为空数组时属性区渲染空（不渲染占位行）。
- 第 3 条（专属技能）用 `text-archive-gold` 区分，实现时按视觉走查确认。

**`PartBadge`**（`src/components/Equipment/PartBadge.tsx`）：

```tsx
interface PartBadgeProps { partType: number }
```

- 复用既有 `PART_NAMES`（`equipment.partBody/partHand/partEdc`）+ `useI18n()`，样式与 `AmountBadge` 同族：`absolute` 定位由 ItemTile badge 槽位提供，组件本身只渲染 `rounded bg-archive-ink/80 px-0.5 text-[9px] text-archive-ivory`。
- `PART_NAMES` 当前在 `EquipmentDetail.tsx` / `EquipTooltipPanel.tsx` 各自定义，收敛到 `PartBadge` 或 `data/constants.ts`。

**`EquipBar`**（`src/components/Equipment/EquipBar.tsx`）：

```tsx
interface EquipBarProps {
  equip: Equip
  attrShowMap: Record<string, AttrShowMapEntry>
}
```

```tsx
<ItemBar itemId={equip.id} href={`/archive/equipment/${equip.id}`} badge={<PartBadge partType={equip.partType} />}>
  <div className="flex flex-col gap-0.5">
    {baseAttr && <span className="text-xs text-archive-ivory">{baseAttrName} +{baseAttrValue}</span>}
    {attrs.map(a => <span className="text-[10px] text-archive-dust">{a.name} +{a.value}</span>)}
  </div>
</ItemBar>
```

- 属性经 `resolveAttrShow(attrShowMap, attr, t('common.unknownAttr'))` + `formatAttributeShow` 解析，与 `EquipTooltipPanel` 同口径。
- 基础属性行 `text-xs`，附加属性行 `text-[10px]`；均按实际数量渲染，无截断上限（数据上 2–3 条）。
- `attrShowMap` 由 `EquipmentList` 页面一次性 `getAttributeShowMap(locale)` 获取后传入。

**`RarityFilterSelect`**（`src/components/RarityFilterSelect.tsx`）：

```tsx
interface RarityFilterSelectProps {
  value: number | null
  onChange: (value: number | null) => void
  levels: number[]
  className?: string
}
```

- 原生 `<select>`，样式与列表页现有筛选下拉一致（深色背景 + 细边框）。
- 选项文本 `'★'.repeat(n)`，`style={{ color: rarityColor(n) }}`；首项为「全部」复用页面现有 i18n key。
- 接入 `ItemList`、`WeaponList`、`EquipmentList`，仅替换选项渲染，筛选状态与 `useMemo` 逻辑不动。

### 3.5 页面与调用方迁移要点

| 场景 | 迁移要点 |
|------|----------|
| `ItemList` | `ItemPanel` → `ItemTile`（默认 md，名称+稀有度不变）；筛选替换 |
| `OperatorDetail` 材料 | `ItemTile size="sm" amount={count} showName={false}` |
| `OperatorDetail` 推荐武器 | `ItemTile size="lg" showName={false} href={/archive/weapons/:id}` |
| `WeaponList` | 删除本地 `WeaponCard`/常量；条目 → `<WeaponBar weapon skillNames />`；网格改为 `grid grid-cols-1 sm:grid-cols-2 gap-2`（长条较宽，实现时按视觉走查定列数）；`skillNameMap` 逻辑保留 |
| `WeaponDetail` 头部 | 手写 `<img>` → `RarityFrame`（`w-20 aspect-square`，无 name）+ `ItemIcon` + `RarityStars`；其余头部结构不动 |
| `EquipmentList` | 条目 → `<EquipBar equip attrShowMap />`；页面新增 `getAttributeShowMap(locale)` 加载（`useEffect` + state，缓存由 `getCachedData` 保证）；分组/分页逻辑不动 |
| `EquipmentDetail` 头部 | 同 WeaponDetail；强化材料费用 `ItemPanel` → `ItemTile amount` |
| `EquipCard`（同套装网格） | 基于 `ItemTile` 重写，保留 `link` / `tooltip` 两种交互模式与现有尺寸 |
| `EntityCards` | `WeaponReferenceCard`/`ItemReferenceCard` 的 `ItemPanel` → `ItemTile`（`size`、`href`、`showTips` 对应迁移） |
| `RewardPanel` | `ItemPanel` → `ItemTile amount` |
| `ItemChangePanel`/`WeaponChangePanel` | 手写 `<img>` → `ItemTile size="sm" showTips={false}`；`✦` → `RarityStars`；变更计数等自有信息保留 |
| 其余 Diff 面板 | 仅收敛 `RARITY_COLORS` 引用，结构不动 |

### 3.6 i18n

- 无新增文案 key。`PartBadge` 复用 `equipment.part*`，`RarityFilterSelect` 复用页面现有「全部」key。
- 若实现时发现缺失 key，走标准流程：`scripts/i18n-custom.json` 补 14 语言 → `node scripts/generate-i18n-dicts.ts`。

## 4. 实现顺序

### 阶段一：常量收敛（第 1 轮提交）

1. `src/data/constants.ts` 新增 `RARITY_COLORS` / `rarityColor`。
2. `src/lib/icons.ts` 新增 `getItemIconUrl`。
3. 全站 12 处 `RARITY_COLORS`、7 处 `getItemIconUrl` 改导入，`✦` → `★`（本阶段先直接替换符号，`RarityStars` 落地后再统一接入）。
4. 校验：`npm run lint && npm run test && npm run build`。

### 阶段二：基础件（第 2 轮提交）

1. 新增 `RarityFrame`、`AmountBadge`、`RarityStars`（`Rarity.tsx` 改 re-export）。
2. 新增 `ItemTile`，迁移名称/稀有度解析逻辑。
3. 新增组件测试（RarityFrame / AmountBadge / ItemTile）。
4. 校验：lint / test / build。

### 阶段三：组合组件（第 3 轮提交）

1. 新增 `ItemBar`、`PartBadge`、`WeaponBar`、`EquipBar`、`RarityFilterSelect`。
2. `PART_NAMES` 收敛。
3. 新增组件测试（ItemBar / WeaponBar / EquipBar / RarityFilterSelect）。
4. 校验：lint / test / build。

### 阶段四：全场景迁移（第 4 轮提交）

1. 按 §3.5 表格迁移全部页面与组件。
2. 删除 `ItemPanel.tsx`。
3. grep 验证无残留：`RARITY_COLORS` 本地定义、`getItemIconUrl` 本地定义、`✦`、`ItemPanel` 引用。
4. 校验：lint / test / build。

### 阶段五：E2E 与回归（第 5 轮提交）

1. 新增/更新 E2E：武器列表长条+跳转、装备列表长条+跳转、星级筛选、干员材料提示、道具材料提示。
2. 更新受影响的既有 E2E 选择器（装备/武器列表卡片结构变化）。
3. 全量回归：`npm run lint && npm run test && npm run build` + E2E。

## 5. 测试计划

### 5.1 单元/组件测试

- `rarityColor`：边界值（0、1、2、6、7）。
- `toCountString`：9999、10000、10001、12345 → `12.3k`。
- `RarityFrame`：色条置底满宽；传 `name` 渲染渐变+底部居中名称；不传 `name` 无渐变。
- `ItemTile`：正方形（`aspect-square`）；`amount`/`badge` 槽位渲染；`showName` 开关；`href` → Link、无 `href` → button + tooltip。
- `ItemBar`：children 渲染、href 正确、ItemTile 不重复渲染边框。
- `WeaponBar`：3 个技能名一行一个，按实际数量渲染。
- `EquipBar`：部位角标渲染；基础属性行 `text-xs` 大于附加属性行；属性按实际数量渲染。
- `RarityFilterSelect`：选项星级与颜色；`onChange` 行为。

### 5.2 E2E 测试

- 武器图鉴：条目为长条结构（左方块 + 3 个技能名），点击进入武器卷宗；稀有度筛选显示星级且过滤正确。
- 装备图鉴：条目为长条结构（部位角标 + 基础/附加属性），点击进入装备卷宗；稀有度筛选同上。
- 干员卷宗：材料方块显示数量角标，点击弹出物品提示。
- 道具材料：点击物品弹出提示；稀有度筛选星级化。

### 5.3 回归校验

- `npm run lint`、`npm run test`、`npm run build` 全部通过。
- grep 确认无残留本地 `RARITY_COLORS` / `getItemIconUrl` / `✦` / `ItemPanel`。

## 6. 验收标准

- [ ] `RARITY_COLORS`、`getItemIconUrl` 全站单一定义，无重复；星级符号全站统一 `★`。
- [ ] `RarityFrame` 符合 scope：色条置底满宽、名称可选、有名称才有渐变、不限高宽。
- [ ] `ItemTile` 对外正方形，尺寸档位化，`amount`/`badge` 组合槽位可用。
- [ ] 武器图鉴列表为长条（左方块 + 3 个技能名一行一个），点击跳转卷宗。
- [ ] 装备图鉴列表为长条（部位角标 + 基础属性大字行 + 附加属性各一行），点击跳转卷宗。
- [ ] 道具材料/武器/装备稀有度筛选使用星级且选项着色。
- [ ] §3.5 所有场景接入统一组件，无手写物品 `<img>`；`ItemPanel.tsx` 已删除。
- [ ] `npm run lint`、`npm run test`、`npm run build`、E2E 全部通过。

## 7. 风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 渐变托底遮挡图标主体 | 视觉受损 | 渐变高度/透明度视觉走查微调；`showName` 可关闭 |
| ItemPanel 删除遗漏调用方 | 构建报错 | TypeScript 编译期发现；阶段四 grep 全量核对 |
| 原生 `<select>` option 着色浏览器差异 | 部分浏览器选项无颜色 | 渐进增强，星级文本始终可读 |
| 长条改造影响列表筛选/分页 | 功能回退 | 仅替换条目渲染，不动 `useMemo` 逻辑；E2E 覆盖 |
| 稀有度色值收敛引起视觉差异 | 2 星/6 星颜色变化 | 遵循 common-rules 约定，属预期内统一 |
| 装备列表新增 attrShowMap 加载 | 首屏多一次表请求 | `getCachedData` 缓存；与装备表并行加载 |

回滚策略：纯展示层重构，无数据与契约变更，按阶段提交可逐阶段回滚。

## 8. 相关文档

- [[20260722-item-panel|物品组件规范化（ItemPanel）PRD]]
- [[20260722-item-panel|物品组件规范化（ItemPanel） - 技术提案]]
- [通用开发规范](../common-rules.md)
- [前端开发规范](../frontend-spec.md)
- [UI 常见陷阱参考](../references/ui-pitfalls.md)
- [国际化规范](../references/i18n-spec.md)
