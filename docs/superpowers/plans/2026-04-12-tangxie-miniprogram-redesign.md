# 糖蟹小程序改版实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变 `日程 / 事项 / 排期` 核心功能边界的前提下，把糖蟹小程序用户侧页面重构为确认版“温和治愈 + 效率优先”视觉体系，并落地紧凑 `浮岛混合` 导航。

**Architecture:** 这次实现以 `apps/miniprogram/pages/home` 为主战场，优先通过现有页面模型补充展示态数据，再在 `index.wxml` / `index.wxss` 中完成页面级重排。`任务详情` 保持只读，通过 `pages/task-detail` 与首页详情浮层共用同一套只读信息结构，明确移除占位动作能力。实现时坚持小步 TDD，并保持 `.ts` 与 `.js` 镜像同步。

**Tech Stack:** WeChat Mini Program (`.ts` / `.js` / `.wxml` / `.wxss`), Node.js built-in test runner, pnpm monorepo scripts

---

## File Map

- Modify: `apps/miniprogram/pages/home/index.ts`
  - 扩展首页展示态数据，补充紧凑导航、今日节奏摘要和只读任务详情映射。
- Modify: `apps/miniprogram/pages/home/index.js`
  - 与 `index.ts` 保持镜像一致，确保微信开发者工具直接运行不漂移。
- Modify: `apps/miniprogram/pages/home/index.wxml`
  - 重写首页、事项页、排期页和内嵌任务详情浮层的结构。
- Modify: `apps/miniprogram/pages/home/index.wxss`
  - 落地暖纸面视觉、浮岛导航、紧凑控制带、摘要条、时间轴 / 看板 / 排期 / 详情页样式。
- Modify: `apps/miniprogram/pages/home/runtime.ts`
  - 保持详情页打开逻辑与新只读详情数据结构一致，不引入新增操作。
- Modify: `apps/miniprogram/pages/home/runtime.js`
  - 同步 `runtime.ts` 的运行时改动。
- Modify: `apps/miniprogram/pages/task-detail/index.ts`
  - 去掉占位动作字段，输出只读详情分区数据。
- Modify: `apps/miniprogram/pages/task-detail/index.js`
  - 与 `index.ts` 保持镜像一致。
- Modify: `apps/miniprogram/pages/task-detail/index.wxml`
  - 重写独立任务详情页结构，和首页内嵌详情保持一致语言。
- Modify: `apps/miniprogram/pages/task-detail/index.wxss`
  - 落地详情页新样式。
- Modify: `apps/miniprogram/tests/home-page.spec.ts`
  - 锁定首页数据结构、摘要指标、只读详情数据和排期周期切换。
- Modify: `apps/miniprogram/tests/home-runtime.spec.ts`
  - 锁定 runtime 打开任务详情后的状态和只读边界。
- Modify: `apps/miniprogram/tests/smoke.spec.ts`
  - 锁定 WXML / WXSS / JS 镜像中的关键类名、文案和绑定。

## Implementation Notes

- `@frontend-design`：实现阶段保持设计方向一致，不回退到默认蓝白后台风格。
- `@frontend-design-review`：所有 UI 改动完成后必须跑一轮最终 review，再宣称任务完成。
- 不要引入新的业务交互能力，尤其是任务详情页动作、用户配置入口、日志入口。
- `今日节奏` 只在 `activeTab === "schedule"` 时渲染。
- `.js` 镜像文件必须同步修改，否则 `smoke.spec.ts` 和微信开发者工具会失配。

### Task 1: 锁定首页展示态与只读详情数据契约

**Files:**
- Modify: `apps/miniprogram/tests/home-page.spec.ts`
- Modify: `apps/miniprogram/pages/home/index.ts`
- Modify: `apps/miniprogram/pages/home/index.js`
- Modify: `apps/miniprogram/pages/task-detail/index.ts`
- Modify: `apps/miniprogram/pages/task-detail/index.js`

- [ ] **Step 1: 写出会失败的数据契约测试**

```ts
const home = buildHomePage();

assert.deepEqual(home.tabs.map((tab) => tab.label), ["日程", "事项", "排期"]);
assert.equal(home.scheduleHeader.summary.metrics.length, 3);
assert.equal(home.scheduleHeader.summary.expandable, true);
assert.equal(home.kanbanHeader.showScheduleSummary, false);
assert.equal(home.planningHeader.showScheduleSummary, false);

const detail = createTaskDetailPage({ title: "论文初稿" });
assert.equal("actions" in detail, false);
assert.equal(detail.meta.length >= 3, true);
assert.equal(detail.sections.some((section) => section.id === "history"), true);
```

- [ ] **Step 2: 跑测试，确认当前代码缺少这些字段**

Run: `node --experimental-strip-types --test apps/miniprogram/tests/home-page.spec.ts -v`

Expected: FAIL，报 `scheduleHeader` / `kanbanHeader` / `sections` 等字段不存在，或 `actions` 仍然存在。

- [ ] **Step 3: 在首页和任务详情模型里补齐最小展示态**

```ts
export interface HomeSurfaceHeader {
  secondaryTabs: Array<{ id: string; label: string; active: boolean }>;
  modeTabs: Array<{ id: string; label: string; active: boolean }>;
  showScheduleSummary: boolean;
}

export interface HomeScheduleSummary {
  title: string;
  metrics: Array<{ id: string; value: string; label: string }>;
  expandable: boolean;
}

export interface TaskDetailSection {
  id: "plan" | "source" | "history";
  title: string;
  lines: string[];
}
```

同时：

1. 在 `buildHomePage()` 中按现有任务数据计算 `3 待办 / 1 高优 / 2h` 这类摘要指标。
2. 为 `schedule / kanban / planning` 各自生成展示专用 header 元数据。
3. 从 `createTaskDetailPage()` 中删除 `actions` 字段，改为 `meta` + `sections`。
4. 同步 `.js` 镜像。

- [ ] **Step 4: 重新运行契约测试**

Run: `node --experimental-strip-types --test apps/miniprogram/tests/home-page.spec.ts -v`

Expected: PASS，且首页数据、只读详情结构、无 `actions` 字段都被锁住。

- [ ] **Step 5: 提交这一块**

```bash
git add apps/miniprogram/pages/home/index.ts apps/miniprogram/pages/home/index.js apps/miniprogram/pages/task-detail/index.ts apps/miniprogram/pages/task-detail/index.js apps/miniprogram/tests/home-page.spec.ts
git commit -m "feat: add miniprogram redesign view models"
```

### Task 2: 重写首页 / 事项 / 排期的 WXML 结构

**Files:**
- Modify: `apps/miniprogram/tests/smoke.spec.ts`
- Modify: `apps/miniprogram/pages/home/index.wxml`

- [ ] **Step 1: 先把模板断言写成失败**

```ts
assert.equal(template.includes('class="primary-tabs primary-tabs-floating"'), true);
assert.equal(template.includes('class="control-row"'), true);
assert.equal(template.includes('class="schedule-summary"'), true);
assert.equal(template.includes('wx:if="{{activeTab === \'schedule\'}}" class="schedule-summary"'), true);
assert.equal(template.includes('wx:if="{{activeTab === \'kanban\'}}" class="schedule-summary"'), false);
assert.equal(template.includes('wx:if="{{activeTab === \'planning\'}}" class="schedule-summary"'), false);
assert.equal(template.includes('class="kanban-shell"'), true);
assert.equal(template.includes('class="planning-shell"'), true);
assert.equal(template.includes('class="task-detail-panel"'), true);
```

- [ ] **Step 2: 跑 smoke 片段测试，确认模板尚未匹配**

Run: `node --experimental-strip-types --test apps/miniprogram/tests/smoke.spec.ts -v`

Expected: FAIL，报找不到新类名或新的条件渲染片段。

- [ ] **Step 3: 用新结构替换首页模板**

```xml
<view class="primary-tabs primary-tabs-floating">
  <view wx:for="{{home.tabs}}" class="primary-tab {{activeTab === tab.id ? 'primary-tab-active' : ''}}">
    <text>{{tab.label}}</text>
  </view>
</view>

<view class="control-row">
  <view class="control-left">
    <view wx:for="{{home.scheduleHeader.secondaryTabs}}" class="soft-tab {{item.active ? 'soft-tab-active' : ''}}">
      <text>{{item.label}}</text>
    </view>
  </view>
  <view class="control-right">
    <view wx:for="{{home.scheduleHeader.modeTabs}}" class="mode-pill {{item.active ? 'mode-pill-active' : ''}}">
      <text>{{item.label}}</text>
    </view>
  </view>
</view>

<view wx:if="{{activeTab === 'schedule'}}" class="schedule-summary">...</view>
```

实现要求：

1. `日程 / 事项 / 排期` 顶部统一为浮岛混合主导航。
2. `日程` 页渲染控制带 + 摘要条 + 时间轴。
3. `事项` 页只渲染主导航 + 控制带 + 看板主体。
4. `排期` 页只渲染主导航 + 控制带 + 排期主体。
5. 详情浮层保持只读结构，不插入动作条。

- [ ] **Step 4: 重新运行 smoke 模板测试**

Run: `node --experimental-strip-types --test apps/miniprogram/tests/smoke.spec.ts -v`

Expected: PASS，模板关键节点和条件渲染已对齐新结构。

- [ ] **Step 5: 提交模板改动**

```bash
git add apps/miniprogram/pages/home/index.wxml apps/miniprogram/tests/smoke.spec.ts
git commit -m "feat: redesign miniprogram home markup"
```

### Task 3: 落地首页 / 事项 / 排期的新样式系统

**Files:**
- Modify: `apps/miniprogram/tests/smoke.spec.ts`
- Modify: `apps/miniprogram/pages/home/index.wxss`

- [ ] **Step 1: 为新样式类补充 smoke 断言**

```ts
const styles = await readFile(new URL("../pages/home/index.wxss", import.meta.url), "utf8");

assert.equal(styles.includes(".primary-tabs-floating"), true);
assert.equal(styles.includes(".control-row"), true);
assert.equal(styles.includes(".schedule-summary"), true);
assert.equal(styles.includes(".primary-tab-active"), true);
assert.equal(styles.includes(".soft-tab-active"), true);
assert.equal(styles.includes(".mode-pill-active"), true);
assert.equal(styles.includes(".task-detail-panel"), true);
```

- [ ] **Step 2: 跑 smoke，确认样式类当前不存在**

Run: `node --experimental-strip-types --test apps/miniprogram/tests/smoke.spec.ts -v`

Expected: FAIL，`index.wxss` 尚未包含这些新类。

- [ ] **Step 3: 用暖纸面样式替换旧蓝灰样式**

```css
.workspace {
  padding: 20rpx 24rpx 228rpx;
  background:
    radial-gradient(circle at top left, rgba(250, 204, 21, 0.14), transparent 34%),
    linear-gradient(180deg, #f7efe6 0%, #f3eadf 100%);
}

.primary-tabs-floating {
  padding: 8rpx;
  border-radius: 28rpx;
  background: rgba(255, 251, 246, 0.94);
}

.schedule-summary {
  border-radius: 24rpx;
  padding: 12rpx 16rpx;
}
```

样式重点：

1. 主导航保留浮岛感，但厚度收紧。
2. 二级和三级控制带压缩成一条水平带。
3. `今日节奏` 默认只是一行摘要条。
4. `事项` 和 `排期` 顶部高度明显低于 `日程`。
5. 时间轴、看板、排期主体统一到暖纸面视觉。

- [ ] **Step 4: 重新跑 smoke，确认样式命名和文件一致**

Run: `node --experimental-strip-types --test apps/miniprogram/tests/smoke.spec.ts -v`

Expected: PASS，样式文件已包含新类名，模板 / 样式不再脱节。

- [ ] **Step 5: 提交样式改动**

```bash
git add apps/miniprogram/pages/home/index.wxss apps/miniprogram/tests/smoke.spec.ts
git commit -m "feat: apply miniprogram redesign styles"
```

### Task 4: 收口只读任务详情页和 runtime 边界

**Files:**
- Modify: `apps/miniprogram/tests/home-runtime.spec.ts`
- Modify: `apps/miniprogram/tests/smoke.spec.ts`
- Modify: `apps/miniprogram/pages/home/runtime.ts`
- Modify: `apps/miniprogram/pages/home/runtime.js`
- Modify: `apps/miniprogram/pages/task-detail/index.wxml`
- Modify: `apps/miniprogram/pages/task-detail/index.wxss`

- [ ] **Step 1: 先把 runtime 和详情模板断言写失败**

```ts
await runtime.openTaskDetail("task_1");
assert.equal(runtime.state.taskDetailVisible, true);
assert.equal(runtime.state.selectedTaskId, "task_1");

const detailTemplate = await readFile(new URL("../pages/task-detail/index.wxml", import.meta.url), "utf8");
assert.equal(detailTemplate.includes("task-detail-actions"), false);
assert.equal(detailTemplate.includes("detail-meta-grid"), true);
assert.equal(detailTemplate.includes("detail-history-list"), true);
```

- [ ] **Step 2: 跑 runtime + smoke，确认当前详情页仍过薄或仍带旧约束**

Run: `node --experimental-strip-types --test apps/miniprogram/tests/home-runtime.spec.ts apps/miniprogram/tests/smoke.spec.ts -v`

Expected: FAIL，详情页模板和 runtime 断言尚未满足新结构。

- [ ] **Step 3: 重写只读详情页并保持 runtime 不引入新动作**

```xml
<view class="detail-meta-grid">...</view>
<view class="detail-section">
  <text class="detail-section-title">{{section.title}}</text>
  <text wx:for="{{section.lines}}">{{item}}</text>
</view>
<view class="detail-history-list">...</view>
```

实现要求：

1. `runtime.openTaskDetail()` 仍只负责加载和展示，不新增确认 / 编辑 / 重新安排动作。
2. 首页内嵌详情浮层和独立 `task-detail` 页面结构保持同一语言。
3. 独立详情页展示 `meta` + `sections` + `history`，不再消费 `actions`。
4. 同步 `.js` 镜像。

- [ ] **Step 4: 重新运行 runtime 与 smoke**

Run: `node --experimental-strip-types --test apps/miniprogram/tests/home-runtime.spec.ts apps/miniprogram/tests/smoke.spec.ts -v`

Expected: PASS，详情打开状态、模板结构和只读边界全部锁住。

- [ ] **Step 5: 提交详情收口**

```bash
git add apps/miniprogram/pages/home/runtime.ts apps/miniprogram/pages/home/runtime.js apps/miniprogram/pages/task-detail/index.wxml apps/miniprogram/pages/task-detail/index.wxss apps/miniprogram/tests/home-runtime.spec.ts apps/miniprogram/tests/smoke.spec.ts
git commit -m "feat: redesign miniprogram task detail views"
```

### Task 5: 最终验证与 UI review 收口

**Files:**
- Modify: `apps/miniprogram/tests/home-page.spec.ts` (如需补充遗漏断言)
- Modify: `apps/miniprogram/tests/home-runtime.spec.ts` (如需补充遗漏断言)
- Modify: `apps/miniprogram/tests/smoke.spec.ts` (如需补充遗漏断言)

- [ ] **Step 1: 跑首页与 runtime 全量单测**

Run: `node --experimental-strip-types --test apps/miniprogram/tests/home-page.spec.ts apps/miniprogram/tests/home-runtime.spec.ts -v`

Expected: PASS，首页数据、runtime 状态、任务详情只读边界全部通过。

- [ ] **Step 2: 跑小程序 smoke 和仓库 smoke**

Run: `node --experimental-strip-types --test apps/miniprogram/tests/smoke.spec.ts -v`
Expected: PASS

Run: `pnpm run smoke`
Expected: PASS，至少 `apps/miniprogram/tests/smoke.spec.ts` 通过；若其他 surface 失败，必须确认是否与本次改版无关。

- [ ] **Step 3: 做一次微信开发者工具人工检查**

Checklist:

1. 首页默认进入 `日程`。
2. `今日节奏` 只在 `日程` 页面出现。
3. `事项` 和 `排期` 顶部明显更短。
4. 多级 tab 基本不跨行。
5. 任务详情无新增操作按钮。
6. 时间轴拖拽编辑未被样式改版破坏。

- [ ] **Step 4: 跑 `@frontend-design-review` 做最终 UI 审核**

Review focus:

1. 是否回到默认 AI 风格。
2. 是否存在键盘 / 可触达 / 可读性问题。
3. 是否有 `今日节奏` 越权渲染到其他 tab。
4. 是否有详情页偷偷引入新能力。

- [ ] **Step 5: 最终提交**

```bash
git add apps/miniprogram/pages/home apps/miniprogram/pages/task-detail apps/miniprogram/tests
git commit -m "feat: redesign tangxie miniprogram surfaces"
```
