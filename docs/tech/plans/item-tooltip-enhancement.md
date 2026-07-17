# ItemTooltip 增强计划

## 背景

对齐 TianShiTools 的 tooltip 功能，包含：
1. 用 ItemType 枚举替代魔法字符串判断武器
2. 武器技能面板复用（WeaponDetail + ItemTooltip 共用）
3. formatBlackboard 一元负号修复（复合表达式支持）
4. 宝箱内容组件化展示

---

## 1. ItemType 枚举迁移

### 目标
用类型安全的 `ItemType` 枚举替代 `Item.type: string`。

### 改动清单

#### 1a. `src/data/constants.ts` — 新增全量 ItemType

从 TianShiTools `Items.cs` 搬入所有 enum member，不遗漏。

```typescript
export const ITEM_TYPE = {
  Gold: 1,
  Diamond: 2,
  Char: 4,
  Weapon: 5,
  Equip: 6,
  CardExp: 7,
  Material: 8,
  // ... 全部 80+ members
} as const

export type ItemType = (typeof ITEM_TYPE)[keyof typeof ITEM_TYPE]
```

#### 1b. `src/lib/types.ts` — Item.type 类型变更

```typescript
export interface Item {
  id: string
  name: string
  type: ItemType           // string → ItemType (number)
  // ... 其余不变
}
```

#### 1c. `src/lib/adapter.ts` — adaptItem 解析 raw.type 为 number

```typescript
type: Number(raw.type) ?? 0,
```

`Number()` 对数值字符串和数字都安全。

#### 1d. 调用方适配（5 处）

| 文件 | 行 | 当前写法 | 改为 |
|------|-----|----------|------|
| `ItemList.tsx:102` filter options | `String(i.type)` | `i.type`（去掉 String） |
| `ItemList.tsx:143` filter compare | `String(i.type) !== typeFilter` | `typeFilter` 改为 number，直接 `i.type !== typeFilter` |
| `ItemList.tsx:157` sort | `Number(a.type) - Number(b.type)` | `a.type - b.type` |
| `ItemList.tsx:169` group | `String(item.type)` | `item.type` 直接作为 key |
| `ItemTooltip.tsx` 武器判断 | `itemId.startsWith('wpn_')` | `Number(itemData.type) === ITEM_TYPE.Weapon` |

#### 1e. Diff 相关文件

`ItemChangePanel.tsx` / `useItemAggregatedDiff.ts` 中 `type` 字段已是 number，仅需在显示类型名时用 `ITEM_TYPE` 常量反向查找代替现有 `Number(key)` → `typeMap` 模式。`typeMap` 构建方式不变。

---

## 2. WeaponSkillPanel 复用

### 目标
抽出共享组件，消除 `WeaponDetail.tsx` 与 `ItemTooltip.tsx` 中的重复技能渲染逻辑。

### 新文件
`src/components/Weapons/WeaponSkillPanel.tsx`

### 接口
```typescript
interface WeaponSkillPanelProps {
  weaponId?: string       // tooltip 模式：按 weaponId 自动取 skillIds
  skillIds?: string[]     // detail 模式：外部已取好 skillIds（来自 adapted Weapon.skills）
  showLevelSlider?: boolean // 默认 false，tooltip 不展示，detail 展示
}
```

### 内部逻辑
- 如果 `weaponId` 提供且 `skillIds` 未提供，自动 fetch `WeaponBasicTable` 拿 `weaponSkillList`
- 统一 fetch `SkillPatchTable` + i18n 解析所有技能数据
- `showLevelSlider=true`：完整 slider，按选中等级渲染
- `showLevelSlider=false`：直接取每个 skill 的 `SkillPatchDataBundle` 末级数据渲染

### 调用方修改
```tsx
// WeaponDetail.tsx
// 原: <WeaponSkills weaponId={weapon.id} skillIds={weapon.skills} />
// 改:
<WeaponSkillPanel skillIds={weapon.skills} showLevelSlider />

// ItemTooltip.tsx
// 删除 inline fetch + render 代码
// 改:
<WeaponSkillPanel weaponId={item.id} />
```

---

## 3. formatBlackboard 一元负号修复

### 当前问题
`compile()` 只对 2-token 模式 `{-x}` 做短路优化。`{-x + 5}` 被 tokenize 为 `['-', 'x', '+', '5']`（4 tokens），不匹配短路，fall through 到 `parseAndEval`。Shunting-yard 把首位的 `-` 当作二元运算符，导致 `output.pop()` 空栈 → `NaN`。

### 修复方案
在 `tokenize` 中区分一元负号（`u`）和二元减号（`-`）。

#### 3a. `tokenize()` 修改
```typescript
// match[2] 分支处理 operator
const ch = match[2]
if (ch === '-') {
  const prev = tokens[tokens.length - 1] ?? null
  const isUnary = !prev || prev.value === '(' || prev.type === 'op'
  tokens.push({ type: 'op', value: isUnary ? 'u' : '-' })
} else {
  tokens.push({ type: 'op', value: ch })
}
```

判定规则：
- token 流为空 → 一元
- 前一个是 `(` → 一元
- 前一个是 operator → 一元
- 其余 → 二元（前一个是 variable/number/`)'`）

#### 3b. `compile()` 短路更新
```typescript
if (tokens.length === 2 && tokens[0].value === 'u' && tokens[1].type === 'number') {
  const val = -Number(tokens[1].value)
  return () => val
}
if (tokens.length === 2 && tokens[0].value === 'u' && tokens[1].type === 'variable') {
  const name = tokens[1].value
  return (vars) => -(vars[name] ?? 0)
}
```

#### 3c. `parseAndEval()` 更新
```typescript
const prec = { '+': 1, '-': 1, '*': 2, '/': 2, 'u': 3 }

function applyOp() {
  const op = ops.pop()!
  if (op === 'u') {
    const a = output.pop() as number
    output.push(-a)
    return
  }
  // ... 二元处理不变
}
```

一元 `'u'` 直接入栈（不触发 precedence 检查），二元运算符遇到栈顶 `'u'` 时因 `prec['u'] >= prec[op]` 优先 apply。

#### 3d. 追踪验证

| 表达式 | Tokens | parseAndEval 结果 |
|--------|--------|-------------------|
| `{-x + 5}` (x=10) | `['u', 'x', '+', '5']` | `-10 + 5 = -5` |
| `{x + -y}` (x=10, y=5) | `['x', '+', 'u', 'y']` | `10 + (-5) = 5` |
| `{-(x + 5)}` (x=10) | `['u', '(', 'x', '+', '5', ')']` | `-(15) = -15` |
| `{x * -y}` (x=10, y=5) | `['x', '*', 'u', 'y']` | `10 * (-5) = -50` |
| `{x--y}` (x=10, y=5) | `['x', '-', 'u', 'y']` | `10 - (-5) = 15` |
| `{-x}` (x=-10) | `['u', 'x']`（短路） | `-(-10) = 10` |

#### 3e. 新增单元测试（`formatText.test.ts`）

```typescript
it('handles compound expression with leading unary minus', () => {
  expect(formatBlackboard('{-x + 5}', { x: 10 })).toBe('-5')
})
it('handles unary minus after binary operator', () => {
  expect(formatBlackboard('{x + -y}', { x: 10, y: 5 })).toBe('5')
})
it('handles unary minus before parenthesized expr', () => {
  expect(formatBlackboard('{-(x + 5)}', { x: 10 })).toBe('-15')
})
it('handles constant negative number', () => {
  expect(formatBlackboard('{-5}', {})).toBe('-5')
})
```

现有 5 条 `{-x}` 测试保持不变。

#### 3f. 改动规模
仅 `src/lib/formatText.ts` 一个文件，+10/-6 行。

---

## 4. 宝箱内容组件化

参见 TianShiTools 数据流：

```
UsableItemChestTable[itemId].rewardIdList[]
  ├── RewardTable["reward_xxx"].itemBundles[]
  │     └── { id: "item_diamond", count: 1 }         → 固定奖励
  └── RewardTable["reward_xxx"].probItemBundles[]
        └── { id: "item_gold", count: 2000 }          → 随机奖励
```

注意：`rewardIdList` 中的 ID 是 **RewardTable** 的 key，不是 ItemTable 的 key。需先用 `RewardTable` 解析出物品 bundle 列表。

### 新文件
`src/components/Items/RewardPanel.tsx`

### 接口
```typescript
interface RewardPanelProps {
  rewardIds: string[]               // UsableItemChestTable.rewardIdList
  rewardTable: Record<string, any>  // RewardTable raw data
  itemTable: Record<string, any>    // ItemTable raw data
  i18nMap: Record<string, string>   // ItemTable i18n dict
}
```

### 逻辑
- 遍历 `rewardIds` → `RewardTable[rewardId]`
- 收集 `itemBundles` 展平到固定列表，`probItemBundles` 展平到随机列表
- 同 item ID 的 bundle 合并数量（count rollup）
- 分别渲染两栏（中间有分隔线）：
  - **固定奖励**：`<ItemIcon>` + 名称 + `×{count}`
  - **随机奖励**：同上
- 对应列表为空时，不渲染该区域

### 调用方修改
```tsx
// ItemTooltip.tsx — load 函数中新增
if (chest?.rewardIdList?.length) {
  const rewardRaw = await getCachedData<Record<string, any>>(
    'RewardTable', () => fetchTableAll('RewardTable')
  )
  if (!cancelled) setRewardTable(rewardRaw)
}

// render 处
{rewardTable && itemChest?.rewardIdList && (
  <RewardPanel
    rewardIds={itemChest.rewardIdList}
    rewardTable={rewardTable}
    itemTable={itemTable}
    i18nMap={i18nMap}
  />
)}
```

---

## 实施顺序

1. `formatText.ts` 一元负号修复 + 新增测试 → `vitest run` ✅
2. `ITEM_TYPE` 常量 + `Item` 类型变更 + `adaptItem` 更新 ✅
3. 逐一修复调用方（ItemList / ItemTooltip） ✅
4. 新建 `WeaponSkillPanel` 组件 ✅
5. `WeaponDetail` / `ItemTooltip` 切到新组件 ✅
6. 新建 `RewardPanel` 组件（RewardTable 解析 + 固定/随机分离）
7. `ItemTooltip` 新增 RewardTable fetch + 传入 RewardPanel
8. `npx tsc --noEmit` + `npm run build` 验证

---

## 预期改动规模

| 文件 | 操作 | 行数 |
|------|------|------|
| `src/data/constants.ts` | 新增 ITEM_TYPE 常量 | +90 |
| `src/lib/types.ts` | Item.type 类型变更 | 1 |
| `src/lib/adapter.ts` | adaptItem type 解析 | 1 |
| `src/pages/items/ItemList.tsx` | sort 中去掉 Number | -2 |
| `src/lib/formatText.ts` | 一元负号修复 | +10/-6 |
| `src/lib/__tests__/formatText.test.ts` | 新增 4 条测试 | +12 |
| `src/components/Weapons/WeaponSkillPanel.tsx` | 新建 | +120 |
| `src/pages/weapons/WeaponDetail.tsx` | 切到新组件 | -103 |
| `src/components/Items/ItemTooltip.tsx` | 3 处修改 + 切组件 | -60/+30 |
| `src/components/Items/RewardPanel.tsx` | 新建 | +55 |

已实现项标记 ✅
