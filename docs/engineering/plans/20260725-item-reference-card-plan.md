---
description: 搜索结果物品参考卡片实现方案
type: Fleeting
---

# 搜索结果物品参考卡片 - 实现方案

**对应产品文档**: [[20260725-item-reference-card|搜索结果物品参考卡片]]
**对应技术方案**: [[20260725-item-reference-card|搜索结果物品参考卡片 - 技术提案]]
**实现方案版本**: v1.0
**创建日期**: 2026-07-25
**作者**: 前端工程
**开发分支**: `feat/item-reference-card`

## 1. 概述

### 1.1 目标

将已评审通过的产品方案与技术方案转化为可执行的代码实现清单。实现过程中复用现有数据接口与缓存，不新增后端服务，不改动现有详情页内部逻辑。

### 1.2 范围

- **做**：
  - 更新 `buildItemEntityMap` 函数，为物品实体添加类型信息。
  - 增强 `ItemReferenceCard` 组件，展示物品类型标签。

- **不做**：
  - 不新增后端接口。
  - 不修改 `SearchEntity` 类型定义（复用 `subInfo` 字段）。
  - 不改动搜索结果的整体布局与交互逻辑。

## 2. 代码变更总览

### 2.1 修改文件

| 文件路径 | 说明 |
|----------|------|
| `src/lib/search.ts` | 更新 `buildItemEntityMap`，获取 `ItemTypeTable` 并设置 `subInfo` |
| `src/components/Search/EntityCards.tsx` | 更新 `ItemReferenceCard`，展示物品类型标签 |

## 3. 详细实现

### 3.1 更新 `buildItemEntityMap` `src/lib/search.ts`

在 `buildItemEntityMap` 函数中，额外获取 `ItemTypeTable` 数据，将物品类型名称设置到 `subInfo` 字段：

```ts
async function buildItemEntityMap(locale: string): Promise<Record<string, SearchEntity>> {
  const [raw, i18nMap, typeRaw, typeI18n] = await Promise.all([
    getCachedData<Record<string, any>>('ItemTable', () => fetchTableAll('ItemTable')),
    getTableI18nDict('ItemTable', locale),
    getCachedData<Record<string, any>>('ItemTypeTable', () => fetchTableAll('ItemTypeTable')),
    getTableI18nDict('ItemTypeTable', locale),
  ])
  const map: Record<string, SearchEntity> = {}
  for (const [, v] of Object.entries<any>(raw)) {
    const id = v.itemId ?? v.$key ?? ''
    const typeName = resolveI18n(typeRaw[String(v.type)]?.name, typeI18n) || ''
    map[id] = {
      type: 'item',
      id,
      name: resolveI18n(v.name, i18nMap) || id,
      route: '/archive/items',
      icon: v.iconId ?? id,
      rarity: v.rarity ?? 0,
      subInfo: typeName || undefined,
    }
  }
  return map
}
```

**关键点**：
- 使用 `Promise.all` 并行获取 `ItemTable` 和 `ItemTypeTable` 数据。
- `ItemTypeTable` 的 key 是数字类型的 `type` 字段值，需转换为字符串。
- `resolveI18n` 解析类型名称的 i18n。
- `subInfo` 为空时不设置，避免渲染空标签。

### 3.2 更新 `ItemReferenceCard` `src/components/Search/EntityCards.tsx`

将 `ItemReferenceCard` 从简单的 `IconBar` 升级为包含类型标签的组件：

```tsx
function ItemReferenceCard({ entity }: ReferenceCardProps) {
  return (
    <ReferenceBar
      href={entity.route}
      left={
        <div className="w-10 h-10 overflow-hidden rounded">
          <RarityFrame rarity={entity.rarity ?? 0} size="sm" className="w-full h-full">
            <ItemIcon itemId={entity.id} className="w-full h-full" />
          </RarityFrame>
        </div>
      }
    >
      <div className="flex flex-col gap-0.5">
        <span className="truncate text-xs text-archive-ivory">{entity.name}</span>
        <Rarity level={entity.rarity ?? 0} />
        {entity.subInfo && (
          <span className="text-[9px] text-archive-dust">{entity.subInfo}</span>
        )}
      </div>
    </ReferenceBar>
  )
}
```

**关键点**：
- 不再使用共享的 `IconBar` 组件，改为内联实现以支持类型标签。
- 使用 `ReferenceBar` 保持与其他 Card 一致的布局。
- `entity.subInfo` 为空时不渲染类型标签。
- 类型标签使用 `text-[9px] text-archive-dust` 样式，与其他 Card 的辅助信息风格一致。

## 4. 实现顺序

### 阶段一：数据层

1. `src/lib/search.ts` 更新 `buildItemEntityMap` 函数。

### 阶段二：UI 组件层

1. `src/components/Search/EntityCards.tsx` 更新 `ItemReferenceCard` 组件。

### 阶段三：测试与验证

1. 运行 `npm run lint` 检查代码风格。
2. 运行 `npm run test` 检查测试通过。
3. 运行 `npm run build` 检查构建通过。
4. 手动验证搜索结果中物品卡片展示类型标签。

## 5. 测试计划

### 5.1 单元测试

- `buildItemEntityMap` 返回的实体包含 `subInfo` 字段。
- `subInfo` 值为正确的类型名称（从 `ItemTypeTable` 解析）。

### 5.2 组件测试

- `ItemReferenceCard` 渲染时展示类型标签。
- `subInfo` 为空时类型标签不显示。

### 5.3 手动验证

- 搜索一个物品名称（如「木材」），确认搜索结果中物品卡片展示类型标签。
- 切换语言后，类型标签正确显示对应语言的类型名称。

## 6. 验收标准

- [ ] 搜索结果中物品卡片展示类型标签。
- [ ] 物品类型名称正确 i18n。
- [ ] `npm run lint` 通过。
- [ ] `npm run test` 通过。
- [ ] `npm run build` 通过。

## 7. 风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| `ItemTypeTable` 数据量较大增加首次加载时间 | 搜索实体映射构建变慢 | 数据走缓存，后续复用；仅在搜索时按需加载 |
| `subInfo` 字段被其他实体类型意外使用 | 类型标签显示错误 | 仅在 `entity.type === 'item'` 时读取 `subInfo` |

回滚策略：本次改动仅涉及搜索实体映射与卡片展示，可直接回滚到上一 commit。

## 8. 相关文档

- [[20260725-item-reference-card|搜索结果物品参考卡片]]
- [[20260725-item-reference-card|搜索结果物品参考卡片 - 技术提案]]
- [工程架构规范](../engineering-spec.md)
- [前端开发规范](../frontend-spec.md)
