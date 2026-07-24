---
description: 列表页自适应布局技术方案 — 物品/武器/装备容器改为 Grid auto-fill + minmax
type: Permanent
---

# 列表页自适应布局技术方案

## 概述

将物品列表、武器列表、装备列表的卡片容器从固定列数 Grid 改为 `auto-fill` + `minmax()` 自适应 Grid，实现等宽列自动换行，消除固定断点或固定列宽导致的留白问题。单项不撑满整行，多行等宽平分。

## 改动范围

### 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| **修改** | `src/pages/items/ItemList.tsx` | 物品列表容器改为 minmax Grid（2 处） |
| **修改** | `src/pages/weapons/WeaponList.tsx` | 武器列表容器改为 minmax Grid（2 处） |
| **修改** | `src/pages/equipment/EquipmentList.tsx` | 装备列表容器改为 minmax Grid（1 处） |

**无需修改**: `ItemTile.tsx`、`ItemBar.tsx`、`RarityFrame.tsx`

### 改动详情

#### ItemList.tsx（物品列表）

```diff
- <div className="grid items-start grid-cols-[repeat(auto-fill,6rem)] gap-2">
+ <div className="grid items-start grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2">
```

ItemTile 加 `!w-full` 覆盖固定宽度，填充 Grid 轨道。分组模式和非分组模式均改动。

#### WeaponList.tsx（武器列表）

```diff
- <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
+ <div className="grid items-start grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-2">
```

分组模式和非分组模式均改动。

#### EquipmentList.tsx（装备列表）

```diff
- <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
+ <div className="grid items-start grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-2">
```

仅分组模式（装备无非分组视图）。

## 布局原理

`repeat(auto-fill, minmax(MIN, 1fr))` 的行为：
1. 浏览器计算容器能容纳多少列（容器宽度 / MIN）
2. 每列等宽，平分容器剩余空间（`1fr`）
3. 超出容器时自动换行
4. 最后一行单项不会撑满整行（只占一列宽度）

| 卡片类型 | minmax 参数 | 说明 |
|----------|------------|------|
| ItemTile（物品） | `minmax(6rem, 1fr)` | 正方形 tile，最小 6rem |
| ItemBar（武器/装备） | `minmax(18rem, 1fr)` | 横向条状卡片，最小 18rem |

## 分支与提交

- 分支: `prd/item-list-flex-layout`
- 无 i18n 变更

## 验证方案

1. `npm run lint` — 无 lint 错误
2. `npm run test` — 现有测试通过
3. `npm run build` — TypeScript 编译通过
4. 视觉验证：等宽列、自动换行、单项不撑满
