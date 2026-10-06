/**
 * 兼容 shim。
 *
 * 真正的实现在 lib/index.js（package.json 的 main / exports["."] 指向它）。
 * 保留本文件是为了覆盖一种缓存情形：若运行时在首次安装时已缓存了本包的入口路径
 * `index.js`，删除它会导致重新导入失败；这里转发一次即可让两种解析都指向同一实现。
 */
export { apply, name, bundledSkillProvider, parseSkill } from './lib/index.js';