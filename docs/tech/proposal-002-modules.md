---
description: 各模块技术方案 — 数据获取、适配转换、展示实现
type: Permanent
---

# 各模块技术方案

针对 11 个分类模块，逐一说明数据来源、适配逻辑与展示实现。

## 通用约定

### 数据获取模式

所有模块遵循同一模式：

```typescript
// 1. 定义获取函数（在 hooks/ 中）
export function useModuleData() {
  return useTableData('表名')  // 列表
}
export function useModuleEntry(id: string) {
  return useTableEntry('表名', id)  // 单条
}

// 2. 适配函数（在 lib/adapter.ts 中，按模块分区）
export function adaptModule(raw: any): ModuleType { /* ... */ }

// 3. 在组件中组合
function ModuleList() {
  const { data, loading, error } = useModuleData()
  if (loading) return <Skeleton />
  if (error) return <ErrorState />
  return data.map(item => <Card>{item.name}</Card>)
}
```

### API 端点速查

| 用途 | 路径 |
|------|------|
| 获取表所有键 | `GET /table/{table}` → `string[]` |
| 获取表全部数据 | `GET /table/{table}/all` → `Record<string, any>` |
| 获取单条记录 | `GET /table/{table}/{key}` → `any` |
| 获取摘要 | `GET /table/{table}/brief` → `any`（仅部分表支持） |

---

## 01 干员档案

### 数据源

| 表名 | 用途 | 获取方式 |
|------|------|---------|
| CharacterTable | 干员主数据 | `all`（量小，一次拉完） |
| CharacterTagDesTable | 干员标签描述 | `all` |
| CharProfessionTable | 职业名称映射 | `all` |
| CharTypeTable | 属性形态名称映射 | `all` |

### 适配转换

```typescript
// lib/adapter/operator.ts

// 职业 ID → 中文名映射（来自 CharProfessionTable）
const PROFESSION_MAP: Record<number, string> = {
  0: '近卫', 2: '重装', 4: '辅助',
  5: '术师', 7: '先锋', 8: '突击',
}

// 属性形态 ID → 中文名 + 色号（来自 CharTypeTable）
const ELEMENT_MAP: Record<string, { name: string; color: string }> = {
  Cryst:    { name: '寒冷', color: '#21C6D0' },
  Fire:     { name: '灼热', color: '#FF623D' },
  Pulse:    { name: '电磁', color: '#FFC000' },
  Natural:  { name: '自然', color: '#9EDC23' },
  Physical: { name: '物理', color: '#888888' },
}

export function adaptOperator(raw: any): Operator {
  return {
    id: raw.$key ?? raw.characterId,
    name: raw.name?.text ?? '',
    profession: PROFESSION_MAP[raw.profession] ?? '未知',
    element: ELEMENT_MAP[raw.charType]?.name ?? '未知',
    elementColor: ELEMENT_MAP[raw.charType]?.color ?? '#888',
    faction: raw.factionTag?.tagId?.replace('tag_power_', '') ?? '',
    race: raw.raceTag?.tagId?.replace('tag_race_', '') ?? '',
    rarity: raw.rarity ?? 0,
    profileRecords: (raw.profileRecord ?? []).map(
      (r: any) => r.recordDesc?.text ?? ''
    ),
    voiceLines: (raw.profileVoice ?? []).map((v: any) => ({
      title: v.voiceTitle?.text ?? '',
      text: v.voiceDesc?.text ?? '',
    })),
    tags: Object.values(raw.tagDesc ?? {}).map(
      (t: any) => t.desc?.text ?? ''
    ),
  }
}
```

### 展示实现

**列表页**：4 列卡片网格（桌面），每张卡片含：

```
┌──────────────┐
│   立绘缩略图   │
│              │
│  陈千语       │
│  近卫 · 物理  │  ← 职业icon + 属性色条
│  ★★★★★       │  ← 星级
│  [宏山] [鲁珀] │  ← 标签
└──────────────┘
```

筛选栏置顶固定：职业 dropdown、属性 dropdown、种族 dropdown、阵营 dropdown、稀有度星级筛选。

**卷宗页**：

```
┌──────────────────────────────────┐
│  面包屑：干员档案 > 陈千语        │
│                                  │
│  ┌─────┬──────────────────────┐  │
│  │     │ 陈千语               │  │
│  │ 立绘 │ 鲁珀 · 近卫 · 物理   │  │
│  │     │ 终末地工业            │  │
│  │     │ ★★★★★               │  │
│  ├─────┼──────────────────────┤  │
│  │ 相关 │ HP  ATK  DEF  RES   │  │
│  │ 武器 │ [数值] [数值] [数值]  │  │
│  │ 推荐 │ [属性面板]           │  │
│  │     ├──────────────────────┤  │
│  │     │ 档案 | 语音 | 关联     │  │
│  │     │ [tab 内容区]          │  │
│  └─────┴──────────────────────┘  │
└──────────────────────────────────┘
```

**空状态**：显示「该干员档案暂缺」占位图。

---

## 02 武器档案

### 数据源

| 表名 | 用途 | 获取方式 |
|------|------|---------|
| WeaponBasicTable | 武器主数据 | `all` |

### 适配转换

```typescript
// lib/adapter/weapon.ts

const WEAPON_TYPE_MAP: Record<number, string> = {
  1: '剑', 6: '手枪',
  // claym/lance/funnel 通过 ID 前缀判断
}

export function adaptWeapon(raw: any): Weapon {
  const id: string = raw.$key ?? raw.weaponId
  let type = '未知'
  if (id.includes('sword')) type = '剑'
  else if (id.includes('claym')) type = '大剑'
  else if (id.includes('lance')) type = '长枪'
  else if (id.includes('pistol')) type = '手枪'
  else if (id.includes('funnel')) type = '浮游单元'

  return {
    id,
    name: raw.engName?.text ?? id,
    type,
    rarity: raw.rarity ?? 0,
    description: raw.weaponDesc?.text ?? '',
    lore: raw.decoDesc?.text ?? '',        // 背景故事
    skills: raw.weaponSkillList ?? [],
    maxLevel: raw.maxLv ?? 90,
    breakthroughTemplate: raw.breakthroughTemplateId,
    talentTemplate: raw.talentTemplateId,
  }
}
```

### 展示实现

**列表页**：按类型分组折叠面板（剑/大剑/长枪/手枪/浮游单元），每个武器显示模型缩略图 + 名称 + 星级。

**卷宗页**：
- 顶部：武器模型渲染图（带旋转交互）
- 属性区：基础攻击/攻速/范围
- 技能区：技能名称 + 描述 + 等级数据
- 故事区：独立卷页展示「来由故事」，富文本排版
- 底部：突破材料表 + 适用干员链接

---

## 03 职业与属性

### 数据源

| 表名 | 用途 |
|------|------|
| CharProfessionTable | 职业定义 |
| CharTypeTable | 属性形态定义 |

两个表数据量极小，启动时随版本一起预取。

### 适配转换

```typescript
interface Profession {
  id: number
  name: string
  description: string
  sortOrder: number
}

interface Element {
  id: string
  name: string
  color: string
  damageType: number
}

// 直接从 API 原始数据映射，几乎无转换
// 主要工作是读取 name.id 对应的 i18n 文本
```

### 展示实现

**总览页**（非列表，也非详情）：
- 上半：职业卡片行（图标圆 + 名称 + 一行定位描述），点击 → 跳转 `/archive/operators?profession=近卫`
- 下半：属性形态卡片行（色块背景 + 名称 + 标签），点击 → 跳转 `/archive/operators?element=寒冷`
- 使用 CSS Grid 2 行布局

---

## 04 种族一览

### 数据源

| 表名 | 用途 |
|------|------|
| TagDataTable | 种族标签定义（`tag_group_race`） |
| CharacterTable | 提取各干员的 `raceTag` 关联 |

注意：TagDataTable 不直接返回种族简介文本，需要从 CharacterTable 的 profileRecord 或剧情文本中提取补充。

### 适配转换

```typescript
export function adaptRace(raw: any): Race {
  return {
    id: raw.tagId.replace('tag_race_', ''),
    name: raw.tagName?.text ?? '',
    memberIds: [],      // 由 CharacterTable 交叉计算后填充
  }
}

// 交叉计算：遍历所有干员，按 race tag 分组
function buildRaceMap(operators: Operator[]): Map<string, Operator[]> {
  const map = new Map<string, Operator[]>()
  for (const op of operators) {
    const list = map.get(op.race) ?? []
    list.push(op)
    map.set(op.race, list)
  }
  return map
}
```

### 展示实现

**总览页**：卡片网格，每张卡片显示种族名 + 该种族代表干员的立绘缩略图拼贴 + 干员数量。

**卷宗页**：
- 种族简介（人工录入或来自剧情文本，暂无 API 直接提供）
- 该种族干员列表（跳转至干员卷宗）
- 「泰拉渊源」栏目（如有泰拉时期延续背景）
- 已知亚种/分支

---

## 05 势力阵营

### 数据源

| 表名 | 用途 |
|------|------|
| TagDataTable | 势力标签定义（`tag_group_power`） |
| CharacterTable | 提取干员的 `factionTag` |
| 剧情文本 | 势力关系描述（需人工整理） |

### 适配转换

与种族类似，通过 TagDataTable 获取标签列表，再与 CharacterTable 交叉计算干员归属。

```typescript
export function adaptFaction(raw: any): Faction {
  return {
    id: raw.tagId.replace('tag_power_', ''),
    name: raw.tagName?.text ?? '',
    memberIds: [],     // 交叉计算填充
    relatedLocations: [], // 人工整理
  }
}
```

### 展示实现

**总览页**：
- 顶部：Mermaid 势力关系图（硬编码布局坐标，用 SVG 或 CSS 模拟）
- 下方：势力卡片（名称 + 简介 + 标识色块 + 干员数）

**卷宗页**：势力简介 + 所属干员列表 + 关联地区 + 相关剧情文献。

---

## 06 地区地理

### 数据源

| 表名 | 用途 | 说明 |
|------|------|------|
| SceneAreaTable | 地区定义 | 部分可用 |
| MapIdTable | 地图/关卡 ID | 补充数据 |
| 剧情文本 | 地区描述 | 主要来源 |

目前 SceneAreaTable 的可用条目有限（多为 `areaId101` 等内部 ID），大量地区信息依赖剧情文本人工整理。

### 适配转换

```typescript
export function adaptArea(raw: any): Area {
  return {
    id: raw.$key ?? raw.areaId,
    name: raw.areaName?.text ?? raw.$key,
    description: '',  // 人工补充
    faction: '',      // 关联势力
    stages: [],       // 关联关卡
  }
}
```

### 展示实现

**总览页**：
- 顶部：简易地图示意图（HTML/CSS 绘制，标记已知地点位置）
- 下方：地区卡片（名称 + 类型标签 + 简述）

**卷宗页**：地区简介 + 关联事件 + 关卡列表 + 活跃势力 + 出没敌人。

---

## 07 敌人图鉴

### 数据源

| 表名 | 用途 | 获取方式 |
|------|------|---------|
| EnemyTable | 敌人主数据 | `all` |
| EnemyTemplateTable | 敌人模板属性 | 按需 |
| EnemyDisplayInfoTable | 敌人显示信息（描述文本） | 按需 |
| EnemyTagTable | 敌人标签 | `all` |
| WikiEnemyDropTable | 掉落数据 | `all` |

### 适配转换

```typescript
export function adaptEnemy(raw: any): Enemy {
  return {
    id: raw.$key ?? raw.enemyId,
    name: raw.enemyName?.text ?? '',
    tags: (raw.tags ?? []).map((t: any) => t.tagId ?? ''),
    description: raw.description?.text ?? '',
    displayInfo: {
      model: raw.modelPath ?? '',
      icon: raw.iconPath ?? '',
    },
    // 属性模板如需展开，通过 EnemyTemplateTable 二次查询
  }
}
```

### 展示实现

**列表页**：按类别分组（天使/裂地者/近战/远程/精英），每项显示模型缩略图 + 名称 + 威胁等级。

**卷宗页**：
- 模型展示（可从 VFS 下载贴图）
- 描述文本
- 属性面板（HP/ATK/DEF/RES 等）
- 掉落物列表（跳转至道具卷宗）
- 出现区域（跳转至地区卷宗）
- 应对记录（社区整理）

---

## 08 装备系统

### 数据源

| 表名 | 用途 | 获取方式 |
|------|------|---------|
| EquipTable | 装备定义 | `all` |
| EquipItemTable | 装备物品 | `all` |
| EquipSuitTable | 套装效果 | `all` |
| GemTable | 宝石定义 | `all` |
| GemTagIdTable | 宝石词条 | `all` |

### 适配转换

```typescript
// 装备
export function adaptEquip(raw: any): Equip {
  return {
    id: raw.$key ?? raw.equipId,
    name: raw.equipName?.text ?? '',
    slot: raw.slot ?? '',         // body / hand / edc
    rarity: raw.rarity ?? '',
    mainStat: raw.mainStat ?? {},
    subStats: raw.subStats ?? [],
    suitId: raw.suitId ?? '',
    description: raw.desc?.text ?? '',
  }
}

// 套装
export function adaptSuit(raw: any): Suit {
  return {
    id: raw.$key ?? raw.suitId,
    name: raw.suitName?.text ?? '',
    twoPieceEffect: raw.twoPieceEffect?.text ?? '',
    fourPieceEffect: raw.fourPieceEffect?.text ?? '',
  }
}

// 宝石
export function adaptGem(raw: any): Gem {
  return {
    id: raw.$key ?? raw.gemId,
    name: raw.gemName?.text ?? '',
    slot: raw.slot ?? '',
    mainTag: raw.mainTag ?? '',
    subTags: raw.subTags ?? [],
  }
}
```

### 展示实现

**总览页**：三大入口卡片（装备 / 套装 / 宝石）。

**装备列表**：按部位分组（躯干/手部/饰品），稀有度筛选。

**装备卷宗**：属性详情 + 套装归属链接 + 获取途径。

**套装图鉴**：套装名 + 2 件套效果 + 4 件套效果 + 适用干员推荐。

**宝石图鉴**：词条池表格 + 可镶嵌部位 + 强化/重铸消耗表。

---

## 09 道具材料

### 数据源

| 表名 | 用途 | 获取方式 |
|------|------|---------|
| ItemTable | 物品主数据 | `all` |
| ItemTypeTable | 物品类型 | `all` |
| UsableItemChestTable | 可开箱物品 | `all` |
| CollectionTable | 收集品 | `all` |

注意：ItemTable 数据量较大，建议首次全量拉取后缓存。

### 适配转换

```typescript
export function adaptItem(raw: any): Item {
  return {
    id: raw.$key ?? raw.itemId,
    name: raw.itemName?.text ?? '',
    type: raw.itemType ?? '',
    rarity: raw.rarity ?? 0,
    description: raw.desc?.text ?? '',
    decoDesc: raw.decoDesc?.text ?? '',   // 收集品叙事文本
    icon: raw.iconPath ?? '',
    source: [],      // 获取途径：由配方/掉落/商店数据交叉计算
  }
}

// 用途倒查：遍历所有合成配方/掉落表，建立 材料→配方 的反向索引
function buildReverseIndex(items: Item[]): Map<string, string[]> {
  // key: 材料 ID, value: 用到此材料的配方 ID 列表
}
```

### 展示实现

**列表页**：按类型分组（材料/消耗品/收集品/礼物），网格卡片显示图标 + 名称 + 稀有度。

**卷宗页**：
- 物品图标（大图）
- 描述文本
- 获取途径列表（关卡掉落/商店/工厂/任务）
- 用途列表：此材料用于哪些合成配方（跳转至工厂系统）
- 关联干员/武器（如有）

---

## 10 工厂系统

### 数据源

| 表名 | 用途 | 获取方式 |
|------|------|---------|
| FactoryBuildingTable | 建筑定义 | `all` |
| FactoryMachineCrafterTable | 加工机配置 | `all` |
| FactoryGridBeltTable | 传送带 | `all` |
| FactoryLiquidPipeTable | 管道 | `all` |
| LiquidTable | 液体类型 | `all` |
| FactoryPowerStationTable | 供电系统 | `all` |
| PlantingDataTable | 种植 | `all` |
| FactoryFuelItemTable | 燃料 | `all` |
| FactoryManualCraftTable | 手动合成配方 | `all` |
| FactoryMachineCraftTable | 机器合成配方 | `all` |

工厂系统涉及的表最多，按子系统分批加载，避免启动时一次性拉取。

### 适配转换

```typescript
export function adaptBuilding(raw: any): Building {
  return {
    id: raw.$key ?? raw.buildingId,
    name: raw.buildingName?.text ?? '',
    type: raw.buildingType ?? '',
    power: raw.powerConsumption ?? 0,
    size: raw.size ?? { width: 1, height: 1 },
    description: raw.desc?.text ?? '',
  }
}

export function adaptRecipe(raw: any): Recipe {
  return {
    id: raw.$key ?? raw.recipeId,
    inputs: (raw.inputs ?? []).map(i => ({
      itemId: i.itemId,
      amount: i.amount,
    })),
    outputs: (raw.outputs ?? []).map(o => ({
      itemId: o.itemId,
      amount: o.amount,
    })),
    time: raw.craftTime ?? 0,
    power: raw.powerConsumption ?? 0,
    buildingId: raw.buildingId ?? '',
  }
}
```

### 展示实现

**总览页**：子系统入口卡片网格 + 快速配方搜索框。

**建筑图鉴**：按类型分组列表 + 建筑详情（属性、外观、用途）。

**合成路线图**：基于配方数据，用 Mermaid 动态生成流程图，展示从原材料到成品的完整链路。

**配方查询**：输入物品名 → 显示所有产出/消耗此物品的配方。

---

## 11 剧情记录

### 数据源

| 表名 | 用途 | 获取方式 |
|------|------|---------|
| PrtsDocument | PRTS 文献（标题+内容） | `all` |
| RichContentTable | 富文本内容 | 按需 |
| DialogTextTable | 剧情对话 | 按需 |
| DialogSummaryTable | 剧情摘要 | 按需 |
| SNSDialogTable | SNS 聊天 | 按需 |
| EnvTalkTable | 环境对话 | 按需 |
| RadioTable | 广播 | 按需 |
| CollectionTable | 收集品文本 | 已在 09 中加载 |

PrtsDocument 是核心，其他为辅助。建议先拉 PrtsDocument 列表，按需加载具体内容。

### 适配转换

```typescript
export function adaptDocument(raw: any): StoryDocument {
  return {
    id: raw.$key ?? raw.documentId,
    title: raw.name?.text ?? '',
    // 内容在 RichContentTable 中，需二次查询
    contentId: raw.contentId ?? '',
    category: raw.category ?? '',
    relatedChars: raw.relatedChars ?? [],
    relatedAreas: raw.relatedAreas ?? [],
  }
}

// 富文本解析
// RichContentTable 的内容可能是分段格式，需递归遍历 contentList
function parseRichContent(raw: any): RichContent {
  // contentList: [{ type: 'text', content: '...' }, { type: 'image', src: '...' }]
  return {
    paragraphs: (raw.contentList ?? []).map(parseParagraph),
  }
}
```

### 展示实现

**总览页**：
- 顶部：时间线（按剧情顺序排列关键事件节点）
- 下方：分类入口卡片（PRTS 文献 / 剧情对话 / SNS 聊天 / 广播）

**文献详情**：
- 富文本全文展示（支持段落、加粗、高亮、内联标签等格式化）
- 侧栏显示关联角色 / 关联地区 / 关联敌人

**SNS 对话**：按角色聚合，模拟聊天界面样式（左/右气泡）。

## 相关卷宗

- [[proposal-001-architecture|整体技术方案]]
- 各模块 product doc（01-11）
