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

## 相关文档

- [工程架构规范](../engineering-spec.md)
- [[data-mapping-tables|数据表映射参考]]
