/**
 * Host half of the `dsh-evidence-discipline` bundle.
 *
 * ⚠️ 关键认知（v1 的错就在这）：技能**不是**靠 package.json 的 exports 被动扫描，
 *    而是插件代码在 apply 时**主动注册**到 `skills` 服务：
 *        ctx.inject(["skills"], (c) => { c.skills.registerProvider(...) });
 *    注册形状照抄已在本运行时验证可用的 @changfenhuang/dsh-genui
 *    （lib/index.js:4310-4370），只替换名字与内容。
 *
 * 用 provider 路径而非 skills.register()，是为了让 source=bundled 拿到 bundled 优先级。
 */
import { readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const name = 'dsh-evidence-discipline';

const PROVIDER = 'dsh-evidence-discipline';
const SKILL_NAME = 'evidence-discipline';
const SKILL_RANK = 600;
const INVOCATION = { modelInvocable: true, userInvocable: true };

/** SKILL.md 在包根；本模块位于 lib/，故取 ../SKILL.md（同 genui 的路径约定）。 */
function skillPath() {
  const moduleDirectory = dirname(fileURLToPath(new URL(import.meta.url)));
  return basename(moduleDirectory) === 'plugin'
    ? resolve(moduleDirectory, '../../SKILL.md')
    : resolve(moduleDirectory, '../SKILL.md');
}

/**
 * 解析 YAML frontmatter，让 SKILL.md 成为 name/description 的**单一来源**，
 * 避免描述在两处漂移（描述是技能的触发面，漂移会直接影响能不能被唤起）。
 */
function parseSkill(raw, path) {
  const end = raw.indexOf('\n---\n', 4);
  if (!raw.startsWith('---\n') || end < 0) {
    throw new Error('evidence-discipline SKILL.md has invalid frontmatter: ' + path);
  }
  const frontmatter = raw.slice(4, end);
  const grab = key => {
    const m = frontmatter.match(new RegExp('^' + key + ':\\s*(.*)$', 'm'));
    if (!m) return '';
    return m[1].trim().replace(/^["']/, '').replace(/["']$/, '');
  };
  const parsedName = grab('name');
  let description = grab('description');
  if (!parsedName) throw new Error('evidence-discipline SKILL.md has no frontmatter name: ' + path);
  if (!description) throw new Error('evidence-discipline SKILL.md has no frontmatter description: ' + path);
  if (description.length > 1024) description = description.slice(0, 1021) + '...';
  return { name: parsedName, description, body: raw.slice(end + 5) };
}

function bundledSkillProvider() {
  const path = skillPath();
  const raw = readFileSync(path, 'utf8');
  const { name: parsedName, description, body } = parseSkill(raw, path);
  const summary = {
    name: parsedName,
    description,
    invocation: INVOCATION,
    source: 'bundled',
    provider: PROVIDER,
    path,
    resourceBase: { kind: 'directory', path: dirname(path) },
    rank: SKILL_RANK,
    locator: path
  };
  return {
    name: PROVIDER,
    list: () => Promise.resolve([summary]),
    get: () => Promise.resolve({ ...summary, content: body })
  };
}

export function apply(ctx) {
  ctx.inject(['skills'], skillCtx => {
    skillCtx.skills.registerProvider(() => bundledSkillProvider());
  });
}

export { bundledSkillProvider, parseSkill, SKILL_NAME, PROVIDER };
