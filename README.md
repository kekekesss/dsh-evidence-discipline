# dsh-evidence-discipline

> **定位（先读这段）**
> 这是一份**个人核对方法备忘**，外加**一次真实代码核对过程的复盘**——
> **不是**面向技能库的通用作品。不安装也能读：`SKILL.md` 就是正文；
> 做成 DSH 技能包，只是因为我想在同类任务里能随时把它调出来。

**站得住的三块**：谬误目录（8 条，每条都对应一次真实误判）· 证据分级 L1–L5 与「下层不得冒充上层」·
动手前自查清单（12 项）。

**站不住的**：没有可执行内容（0 条命令、0 个模板）——够格的技能库条目应当提供模型**不具备的能力**，
这里提供的是**提醒**；激活至今**未验证**（见下方"装完必须重启"一节）；8 条谬误**全部来自同一个
会话里的亲身错误**，样本量 = 1，不是多项目积累；`description` 英文而正文中文，不一致。

**结论**：它是一份工作纪律备忘，不是技能库贡献。如果你在找能直接提升能力的技能，这个不是。

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

3. **`apply()` 里不要直接访问 `ctx.<service>`。** cordis 会抛
   `cannot get property "skills" without inject`——服务只能经由 `inject` 拿到：

   ```js
   // ✗ 抛异常：typeof ctx.skills
   // ✓ 正确：在 inject 回调里用 skillCtx.skills
   ```

### 排查：装了但没生效（按顺序查，别猜）

1. **先看入口能否被 import。** 以 profile 目录为基准：
   `node --input-type=module -e "import('dsh-evidence-discipline').then(m=>console.log(Object.keys(m)))"`
   —— 能打印出 `apply`，说明模块本身没问题，问题在挂载或注册。
2. **主动逼出 activation 错误。** ⚠️ `install_bundle` 可能返回
   `application: applied, warnings: []`，而该入口其实**激活失败**（本包就踩过：错误被静默吞掉）。
   用 `plugin_manager action: set_plugin target: 'include:<你的 patchId>' enabled:false` 再 `enabled:true`
   —— **真实报错会出现在返回里，含调用栈与行号**。
3. **报错行号对不上 = 宿主持有旧模块。** 若报错指向已不存在的行号，说明必须**重启应用**；
   toggle enabled 不会重新 import。

⚠️ **别拿"日志文件"当证据。** 如果那行日志本身可能抛异常或被静默吞掉，
它的沉默**不能**证明代码没执行——我因此得出过"apply 从未被调用"的错误结论，
而实际上它一直在被调用、只是我的诊断行先抛了异常。**会自己失败且静默的仪器不是证据。**

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
