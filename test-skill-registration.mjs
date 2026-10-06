/**
 * 离线单测：模拟 cordis 的 apply(ctx)，确认 provider 注册成功且返回结构合法。
 * 不需要 DSH 运行时，直接 `node test-skill-registration.mjs` 即可。
 *
 * 这验证的是「插件代码是否正确地把自己注册给 skills 服务」；
 * 它**不**验证宿主进程是否真的加载了这个插件（那需要重启后看技能是否出现）。
 */
import { apply } from './lib/index.js';

let provider;
const ctx = {
  inject(deps, cb) {
    if (!deps.includes('skills')) throw new Error('unexpected deps: ' + JSON.stringify(deps));
    return cb({
      skills: {
        registerProvider(create) {
          provider = create({ signal: undefined, invalidate() {} });
          return () => {};
        }
      }
    });
  }
};

apply(ctx);
if (!provider) throw new Error('FAIL: provider 没有被注册');

const list = await provider.list({});
if (!Array.isArray(list) || list.length !== 1) throw new Error('FAIL: list() 应返回 1 个候选');
const c = list[0];

console.log('provider.name      =', provider.name);
console.log('candidate.name     =', c.name);
console.log('candidate.source   =', c.source);
console.log('candidate.provider =', c.provider);
console.log('candidate.rank     =', c.rank);
console.log('resourceBase       =', JSON.stringify(c.resourceBase));
console.log('description        =', c.description.slice(0, 70) + '...');

const got = await provider.get(c, {});
console.log('definition.name    =', got.name);
console.log('body length        =', got.content.length);
console.log('body 含 frontmatter =', got.content.startsWith('---'), '(必须为 false)');

// SkillSummary 必填字段
for (const k of ['name', 'description', 'invocation', 'source', 'provider']) {
  if (got[k] === undefined) throw new Error('FAIL: 缺少 SkillSummary 必填字段 ' + k);
}
if (c.name !== 'evidence-discipline') throw new Error('FAIL: 技能名不是 evidence-discipline');
if (!got.description || got.description.length < 10) throw new Error('FAIL: 描述未从 frontmatter 解析出来');
if (got.content.startsWith('---')) throw new Error('FAIL: body 仍带 frontmatter');
if (!got.content.includes('证据层级')) throw new Error('FAIL: body 内容不对');

console.log('\nALL CHECKS PASSED');
