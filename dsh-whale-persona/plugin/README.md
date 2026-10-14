# dsh-whale-persona —— DSH 人设插件（鲸鱼娘·大肥鱼）

让“鲸鱼娘·大肥鱼”成为每个 DSH 会话的固定角色设定：每个新窗口、每个子代理都会自动带上这套人设。
纯本地实现：只读本地的人设文本文件，然后注册成 system prompt 的一个 section。

## 一、它做什么

- 在每个会话的 system prompt 末尾注入一份角色设定，因此“每个工作窗口”都一致。
- 支持可调参数：傲娇程度（light / middle / off）、关心程度（normal / high / off）、自称、对用户的称呼。
- 人设正文单独放在 persona.md，改完保存即生效（插件按文件修改时间自动重载，无需重启）。
- 服务缺失时静默跳过，不会让 DSH 启动失败。

## 二、文件结构

    dsh-whale-persona/
      package.json        插件元数据（含 dsh.bundle.patch 与版本兼容声明）
      cordis.patch.yml    插入声明 + 默认参数
      lib/index.js        插件主体（约 150 行，可全文审阅）
      persona.md          人设正文，想改性格就改这里
      README.md           本文件
      LICENSE             MIT

## 三、安装位置与卸载

安装方式（已完成）：

1. 源码目录：E:\ai\work\dsh-whale-persona
2. 在 profile 的 node_modules 下建立一个目录联接（junction），指向源码目录：
   C:\Users\Administrator\.dsh\profiles\desktop\node_modules\dsh-whale-persona
3. 在源码目录里建两个反向依赖联接（Node 按真实路径解析 ESM 依赖时要用）：
   E:\ai\work\dsh-whale-persona\node_modules\@deepseek-ai\schemastery -> profile 的 @deepseek-ai\schemastery
   E:\ai\work\dsh-whale-persona\node_modules\@deepseek-ai\cosmokit    -> profile 的 @deepseek-ai\cosmokit
   （不建也不会崩：插件会退到内置的极简 schema 实现；建上就用 DSH 自带的 schemastery 3.18.4 做完整配置校验。
     本机已建好，实测解析到 C:\Users\Administrator\.dsh\profiles\desktop\node_modules\@deepseek-ai\schemastery。）
4. 在 profile 的 package.json 中登记：dependencies 里加 dsh-whale-persona: link:... ，
   dsh.profile.bundles 数组里加 dsh-whale-persona。

以上四步由 install.ps1 幂等完成（换机器或重装直接跑它）。

因为用的是目录联接，改源码或改 persona.md 后重启 DSH 就是最新版本，不需要重新复制文件。

卸载（三步，uninstall.ps1 已实现）：

1. 删掉 profile 下的 node_modules\dsh-whale-persona（只是联接，不会删源码）。
2. 从 profile 的 package.json 里删掉 dependencies 与 bundles 中的 dsh-whale-persona，并移除 cordis.patch.yml 里的参数覆盖块。
3. 重启 DSH。

源码目录 E:\ai\work\dsh-whale-persona 及其 node_modules 联接不会被删；要彻底清理直接删整个源码目录即可。

## 四、参数怎么改

在 %USERPROFILE%\.dsh\profiles\desktop\cordis.patch.yml 里追加一条同 id 的覆盖项（它会盖过插件自带的默认值）：

    - id: dsh-whale-persona
      name: dsh-whale-persona
      config:
        enabled: true
        tsundere: 低
        care: 高
        selfName: 本鲸
        userTitle: 你

| 参数 | 取值 | 默认 | 说明 |
| --- | --- | --- | --- |
| enabled | true / false | true | 总开关，false 时完全不注入 |
| tsundere | 低 / 中 / 关闭（兼容 light / middle / off） | 低 | 傲娇程度 |
| care | 正常 / 高 / 关闭（兼容 normal / high / off） | 高 | 关心程度 |
| selfName | 本鲸 / 我 | 本鲸 | 自称 |
| userTitle | 你 / 人类 | 你 | 对用户的称呼 |
| extra | 任意文本 | 空 | 追加到人设末尾的附加要求 |
| personaFile | 相对 / 绝对路径 | 空（用 persona.md） | 换一份人设文本 |
| includeRuntimeNote | true / false | true | 是否在末尾附上“本次运行参数”说明 |
| order | 数字 | 0 | 0 表示自动排在 DEPLOYMENT_PERSONA_SUFFIX 之后 |

## 五、安全性（可自行复核）

审计结论：

- 只导入三个 Node 内置模块：node:fs（读取）、node:path、node:url；另外可选导入 @deepseek-ai/schemastery 做参数校验。
- 没有 http / https / fetch / WebSocket / net / dgram，不会发出任何网络请求。
- 没有 child_process / spawn / exec，不会启动任何进程。
- 不写文件、不读会话内容、不读账号凭据；只读你自己指定的人设文本。
- 没有任何遥测或上报逻辑。

你可以自己复核（PowerShell，在插件目录执行）：

    Select-String -Path .\lib\index.js -Pattern 'http|fetch|child_process|spawn|process.env|writeFile'

没有任何输出 = 没有网络、没有进程、没有写文件、没有读环境变量。

## 六、版本兼容

- 针对 @deepseek-ai/dsh-desktop 0.2.0-rc.2（nightly）开发，package.json 中已声明：
  dsh.compatibility.dshReleases => { "0.2.0-rc.2": "compatible" }。
- engines: node ^22.19.0 || >=24.0.0（当前 DSH 内置 Node 24.18.1，满足）。
- 依赖 @deepseek-ai/schemastery（>=3.18.2，可选）：解析不到时插件自动使用内置的最小校验降级，不会崩。
- 使用公开的 systemPrompt 服务（与 dsh-context 相同的 ctx.inject(["systemPrompt"], ...) 接口）；
  若将来该接口改名，插件会静默不注入，不会影响 DSH 其他功能。

## 七、常见问题

Q：改完了怎么没生效？
A：先用 enabled 确认没关；再确认 profile 的 package.json bundles 里有 dsh-whale-persona，然后重启 DSH。persona.md 的改动是热生效的，参数改动需要重启。

Q：想立刻静音人设？
A：把 enabled 改成 false 并重启，或直接把 persona.md 清空。

Q：会不会和 dsh-context 的 promptPrefix / promptSuffix 冲突？
A：不会。它们插在系统提示的最前/最后，本插件默认插在 DEPLOYMENT_PERSONA_SUFFIX 之后，顺序用 order 参数可调。

Q：会不会让 token 变多？
A：注入文本 1294 字符（正文 1000 字符 + 运行参数段 294 字符），按 DeepSeek 官方换算率约 700 token，约占一次请求基础开销的百分之几；且它位于系统提示的稳定前缀中，会被上下文缓存命中，重复计费单价约为未命中的 1/10。
