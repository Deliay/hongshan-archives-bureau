---
description: 搜索结果优化三期实现方案
type: Fleeting
---

# 搜索结果优化三期 - 实现方案

**对应产品文档**: [[20260719-search-optimization-phase3|搜索结果优化三期]]  
**对应技术方案**: [[20260719-search-optimization-phase3|搜索结果优化三期 - 技术提案]]  
**实现方案版本**: v1.0  
**创建日期**: 2026-07-19  
**作者**: 前端工程  
**开发分支**: `feat/search-optimization-phase3`

## 1. 概述

### 1.1 目标

将评审通过的产品方案与技术方案转化为可执行的代码实现清单。本期为现有档案搜索的增量优化，复用现有数据接口与缓存，不新增后端服务。

### 1.2 范围

- **做**：
  - 富文本增益数值蓝色渲染。
  - 敌人能力倒排索引与威胁 Card。
  - 武器 Card 宽度限制。
  - 天赋节点倒排索引与 `TalentReferenceCard`。
  - 武器/干员技能默认等级区分。
  - 修复 `CharGrowthTable` 实体映射。
  - `SkillPatchTable` 子效果命中展示完整技能并定位 patch 等级。
  - 补充单元/组件测试。

- **不做**：
  - 不新增后端接口。
  - 不修改现有数据模型、适配器签名、缓存策略。
  - 不改动详情页内部核心逻辑（除技能等级上限）。

## 2. 代码变更总览

### 2.1 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/components/talents/TalentReferenceCard.tsx` | 天赋面板展示组件 |

### 2.2 修改文件

| 文件路径 | 说明 |
|----------|------|
| `src/lib/formatText.ts` | `formatBlackboard` 支持 `+{expr:format}` 蓝色包裹 |
| `src/lib/search.ts` | 新增敌人能力/天赋节点倒排索引，统一归属实体解析，修复别名表映射 |
| `src/lib/types.ts` | 新增 `TalentNodeRef` 类型 |
| `src/components/Search/EntityCards.tsx` | 武器 Card 宽度限制 |
| `src/components/Search/ArchiveSearchResults.tsx` | 按表分发天赋/技能面板，按归属类型传默认等级 |
| `src/components/skills/SkillReferenceCard.tsx` | 支持 `defaultPatchIndex` |
| `src/pages/operators/OperatorDetail.tsx` | 技能 slider max/default = 13 |
| `src/lib/__tests__/formatText.test.ts` | 增益数值颜色测试 |
| `src/lib/__tests__/search.test.ts` | 倒排索引与 CharGrowthTable 映射测试 |
| `src/components/talents/TalentReferenceCard.test.tsx` | 天赋面板渲染测试 |
| `src/components/Search/ArchiveSearchResults.test.tsx` | 武器宽度、天赋/技能默认等级测试 |

## 3. 详细实现

### 3.1 `src/lib/formatText.ts` 增益数值蓝色渲染

修改 `formatBlackboard`：

```ts
const pattern = /([+-]?)\{(.*?)(:.*?)?\}/g
// ...
const prefix = match[1]
result += format.slice(lastIndex, match.index)
if (prefix === '+') {
  result += `<color=#26bbfd>+{${argIndex}${fmt}}</color>`
} else {
  result += `{${argIndex}${fmt}}`
}
```

### 3.2 `src/lib/search.ts` 倒排索引与归属解析

#### 3.2.1 敌人能力倒排索引

```ts
async function buildAbilityOwnerIndex(locale: string): Promise<Record<string, string>> {
  const raw = await getCachedData<Record<string, any>>('EnemyTemplateDisplayInfoTable', () => fetchTableAll('EnemyTemplateDisplayInfoTable'))
  const index: Record<string, string> = {}
  for (const [, v] of Object.entries<any>(raw)) {
    const templateId = v.templateId ?? v.$key ?? ''
    for (const abilityId of v.abilityDescIds ?? []) {
      if (!index[abilityId]) index[abilityId] = templateId
    }
  }
  return index
}
```

#### 3.2.2 天赋节点倒排索引

```ts
async function buildTalentNodeIndex(locale: string): Promise<Record<string, TalentNodeRef>> {
  const growthRaw = await getCachedData<Record<string, any>>('CharGrowthTable', () => fetchTableAll('CharGrowthTable'))
  const index: Record<string, TalentNodeRef> = {}
  for (const [, v] of Object.entries<any>(growthRaw)) {
    const charId = v.charId ?? v.$key ?? ''
    for (const [nodeId, node] of Object.entries<any>(v.talentNodeMap ?? {})) {
      if (node.nodeType !== 4) continue
      const psi = node.passiveSkillNodeInfo ?? {}
      if (!psi.talentEffectId) continue
      index[psi.talentEffectId] = { charId, nodeId, nameRef: psi.name, iconId: psi.iconId ?? '', level: psi.level ?? 0, breakStage: psi.breakStage ?? 0 }
    }
  }
  return index
}
```

#### 3.2.3 统一归属实体解析

在 `enrichResults` 末尾：

```ts
for (const r of enriched) {
  const target = SEARCH_ENTITY_ALIAS_TABLES[r.table] ?? r.table
  if (r.table !== target && r.entityKey && entities[target]) {
    r.ownerEntity = entities[target][r.entityKey]
  }
}
```

### 3.3 `src/components/talents/TalentReferenceCard.tsx`

数据加载：

1. `buildTalentNodeIndex` 获取 `TalentNodeRef`。
2. `PotentialTalentEffectTable` 与字典获取 `desc`。
3. 合并 `dataList` 中的 blackboard，调用 `formatBlackboard`。

渲染：

```tsx
<div className="p-2 rounded bg-archive-ink border border-archive-border">
  <div className="flex items-center gap-2">
    {iconId && <img src={`${ASSET_BASE}/.../skillicon/${iconId}.png`} ... />}
    <span className="text-xs font-medium text-archive-ivory">{name}</span>
    <span className="text-[10px] text-archive-gold font-mono ml-auto">Lv.{level}</span>
  </div>
  <div className="mt-1 text-xs text-archive-ivory leading-relaxed">
    <RichText text={description} />
  </div>
</div>
```

### 3.4 `src/components/Search/EntityCards.tsx` 武器宽度

```tsx
<ItemPanel
  ...
  className="w-24 items-start"
  iconClassName="w-12 h-12"
/>
```

### 3.5 `src/components/Search/ArchiveSearchResults.tsx` 结果分发

```tsx
{r.table === 'SkillPatchTable' && r.entityKey && (
  <SkillReferenceCard
    skillId={r.entityKey}
    showLevelSlider
    defaultLevel={r.ownerEntity?.type === 'weapon' ? 9 : 13}
    defaultPatchIndex={extractPatchIndex(r.path)}
    className="mb-2"
  />
)}
{r.table === 'PotentialTalentEffectTable' && r.entityKey && (
  <TalentReferenceCard talentEffectId={r.entityKey} className="mb-2" />
)}
{(entity || ownerEntity) && <EntityReferenceCard entity={ownerEntity ?? entity} />}
```

### 3.6 `src/components/skills/SkillReferenceCard.tsx` patch 索引

扩展 props 与默认等级逻辑：

```ts
interface SkillReferenceCardProps {
  skillId: string
  showLevelSlider?: boolean
  defaultLevel?: number
  defaultPatchIndex?: number
  className?: string
}
```

在 `setPatches` 后：

```ts
const sorted = [...parsed].sort((a, b) => a.level - b.level)
let target = defaultLevel ?? (defaultPatchIndex !== undefined ? bundle[defaultPatchIndex]?.level : undefined) ?? sorted[sorted.length - 1].level
const found = sorted.find(p => p.level === target)
setLevel(found ? found.level : sorted[sorted.length - 1].level)
```

### 3.7 `src/pages/operators/OperatorDetail.tsx` 技能等级

```tsx
const [level, setLevel] = useState(13)
// ...
<input type="range" min={1} max={13} value={level} ... />
```

## 4. 实现顺序

### 阶段一：基础格式化与索引（第 1 轮提交）

1. `src/lib/formatText.ts`：增益数值蓝色渲染。
2. `src/lib/search.ts`：新增敌人能力/天赋节点倒排索引。
3. `src/lib/types.ts`：新增 `TalentNodeRef`。

### 阶段二：组件与页面改造（第 2 轮提交）

1. `src/components/talents/TalentReferenceCard.tsx`：新增天赋面板。
2. `src/components/Search/EntityCards.tsx`：武器宽度限制。
3. `src/components/Search/ArchiveSearchResults.tsx`：按表分发与默认等级。
4. `src/components/skills/SkillReferenceCard.tsx`：支持 `defaultPatchIndex`。
5. `src/pages/operators/OperatorDetail.tsx`：技能等级上限 13。

### 阶段三：映射修复与测试（第 3 轮提交）

1. `src/lib/search.ts`：修复 `CharGrowthTable` 别名映射，统一 `ownerEntity`。
2. 单元测试、组件测试。
3. `npm run lint` / `npm run test` / `npm run build`。

## 5. 测试计划

### 5.1 单元测试

- `formatBlackboard`：
  - `+{atk_up:0%}` → 包裹 `<color=#26bbfd>`。
  - `{atk_up:0%}` → 无颜色标签。
- `buildAbilityOwnerIndex`：已知 abilityId → templateId。
- `buildTalentNodeIndex`：已知 talentEffectId → 节点信息。
- `enrichResults`：
  - `CharGrowthTable` 命中附加 `ownerEntity`。
  - `EnemyAbilityDescTable` 命中附加 `ownerEntity`。

### 5.2 组件测试

- `TalentReferenceCard`：渲染名称、等级、描述、图标。
- `ArchiveSearchResults`：
  - 武器 Card 类名包含 `w-24`。
  - `PotentialTalentEffectTable` 结果展示 `TalentReferenceCard` 与干员 Card。
  - `SkillPatchTable` 结果根据 `ownerEntity.type` 传入 9 或 13。

### 5.3 E2E 测试

- 搜索敌人能力关键词，威胁 Card 可跳转。
- 搜索天赋效果关键词，天赋面板展示。
- 干员详情页技能滑动条可拖到 13。

## 6. 验收标准

- [ ] `+{expr:format}` 渲染为蓝色
- [ ] `EnemyAbilityDescTable` 命中展示威胁 Card
- [ ] 武器 Card 宽度受限
- [ ] `PotentialTalentEffectTable` 命中展示天赋面板
- [ ] 武器技能默认 Lv.9，干员技能默认 Lv.13
- [ ] `CharGrowthTable` 命中正确展示干员 Card
- [ ] `SkillPatchTable` 子效果命中展示完整技能面板
- [ ] `npm run lint` 通过
- [ ] `npm run test` 通过
- [ ] `npm run build` 通过

## 7. 风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 新增倒排索引增加首次搜索耗时 | 首屏变慢 | 按需构建，复用缓存 |
| 技能默认等级 13 但数据不足 | 展示异常 | 回退到实际最高等级 |
| `CharGrowthTable` 修复影响其它别名表 | Card 缺失 | 回归测试别名表 |

回滚策略：纯前端增量改动，可直接回滚到上一稳定 commit。

## 8. 相关文档

- [[20260719-search-optimization-phase3|搜索结果优化三期]]
- [[20260719-search-optimization-phase3|搜索结果优化三期 - 技术提案]]
- [工程架构规范](../engineering-spec.md)
- [前端开发规范](../frontend-spec.md)
- [数据表映射参考](../references/data-mapping-tables.md)
- [富文本规范参考](../references/rich-text-spec.md)
