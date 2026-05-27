# PromptHub Testing Standards

## 基本原则

- 高优先级需求必须有自动化验证。
- bug 修复必须补回归测试。
- 测试必须服务真实风险，而不是为了制造覆盖率数字。
- 测试应验证行为，不应过度绑定内部实现。

## 当前测试层次

- White-box Unit：验证纯逻辑、边界条件、规则与数据转换
- Integration：验证模块协作、数据库、IPC、服务编排
- E2E：验证最关键的用户流程
- Performance：验证关键路径与长列表 / 大数据量场景
- Security：验证鉴权、权限、输入校验与敏感信息处理

## PromptHub 项目要求

- 修改需求或行为前，先检查 `spec/workflow/04-verification/README.md` 是否需要同步。
- 引入新风险路径时，要把回归策略写进 verification 或当前 change 工作区。
- PromptHub 已有的长期测试标准以 `AGENTS.md` 为主，本文件作为项目内规则入口补充。

## 当前主要真相源

- `AGENTS.md`
- `spec/workflow/04-verification/README.md`
