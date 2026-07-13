---
description: 干员图鉴模块 — 可操作角色的一站式查阅页面
type: Permanent
---

# 干员图鉴

干员图鉴是档案馆的核心模块，提供所有可操作角色的展示与详情查阅。

## 功能范围

- 干员列表页（网格/列表两种视图）
- 干员详情页（档案、属性、语音、剧情关联）
- 多维筛选（职业、属性形态、种族、阵营、稀有度）
- 搜索（名称、代号）

## 数据字段

| 字段 | 类型 | 来源 |
|------|------|------|
| 名称/代号 | string | CharacterTable.name |
| 种族 | tag_race_* | CharacterTable / TagDataTable |
| 职业 | profession_id | CharProfessionTable |
| 属性形态 | CharType | CharTypeTable |
| 阵营归属 | tag_power_* | TagDataTable |
| 稀有度 | rarity | CharacterTable |
| 档案记录 | text[] | CharacterTable.profileRecord |
| 语音文本 | text[] | CharacterTable.profileVoice |
| 角色标签 | tag[] | CharacterTagDesTable |

## 视图结构

```mermaid
flowchart TD
    A[干员列表页] --> B[筛选栏]
    A --> C[网格/列表切换]
    A --> D[干员卡片]
    D --> E[干员详情页]
    E --> F[基础信息区]
    E --> G[属性面板]
    E --> H[档案/语音标签页]
    E --> I[关联内容]
    I --> J[相关武器]
    I --> K[相关剧情]
    I --> L[同阵营干员]
```

## 已知角色清单

参见 [[00-site-concept#数据源说明|站点概念设计]] 中关联的数据源说明。

如需扩展数据，通过 `CharacterTable` 接口增量获取即可。

## 相关文档

- [[03-profession-element|职业与属性]]
- [[04-races|种族一览]]
- [[05-factions|势力阵营]]
