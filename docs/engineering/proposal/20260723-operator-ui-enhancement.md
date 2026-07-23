---
description: 干员界面优化技术方案 — OperatorPortraitCard 组件设计与页面改造
type: Permanent
---

# 干员界面优化技术方案

## 概述

创建通用干员竖向卡片组件 `OperatorPortraitCard`，替换干员档案、种族、阵营三个页面的现有卡片展示。复用 `RarityFrame` 底层能力，不直接使用 `ItemTile`。

## 新组件：OperatorPortraitCard

**文件**: `src/components/Operators/OperatorPortraitCard.tsx`

### 接口定义

```typescript
interface OperatorPortraitCardProps {
  /** 干员唯一标识 */
  id: string
  /** 干员名称 */
  name: string
  /** 干员头像 URL */
  portrait: string
  /** 稀有度等级 0-6 */
  rarity: number
  /** 可选：职业图标 URL（左上角徽章） */
  professionIcon?: string
  /** 可选：元素图标 URL（右上角徽章） */
  elementIcon?: string
  /** 可选：元素颜色（用于元素图标发光效果） */
  elementColor?: string
  /** 卡片尺寸预设 */
  size?: 'sm' | 'md' | 'lg'
  /** 自定义类名 */
  className?: string
}
```

### 尺寸预设

| size | 宽高 | 用途 |
|------|------|------|
| `sm` | 76×106 | 种族/阵营页面成员展示 |
| `md` | 114×159 | 干员档案默认展示 |
| `lg` | 152×212 | 参考尺寸/详情场景 |

### 视觉结构

```
┌───────────────────────┐
│ [professionIcon]      │ ← 左上角可选职业徽章
│              [element]│ ← 右上角可选元素徽章
│                       │
│     干员头像           │ ← object-cover 填充
│     (portrait)        │
│                       │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ ← RarityFrame 渐变遮罩
│        干员名称        │ ← RarityFrame 名称文字
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ ← RarityFrame 稀有度色条
└───────────────────────┘
```

### 实现伪代码

```tsx
export default function OperatorPortraitCard({
  id, name, portrait, rarity,
  professionIcon, elementIcon, elementColor,
  size = 'md', className,
}: OperatorPortraitCardProps) {
  return (
    <Link to={`/archive/operators/${id}`} className={/* size + border + hover */}>
      <RarityFrame rarity={rarity} name={name} size={size对应} className="w-full h-full">
        <img src={portrait} alt={name} className="w-full h-full object-cover" />
        {/* 左上角职业徽章 */}
        {professionIcon && <img src={professionIcon} className="absolute top-1 left-1 ..." />}
        {/* 右上角元素徽章 */}
        {elementIcon && <img src={elementIcon} className="absolute top-1 right-1 ..." />}
      </RarityFrame>
    </Link>
  )
}
```

### 复用关系

| 底层组件 | 用途 | 来源 |
|---------|------|------|
| `RarityFrame` | 稀有度色条 + 渐变遮罩 + 名称覆盖 | `src/components/RarityFrame.tsx` |
| `rarityColor()` | 稀有度颜色计算 | `src/data/constants.ts`（RarityFrame 内部使用） |

**不复用** `ItemTile`/`ItemIcon`（干员用 portrait 而非物品图标系统）。

---

## 页面改造

### 1. OperatorList.tsx

**文件**: `src/pages/operators/OperatorList.tsx`

**改动范围**:
- 导入 `OperatorPortraitCard`
- 替换分组视图卡片渲染（约 L216-269）
- 替换非分组视图卡片渲染（约 L276-330）
- Grid 列数从 `grid-cols-2 sm:grid-cols-3 md:grid-cols-4` 改为 `grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8`

**不变**: 筛选、排序、分组逻辑保持原样。

**改动前后对比**:

```diff
- <Link key={op.id} to={`/archive/operators/${op.id}`} className="block p-4 ...">
-   <div className="flex gap-3">
-     <div className="w-14 h-14 ..."><img src={op.portrait} /></div>
-     <div>名称 + 稀有度 + 种族 + 阵营</div>
-   </div>
-   <div>元素 + 职业 + 属性</div>
-   <div>标签</div>
- </Link>

+ <OperatorPortraitCard
+   key={op.id}
+   id={op.id}
+   name={op.name}
+   portrait={op.portrait}
+   rarity={op.rarity}
+   professionIcon={op.professionIcon}
+   elementIcon={op.elementIcon}
+   elementColor={op.elementColor}
+ />
```

**信息取舍**: 竖向卡片仅展示头像+名称+稀有度+职业/元素图标。种族、阵营、标签、主副属性等信息从卡片中移除（这些信息可通过筛选/分组功能覆盖，且详情页有完整展示）。

### 2. RaceList.tsx

**文件**: `src/pages/races/RaceList.tsx`

**改动范围**:
- 导入 `OperatorPortraitCard`
- 替换成员渲染（约 L43-64），使用 `size="sm"`
- Grid 列数从 `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6` 改为 `grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8`

**不变**: 种族头部结构、链接、人数统计。

### 3. FactionList.tsx

**文件**: `src/pages/factions/FactionList.tsx`

**改动范围**: 同 RaceList，替换成员渲染。

---

## 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| **新建** | `src/components/Operators/OperatorPortraitCard.tsx` | 核心组件 |
| **修改** | `src/pages/operators/OperatorList.tsx` | 替换卡片渲染 |
| **修改** | `src/pages/races/RaceList.tsx` | 替换成员渲染 |
| **修改** | `src/pages/factions/FactionList.tsx` | 替换成员渲染 |

**无需修改**: `RarityFrame.tsx`、`types.ts`、`constants.ts`、i18n 字典

---

## 分支与提交

- 分支: `enhance/operator-ui-enhancement`
- 无 i18n 变更（组件不引入新 UI 文案）

## 验证方案

1. `npm run build` — TypeScript 编译通过
2. `npm run lint` — 无 lint 错误
3. `npm run test` — 现有测试通过
4. 视觉验证：三个页面干员卡片显示为竖向长方形，稀有度色条+名称正确
