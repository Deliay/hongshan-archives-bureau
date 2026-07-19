---
description: 左侧导航栏分组优化技术方案：改造 Sidebar 数据结构、分组渲染与样式
type: Fleeting
---

# 左侧导航栏分组优化技术方案

**对应产品文档**: [[20260719-sidebar-navigation-grouping|左侧导航栏分组优化]]
**技术方案版本**: v1.0
**创建日期**: 2026-07-19
**作者**: 前端工程

## 背景与目标

### 1.1 背景

当前 `src/components/Layout/Sidebar.tsx` 中的导航配置 `NAV_ITEMS` 为扁平数组，所有入口在同一层级平铺。随着档案门类扩展，用户扫描与定位成本增加。

### 1.2 目标

- 将扁平导航改造为分组导航，按产品文档定义的业务领域归组；
- 分组标签为纯展示元素，不引入折叠/展开交互；
- 保持现有路由、激活态、语言切换、移动端抽屉行为不变；
- 支持后续通过修改配置即可新增分组或调整入口。

## 范围

### 2.1 做

- 改造 `src/components/Layout/Sidebar.tsx` 的导航数据结构；
- 在 `Sidebar.tsx` 内实现分组标签渲染与分组内入口渲染；
- 调整导航项间距、颜色与字号，体现分组层级；
- 保证桌面端与移动端抽屉中的分组表现一致；
- 激活态逻辑保持：当前路径命中分组内任意入口时，仅该入口高亮。

### 2.2 不做

- 不新增页面、不修改路由；
- 不引入第三方导航组件库；
- 不改动 `Breadcrumb.tsx`、`Footer.tsx`、`ArchiveLayout.tsx`；
- 不改动数据层、缓存、Diff 系统；
- 本次不实现分组折叠/展开能力（产品明确为非折叠）。

## 现状分析

### 3.1 当前实现

```tsx
type NavItem = {
  label: string
  path: string
  children?: { label: string; path: string }[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: '干员档案', path: '/archive/operators',
    children: [
      { label: '干员种族', path: '/archive/races' },
      { label: '干员阵营', path: '/archive/factions' },
    ],
  },
  { label: '武器档案', path: '/archive/weapons' },
  { label: '敌人图鉴', path: '/archive/enemies' },
  { label: '道具材料', path: '/archive/items' },
  { label: '地区地理', path: '/archive/geography' },
  { label: '装备系统', path: '/archive/equipment' },
  { label: '工厂系统', path: '/archive/factory' },
  { label: '剧情记录', path: '/archive/story' },
  { label: '更新日志', path: '/archive/updates' },
]
```

当前代码对 `NavItem.children` 的处理是：父项本身也是一个可点击链接，子项以缩进形式展示在其下方。这种「父子」模式与产品定义的「分组标签 + 平级入口」模式不同，需要调整。

### 3.2 可复用基础

- `Sidebar.tsx` 已使用 `useLocation` 判断当前路径，激活态逻辑可直接复用；
- 移动端抽屉、遮罩、语言切换逻辑无需改动；
- Tailwind CSS v4 token 已定义，可直接使用语义化颜色。

## 技术方案

### 4.1 数据结构改造

将 `NavItem` 与 `NAV_ITEMS` 改为以「分组」为单位的结构：

```tsx
type NavLink = {
  label: string
  path: string
}

type NavGroup = {
  label: string
  items: NavLink[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: '人事档案',
    items: [
      { label: '干员档案', path: '/archive/operators' },
      { label: '干员种族', path: '/archive/races' },
      { label: '干员阵营', path: '/archive/factions' },
    ],
  },
  {
    label: '物资档案',
    items: [
      { label: '道具材料', path: '/archive/items' },
      { label: '武器档案', path: '/archive/weapons' },
      { label: '装备系统', path: '/archive/equipment' },
      { label: '工厂系统', path: '/archive/factory' },
    ],
  },
  {
    label: '地理档案',
    items: [
      { label: '地区地理', path: '/archive/geography' },
    ],
  },
  {
    label: '威胁档案',
    items: [
      { label: '敌人图鉴', path: '/archive/enemies' },
    ],
  },
  {
    label: '大事记',
    items: [
      { label: '剧情记录', path: '/archive/story' },
      { label: '更新日志', path: '/archive/updates' },
    ],
  },
]
```

#### 设计决策

- **分组与入口解耦**：分组标签不再对应可点击路径，因此不再使用 `children` 表达层级，改用 `items` 表达集合；
- **平级入口**：分组内所有入口为同一层级，不再对「干员档案」做特殊缩进处理；
- **配置外置（可选）**：若后续多语言化导航文案，可将 `NAV_GROUPS` 抽离到 `src/data/navigation.ts`，本次暂保留在 `Sidebar.tsx` 内，降低改动范围。

### 4.2 渲染逻辑改造

Sidebar 的 `<nav>` 区域由单层循环改为双层循环：外层遍历分组，内层遍历分组内入口。

```tsx
<nav className="flex-1 overflow-y-auto p-2 space-y-5">
  {NAV_GROUPS.map((group) => (
    <div key={group.label}>
      {/* 分组标签：纯展示 */}
      <div className="px-3 py-1 text-xs font-medium tracking-wider text-archive-lead uppercase">
        {group.label}
      </div>
      {/* 分组内入口 */}
      <div className="mt-1 space-y-0.5">
        {group.items.map((item) => {
          const active = location.pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
                active
                  ? 'text-archive-gold bg-archive-gold/10'
                  : 'text-archive-dust hover:text-archive-ivory hover:bg-archive-file'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  ))}
</nav>
```

#### 关键交互点

- **分组标签不可交互**：使用 `<div>` 而非 `<button>` 或 `<a>`，不响应 click/hover/focus；
- **激活态**：继续通过 `location.pathname.startsWith(item.path)` 判断，与现有逻辑一致；
- **移动端关闭抽屉**：入口点击后调用 `setOpen(false)`，行为不变；
- **单分组单入口**：如「地理档案」下仅「地区地理」，仍完整展示分组标签与入口，保持结构一致性。

### 4.3 样式方案

基于现有设计 token 调整：

| 元素 | 样式 |
|------|------|
| 分组标签 | `text-xs font-medium tracking-wider text-archive-lead uppercase` |
| 分组间距 | 分组之间 `space-y-5`（20px），分组内入口 `space-y-0.5` |
| 入口默认态 | `text-sm text-archive-dust` |
| 入口 hover 态 | `hover:text-archive-ivory hover:bg-archive-file` |
| 入口激活态 | `text-archive-gold bg-archive-gold/10` |

为增强档案索引感，分组标签采用纯文本 uppercase 风格：

```tsx
<div className="px-3 py-1 text-xs font-medium tracking-wider text-archive-lead uppercase">
  {group.label}
</div>
```

该方案不引入装饰线或图标，与当前档案局克制、简洁的视觉风格一致。

### 4.4 删除旧逻辑

移除原 `NAV_ITEMS` 中对 `children` 的分支处理，统一为分组渲染。

## 实现计划

### 阶段一：数据结构改造

1. 在 `Sidebar.tsx` 中定义 `NavLink`、`NavGroup` 类型；
2. 替换 `NAV_ITEMS` 为 `NAV_GROUPS`，按产品文档组织分组；
3. 删除旧的 `NavItem` 类型与 `children` 渲染逻辑。

### 阶段二：渲染与样式

1. 重写 `<nav>` 区域为双层循环；
2. 应用分组标签样式与分组间距；
3. 保持入口激活态、hover 态、点击关闭抽屉逻辑。

### 阶段三：验证

1. 运行 `npm run lint`；
2. 运行 `npm run test`；
3. 运行 `npm run build`；
4. 桌面端与移动端走查：确认所有入口可见、分组正确、激活态正常、抽屉关闭正常。

## 测试策略

### 5.1 组件测试

若现有测试覆盖了 Sidebar 的导航渲染，需更新断言：

- 验证分组标签按顺序渲染；
- 验证每个分组内入口数量与文案正确；
- 验证分组标签本身不是可点击元素。

### 5.2 E2E 测试

更新或新增 `tests/e2e/navigation.spec.ts`：

- 桌面端：侧边栏展示「人事档案」「物资档案」「地理档案」「威胁档案」「大事记」分组；
- 点击分组内入口跳转至正确路径；
- 当前页面所属入口高亮；
- 移动端：抽屉中分组展示正常，点击入口后抽屉关闭。

## 验收标准

- [ ] `Sidebar.tsx` 使用 `NAV_GROUPS` 分组结构，无 `NavItem.children` 遗留逻辑；
- [ ] 侧边栏展示 5 个分组：人事档案、物资档案、地理档案、威胁档案、大事记；
- [ ] 每个分组内入口与产品文档一致；
- [ ] 分组标签不可点击、不可聚焦、无 hover 反馈；
- [ ] 入口激活态、hover 态与现有行为一致；
- [ ] 移动端抽屉导航应用相同分组规则；
- [ ] `npm run lint` 通过；
- [ ] `npm run test` 通过；
- [ ] `npm run build` 通过。

## 风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 现有测试硬编码了导航项数量/顺序 | 测试失败 | 同步更新测试断言 |
| 用户不习惯干员档案与子入口平级 | 认知成本 | 产品已确认分组方案，子入口归入「人事档案」下 |
| 分组标签样式与现有视觉冲突 | 审美不一致 | 采用现有 archive-lead 色，保持克制 |

回滚策略：本次改动仅涉及 `Sidebar.tsx` 的导航数据结构与渲染，若出现问题可直接回滚该文件或还原 `NAV_ITEMS`。

## 设计确认

- **敌人图鉴归属**：已确认新增「威胁档案」分组。
- **分组标签样式**：已确认采用纯文本 uppercase 风格。

## 相关文档

- [[20260719-sidebar-navigation-grouping|左侧导航栏分组优化]]
- [[frontend-spec|前端开发规范]]
- [[engineering-spec|工程架构规范]]
- [UI 常见陷阱参考](../references/ui-pitfalls.md)
