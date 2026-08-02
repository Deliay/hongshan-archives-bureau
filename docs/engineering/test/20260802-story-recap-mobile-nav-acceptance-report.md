---
description: 剧情梗概移动端导航验收问题记录与修复方案（剧情切换与筛选合并置顶）
type: Permanent
---

# 剧情梗概移动端导航验收报告

> **状态**: 修复完成，待提交与二次验收。
> 本轮受理 12 项验收反馈：①移动端剧情切换（任务导航下拉）需与筛选合并放于 sticky 顶部，滚动时保持可切换（已修复）；②Baker 聊天表情尺寸被压缩至 4×4 且短文本异常换行（已修复，同根因）；③切换 topic 时聊天滚动位置未重置到顶部（已修复）；④PRTS 文库改为左列表右详情、所有文档默认展开（已修复）；⑤文库顶部 tab 筛选需换行且字号/列表缩小（已修复）；⑥文库正文 `<image>` 标签需经 RichText 正确渲染（已修复）；⑦文库 multimedia 文档需支持音频播放（已修复）；⑧切换档案后播放高亮串行，需按 voiceId 匹配（已修复）；⑨Baker 中 PRTS/任务引用需渲染为卡片而非气泡（已修复）；⑩Baker 聊天选项需走富文本渲染（已修复）；⑪Baker 切换联系人后聊天滚动位置需重置到顶部（已修复）；⑫Baker 任务/PRTS 卡片需跳转剧情梗概/文库并展示简介（已修复）。
>
> 历史验收报告已归档至 `docs/engineering/test/archived/`（工厂系统 `20260726-*`、剧情纪事 `20260731-*`）。

**关联 PRD**: [[20260730-story-chronicle|剧情纪事]]
**关联技术方案**: [[20260730-story-chronicle|剧情纪事 - 技术提案]]
**关联实现方案**: [[20260731-story-chronicle-implementation|剧情纪事 - 实现方案]]
**关联分支**: `fix/mobile-story-recap-nav`
**验收日期**: 2026-08-02

---

## 1. 需求概述

剧情梗概页 `/archive/story/recap` 需在移动端提供剧情切换能力：

1. **剧情切换与筛选放在一块**：章节类型筛选（`type=` 下拉）与任务导航下拉合并展示，移动端不拆分两处。
2. **往下滑动时顶部可切换**：合并后的控制区在页面滚动时始终固定在视口顶部（sticky），用户阅读长卷时无需回滚即可切换剧情。

## 2. 验收问题清单

### 2.1 移动端剧情切换与筛选分离，滚动后无法在顶部切换

**问题描述**：移动端界面中，剧情切换（任务导航下拉）与筛选（章节类型下拉）分离展示——类型筛选位于 `sticky top-0` 头部，任务导航下拉在头部下方的内容区，向下滑动时任务导航随内容滚出视口，用户需回滚到顶部才能切换剧情。

**根因分析**：`StoryRecap.tsx` 将任务导航下拉放在独立的 `md:hidden` `div` 中（非 sticky），与 sticky 的筛选头部分离。此前提交 `36ac2f6` 为解决移动端左侧导航不可见问题而新增任务导航下拉，但未将其并入 sticky 头部。

**修复方案**（`src/pages/story/StoryRecap.tsx`）：
1. 任务导航下拉移入 sticky 顶部头部（`sticky top-0 z-10`），与类型筛选并列：头部容器由单行 `flex items-center` 改为 `flex flex-col gap-2 md:flex-row md:items-center md:gap-4`——移动端纵向堆叠两行（筛选 + 任务导航），桌面端保持单行不变。
2. 移动端类型筛选改为整行宽度（`w-full md:w-auto`）；任务导航 `label` 标记 `md:hidden`（桌面端隐藏，由左侧章节导航承担切换）。
3. 删除原头部下方独立的移动端任务导航块；剧透提示保留在 sticky 头部内，移动端/桌面端均可见。

**涉及文件**：
- `src/pages/story/StoryRecap.tsx`

**验证结果**：
- ✅ 移动端（375px）：sticky 头部同时含 2 个 `select`（类型筛选 + 任务导航）与剧透提示；滚动 600px 后头部仍 `position: sticky` 且 `getBoundingClientRect().top === 0`，可在顶部随时切换。
- ✅ 桌面端（1280px）：sticky 头部仅类型筛选可见，任务导航隐藏（`md:hidden`），左侧章节导航正常切换；侧栏 `nav` 任务按钮可见。
- ✅ `npm run lint`：0 errors；`npm run build`：构建成功（含 tsc）。

### 2.2 相关 E2E 测试修正（随本轮修复）

**问题描述**：任务导航下拉合并进 sticky 头部后，页面存在两个 `select`，既有 E2E 用例出现两类定位错误：

1. `responsive.spec.ts` 移动端用例通过 `page.locator('select option')` 取全部下拉选项，把类型筛选的值（如 `a`、`c`）误当作任务导航选项，`selectOption` 报「did not find some options」超时。
2. `story-chronicle.spec.ts` 5 例 recap 用例用 `page.locator('select')` 定位类型筛选，严格模式（strict mode）下匹配到 2 个元素而失败。

**修复方案**：
1. `responsive.spec.ts`：选项枚举限定到任务导航下拉内部（`missionNav.locator('option')`），排除类型筛选选项。
2. `story-chronicle.spec.ts`：类型筛选定位改为 `page.locator('select').first()`，避免严格模式冲突。

**涉及文件**：
- `tests/e2e/src/responsive.spec.ts`
- `tests/e2e/src/story-chronicle.spec.ts`

**验证结果**：
- ✅ `responsive.spec.ts`：移动端任务导航下拉可切换任务并更新路由（1/1 passed，此前存量失败）。
- ✅ `story-chronicle.spec.ts`：recap 相关 8 例全数通过（含此前存量的 5 例失败）。

### 2.3 Baker 聊天表情被压缩至 4×4 且短文本异常换行

**问题描述**：`/archive/baker?chat=sns_chr_0024_deepfin&topic=topic_chr_0024_deepfin_1` 中：

1. 干员回复的纯表情消息（如 `<image="sns_emoji_011">`）渲染为 4×4 像素，肉眼几乎不可见。
2. 短文本「你的钓鳞技术真不错。」（9 字符 ≈ 144px）在页面宽度充足时仍被换行为两行（气泡仅 130px）。

**根因分析**（两现象同根因）：
- 气泡宽度约束位置错误。`BakerMessageBubble` 把 `max-w-[70%]` 加在**气泡自身**上，而气泡的父容器是 shrink-to-fit 的 flex 列（`flex flex-col min-w-0`）。`max-width: 70%` 是百分比，需解析父容器宽度，但父容器宽度又由内容（气泡）决定，形成循环依赖 → 浏览器按最小可行值收缩父列（实测 40px）与气泡（28px）。
- 表情消息：气泡 28px 减去 `px-3`（24px）内边距后内容盒仅 4px，RichText 的 `<img>` 受 `max-width: 100%` 钳制被压成 4×4。
- 短文本：气泡被收缩至 130px < 文本自然宽度 144px，触发换行。

**修复方案**：
1. **气泡宽度约束上移**（`src/components/Baker/BakerMessageBubble.tsx`）：`max-w-[70%]` 从气泡移到父 flex 列（`flex flex-col min-w-0 max-w-[70%]`，非本人消息加 `items-start`、本人消息保留 `items-end`）；气泡自身改 `w-fit`（`width: fit-content`），按内容自适应且不超父列上限。
2. **表情尺寸对齐选项**（`src/lib/richText.tsx` + `BakerMessageBubble.tsx`）：`RichText` 新增可选 `imageSize` prop（默认 `1rem`），Baker 文本消息传 `2rem`（32px），与 `BakerOptionGroup` 选项表情（`w-8 h-8`）尺寸一致。

**涉及文件**：
- `src/components/Baker/BakerMessageBubble.tsx`
- `src/lib/richText.tsx`

**验证结果**：
- ✅ 表情消息 `sns_emoji_011` 由 4×4 → 32×32（`width: 2rem`），与选项表情一致。
- ✅ 短文本「你的钓鳞技术真不错。」单行展示（气泡 186px，span 高度 24px 单行）。
- ✅ 图片消息（contentType 2，`max-w-xs` 320×180）不受影响。
- ✅ E2E `story-chronicle.spec.ts` Baker 相关 16 例全数通过；lint / build 通过。

### 2.4 切换 topic 时聊天滚动位置未重置到顶部

**问题描述**：Baker 聊天面板在滚动到中后部后切换 topic，滚动位置保持原值，用户看到的是新 topic 的中部而非开头。

**根因分析**：`BakerChatPanel` 的滚动容器（`overflow-y-auto`）由组件内部持有，无外部 ref；topic 切换仅更新 `beats`，滚动位置不随内容变化而重置。

**修复方案**（`src/components/Baker/BakerChatPanel.tsx` + `src/pages/baker/BakerTerminal.tsx`）：
1. `BakerChatPanel` 新增可选 `topicId` prop 与 `scrollRef`。
2. `useEffect(() => scrollRef.current?.scrollTo({ top: 0 }), [topicId])`：topic 变化时重置滚动到顶部。
3. `BakerTerminal` 传入 `topicId={activeTopic?.topicId}`。

**涉及文件**：
- `src/components/Baker/BakerChatPanel.tsx`
- `src/pages/baker/BakerTerminal.tsx`

**验证结果**：
- ✅ E2E 新增「切换 topic 后滚动位置重置到顶部」：面板 `scrollTop` 200 → 切换 topic → `scrollTop === 0`。
- ✅ E2E Baker 全量 12/12 passed；lint / build 通过。

### 2.5 PRTS 文库未采用左列表右详情布局，文档需手动展开

**问题描述**：PRTS 文库 `/archive/story/library` 为「分类页签 + 卷卡片网格」布局，文档条目默认折叠，需逐个点击卷卡片展开；验收要求改为左侧列表 + 右侧详情两栏设计，且所有文档默认展开。

**根因分析**：旧实现 `StoryLibrary.tsx` 以卷为卡片渲染，`expandedVol` 状态控制展开/收起；详情页为独立路由 `/archive/story/library/:itemId`，无两栏联动。

**修复方案**（`src/pages/story/StoryLibrary.tsx` + `src/pages/story/PrtsDocumentDetail.tsx` + `src/pages/story/StoryDocumentDetail.tsx`）：
1. 布局改为 `flex` 两栏：左侧 `aside`（分类页签 + 卷列表，所有文档条目默认平铺展开）与右侧 `section`（详情），桌面端 `md:h-[calc(100vh-4rem)]` 各自独立滚动，移动端纵向堆叠。
2. 抽取 `PrtsDocumentDetail` 组件，接受 `itemId` prop 渲染详情（标题/正文/脚本）。
3. 列表选中项以 URL 查询参数 `doc=` 记录；默认选中第一个文档；分类筛选 `cat=` 与 `doc=` 并存。
4. `StoryDocumentDetail` 路由页改为薄包装（返回链接 + `PrtsDocumentDetail`），深链 `/archive/story/library/:itemId` 仍可用。

**涉及文件**：
- `src/pages/story/StoryLibrary.tsx`
- `src/pages/story/PrtsDocumentDetail.tsx`（新增）
- `src/pages/story/StoryDocumentDetail.tsx`

**验证结果**：
- ✅ E2E 新增「左侧列表点击后右侧展示详情」：点击文档 → URL 携带 `doc=`，右侧详情渲染。
- ✅ E2E「文档详情深链可渲染」：`/archive/story/library/nar_sm1l1m5_hatman_2` 正常渲染。
- ✅ PRTS 相关 E2E 全量通过；lint / build 通过。

### 2.6 文库顶部 tab 筛选横向滚动不换行，列表字号/宽度过大

**问题描述**：顶部筛选 tab 在窄栏内横向滚动（`overflow-x-auto`），六类分类标签无法换行展示；左侧列表文字与栏宽偏大，占用详情区域。

**根因分析**：筛选容器使用 `flex gap-2 overflow-x-auto` 与按钮 `whitespace-nowrap`，禁止换行；列表侧栏 `md:w-80 lg:w-96` 偏宽，卷名/条目均用 `text-sm`。

**修复方案**（`src/pages/story/StoryLibrary.tsx`）：
1. 筛选容器改 `flex flex-wrap gap-2`，移除 `whitespace-nowrap`，tab 字号 `text-sm`→`text-xs`、`py-1.5`→`py-1`。
2. 侧栏收窄 `md:w-72 lg:w-80`；卷名 `text-sm`→`text-xs`、副标题 `text-xs`→`text-[11px]`、条目 `text-sm`→`text-xs`、type 标签与图标同步缩小。

**涉及文件**：
- `src/pages/story/StoryLibrary.tsx`

**验证结果**：
- ✅ tab 在窄栏内可换行展示（`flex-wrap`），字号缩小。
- ✅ 列表栏更窄，文字更紧凑；E2E PRTS 相关全量通过；lint / build 通过。

### 2.7 文库正文 `<image>` 标签未正确渲染为图片

**问题描述**：文本文档正文（如 `nar_sm1l1m4_1`）含 `<image>Reading/collection_sm1l1m4_arrowrelic</image>` 形式的成对标签，渲染为空图或按行内小图标处理，未按文档插图尺寸展示。

**根因分析**（`src/lib/richText.tsx`）：
1. `isOrphanTag` 中 `<image>`（无属性空形式）被 `ORPHAN_TAGS.has('image')` 提前命中判定为 orphan，`<image>path</image>` 成对标签永远无法进入图片节点转换逻辑（`isSpecialImageTag` 特判在 orphan 判断之后，不可达）。
2. `buildTree` 的成对标签图片转换只在 `tag-close` 时对**未出栈**的栈节点执行；成对 `<image>` 被正常闭合出栈后保留为 `tag` 节点，渲染为 `<span>` 文本而非 `<img>`。

**修复方案**（`src/lib/richText.tsx` + `src/pages/story/PrtsDocumentDetail.tsx`）：
1. `isOrphanTag` 将 `isImageTag && isSpecialImageTag` 特判提前到 orphan 判断之前，使 `<image>` 走 tag-open 分支。
2. `buildTree` 的 `tag-close` 分支在出栈时校验被弹节点是否为「无属性 image 标签 + 纯文本子节点」，若是则就地转换为 `image` 节点。
3. `PrtsDocumentDetail` 正文 `RichText` 传 `imageSize="min(100%, 28rem)"`，文档插图按正文宽度自适应（原默认 `1rem` 仅适用于行内 emoji）。

**涉及文件**：
- `src/lib/richText.tsx`
- `src/pages/story/PrtsDocumentDetail.tsx`
- `src/lib/__tests__/richText.test.tsx`（新增「paired-tag 形式」用例）

**验证结果**：
- ✅ 新增单测：`<image>Reading/collection_sm1l1m4_arrowrelic</image>` 渲染为 `<img src=…/sprites/reading/collection_sm1l1m4_arrowrelic.png>`。
- ✅ E2E 新增「文本文档中的 `<image>` 标签渲染为图片」：`nar_sm1l1m4_1` 渲染出 100px+ 宽插图。
- ✅ richText 20/20 单测通过；lint / build 通过。

### 2.8 文库 multimedia 文档不支持音频播放

**问题描述**：multimedia 类型文档（如 `nar_col_radio_5`）仅展示文字脚本，无法像剧情概览那样播放对应音频；数据中 `radioSingleDataList[].audioOverride` 即 voiceId。

**根因分析**：`usePrtsItemDetail` 对 multi_media 仅取 `actorName`/`radioText` 映射为 `script`，丢弃 `audioOverride`；`PrtsDocumentDetail` 只做纯文本渲染，无播放交互。

**修复方案**：
1. `src/lib/types.ts`：`PrtsItemDetail.script` 增补 `id` 与 `voId` 字段。
2. `src/hooks/useData.ts`：`usePrtsItemDetail` 映射 `audioOverride` → `voId`。
3. `src/pages/story/RadioPlayer.tsx`（新增）：复用 `useDialogAudio` / `playFrom` / `togglePlay` 与 `getAudioUrl` / `checkAudioUrl`，逐条渲染播放按钮并高亮当前行，行为与 `DialogScript` 一致。
4. `src/pages/story/PrtsDocumentDetail.tsx`：multi_media 分支改为 `DialogPlayerBar`（顶部播放控制条）+ `RadioPlayer`。

**涉及文件**：
- `src/lib/types.ts`
- `src/hooks/useData.ts`
- `src/pages/story/RadioPlayer.tsx`（新增）
- `src/pages/story/PrtsDocumentDetail.tsx`

**验证结果**：
- ✅ E2E 新增「multimedia 文档支持音频播放」：`nar_col_radio_5` 第一条 `radio_gm01m23_4_001` 播放按钮可见，点击后控制面板出现并显示当前行，Next 切到下一条。
- ✅ PRTS 相关 E2E 全量通过；lint / build 通过。

### 2.9 文库切换档案后播放高亮串行（按 index 而非 voiceId 匹配）

**问题描述**：在 A 档案（如 `nar_col_radio_5`）点击播放后切到 B 档案（如 `nar_media_map01_45_1`），B 档案中会出现一行被高亮为「正在播放」，但实际播放的是 A 的音频。

**根因分析**：`RadioPlayer` 与 `DialogScript` 用全局播放器状态 `useDialogAudio().currentIndex` 直接索引**本组件局部构建**的 `tracks` 数组（`tracks[currentIndex]`）。`currentIndex` 是全局播放列表的下标，代表 A 的播放位置；切换到 B 后 B 的局部 `tracks` 长度/顺序与 A 不同，用 A 的下标取 B 的 `tracks` 得到一条不相干的行并被标记为播放中。

**修复方案**（`src/pages/story/RadioPlayer.tsx` + `src/pages/story/DialogScript.tsx`）：
1. 活跃行判定改为按 `voId` 匹配：取全局 `tracks[currentIndex]?.voId`（真正在播放的 voiceId），在当前文档的 `script`/`lines` 中查找该 `voId` 对应行，找不到则为 `undefined`（不高亮任何行）。
2. `LinePlayButton` 的 `isCurrent` 同样改为 `currentVoId === voId`，点击切换播放目标仍用局部 `tracks` 的 `findIndex` 定位。

**涉及文件**：
- `src/pages/story/RadioPlayer.tsx`
- `src/pages/story/DialogScript.tsx`

**验证结果**：
- ✅ E2E 新增「切换文档后播放高亮不串到新文档」：A 播放 → 切 B（`nar_media_map01_45_1`）→ B 中 `[data-active="true"]` 计数为 0。
- ✅ E2E 全量 45/45 passed；lint / build 通过。

### 2.10 Baker 中 PRTS / 任务引用未渲染为可跳转卡片

**问题描述**：SNS 聊天中 `contentType=12`（任务）与 `contentType=10`（PRTS）的消息节点只有引用信息（`linkMissionId` / `contentParams` 中的 PRTS 文档 id），`content.text` 为空。旧实现按 `resolveContentType` 映射为 `mission`/`share` 气泡并渲染 `message.text`，结果 PRTS 气泡只剩一个空标签、任务气泡完全空白。

**根因分析**：`resolveDialog` 把任务/PRTS 节点当作普通消息交给 `adaptBakerMessage`，后者只解析 `content.text`；任务的实际引用在 `linkMissionId`（或 `contentParam[0]`），PRTS 的实际引用在 `contentParams` 的 JSON（`{"id": "nar_..."}`）。缺少对 `SNSDialogContentType` 常量的完整定义与针对性解析。

**修复方案**：
1. `src/data/constants.ts`：新增 `SNS_DIALOG_CONTENT_TYPE` 与 `SNS_DIALOG_OPTION_TYPE` 常量（经旧版常量名数据与新版数值数据对照提取：Text=1/Image=2/Video=4/Voice=5/Item=6/System=7/Card=8/EmojiResult=9/PRTS=10/Vote=11/Task=12）。
2. `src/lib/baker.ts`：`resolveDialog` 对 `PRTS(10)` 解析 `contentParams` 的 id、对 `Task(12)` 取 `linkMissionId ?? contentParam[0]`，构建带 `card` 字段的消息；`ResolveContext` 新增 `prtsName`/`missionName` 解析器。
3. `src/lib/types.ts`：`BakerMessage` 增补 `card?: { kind: 'prts'|'mission'; title: string; to: string }`。
4. `src/hooks/useData.ts`：`useBakerDialog` 拉取 `PrtsAllItem`+i18n 与 `MissionRuntimeBrief`+`TextTable`+i18n，构造 PRTS 文档名与任务名解析器。
5. `src/components/Baker/BakerRefCard.tsx`（新增）：可复用引用卡片组件，PRTS 卡片跳转 `/archive/story/library?doc=<id>`，任务卡片跳转 `/archive/story/recap?mission=<id>`。
6. `src/components/Baker/BakerMessageBubble.tsx`：`share`/`mission` 分支优先渲染卡片。

**涉及文件**：
- `src/data/constants.ts`
- `src/lib/baker.ts`
- `src/lib/adapter.ts`
- `src/lib/types.ts`
- `src/hooks/useData.ts`
- `src/components/Baker/BakerRefCard.tsx`（新增）
- `src/components/Baker/BakerMessageBubble.tsx`

**验证结果**：
- ✅ E2E 新增「Baker 聊天中的 PRTS 引用渲染为卡片并可跳转文库」「Baker 聊天中的任务引用渲染为卡片并可跳转剧情梗概」：`sns_npc_joost` 中 PRTS 卡片显示文档名 `《试论碾骨氏族印记的源流及特色》` 并跳转文库；`sns_chat_roman` 中任务卡片显示任务名 `开拓节与特色美食` 并跳转剧情梗概。
- ✅ baker 单测 15/15（含 PRTS/Task 卡片 4 例）；lint / build 通过。

### 2.11 Baker 聊天选项未走富文本渲染（`<image>` 标签显示为字面文本）

**问题描述**：`/archive/baker?chat=sns_chr_0021_whiten` 最后一个选项的文案为 `<image="sns_emoji_002">`，页面上原样显示字面标签文本，未渲染为表情图。

**根因分析**：`BakerOptionGroup` 直接渲染 `opt.text` 纯文本；`RichText` 已支持 `<image="sns_emoji_002">`（orphan image 标签 → `sns/emoji/*.png`），但选项没有接入该解析。

**修复方案**：`src/components/Baker/BakerOptionGroup.tsx` 中选项文本改为 `<RichText text={opt.text} imageSize="2rem" />`，与消息气泡的 emoji 渲染一致。

**涉及文件**：
- `src/components/Baker/BakerOptionGroup.tsx`

**验证结果**：
- ✅ E2E 新增「Baker 聊天选项走富文本渲染」：whiten 聊天中 `button img[src*="sns/emoji/sns_emoji_002"]` 可见且页面不含字面 `<image="sns_emoji_002">`。
- ✅ lint / build 通过。

### 2.12 Baker 切换联系人后聊天滚动位置未重置

**问题描述**：`/archive/baker?chat=sns_team_qingbozhai` 滚动聊天到底部后，切换到 `sns_npc_zhihuibu`（重建指挥部相关讨论），聊天面板滚动条仍停留在底部。

**根因分析**：`BakerChatPanel` 的滚动重置 `useEffect` 仅依赖 `topicId`。这两个聊天的 `topicId` 均为空字符串 `''`，切换时 `topicId` 不变，effect 不触发；且因数据命中缓存加载极快，聊天面板没有经历卸载重挂载（skeleton 未出现），旧 DOM 滚动位置被保留。

**修复方案**：`src/components/Baker/BakerChatPanel.tsx` 滚动重置改为依赖 `chatId:topicId` 组合键（`lastKey` ref 去重），任意切换 chat 或 topic 都重置到顶部；`BakerTerminal` 透传 `chatId` prop。

**涉及文件**：
- `src/components/Baker/BakerChatPanel.tsx`
- `src/pages/baker/BakerTerminal.tsx`

**验证结果**：
- ✅ E2E 新增「Baker 切换联系人后聊天滚动位置重置到顶部」：qingbozhai 滚到底部 → 切 zhihuibu → `scrollTop === 0`。
- ✅ E2E 全量 49/49 passed；lint / build 通过。

## 3. 修复总览

| # | 问题 | 根因 | 状态 | 修复 commit |
|---|------|------|------|-------------|
| 2.1 | 移动端剧情切换与筛选分离，滚动后无法在顶部切换 | 任务导航下拉在独立非 sticky 块中，与筛选头部分离 | ✅ 已修复（并入 sticky 头部） | `1651fb8` |
| 2.2 | 相关 E2E 用例定位失败（存量） | 双 `select` 下选项误取与严格模式冲突 | ✅ 已修复（限定作用域 / `.first()`） | `1651fb8` |
| 2.3 | Baker 表情 4×4 + 短文本异常换行 | 气泡 `max-w-[70%]` 百分比依赖 shrink-to-fit 父列，循环收缩 | ✅ 已修复（约束上移 + `w-fit` + 表情 2rem） | `6bdd5f1` |
| 2.4 | 切换 topic 时滚动位置未重置 | 滚动容器无外部控制，内容变化不重置滚动 | ✅ 已修复（`topicId` 变化 `scrollTo(top:0)`） | `b329f3e` |
| 2.5 | 文库未用左列表右详情布局，文档需手动展开 | 卷卡片网格 + 折叠状态，详情独立路由 | ✅ 已修复（两栏布局 + 默认全展开 + `PrtsDocumentDetail` 组件化） | `cf3b732` |
| 2.6 | 文库 tab 横向滚动不换行，列表字号/宽度过大 | `overflow-x-auto` + `whitespace-nowrap`，侧栏/字号偏大 | ✅ 已修复（`flex-wrap` + 缩小字号与栏宽） | `cf3b732` |
| 2.7 | 文库正文 `<image>` 成对标签未渲染为图片 | orphan 特判顺序 + tag-close 出栈节点未转换 | ✅ 已修复（特判前置 + 出栈时转换 + 插图尺寸） | `a3a618d` |
| 2.8 | 文库 multimedia 文档不支持音频播放 | 丢弃 `audioOverride`，无播放交互 | ✅ 已修复（`voId` 映射 + `RadioPlayer`） | `a3a618d` + `cf3b732` |
| 2.9 | 切换档案后播放高亮串行 | 局部 `tracks` 用全局 `currentIndex` 索引 | ✅ 已修复（按 `voId` 匹配活跃行） | `ef74560` |
| 2.10 | Baker 中 PRTS/任务引用未渲染为卡片 | 缺 `SNSDialogContentType` 常量定义与针对性解析 | ✅ 已修复（卡片组件 + 解析 + 名称解析器） | `f1a9ce2` |
| 2.11 | Baker 选项未走富文本，`<image>` 显示为字面文本 | `BakerOptionGroup` 直接渲染纯文本 | ✅ 已修复（选项接入 `RichText`） | `e1051a6` |
| 2.12 | 切换联系人后聊天滚动位置未重置 | 滚动重置仅依赖 `topicId`，`topicId=''` 时不变 | ✅ 已修复（`chatId:topicId` 组合键） | `cdf3490` |

## 4. 最终验证

| 验证项 | 结果 |
|--------|------|
| `npm run lint` | ✅ 0 errors |
| `npm run build` | ✅ 构建成功（含 tsc） |
| `npm run test`（vitest） | ✅ 477 passed（2 例 Sidebar 存量失败，与本次改动无关） |
| E2E `responsive.spec.ts` + `story-chronicle.spec.ts` | ✅ 49/49 passed（含 topic/联系人滚动重置、PRTS 卡片、选项富文本、PRTS 文库 8 例） |

## 5. 经验总结

- **移动端导航控件必须随主操作区一同置顶**：任何承担「切换」职责的控件（下拉/页签）应并入 sticky 头部的同一容器，滚动时保持可达；独立散落在内容区会随内容滚出视口，破坏连续阅读体验。
- **响应式下同一控件移动/桌面形态可并存**：桌面端由左侧章节导航承担切换，移动端由头部任务导航下拉承担，通过 `md:hidden` / `hidden md:block` 按断点切换形态，避免两套交互并存。
- **E2E 断言需限定控件作用域**：页面存在多个同类型控件（如两个 `select`）时，定位必须限定到目标控件内部（`selectOption` 枚举、`locator('select')` 均需 `.first()` 或嵌套作用域），否则严格模式或选项误取导致存量失败。
- **百分比宽度约束不可放在 shrink-to-fit 容器内部**：`max-width: 70%` 这类百分比解析依赖父容器宽度，若父容器宽度又由子内容决定则形成循环依赖，浏览器会收缩到最小可行值。约束应放在有确定宽度的 flex 项（列）上，子元素用 `w-fit` 自适应。
- **成对富文本标签的转换点须覆盖「出栈」路径**：`<image>path</image>` 这类成对标签正常闭合后会从解析栈弹出，若只在栈内节点上做转换会漏掉；应在 `tag-close` 出栈时对弹节点做校验转换。
- **特判分支必须早于通用兜底判断**：`isOrphanTag` 中 image 特殊形式（`<image>` 空属性）的特判放在 `ORPHAN_TAGS.has` 之后永远不可达，导致成对标签落入孤儿分支；特判应前置。
- **复用既有播放基建而非新建**：multimedia 音频播放直接复用 `useDialogAudio` / `getAudioUrl` / `checkAudioUrl`，与 `DialogScript` 行为一致，避免双套播放器状态冲突。
- **两栏详情页用 URL 参数驱动选中项**：`doc=` 查询参数承载当前文档，刷新/深链/筛选切换后选中态不丢失，详情组件以 `itemId` prop 纯渲染，便于独立路由复用。
- **全局播放器状态不可按 index 匹配局部列表**：`useDialogAudio` 的 `currentIndex` 属于全局播放列表，组件各自构建的局部 `tracks` 与它长度/顺序可能不同，用 `tracks[currentIndex]` 判定「正在播放」会在切换档案后串行。应以唯一标识（`voId`）从全局状态取当前播放项，再在局部列表查找对应行。
- **滚动重置的依赖键须覆盖所有「内容切换」维度**：滚动容器不随内容切换卸载重挂载时，仅依赖单一维度（如 `topicId`）会漏掉该维度不变的切换（两个聊天的 `topicId` 均为 `''`）。应以 `chatId:topicId` 组合键驱动，保证切换 chat 或 topic 都重置。
- **富文本组件复用同一套解析**：选项、气泡、工具提示中的富文本都应接入同一 `RichText` 组件，避免出现「同一标签一处渲染一处字面」的分裂。
