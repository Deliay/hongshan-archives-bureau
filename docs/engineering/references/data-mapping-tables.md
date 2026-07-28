---
description: 游戏数据表与前端适配映射参考
type: Permanent
---

# 数据表映射参考

本文档记录《宏山档案馆》使用的主要游戏数据表、主键、关键字段与用途。实现新功能或调试数据问题时查阅。

## 干员相关

| 表名 | 主键 | 关键字段 | 用途 |
|---|---|---|---|
| CharacterTable | `charId` | `profession`, `charTypeId`, `rarity`, `mainAttrType`, `subAttrType`, `charBattleTagIds[]`, `name`, `profileRecord[]`, `profileVoice[]` | 干员主数据 |
| CharProfessionTable | numeric ID | `name`, `iconId` | 职业名称/图标 |
| CharTypeTable | string key | `name`, `color`, `icon` | 元素名称/颜色/图标 |
| CharBattleTagTable | string key | i18n value | 战斗标签 |
| AttributeMetaTable | numeric attrType | `iconName` | 属性图标 |
| AttributeShowConfigTable | numeric attrType | `list[0].name` | 属性显示名 |
| CompositeAttributeShowConfigTable | `"Main"`, `"Sub"`, `"All"` | 属性组配置 | 属性分组 |
| CharGrowthTable | `charId` | `skillGroupMap`, `skillLevelUp`, `charBreakCostMap`, `talentNodeMap` | 干员成长/技能/天赋 |
| SkillPatchTable | `skillId` | `SkillPatchDataBundle[]` | 技能等级数据 |
| SpaceshipCharSkillTable | `charId` | `maxSkillCount`, `skillList[]` | 基建/飞船技能映射 |
| SpaceshipSkillTable | `skillId` | `name`, `desc`, `icon`, `roomType`, `effectType`, `parameters` | 基建技能数据 |
| TagDataTable | tag ID | `tagName`, `tagGroupId`, `hideTag` | 种族/专长/爱好等标签 |
| TagGroupDataTable | group ID | `tagGroupName`, `desc` | 标签分组 |
| CharacterTagTable | `charId` | `raceTagId`, `blocTagId`, `dispositionTagIds[]`, `hobbyTagIds[]`, `expertTagIds[]`, `giftPreferTagId[]` | 干员标签映射 |
| CharacterTagDesTable | `charId` | `tagDesc` map | 干员专属标签描述 |

## 武器与物品

| 表名 | 主键 | 关键字段 | 用途 |
|---|---|---|---|
| WeaponBasicTable | `weaponId` | `name`, `rarity`, `weaponDesc`, `decoDesc` | 武器战斗数据 |
| ItemTable | `itemId` | `name`, `rarity`, `type`, `desc`, `decoDesc`, `iconId`, `iconCompositeId`, `obtainWayIds[]` | 物品/材料显示数据 |
| ItemTypeTable | numeric string | `name`, `itemType`, `storageSpace` | 物品类型名 |
| ItemShowingTypeTable | numeric string | `name`, `icon`, `sortId`, `type` | 物品显示类型 |
| ValuableDepot | numeric string | `name`, `icon`, `storageItemType[]`, `type` | 贵重仓库分类 |
| FullBottleTable | `itemId` | `liquidId`, `liquidCapacity` | 满瓶液体覆盖 |
| SystemJumpTable | `wayId` | `iconId`, `desc` | 物品获取途径提示 |
| UsableItemChestTable | `itemId` | `rewardIdList[]` | 宝箱内容 |
| TextTable | string key | `{ id, text }` | 全局文本，如 `LUA_WEAPON_TYPE_*` |

## 敌人相关

| 表名 | 主键 | 关键字段 | 用途 |
|---|---|---|---|
| EnemyTemplateDisplayInfoTable | `templateId` | `name`, `nickname`, `description`, `displayType`, `abilityDescIds[]`, `tags[]`, `distributionIds[]` | 敌人显示信息（主要来源） |
| EnemyTable | `enemyId` | `attrTemplateId`, `templateId`, `modelId`, `attrModifiers[]` | 敌人原始数据 |
| EnemyAbilityDescTable | `abilityId` | `name`, `description` | 敌人能力描述 |
| EnemyAttributeTemplateTable | `templateId` | `levelDependentAttributes[]`, `levelIndependentAttributes`, 抗性/韧性标量 | 敌人等级属性 |
| EnemyTagTable | `tagId` | `tagText` | 敌人标签显示名 |
| DisplayEnemyTypeTable | numeric string | `name` | 敌人类型名 |
| WikiEntryDataTable | string key | `refMonsterTemplateId`, `groupId` | 敌人到分组映射 |
| WikiGroupTable | `groupId` | `list[]` with `groupName`, `iconId` | 敌人分组定义 |
| DistributionInfoTable | area ID | `areaName` | 敌人分布区域名 |

## 活动相关

| 表名 | 主键 | 关键字段 | 用途 |
|---|---|---|---|
| ActivityTable | `id` (string) | `name`, `desc`, `type`, `timeId`, `tagIds[]`, `tabImg`, `tabImgColor`, `sortId`, `rewardId`, `bgImg` | 活动主数据 |
| TimeRangeTable | string key（活动以 `timeId` 关联） | `timeRangeList[]`（`openTime`, `closeTime`） | 活动开启/结束时段 |
| ActivityTagTable | `tagId` | `name` | 活动标签显示名 |

活动数据要点：

- `ActivityData.timeId` 直接给出 TimeRangeTable 的 key，无需启发式猜测；查不到时按无时间信息处理。
- 时间格式为字符串 `"yyyy/M/d H:mm:ss"`（UTC+8，不补零），需手写解析；`closeTime` 为空串表示常驻。
- `timeRangeList` 可能含多个时段且存在重复，需去重。
- `type` 为开放枚举（实测 31 种值且随版本增长），展示时必须做「大类归并 + 其他兜底」，禁止封闭枚举硬编码。
- 图片路径：`ui/sprites/activity/{tabImg}.png`。

## 工厂相关

| 表名 | 主键 | 关键字段 | 用途 |
|---|---|---|---|
| FactoryMachineCraftTable | `id` | `machineId`, `ingredients[{group:[{id,count}]}]`, `outcomes[{group:[{id,count}]}]`, `totalProgress`（= progressRound × 6000，6000 进度 = 1 秒）, `sortId` | 机器制造配方（含采种/种植） |
| FactoryBuildingTable | building ID | `name`, `iconOnPanel`（图标在 `factory/buildingpanelicon/`） | 机器/建筑显示数据 |
| FactoryMinerTable | miner ID | `mineable[{miningItemId, produceRate, consumeItem?}]`, `msPerRound`（真毫秒） | 矿机可采资源与产能 |
| FactoryGasMinerTable | gas miner ID | 同 FactoryMinerTable | 气泵可采气体 |
| FactoryFluidPumpInTable | pump ID | `enableLiquidIds[]`, `msPerRound` | 水泵可泵液体（隐含每轮 1 单位） |
| WikiDefaultCraftTable | item ID | value = craftId **纯字符串**（泵类为伪配方 ID） | 官方指定默认配方 |
| FactoryGridBeltTable | `grid_belt_01` | `beltData.msPerRound`（2000ms → 30 个/min） | 固体传送带吞吐量 |
| FactoryLiquidPipeTable | `log_pipe_01` | `pipeData.msPerRound`（500ms）、`volume`（1 → 120 单位/min） | 液体管道吞吐量 |
| LiquidTable | item ID | — | 液体物品判定（链路图边样式：管道 vs 传送带） |
| FactoryItemAsMachineCrafterIncomeTable / OutcomeTable | ⚠️ key 非物品 ID | — | 不用于物品索引（见 [[data-pitfalls|数据陷阱]]） |

适配要点：配方适配器在 `src/lib/factory/recipes.ts`；链路求解器在 `src/lib/factory/chain.ts`（架构见 [制作链路求解器参考](./factory-chain-solver.md)）；区域采集上限为人工维护常量 `src/lib/factory/regions.ts`（武陵/四号谷地）。

## 富文本相关

| 表名 | 主键 | 关键字段 | 用途 |
|---|---|---|---|
| HyperlinkTextTable | string key | `name`, `desc`, `iconPath` | 富文本超链接提示 |
| RichTextStyleTable | string key | `preDef[]`, `postDef[]` | 富文本样式定义 |

## I18n 配对规则

每个表有独立的 i18n 字典。Hook 在获取表数据时并行获取对应字典，再传入 `adapt*`。禁止混用不同表的字典，否则会出现空文本或回退文本。

领域 lookup map（`getProfessionMap`、`getElementMap`、`getBattleTagMap`、`getAttributeMap`、`getRaceMap`）按语言缓存为 `Map<string, Promise<...>>`。

`getRaceMap` 先取 `TagDataTable` 过滤 `tagGroupId === 'tag_group_race'`，再取 `CharacterTagTable` 建立 `charId → raceName`。`useRaces` 生成的列表数据缓存于 `__built_races` 键。

## 相关文档

- [工程架构规范](../engineering-spec.md)
- [[data-pitfalls|数据层常见陷阱]]
