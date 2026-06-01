# Implementation

## Changes

- `Image Reverse` 从 `QuickAddModal` 中拆出，作为独立 `ImagePromptReverseModal`。
- `TopBar` 的 Prompt 新建菜单新增独立图片反推入口。
- `QuickAddModal` 只保留 `Analyze Existing` / `AI Generate` 两种模式。
- `Image Reverse` 支持：
  - 点击选择图片
  - 拖拽图片
  - 粘贴系统截图或剪贴板图片
- 图片会通过现有 image IPC 保存供视觉模型读取；是否作为新建 image Prompt 的 `images` 参考图由用户勾选项控制。
- 新增 `imageReverseAttachReferenceByDefault` 设置偏好，存储在 renderer `prompthub-settings` zustand persist 里，默认开启。
- UI 将固定的 `Prompt Type = Image` 改成只读输出类型信息条，并让文件夹选择单独占满一行，避免底部表单拥挤。
- AI 调用使用新的 `imageReverse` chat 场景配置和 `chatCompletion()` 多模态消息，不走 `imageTest` / 生图 endpoint。
- AI 模型配置新增 chat 模型能力标记：
  - `capabilities.vision`：可读取图片 / 截图，`imageReverse` 必须使用此类模型
- AI 路由配置新增 `modelRouteDefaults`，暴露主文本 / 快速 / 视觉 / 生图四类稳定路由槽位。
- `fast` 从模型能力中移除，改为 `fastText` 路由；Quick Add、翻译、轻量审核等内部场景映射到该路由。
- AI 设置工作台不再直接暴露业务场景默认模型，而是显示和配置四类模型路由；总览显示当前解析到的模型名，而不是模型数量。
- `imageReverse` 不再回退到普通 chat 模型或旧版单文本模型配置；未配置 vision-capable chat 模型时返回不可用状态。
- 未配置 vision-capable chat 模型时，`ImagePromptReverseModal` 显示图片反推专用错误提示，明确引导用户到 AI 模型工作台添加视觉对话模型并配置视觉模型路由；该路径不会调用 AI，也不会创建 Prompt。
- `image-prompt-reverse-utils.ts` 新增 `buildImagePromptReverseInstruction()`，约束模型返回可保存的 image Prompt JSON 草稿。
- 批量审查并强化了生产提示词模板：
  - Quick Add analysis 更明确保留变量、格式、代码块和任务意图
  - Quick Add generate 增加 text/image Prompt 的结构化质量标准
  - Image Reverse 明确输出生图 prompt，而不是图片 caption
- 新建 Prompt 时固定 `promptType=image`，并从 AI 返回结果填充 title / userPrompt / description / tags / suggestedFolder。只有勾选“同时添加为参考图”时才写入 `images`。

## Verification

- `pnpm --filter @prompthub/desktop exec vitest run tests/unit/services/ai-defaults.test.ts tests/unit/components/image-prompt-reverse-utils.test.ts tests/unit/components/image-prompt-reverse-modal.test.tsx tests/unit/components/ai-settings-prototype.test.tsx tests/unit/stores/settings-ai-models.test.ts`
  - 结果：通过（29/29）
- `pnpm --filter @prompthub/desktop exec vitest run tests/unit/components/ai-workbench-base-fields.test.tsx tests/unit/components/ai-settings-prototype.test.tsx tests/unit/services/ai-defaults.test.ts tests/unit/components/image-prompt-reverse-utils.test.ts tests/unit/stores/settings-ai-models.test.ts`
  - 结果：通过（30/30），覆盖旧形态 `modelForm` 未携带 `capabilities` 时的兼容渲染。
- `pnpm --filter @prompthub/desktop exec vitest run tests/unit/services/ai-defaults.test.ts tests/unit/components/quick-add-utils.test.ts tests/unit/components/image-prompt-reverse-utils.test.ts tests/unit/components/image-prompt-reverse-modal.test.tsx tests/unit/components/ai-settings-prototype.test.tsx tests/unit/components/ai-workbench-base-fields.test.tsx tests/unit/stores/settings-ai-models.test.ts tests/unit/services/settings-snapshot.test.ts`
  - 结果：通过（47/47），覆盖模型路由槽位、旧 scenario 配置兼容、AI 配置快照保留 `modelRouteDefaults`。
- `pnpm --filter @prompthub/desktop exec vitest run tests/unit/components/image-prompt-reverse-modal.test.tsx tests/unit/components/image-prompt-reverse-utils.test.ts`
  - TDD 红灯结果：失败（新增 UI 用例找不到图片反推专用视觉模型错误提示）。
- `pnpm --filter @prompthub/desktop exec vitest run tests/unit/components/image-prompt-reverse-modal.test.tsx tests/unit/components/image-prompt-reverse-utils.test.ts`
  - 修复后结果：通过（11/11），覆盖无视觉模型、旧版根级文本配置不能兜底、不完整 vision 模型拒绝、错误视觉路由目标回退到 vision-capable chat 模型、未显式配置视觉路由但存在视觉模型、AI 返回不可解析内容、AI 调用失败。
- `pnpm --filter @prompthub/desktop exec vitest run tests/unit/services/ai-defaults.test.ts tests/unit/components/quick-add-utils.test.ts tests/unit/components/image-prompt-reverse-utils.test.ts tests/unit/components/image-prompt-reverse-modal.test.tsx tests/unit/components/ai-settings-prototype.test.tsx tests/unit/components/ai-workbench-base-fields.test.tsx tests/unit/stores/settings-ai-models.test.ts tests/unit/services/settings-snapshot.test.ts`
  - 结果：通过（53/53），覆盖模型路由、视觉能力过滤、不完整 vision 模型拒绝、旧版配置兼容、未配置视觉模型错误提示、图片反推解析/调用失败、参考图偏好和设置快照。
- `pnpm --filter @prompthub/desktop typecheck`
  - 结果：通过
- `node -e 'for (const f of ["en","zh","zh-TW","ja","fr","de","es"]) JSON.parse(require("fs").readFileSync("apps/desktop/src/renderer/i18n/locales/" + f + ".json", "utf8")); console.log("locale json ok")'`
  - 结果：通过
- `pnpm --filter @prompthub/desktop exec eslint src/renderer/components/prompt/ImagePromptReverseModal.tsx src/renderer/components/prompt/image-prompt-reverse-utils.ts src/renderer/services/ai-defaults.ts src/renderer/stores/settings.store.ts tests/unit/components/image-prompt-reverse-modal.test.tsx tests/unit/components/image-prompt-reverse-utils.test.ts tests/unit/services/ai-defaults.test.ts`
  - 结果：通过
- `pnpm --filter @prompthub/desktop exec eslint src/renderer/services/ai-defaults.ts src/renderer/components/prompt/image-prompt-reverse-utils.ts src/renderer/components/settings/AISettingsPrototype.tsx src/renderer/components/settings/ai-workbench/types.ts src/renderer/components/settings/ai-workbench/constants.ts src/renderer/components/settings/ai-workbench/helpers.ts src/renderer/components/settings/ai-workbench/ScenarioDefaultsSection.tsx src/renderer/components/settings/ai-workbench/model-form/BaseFields.tsx src/renderer/components/settings/ai-workbench/EndpointsSection.tsx src/renderer/stores/settings.store.ts tests/unit/services/ai-defaults.test.ts tests/unit/components/image-prompt-reverse-utils.test.ts tests/unit/components/image-prompt-reverse-modal.test.tsx tests/unit/components/ai-settings-prototype.test.tsx tests/unit/stores/settings-ai-models.test.ts`
  - 结果：通过
- `pnpm --filter @prompthub/desktop exec eslint src/renderer/services/ai-defaults.ts src/renderer/components/prompt/quick-add-utils.ts src/renderer/components/prompt/QuickAddModal.tsx src/renderer/components/prompt/image-prompt-reverse-utils.ts src/renderer/components/prompt/ImagePromptReverseModal.tsx src/renderer/components/prompt/AiTestModal.tsx src/renderer/components/prompt/EditPromptModal.tsx src/renderer/components/prompt/PromptQuickRewriteDialog.tsx src/renderer/components/layout/MainContent.tsx src/renderer/components/settings/AISettingsPrototype.tsx src/renderer/components/settings/ai-workbench/types.ts src/renderer/components/settings/ai-workbench/constants.ts src/renderer/components/settings/ai-workbench/helpers.ts src/renderer/components/settings/ai-workbench/ScenarioDefaultsSection.tsx src/renderer/components/settings/ai-workbench/model-form/BaseFields.tsx src/renderer/components/settings/ai-workbench/EndpointsSection.tsx src/renderer/stores/settings.store.ts src/renderer/services/settings-snapshot.ts src/renderer/services/database-backup-format.ts tests/unit/services/ai-defaults.test.ts tests/unit/components/quick-add-utils.test.ts tests/unit/components/image-prompt-reverse-utils.test.ts tests/unit/components/image-prompt-reverse-modal.test.tsx tests/unit/components/ai-settings-prototype.test.tsx tests/unit/stores/settings-ai-models.test.ts tests/unit/services/settings-snapshot.test.ts`
  - 结果：通过
- `pnpm --filter @prompthub/desktop test -- --run`
  - 结果：失败（1490/1505 通过）。本次新增的 `ai-workbench-base-fields` 兼容性失败已修复并定向复测通过；剩余失败集中在既有 skill / db 测试：
    - `tests/unit/components/top-bar.test.tsx`：distribution view 搜索仍显示 `No results`
    - `tests/unit/components/skill-i18n-smoke.test.tsx`：project deployment action 用例超时
    - `tests/unit/components/skill-store-custom-sources.test.tsx`：官方商店 empty state 期望不匹配
    - `tests/integration/components/skill-manager-large-dataset.integration.test.tsx`：mock 缺少 `SKILL_LIST_PAGE_SIZE_OPTIONS`
    - `tests/unit/services/skill-filter*.test.ts` / `skill-stats.test.ts`：deployed/pending 统计期望不匹配
    - `tests/unit/services/skill-platform-sync.test.ts`：结果字段从 `skillName` 变为 `skillId`
    - `tests/unit/main/skill-db-versioning.test.ts`：重复添加 `source_url` column
- `pnpm --filter @prompthub/desktop exec vitest run tests/unit/components/image-prompt-reverse-modal.test.tsx tests/unit/components/image-prompt-reverse-utils.test.ts tests/unit/components/quick-add-utils.test.ts tests/unit/services/renderer-i18n-hardcode-regression.test.ts`
  - 结果：通过（15/15）
- `pnpm --filter @prompthub/desktop exec eslint src/renderer/components/prompt/ImagePromptReverseModal.tsx src/renderer/components/prompt/image-prompt-reverse-utils.ts src/renderer/stores/settings.store.ts tests/unit/components/image-prompt-reverse-modal.test.tsx tests/unit/components/image-prompt-reverse-utils.test.ts`
  - 结果：通过
- `node -e 'for (const f of ["en","zh","zh-TW","ja","fr","de","es"]) JSON.parse(require("fs").readFileSync("apps/desktop/src/renderer/i18n/locales/" + f + ".json", "utf8")); console.log("locale json ok")'`
  - 结果：通过
- `pnpm --filter @prompthub/desktop exec vitest run tests/unit/components/top-bar.test.tsx`
  - 结果：失败。失败用例为既有 `uses the regular skill search query in the distribution view`，单独运行同样失败；症状是 distribution view 搜索 `pdf` 显示 `No results` 而非 `1 results`。本次新增的 Prompt 菜单入口用例已通过。
- `pnpm --filter @prompthub/desktop exec vitest run tests/unit/components/top-bar.test.tsx -t "renders the create mode dropdown"`
  - 结果：通过（1/1），验证新建菜单中独立显示图片反推入口。

## Harness Notes

- 本次最低有效验证层是 renderer unit/component + AI transport unit + app typecheck/lint。
- 没跑根级 `pnpm verify:release:quick`：`spec/issues/active/quality.md` 已记录当前 release quick harness 仍有既有 desktop unit 失败，不能作为本次绿色准入信号。
