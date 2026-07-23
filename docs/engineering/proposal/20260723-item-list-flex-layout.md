---
description: 物品列表 Flex 布局技术方案 — ItemList 容器从 Grid 改为 Flex
type: Permanent
---

# 物品列表 Flex 自适应布局技术方案

## 概述

将 `ItemList.tsx` 中物品卡片容器的 CSS 类从 Grid `auto-fill` 改为 Flex `flex-wrap`，使卡片在任意容器宽度下自然换行排列。`ItemTile` 组件本身无需修改（xl 尺寸已有固定宽度 `w-24`）。

## 改动范围

### 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| **修改** | `src/pages/items/ItemList.tsx` | 列表容器 CSS 类名变更（2 处） |

**无需修改**: `ItemTile.tsx`、`RarityFrame.tsx`、其他页面

### 改动详情

**文件**: `src/pages/items/ItemList.tsx`

改动 2 处容器 className，从：

```
grid items-start grid-cols-[repeat(auto-fill,6rem)] gap-2
```

改为：

```
flex flex-wrap gap-2 items-start
```

#### 改动 1: 分组模式（约 L317）

```diff
- <div className="grid items-start grid-cols-[repeat(auto-fill,6rem)] gap-2">
+ <div className="flex flex-wrap gap-2 items-start">
    {groupPaged.map(item => (
      <ItemTile key={item.id} itemId={item.id} name={item.name} rarity={item.rarity} size="xl" />
    ))}
  </div>
```

#### 改动 2: 非分组模式（约 L349）

```diff
- <div className="grid items-start grid-cols-[repeat(auto-fill,6rem)] gap-2">
+ <div className="flex flex-wrap gap-2 items-start">
    {paged.map((item) => (
      <ItemTile key={item.id} itemId={item.id} name={item.name} rarity={item.rarity} size="xl" />
    ))}
  </div>
```

## 布局原理

| 属性 | Grid auto-fill | Flex wrap |
|------|---------------|-----------|
| 列数计算 | 由容器宽度 / 6rem 决定 | 由卡片自然排列 + 换行 |
| 末尾留白 | 容器宽度非 6rem 倍数时有空白 | 无，卡片左对齐紧贴 |
| 卡片宽度 | 由 grid 列轨道控制 | 由 ItemTile `w-24`（6rem）固定 |
| 间距 | `gap-2` | `gap-2` |

ItemTile `size="xl"` 已有 `w-24`（6rem）+ `aspect-square`，flex-wrap 下每个卡片宽度固定，自然按行排列换行。

## 不涉及的页面

| 页面 | 布局 | 原因 |
|------|------|------|
| 武器列表 (`WeaponList.tsx`) | Grid `grid-cols-2 md:grid-cols-4` | 使用 ItemBar 横向卡片，需要 stretch 填充列宽 |
| 装备列表 (`EquipmentList.tsx`) | Grid `grid-cols-2 md:grid-cols-4` | 同上 |

## 分支与提交

- 分支: `prd/item-list-flex-layout`（产品文档 PR）
- 实现分支: `feat/item-list-flex-layout`（产品文档通过后创建）
- 无 i18n 变更

## 验证方案

1. `npm run lint` — 无 lint 错误
2. `npm run test` — 现有测试通过
3. `npm run build` — TypeScript 编译通过
4. 视觉验证：物品列表卡片左对齐、自动换行、无异常留白
