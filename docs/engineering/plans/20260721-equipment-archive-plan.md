---
description: 装备图鉴（/archive/equipment）实现方案：数据层、页面、组件与多语言的可执行清单
type: Fleeting
---

# 装备图鉴 - 实现方案

**对应产品文档**: [[20260721-equipment-archive|装备图鉴产品方案（docs/product/draft）]]
**对应技术方案**: [[20260721-equipment-archive|装备图鉴技术方案]]
**实现方案版本**: v1.0
**创建日期**: 2026-07-21
**作者**: 前端工程
**开发分支**: `feat/equipment-archive`

## 1. 概述

### 1.1 目标

将技术方案转化为可执行的代码实现清单：装备列表页（套组分组）、装备卷宗页（属性 / 套装技能 / 精锻材料 / 制作配方）、`RecipePanel` 公共组件、`ItemTooltip` 装备分支、14 语言文案与测试。

### 1.2 范围

- **做**：`types.ts` / `adapter.ts` / `useData.ts` 数据层；`EquipmentList` / `EquipmentDetail` 页面；`EquipCard` / `EquipTooltipPanel` / `RecipePanel` 组件；`App.tsx` 路由；`equipment.*` i18n（14 语言全量）；adapter 单测与 E2E。
- **不做**：Gem（宝石）相关展示；工厂配方通用接入；缓存与 API 层改动；`Breadcrumb`（已有 `equipment` 映射，实现时验证详情页表现即可）；`Sidebar`（导航已存在）。

## 2. 代码变更总览

### 2.1 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/pages/equipment/EquipmentList.tsx` | 装备列表页（替换占位页） |
| `src/pages/equipment/EquipmentDetail.tsx` | 装备卷宗页 |
| `src/components/Equipment/EquipCard.tsx` | 装备卡片（列表/卷宗/材料区复用） |
| `src/components/Equipment/EquipTooltipPanel.tsx` | ItemTooltip 装备摘要面板 |
| `src/components/Craft/RecipePanel.tsx` | 配方展示公共组件 |
| `src/lib/__tests__/adapter.test.ts` | adaptEquip / adaptSuit / adaptEquipFormula 单测 |
| `tests/e2e/src/equipment.spec.ts` | 装备模块 E2E |

### 2.2 修改文件

| 文件路径 | 说明 |
|----------|------|
| `src/lib/types.ts` | 重写 `Equip`/`Suit`，新增 `RecipeEntry`，删除死代码 `Recipe` |
| `src/lib/adapter.ts` | 重写 `adaptEquip`/`adaptSuit`，新增 `adaptEquipFormula` |
| `src/hooks/useData.ts` | 重写 `useEquips`，新增 `useEquipDetail`；`getAttributeMap` 导出并扩展格式配置 |
| `src/components/Items/ItemTooltip.tsx` | 新增 `ITEM_TYPE.Equip` 分支 |
| `src/App.tsx` | 替换 equipment 占位路由，新增 `equipment/:id` |
| `scripts/i18n-custom.json` | 新增 `equipment.*` namespace（14 语言） |

### 2.3 删除文件

| 文件路径 | 说明 |
|----------|------|
| `src/pages/equipment/EquipmentOverview.tsx` | 占位页，被 `EquipmentList` 替代 |

## 3. 详细实现

### 3.1 类型定义 `src/lib/types.ts`

```ts
export interface EquipAttr {
  attrType: number
  value: number
  enhancedValues: number[]
  modifierType: number
}

export interface Equip {
  id: string
  name: string
  description: string
  decoDesc: string
  iconId: string
  rarity: number
  partType: number
  suitId: string
  minWearLv: number
  baseAttr: EquipAttr | null
  attrs: EquipAttr[]
  obtainWayIds: string[]
}

export interface SuitEffect {
  equipCnt: number
  skillId: string
  skillLv: number
}

export interface Suit {
  id: string
  name: string
  logoName: string
  equipIds: string[]
  effects: SuitEffect[]
}

export interface RecipeMaterial {
  itemId: string
  count: number
}

export interface RecipeEntry {
  id: string
  isDefault: boolean
  materials: RecipeMaterial[]
  goldId: string
  goldCount: number
  hasUnlockCondition: boolean
}

export interface EquipDetail {
  equip: Equip
  suit: Suit | null
  suitEquips: Equip[]
  enhanceMaterials: Equip[]
  enhanceCost: RecipeMaterial | null
  recipes: RecipeEntry[]
}
```

删除未被引用的 `Recipe` 接口（死代码）。

### 3.2 适配器 `src/lib/adapter.ts`

#### 3.2.1 `adaptEquip`（重写，合并 EquipTable + ItemTable）

```ts
function adaptAttr(raw: any): EquipAttr {
  return {
    attrType: raw.attrType ?? 0,
    value: raw.attrValue ?? 0,
    enhancedValues: raw.enhancedAttrValues ?? [],
    modifierType: raw.modifierType ?? 0,
  }
}

export function adaptEquip(raw: any, itemRaw: any, i18nMap?: Record<string, string>): Equip {
  return {
    id: raw.itemId ?? raw.$key ?? '',
    name: resolveI18n(itemRaw?.name, i18nMap) || raw.itemId || '',
    description: resolveI18n(itemRaw?.desc, i18nMap),
    decoDesc: resolveI18n(itemRaw?.decoDesc, i18nMap),
    iconId: itemRaw?.iconId ?? '',
    rarity: itemRaw?.rarity ?? 0,
    partType: raw.partType ?? 0,
    suitId: raw.suitID ?? '',
    minWearLv: raw.minWearLv ?? 0,
    baseAttr: raw.displayBaseAttrModifier ? adaptAttr(raw.displayBaseAttrModifier) : null,
    attrs: (raw.displayAttrModifiers ?? []).map(adaptAttr),
    obtainWayIds: itemRaw?.obtainWayIds ?? [],
  }
}
```

#### 3.2.2 `adaptSuit`（重写，匹配真实表结构）

```ts
export function adaptSuit(raw: any, i18nMap?: Record<string, string>): Suit {
  const first = raw.list?.[0]
  return {
    id: raw.suitID ?? raw.$key ?? '',
    name: resolveI18n(first?.suitName, i18nMap) || raw.suitID || raw.$key || '',
    logoName: first?.suitLogoName ?? '',
    equipIds: raw.equipList ?? [],
    effects: (raw.list ?? []).map((e: any) => ({
      equipCnt: e.equipCnt ?? 0,
      skillId: e.skillID ?? '',
      skillLv: e.skillLv ?? 1,
    })),
  }
}
```

注意：`EquipSuitTable` 的 key 即 suitId，条目内无 `suitID` 字段，遍历时需注入 `$key`。

#### 3.2.3 `adaptEquipFormula`（新增，展开材料链）

```ts
export function adaptEquipFormula(formulaRaw: any, chainList: any[]): RecipeEntry[] {
  return chainList
    .map((chain: any) => ({
      id: `${formulaRaw.formulaId}#${chain.chainId}`,
      isDefault: chain.isDefault ?? false,
      materials: (chain.costItemId ?? []).map((itemId: string, i: number) => ({
        itemId,
        count: chain.costItemNum?.[i] ?? 0,
      })),
      goldId: chain.costGoldId ?? '',
      goldCount: chain.costGoldNum ?? 0,
      hasUnlockCondition: Number(formulaRaw.unlockType) !== 0,
    }))
    .sort((a: RecipeEntry, b: RecipeEntry) => Number(b.isDefault) - Number(a.isDefault))
}
```

### 3.3 Hooks `src/hooks/useData.ts`

#### 3.3.1 `getAttributeMap` 导出与扩展

现有 `getAttributeMap`（模块私有，146 行）改为 `export`，返回值扩展格式配置供属性值展示：

```ts
function getAttributeMap(locale: string): Promise<Record<number, {
  id: number
  name: string
  icon: string
  valueFormat: string
  showPercent: boolean
}>>
```

`valueFormat` / `showPercent` 取自 `AttributeShowConfigTable[k].list[0]`，页面用现有 `formatAttributeShow({ valueFormat, showPercent }, value)` 格式化数值（覆盖 `0.414` 这类百分比属性）。

#### 3.3.2 `useEquips`（重写）

```ts
export function useEquips(): UseDataResult<{ equips: Equip[]; suits: Suit[] }> {
  const { locale } = useLocale()
  return useData(async () => {
    const [equipRaw, itemRaw, suitRaw, itemI18n, suitI18n] = await Promise.all([
      getCachedData<Record<string, any>>('EquipTable', () => fetchTableAll('EquipTable')),
      getCachedData<Record<string, any>>('ItemTable', () => fetchTableAll('ItemTable')),
      getCachedData<Record<string, any>>('EquipSuitTable', () => fetchTableAll('EquipSuitTable')),
      getTableI18nDict('ItemTable', locale),
      getTableI18nDict('EquipSuitTable', locale),
    ])
    const equips = Object.values(equipRaw).map((v: any) => adaptEquip(v, itemRaw[v.itemId], itemI18n))
    const suits = Object.entries(suitRaw).map(([k, v]) => adaptSuit({ ...(v as any), $key: k }, suitI18n))
    return { equips, suits }
  }, [locale])
}
```

旧 `useSuits` 删除（无引用）；`useGems` 保留不动。

#### 3.3.3 `useEquipDetail`（新增）

```ts
export function useEquipDetail(id: string): UseDataResult<EquipDetail> {
  const { locale } = useLocale()
  return useData(async () => {
    const [equipRaw, itemRaw, suitRaw, itemI18n, suitI18n, constRaw, enhanceCostRaw, reverseRaw, formulaRaw, chainRaw] =
      await Promise.all([
        getCachedData<Record<string, any>>('EquipTable', () => fetchTableAll('EquipTable')),
        getCachedData<Record<string, any>>('ItemTable', () => fetchTableAll('ItemTable')),
        getCachedData<Record<string, any>>('EquipSuitTable', () => fetchTableAll('EquipSuitTable')),
        getTableI18nDict('ItemTable', locale),
        getTableI18nDict('EquipSuitTable', locale),
        getCachedData<Record<string, any>>('EquipConst', () => fetchTableAll('EquipConst').catch(() => ({}))),
        getCachedData<Record<string, any>>('EquipEnhanceCostTable', () => fetchTableAll('EquipEnhanceCostTable').catch(() => ({}))),
        getCachedData<Record<string, string>>('EquipFormulaReverseTable', () => fetchTableAll('EquipFormulaReverseTable').catch(() => ({}))),
        getCachedData<Record<string, any>>('EquipFormulaTable', () => fetchTableAll('EquipFormulaTable').catch(() => ({}))),
        getCachedData<Record<string, any>>('EquipFormulaChainTable', () => fetchTableAll('EquipFormulaChainTable').catch(() => ({}))),
      ])
    const equip = adaptEquip(equipRaw[id], itemRaw[id], itemI18n)
    const allEquips = Object.values(equipRaw).map((v: any) => adaptEquip(v, itemRaw[v.itemId], itemI18n))

    const suitEntry = equip.suitId ? suitRaw[equip.suitId] : null
    const suit = suitEntry ? adaptSuit({ ...suitEntry, $key: equip.suitId }, suitI18n) : null
    const equipById = new Map(allEquips.map((e) => [e.id, e]))
    const suitEquips = (suit?.equipIds ?? []).map((eid) => equipById.get(eid)).filter((e): e is Equip => Boolean(e))

    const enhanceRarity = constRaw.enhanceEquipRarity ?? 5
    const enhanceMaterials = allEquips
      .filter((e) => e.id !== id && e.partType === equip.partType && e.rarity >= enhanceRarity)
      .sort((a, b) => b.rarity - a.rarity || b.minWearLv - a.minWearLv)

    const costEntry = enhanceCostRaw[equipRaw[id]?.domainId]
    const enhanceCost = costEntry?.consumeItemId
      ? { itemId: costEntry.consumeItemId, count: costEntry.consumeItemCnt ?? 0 }
      : null

    const formulaId = reverseRaw[id]
    const formula = formulaId ? formulaRaw[formulaId] : null
    const chains = formula ? chainRaw[formula.level]?.chainList ?? [] : []
    const recipes = formula ? adaptEquipFormula(formula, chains) : []

    return { equip, suit, suitEquips, enhanceMaterials, enhanceCost, recipes }
  }, [id, locale])
}
```

### 3.4 装备卡片 `src/components/Equipment/EquipCard.tsx`

参照 `WeaponCard`（WeaponList.tsx:382）：

- 整体 `<Link to={/archive/equipment/${equip.id}}>`，圆角细边框，hover 边框 `archive-gold/40`。
- 图标 `itemicon/{iconId}.png`（`onError` 隐藏兜底），名称、稀有度色条（复用 `RARITY_COLORS` 映射，抽到组件内常量或与 WeaponCard 对齐）。
- 底部标签：部位（`t(`equipment.part${Body|Hand|Edc}`)`）。

```tsx
export default function EquipCard({ equip }: { equip: Equip }) { ... }
```

### 3.5 列表页 `src/pages/equipment/EquipmentList.tsx`

照搬 `WeaponList` 状态机模式：

- 状态：`search / partFilter / rarityFilter / sortField('rarity' | 'wearLevel') / sortDesc / pageSize / groupPageMap`。
- `useMemo` 链：`filtered → sorted → groups`。
- 分组：`Map<suitId, Equip[]>`，散件（`suitId === ''`）归入 key `''` 的组，渲染时排最后；组头：套组徽记（`equipmentlogobig/{logoName}.png`，`onError` 隐藏）+ 套组名 + `t('common.countPiece', { count })`；散件组头为 `t('equipment.looseGroup')`。
- 筛选：部位（全部/护甲/护手/配件）、稀有度（全部/3/4/5 星，按数据实际分布动态生成）。
- 每组独立分页（`groupPageMap`），`PAGE_SIZES = [12, 24, 48, 0]`。
- 卡片网格 `grid grid-cols-2 sm:grid-cols-4 gap-2`。
- 加载态 `<ListSkeleton filters={4} cards={12} />`；错误态 `t('common.loadFailed')`；空态 `t('common.notFound', ...)`。

### 3.6 卷宗页 `src/pages/equipment/EquipmentDetail.tsx`

布局参照 `WeaponDetail` + `OperatorDetail` 分节模式：

1. 返回链接：`← t('common.backToList', { list: t('equipment.title') })`。
2. 头部：`w-20 h-20` 图标 + 名称 + `Badge`（`HSA-EQP`，来自 `archiveMeta`）+ 部位 + 稀有度色条 + `t('equipment.wearLevel')`: `minWearLv`。
3. 描述区：`desc` / `decoDesc` 两张卡片，`<RichText>` 渲染。
4. 属性区：
   - 属性名/图标/格式通过导出的 `getAttributeMap(locale)`（`useEffect` + state 获取，参照 WeaponList 的 `skillNameMap` 模式）。
   - 主属性一行；副属性列表每行：图标 + 名称 + 基础值，其后展示精锻强化值 `enhancedValues`（`t('equipment.enhancedValue')` + 各阶数值，`formatAttributeShow` 格式化）；`enhancedValues` 为空时不展示。
5. 套装区（`suit` 非空时）：
   - 徽记 + 套组名。
   - `effects` 逐条：`t('equipment.suitPieces', { count: effect.equipCnt })` + `<SkillReferenceCard skillId={effect.skillId} defaultLevel={effect.skillLv} />`（不开等级滑块）。
   - `suitEquips` 用 `EquipCard` 网格展示，可跳转。
6. 精锻材料区：
   - 标题 `t('equipment.enhanceMaterials')` + 说明 `t('equipment.enhanceMaterialsHint')`。
   - `enhanceCost` 非空时展示通用消耗：`<ItemPanel itemId={enhanceCost.itemId} amount={enhanceCost.count} showName />`。
   - `enhanceMaterials` 用 `EquipCard` 网格；为空时展示 `t('equipment.noEnhanceMaterial')`。
7. 配方区（`recipes.length > 0` 时）：标题 `t('equipment.recipes')` + `<RecipePanel recipes={recipes} />`。
8. 加载态 `<DetailSkeleton />`；错误态 `t('common.loadFailed')`；`equip` 为空（id 不存在）时 `t('common.notFound', ...)`。

### 3.7 配方公共组件 `src/components/Craft/RecipePanel.tsx`

```tsx
interface RecipePanelProps {
  recipes: RecipeEntry[]
  className?: string
}
```

- 每条 `RecipeEntry` 一个 `p-3 rounded border border-archive-border bg-archive-file` 面板：
  - 材料行：`<ItemPanel itemId amount showName={false} iconClassName="w-8 h-8" className="w-16" />` 横排（先例：OperatorDetail 材料列表）。
  - 货币行：`goldId` 非空时同样用 `ItemPanel` 展示。
  - `hasUnlockCondition` 时展示 `t('equipment.recipeUnlock')` 提示行。
- 组件不含数据请求，纯展示，便于后续工厂模块复用。

### 3.8 `ItemTooltip` 装备分支

#### 3.8.1 `src/components/Equipment/EquipTooltipPanel.tsx`

- 自行按 `itemId` 拉取 `EquipTable` / `EquipSuitTable` / i18n dict（`getCachedData`，参照 `WeaponSkillPanel` 的自取数模式）。
- 展示：部位、稀有度、主属性 + 副属性名称与基础值（属性名经 `getAttributeMap`，但该函数在 hooks 层，Tooltip 内可直接 `getCachedData('AttributeMetaTable'...)` 复用同一缓存键，或改用 hooks 导出——实现时与 `useData.ts` 的导出保持一致）、套组名（`adaptSuit`）。
- 底部：`<Link to={/archive/equipment/${itemId}}>` 文案 `t('equipment.viewDetail')`，点击后关闭弹层。

#### 3.8.2 `src/components/Items/ItemTooltip.tsx` 修改

仿照 Weapon 分支（201-206 行）追加：

```tsx
{Number(itemData.type) === ITEM_TYPE.Equip && (
  <div>
    <div className="text-[10px] text-archive-dust uppercase tracking-wide mb-1">{t('equipment.title')}</div>
    <EquipTooltipPanel itemId={itemId} onNavigate={onClose} />
  </div>
)}
```

`ItemPanel` 本体不改动。

### 3.9 路由 `src/App.tsx`

```tsx
import EquipmentList from './pages/equipment/EquipmentList'
import EquipmentDetail from './pages/equipment/EquipmentDetail'

<Route path="equipment" element={<EquipmentList />} />
<Route path="equipment/:id" element={<EquipmentDetail />} />
```

删除 `EquipmentOverview` 导入。`Breadcrumb.tsx` 第 15 行已有 `equipment: t('nav.equipment')` 映射，实现时验证详情页面包屑（对照 weapons 详情页行为），如有缺漏按 [[ui-pitfalls]] 补齐。

### 3.10 i18n（`scripts/i18n-custom.json`，14 语言全量）

以下 17 个 key 直接写入 `scripts/i18n-custom.json`（扁平 `equipment.*` 顶层 key），随后运行 `node scripts/generate-i18n-dicts.ts` 并用 `node scripts/verify-i18n.ts` 校验。语言列顺序：CN/TC/EN/JP/KR/RU/MX/BR/DE/FR/VN/TH/ID/IT。

| key | CN | TC | EN | JP | KR | RU | MX |
|-----|----|----|----|----|----|----|----|
| `equipment.title` | 装备 | 裝備 | Equipment | 装備 | 장비 | Снаряжение | Equipo |
| `equipment.looseGroup` | 散件 | 散件 | Loose Pieces | 単品 | 단품 | Без комплекта | Piezas sueltas |
| `equipment.partBody` | 护甲 | 護甲 | Armor | 胴 | 갑옷 | Броня | Armadura |
| `equipment.partHand` | 护手 | 護手 | Gloves | 籠手 | 장갑 | Перчатки | Guantes |
| `equipment.partEdc` | 配件 | 配件 | Kit | アクセサリー | 액세서리 | Аксессуар | Accesorio |
| `equipment.wearLevel` | 穿戴等级 | 穿戴等級 | Wear Level | 装備レベル | 착용 레벨 | Уровень ношения | Nivel de uso |
| `equipment.baseAttr` | 主属性 | 主屬性 | Main Attribute | メイン属性 | 주 속성 | Основной атрибут | Atributo principal |
| `equipment.subAttrs` | 副属性 | 副屬性 | Sub Attributes | サブ属性 | 부 속성 | Доп. атрибуты | Atributos secundarios |
| `equipment.enhancedValue` | 精锻强化 | 精鍛強化 | Refinement | 精鍛強化 | 정련 강화 | Усиление перековки | Reforja |
| `equipment.suitSection` | 套装 | 套裝 | Set | セット | 세트 | Комплект | Conjunto |
| `equipment.suitPieces` | 集齐 {{count}} 件激活 | 集齊 {{count}} 件啟動 | Activate with {{count}} pieces | {{count}} 部位で発動 | {{count}}부위 모으면 발동 | Активен при {{count}} предметах | Se activa con {{count}} piezas |
| `equipment.enhanceMaterials` | 精锻材料 | 精鍛材料 | Refinement Materials | 精鍛素材 | 정련 재료 | Материалы перековки | Materiales de reforja |
| `equipment.enhanceMaterialsHint` | 消耗同部位金色品质装备进行精锻 | 消耗同部位金色品質裝備進行精鍛 | Consume gold-quality equipment of the same slot to refine | 同部位の金品質装備を消費して精鍛 | 동일 부위의 금색 등급 장비를 소모하여 정련 | Расходуется золотое снаряжение той же части | Consume equipo dorado de la misma ranura |
| `equipment.noEnhanceMaterial` | 暂无可用的精锻材料 | 暫無可用的精鍛材料 | No refinement materials available | 精鍛素材がありません | 사용 가능한 정련 재료 없음 | Нет доступных материалов | No hay materiales disponibles |
| `equipment.recipes` | 制作配方 | 製作配方 | Crafting Recipes | 製作レシピ | 제작 레시피 | Рецепты изготовления | Recetas de fabricación |
| `equipment.recipeUnlock` | 该配方有解锁条件 | 該配方有解鎖條件 | This recipe has an unlock condition | このレシピには解放条件がある | 이 레시피에는 잠금 해제 조건이 있습니다 | У этого рецепта есть условие разблокировки | Esta receta tiene una condición de desbloqueo |
| `equipment.viewDetail` | 查看卷宗 | 查看卷宗 | View Archive | 巻宗を見る | 문서 보기 | Открыть досье | Ver archivo |

| key | BR | DE | FR | VN | TH | ID | IT |
|-----|----|----|----|----|----|----|----|
| `equipment.title` | Equipamento | Ausrüstung | Équipement | Trang bị | อุปกรณ์ | Peralatan | Equipaggiamento |
| `equipment.looseGroup` | Peças avulsas | Einzelteile | Pièces isolées | Món lẻ | ชิ้นเดี่ยว | Satuan | Pezzi singoli |
| `equipment.partBody` | Armadura | Rüstung | Armure | Giáp | เกราะ | Zirah | Armatura |
| `equipment.partHand` | Luvas | Handschuhe | Gants | Găng tay | ถุงมือ | Sarung tangan | Guanti |
| `equipment.partEdc` | Acessório | Zubehör | Accessoire | Phụ kiện | อุปกรณ์เสริม | Aksesori | Accessorio |
| `equipment.wearLevel` | Nível de uso | Tragestufe | Niveau requis | Cấp đeo | เลเวลสวมใส่ | Level pakai | Livello richiesto |
| `equipment.baseAttr` | Atributo principal | Hauptattribut | Attribut principal | Thuộc tính chính | คุณสมบัติหลัก | Atribut utama | Attributo principale |
| `equipment.subAttrs` | Atributos secundários | Sekundäre Attribute | Attributs secondaires | Thuộc tính phụ | คุณสมบัติรอง | Atribut tambahan | Attributi secondari |
| `equipment.enhancedValue` | Reforja | Veredelung | Reforge | Tinh luyện | การตีขึ้นรูป | Tempa | Riforgiatura |
| `equipment.suitSection` | Conjunto | Set | Ensemble | Bộ | เซ็ต | Set | Set |
| `equipment.suitPieces` | Ativa com {{count}} peças | Aktivierung mit {{count}} Teilen | Actif avec {{count}} pièces | Kích hoạt khi đủ {{count}} món | เปิดใช้เมื่อครบ {{count}} ชิ้น | Aktif dengan {{count}} bagian | Si attiva con {{count}} pezzi |
| `equipment.enhanceMaterials` | Materiais de reforja | Veredelungsmaterialien | Matériaux de reforge | Nguyên liệu tinh luyện | วัสดุตีขึ้นรูป | Bahan tempa | Materiali di riforgiatura |
| `equipment.enhanceMaterialsHint` | Consome equipamento dourado do mesmo espaço | Verbraucht goldene Ausrüstung desselben Platzes | Consomme de l'équipement doré du même emplacement | Tiêu hao trang bị vàng cùng vị trí | ใช้อุปกรณ์สีทองช่องเดียวกัน | Mengonsumsi peralatan emas di slot yang sama | Consuma equipaggiamento dorato dello stesso slot |
| `equipment.noEnhanceMaterial` | Nenhum material disponível | Keine Materialien verfügbar | Aucun matériau disponible | Chưa có nguyên liệu | ไม่มีวัสดุที่ใช้ได้ | Belum ada bahan | Nessun materiale disponibile |
| `equipment.recipes` | Receitas de fabricação | Herstellungsrezepte | Recettes de fabrication | Công thức chế tạo | สูตรผลิต | Resep pembuatan | Ricette di produzione |
| `equipment.recipeUnlock` | Esta receita tem uma condição de desbloqueio | Dieses Rezept hat eine Freischaltbedingung | Cette recette a une condition de déblocage | Công thức này có điều kiện mở khóa | สูตรนี้มีเงื่อนไขปลดล็อก | Resep ini memiliki syarat buka kunci | Questa ricetta ha una condizione di sblocco |
| `equipment.viewDetail` | Ver arquivo | Akte ansehen | Voir le dossier | Xem hồ sơ | ดูแฟ้ม | Lihat arsip | Vedi scheda |

变量占位统一使用 `{{count}}`（双花括号），与现有 `common.countPiece` 一致。

## 4. 实现顺序

### 阶段一：数据层（第 1 轮提交）

- `types.ts`：`Equip`/`Suit`/`RecipeEntry`/`EquipDetail`，删除 `Recipe`。
- `adapter.ts`：`adaptEquip`/`adaptSuit`/`adaptEquipFormula`。
- `useData.ts`：`getAttributeMap` 导出扩展、`useEquips` 重写、`useEquipDetail`、删除旧 `useSuits`。
- `adapter.test.ts` 单测先行。

### 阶段二：组件层（第 2 轮提交）

- `EquipCard`、`RecipePanel`、`EquipTooltipPanel`、`ItemTooltip` 分支。

### 阶段三：页面与路由（第 3 轮提交）

- `EquipmentList`、`EquipmentDetail`、`App.tsx` 路由、删除 `EquipmentOverview`。

### 阶段四：多语言（第 4 轮提交）

- `i18n-custom.json` 17 个 key × 14 语言 → `generate-i18n-dicts.ts` → `verify-i18n.ts`。

### 阶段五：测试与验证（第 5 轮提交）

- E2E `equipment.spec.ts`；`npm run lint && npm run test && npm run build`。

## 5. 测试计划

### 5.1 单元测试（`src/lib/__tests__/adapter.test.ts`）

- `adaptEquip`：i18n 名称解析与回退、散件（`suitID` 缺失 → `suitId: ''`）、`enhancedAttrValues` 缺失 → 空数组、`displayBaseAttrModifier` 缺失 → `baseAttr: null`。
- `adaptSuit`：`$key` 注入、`effects` 多档映射、`suitName` i18n 解析。
- `adaptEquipFormula`：多 chain 展开材料/货币、`isDefault` 置顶排序、`unlockType` 判定。

### 5.2 组件测试

- `RecipePanel`：材料数量渲染、货币行、解锁条件提示行的显隐。

### 5.3 E2E（`tests/e2e/src/equipment.spec.ts`，参照 `weapons.spec.ts`）

- 列表页：分组标题含套组名与计数、散件分组存在、搜索过滤、部位筛选、稀有度排序校验（色条颜色 → 星级）。
- 卷宗页：属性区无 `{` 原始占位符、套装技能描述含格式化数值、精锻材料区与配方区存在、散件卷宗无套装区。
- ItemTooltip：点击装备图标出现装备摘要与「查看卷宗」跳转。

## 6. 验收标准

- [ ] 列表页默认套组分组、散件组排最后，搜索/部位/稀有度筛选与排序、分组独立分页可用。
- [ ] 卷宗页属性区含基础值与精锻强化值；套装区技能描述数值占位符正确替换；精锻材料为同部位金色装备（排除自身）；配方多链路全部展示且默认链路置顶。
- [ ] 散件卷宗不展示套装区；无配方装备不展示配方区；无材料时展示空态文案。
- [ ] `ItemTooltip` 装备分支展示摘要并可跳转卷宗。
- [ ] 17 个 `equipment.*` key 14 语言全量，`verify-i18n.ts` 通过。
- [ ] `npm run lint`、`npm run test`、`npm run build` 通过。

## 7. 风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 套装技能 `skillName` id 为 0 | 技能名缺失 | `SkillReferenceCard` 已有全局字典回退；仍缺失展示 skillId |
| 配方 `unlockKey` 文案表未确认 | 解锁条件只有通用提示 | 本期仅展示通用提示（`equipment.recipeUnlock`），后续需求细化 |
| `EquipFormulaChainTable` 出现 `level` 未覆盖的新档位 | 配方缺失 | `chainRaw[formula.level]` 缺省时 `recipes` 为空，配方区自动隐藏 |
| 装备列表一次性渲染 243 卡片 | 低端设备滚动卡顿 | 分组独立分页默认 12/页，已限制单屏渲染量 |

回滚策略：纯新增 + `ItemTooltip` 分支扩展，可直接回滚到 `feat/equipment-archive` 起点 commit。

## 8. 相关文档

- [[20260721-equipment-archive|装备图鉴产品方案（docs/product/draft）]]
- [[20260721-equipment-archive|装备图鉴技术方案（docs/engineering/proposal）]]
- [前端开发规范](../frontend-spec.md)
- [数据表映射参考](../references/data-mapping-tables.md)
- [UI 常见陷阱参考](../references/ui-pitfalls.md)
- [国际化规范](../references/i18n-spec.md)
