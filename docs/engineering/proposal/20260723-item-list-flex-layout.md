---
description: 列表页 Flex 布局技术方案 — 物品/武器/装备容器从 Grid 改为 Flex
type: Permanent
---

# 列表页 Flex 自适应布局技术方案

## 概述

将物品列表、武器列表、装备列表的卡片容器统一从 Grid 改为 Flex `flex-wrap`，使卡片在任意容器宽度下自然换行排列，消除 Grid 固定列数导致的留白问题。

## 改动范围

### 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| **修改** | `src/pages/items/ItemList.tsx` | 物品列表容器改为 flex-wrap（2 处） |
| **修改** | `src/pages/weapons/WeaponList.tsx` | 武器列表容器改为 flex-wrap（2 处） |
| **修改** | `src/pages/equipment/EquipmentList.tsx` | 装备列表容器改为 flex-wrap（1 处） |

**无需修改**: `ItemTile.tsx`、`ItemBar.tsx`、`RarityFrame.tsx`

### 改动详情

#### ItemList.tsx（物品列表）

物品 tile 使用 wrapper `div.flex-1.min-w-24` + ItemTile `!w-full`，最小宽度 6rem：

```diff
- <div className="grid items-start grid-cols-[repeat(auto-fill,6rem)] gap-2">
-   {groupPaged.map(item => (
-     <ItemTile key={item.id} itemId={item.id} name={item.name} rarity={item.rarity} size="xl" />
-   ))}
- </div>
+ <div className="flex flex-wrap gap-2 items-start">
+   {groupPaged.map(item => (
+     <div key={item.id} className="flex-1 min-w-24">
+       <ItemTile itemId={item.id} name={item.name} rarity={item.rarity} size="xl" className="!w-full" />
+     </div>
+   ))}
+ </div>
```

分组模式（约 L317）和非分组模式（约 L349）均做同样改动。

#### WeaponList.tsx（武器列表）

WeaponBar 使用 wrapper `div.flex-1.min-w-72`，最小宽度 18rem：

```diff
- <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
-   {groupPaged.map(w => (
-     <WeaponBar key={w.id} weapon={w} skillNames={...} />
-   ))}
- </div>
+ <div className="flex flex-wrap gap-2 items-start">
+   {groupPaged.map(w => (
+     <div key={w.id} className="flex-1 min-w-72">
+       <WeaponBar weapon={w} skillNames={...} />
+     </div>
+   ))}
+ </div>
```

分组模式（约 L321）和非分组模式（约 L343）均做同样改动。

#### EquipmentList.tsx（装备列表）

EquipBar 使用 wrapper `div.flex-1.min-w-72`，最小宽度 18rem：

```diff
- <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
-   {groupPaged.map(e => (
-     <EquipBar key={e.id} equip={e} attrShowMap={attrShowMap} />
-   ))}
- </div>
+ <div className="flex flex-wrap gap-2 items-start">
+   {groupPaged.map(e => (
+     <div key={e.id} className="flex-1 min-w-72">
+       <EquipBar equip={e} attrShowMap={attrShowMap} />
+     </div>
+   ))}
+ </div>
```

仅分组模式（装备无非分组视图）。

## 布局原理

| 卡片类型 | min-width | 说明 |
|----------|-----------|------|
| ItemTile（物品） | `min-w-24`（6rem） | 正方形 tile，宽度较小 |
| ItemBar（武器/装备） | `min-w-72`（18rem） | 横向条状卡片，含图标+文字，需要更宽 |

## 分支与提交

- 分支: `prd/item-list-flex-layout`
- 无 i18n 变更

## 验证方案

1. `npm run lint` — 无 lint 错误
2. `npm run test` — 现有测试通过
3. `npm run build` — TypeScript 编译通过
4. 视觉验证：三个列表页卡片左对齐、自动换行、无异常留白
