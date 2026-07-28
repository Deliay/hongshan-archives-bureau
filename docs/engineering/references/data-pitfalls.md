---
description: 数据层常见陷阱与经验参考
type: Permanent
---

# 数据层常见陷阱

本文档记录处理游戏数据时容易出错的历史经验，实现新功能前必读。

## 64 位整数 ID

游戏数据中存在超过 `Number.MAX_SAFE_INTEGER` 的 ID。`api.ts` 中的 `safeParse` 在 `JSON.parse` 前对 17 位及以上数字加引号，使其以字符串形式存在。任何 i18n 字典查找都必须使用 `String(field.id)`，不能假设 `field.id` 是数字。

## 天赋节点名称与图标

`talentNodeMap` 中不同 `nodeType` 对应不同数据结构：

| nodeType | 含义 | 名称来源 | 图标路径 |
|---|---|---|---|
| 1/2 | 精英化/能力值突破 | — | `talenticon/{iconId}.png` |
| 3 | 属性提升 | `attributeNodeInfo.title`/`.desc` | `talenttreeicon/icon_talenttree_{attrType}.png` |
| 4 | 被动技能 | `passiveSkillNodeInfo.name` | `skillicon/{iconId}.png` |
| 5 | 工厂/飞船技能 | 经 `SpaceshipCharSkillTable` 索引到 `SpaceshipSkillTable` | 来自 `SpaceshipSkillTable` |

## 技能数据

`SkillPatchDataBundle` 中的 `skillName` 与 `description` 经常是空 locale 对象。真实技能名来自 `CharGrowthTable.skillGroupMap[groupId].name`，描述来自 `.desc`，并用 `blackboard` 数组中的值替换 `{key}` 占位符。

## 基建技能（nodeType 5）

数据流：`talentNodeMap[nodeId].factorySkillNodeInfo.index` → `SpaceshipCharSkillTable[charId].skillList[index].skillId` → `SpaceshipSkillTable[skillId]`。

i18n 字典来自 `SpaceshipSkillTable`，不是 `SkillPatchTable`。

## 武器数据来源

武器数据分布在两张表：

- `WeaponBasicTable`：战斗数据（weaponType、skills、breakthrough、upgrade templates）
- `ItemTable`：显示数据（名称、decoDesc、iconId）

`ItemTable` 的 key 就是 `weaponId`（如 `wpn_sword_0003`），不是 `item_wpn_xxx`。适配时必须同时拉取两张表。

武器类型名存在 `TextTable` 中，key 为 `LUA_WEAPON_TYPE_{1,2,3,5,6}`。

## 技能 tagId

`SkillPatchDataBundle[0]` 中每个技能有 `tagId` 字段分类（如 `attr_str`、`attr_main`、`tactic`）。第三个武器技能（`sk_wpn_*`）的 `tagId` 固定为 `tactic`。

## 敌人数据来源

- `EnemyTemplateDisplayInfoTable`（key 为 `templateId`）是主要来源，包含名称、描述、类型、标签、能力、分布。
- `EnemyDisplayInfoTable`（key 为 `enemyId`）是次要来源，条目的 `templateId` 可能与 key 不同。
- 聚合时优先用 `templateId` 分组，将变体归到基础模板下。

## 敌人属性模板

`EnemyAttributeTemplateTable` 结构特殊：

- `levelDependentAttributes` 是数组，每项 `{ attrs: [{ attrType, attrValue }] }`，无 `level` 字段。等级 = 数组索引 + 1。
- `levelIndependentAttributes` 是对象 `{ attrs: [...] }`，不是可迭代数组，必须访问 `.attrs`。
- 顶层抗性标量（`physicalDmgResistScalar` 等）是直接浮点属性。

## 敌人属性修正

`EnemyTable.attrModifiers[]` 对属性进行修正：

- `attrType`：属性类型 ID（1=HP，2=ATK，20=移速）
- `attrValue`：修正幅度
- `modifierType`：0= flat 加法；1/4=乘法（最终 = 基础 × (1 + attrValue)）
- `modifyAttributeType`：0=修正基础属性

Dummy/training 敌人常见配置：`attrType:1, attrValue:1000, modifierType:1`，即 ×1001 HP。

## 敌人分布区域

`EnemyTemplateDisplayInfoTable.distributionIds[]` 是区域 ID，需查 `DistributionInfoTable` 的 `areaName` 解析。展示时：

- 绿色：新增分布
- 红色删除线：移除分布
- 灰色：已有分布

## 原始数据组件必须拉取 I18n

组件如 `ItemPanel`、`ItemTooltip` 直接拉取原始表数据时，必须同时拉取该表 i18n 字典。原始 `{ id, text }` 对象不含 locale key，禁止直接访问 `raw.name[locale]`。应使用 `resolveI18n(raw.name, i18nMap)` 或 `i18nMap[String(raw.name.id)] || raw.name.text || ''`。

## I18n 搜索

`fetchI18nSearch(regex)` 可跨表搜索包含某文本的 i18n 条目，返回 `{ Table, Path, Id }[]`。再用 `fetchI18nText(locale, id)` 获取具体文本。种族/阵营的「相关记载」即基于此实现。

## Diff 中的数字 ID

`diff-tables.ts` 同样使用 `safeParse`，i18n 字段检测兼容 `id` 为 number 或 string。比较时始终使用 `String(field.id)`。

## 数组差异使用索引路径

当数组字段变更（如 `distributionIds`）时，Diff 输出使用索引路径如 `distributionIds[2]`，而不是顶层 `distributionIds` 键。检测数组变更时过滤 `k.startsWith('distributionIds')`，读取完整数组需直接访问 `entry.oldValue.distributionIds` 与 `entry.newValue.distributionIds`。

## 新增干员卡片

当干员完全新增时，差异卡片需展示完整信息：基础信息、技能（从 `CharGrowthTable` + `SkillPatchTable`）、基建技能、档案与语音。卡片使用蓝色边框与「新增」徽章。

## 工厂数据表

### WikiDefaultCraftTable 值为纯字符串

该表 value 是 craftId **纯字符串**（如 `"item_gas_copper": "liquid_transmuter_2_gas_gas_copper_1"`），不是 `{ craftId }` 对象。按 `entry.craftId` 解析会静默得到空表，导致链路图丢失官方默认配方、回退到配方表键序首个配方（气态赤铜/空罐/赤铜块的首个均为拆解机/转化机反向配方，必然构成净产出为 0 的封闭回路）。解析必须兼容字符串：

```ts
const craftId = typeof entry === 'string' ? entry : entry?.craftId
```

另外表内液体/气体的“默认 craft”是指向泵的伪配方 ID（如 `item_liquid_water_pump_1`、`item_gas_inert_gas_pump_1`），不存在于 `FactoryMachineCraftTable`，仅表达「该资源来自哪台泵」。

### FactoryFluidPumpInTable 结构不同于矿机表

`FactoryMinerTable`/`FactoryGasMinerTable` 用 `mineable[{miningItemId, produceRate}]`；而 `FactoryFluidPumpInTable` 用 `enableLiquidIds: string[]` 列举可泵采液体（无 `mineable`、无 `produceRate`，隐含每 `msPerRound` 1 单位）。按 `mineable` 解析会静默得到空数组，导致液体永远没有采集源头。`pump_2`（二型耐酸水泵）是 `item_liquid_acid` 的唯一泵采来源。

### 采种/种植配方在 FactoryMachineCraftTable

采种机（`seedcollector_1`，多为 1 作物 → 2 种子）与种植机（`planter_1`，1 种子 → 1 作物）的配方就是普通机器配方，没有独立配方表。二者构成净产出比 = 2 的有效循环（增产），链路求解时不能按封闭回路剪枝；种草例外（采种 1→1，种植需额外清水）。另有未加载的 `SpaceshipGrowCabinSeedFormulaTable`（飞船培育舱 1 作物 → 3 种子）勿与采种机混淆。

### FactoryMachineCraftTable 产出多 group = 副产物

配方的 `ingredients` 恒为单 group（组内多物品皆必需，全表 0 个多材料组配方）；但 `outcomes` 的**多 group 语义为「每组一个副产物」**（全表 8 个配方，如反应池的 污水、惰性壤晶废液）。对 outcomes 只取首 group 会静默丢弃副产物——影响副产物物品的路线候选与反应池缓存区物质计数。适配时必须展开全部产出组。

### 气罐灌装/拆解与转化机构成零净值自耗环

灌装机（`filling_powder_mc_1`：空罐 + 气体 → 气罐）与拆解机（`dismantler_1`：气罐 → 空罐 + 气体）互逆，任意气体品种都构成 1:1 零净值环（生产中空气瓶/罐只循环不消耗）。同理转化机互逆配方（液气转化 `transmuter_1`、固气转化 `transmuter_2`，如 息壤气⇌息壤液⇌息壤粉末）任意往返组合净产出比 = 1。**这些配方单个看都「可行」，组合后左脚踩右脚不产出任何产物**，链路求解绝不能把它们当作气体的生产路线（验收 2.29）。拆解机/转化机反向配方在配方表键序中往往排在正向配方之前，无官方默认配方（WikiDefaultCraftTable）的物品极易回退到它们。

### 反应池缓存区（slot）数量不在结构化表中

反应池（`mix_pool_1`）/ 扩容反应池（`mix_pool_2`）的缓存区数量在结构化数据表中**不存在**（FactoryBuildingTable / FactoryFluidReactionTable / CraftGroupTable / GlobalConst 等均已排查，该部分游戏数据尚未解包）。数值仅见于教学文案（I18nTextTable）：「扩容反应池拥有8个缓存区」→ mix_pool_2 = 8；「仅有5个缓存区的反应池…」→ mix_pool_1 = 5。缓存区占用 = 共炉配方涉及的不同物质种数（投入∪产出，产物也占缓存区，共享物质只算一次，见「3个配方一共涉及8种不同的物质」「将产出的芽针溶液存储在最后一个缓存区中」）。代码中以常量维护于 `chain.ts` 的 `REACTOR_BUFFER_SLOTS` 并注明出处；若未来游戏结构化该数据应切换为动态加载。

### FactoryMachineCraftTable 的 totalProgress 不是毫秒

配方的 `totalProgress` 字段**不是毫秒**：全部数据版本均满足 `totalProgress = progressRound × 6000`，即 **6000 进度单位 = 1 秒**（`progressRound` 字段即为制作秒数）。例：中容武陵电池 `progressRound=10, totalProgress=60000` → 10s/个 → 单台 6/min。误按毫秒（`count×60000/totalProgress`）计算会把所有机器理论产速低估 6 倍、台数放大 6 倍。单台理论产速应为 `count × 360000 / totalProgress`（`chain.ts` 的 `perMinute()`）。注意与矿机/泵机表区分：`FactoryMinerTable`/`FactoryFluidPumpInTable` 等的 `msPerRound` 字段名自带 ms，为真实毫秒。

### 配方副产物可回用于链路其他环节

多产出配方的非主产出（如壤晶合成副产污水、精炼炉副产污水/提纯机副产清水）不是废料：游戏内可回用为其他配方的材料（壤晶废液合成吃污水、惰性壤晶废液经提纯机 4→1 回收为壤晶废液）。链路求解必须将副产物作为供给抵扣需求（含「副产物→转化配方→主产物」的利用回路），否则会为污水等材料虚增整条上游链（典型：中容武陵电池 6/min 的污水净外部需求仅 18/min，不复用会按 60/min 跑赫铜块路线、顶满赤铜矿区域上限 420/min）。转化路线的副产物材料需按副产物余量封顶，防止「为转化而生产副产物」的自喂放大。

### FactoryMinerTable 的 consumeItem

矿机 `mineable[]` 条目可能带 `consumeItem`（如 `miner_4` 水驱矿机采矿消耗清水），adapter 目前丢弃该字段，评估矿机真实成本时需注意。

## 相关文档

- [工程架构规范](../engineering-spec.md)
- [[data-mapping-tables|数据表映射参考]]
