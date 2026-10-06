# dsh-evidence-discipline

A [DeepSeek Harness](https://github.com/deepseek-ai) skill 包：**证据纪律 · 代码跟进与核对方法**。

用于接手不熟悉的项目、核对他人改动、验证某条技术结论。目标只有一个：
**让每句结论都对得起它的证据。**

## 内容

`SKILL.md`（技能正文）：

- **证据层级 L1–L5**：读到的代码 / 本地模拟测试 / 真实渲染 / 真实云 / 真机与真实支付，
  硬规则是**下层不得冒充上层**，结论必须分成「已验证 / 待核对假设 / 产品策略」。
- **跟进流程 17 条**：真实 diff 优先于自述、承重声明逐行定位、追完整控制流与异常形状、
  mock 保真度检查、关键断言做证伪、区分三种失败、定级前追影响链路……
- **谬误目录 8 条**：搜不到即不存在、有分支即生效、默认值即线上配置、产品策略当漏洞、
  样本当全量、下层冒充上层、报告转述当事实、修正一处放行另一处。
- **动手前自查清单 12 项**。
- **自主推进 vs 真阻塞**的边界。

## 安装

```bash
# DSH 内
plugin_manager  action: install_bundle  target: <本仓库绝对路径>

# 或 CLI
dsh plugin --profile <profile> add link:<本仓库绝对路径>
```

## ⚠️ 装完必须重启才会生效

这不是本包的特殊要求，而是这套机制的固有性质，也是本包最有价值的一条经验：

1. **技能不是靠文件被扫描发现的。** 把 `SKILL.md` 放进包根、再声明
   `exports: { "./skill": "./SKILL.md" }`——**光这样永远不会生效**。技能必须由插件在
   `apply()` 时**主动注册**到 `skills` 服务：

   ```js
   ctx.inject(['skills'], skillCtx => {
     skillCtx.skills.registerProvider(() => bundledSkillProvider());
   });
   ```

   `@deepseek-ai/dsh-skill` 的 `skills` 服务提供 `registerProvider()` 与 `register()`；
   provider 需实现 `list()` 与 `get()`，候选/定义对象要满足 `SkillSummary` / `SkillDefinition`。

2. **运行中的宿主进程会缓存插件模块。** 若该入口在更早的安装中被加载过，
   仅做「移除 + 重装」**不会**重新导入模块——`apply()` 不会再次执行，技能也不会出现。
   **需要重启应用或在一个新进程里加载。**

验证（重启后）：

```bash
node test-skill-registration.mjs   # 离线单测：模拟 ctx，确认 provider 注册与返回结构
```

在 DSH 会话里直接调用 `skill('evidence-discipline')`；能加载即表示注册链路通。

## 移除

```bash
plugin_manager  action: remove_bundle  target: dsh-evidence-discipline
```

## 结构

```
SKILL.md             技能正文（frontmatter 的 name/description 是触发面，也是单一数据源）
lib/index.js         Host 插件：apply() 时向 skills 服务注册 provider
index.js             兼容 shim（转发到 lib/index.js）
cordis.patch.yml     bundle patch：把插件行插入 profile roster
package.json         dsh.bundle.patch + exports
```

`lib/index.js` 从 `SKILL.md` 的 frontmatter 解析 `name` / `description`，
避免描述在两处漂移——描述就是技能的触发面，漂移会直接影响它能不能被唤起。

## License

MIT
