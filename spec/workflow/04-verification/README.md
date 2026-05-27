# PromptHub Workflow Verification

`spec/workflow/04-verification/README.md` 是 PromptHub 当前项目级 verification 主入口，对齐最新 `spec-init` 的 workflow/verification 边界，回答“怎么证明做对了”。

## 当前验证原则

- 高优先级需求必须有自动化验证
- bug fix 必须补回归测试
- 测试应验证行为，而不是堆覆盖率数字
- 需求、设计、验证、任务之间应尽量形成追踪链

## 当前验证真相源

- `AGENTS.md` 中的测试标准
- 各 active change 的 `tasks.md` / `implementation.md`
- 已存在的单元、集成与 E2E 测试文件

## 当前推荐做法

- 项目级长期验证策略逐步沉淀到这里
- 单次变更的验证计划继续写在对应 change 中
