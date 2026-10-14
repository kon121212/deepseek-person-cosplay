## 添加插件：dsh-whale-persona

本次 PR 只新增一个条目文件：`data/plugins/<owner>__dsh-whale-persona.yml`。

- 仓库：https://github.com/<owner>/dsh-whale-persona
- 分类：`identity`
- 作用：把固定角色人设注入每个会话的 system prompt，可调傲娇程度 / 关心程度 / 自称 / 对用户的称呼；人设文本读自本地 Markdown 文件，插件不发起网络请求。

### 自查（对应 pull_request_template.md）

- [x] 只新增了 `data/plugins/<owner>__dsh-whale-persona.yml` 这一个文件，没有手工编辑两个 README
- [x] 仓库 `package.json` 声明了 `dsh.bundle`（`{ "patch": "./cordis.patch.yml" }`），不是只有 `dsh.client`
- [x] 仓库创建已满 1 天
- [x] `category` 取值在允许列表内（`identity`）
- [x] 描述只说明功能，没有最高级形容词或营销词，且与代码一致
- [x] 仓库已加 `dsh-plugin` topic
- [ ] 已发布到 npm（可选）
- [x] 官方包 `@deepseek-ai/schemastery` 用 `peerDependencies` 声明（并标 optional）
