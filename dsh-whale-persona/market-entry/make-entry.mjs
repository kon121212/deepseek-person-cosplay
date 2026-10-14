#!/usr/bin/env node
/**
 * 生成 DSH 插件市场条目文件：<owner>__<repo>.yml
 *
 * 用法：
 *   node make-entry.mjs <你的GitHub用户名> [仓库名=dsh-whale-persona] [category=identity]
 *
 * 生成的文件在 ./data-plugins/ 下，把它复制到 awesome-dsh-plugin 仓库的 data/plugins/ 即可。
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const [owner, repoArg, categoryArg] = process.argv.slice(2)
if (!owner) {
  console.error('用法: node make-entry.mjs <GitHub用户名> [仓库名] [category]')
  process.exit(1)
}
const repo = repoArg || 'dsh-whale-persona'
const category = categoryArg || 'identity'
if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(owner)) {
  console.error('GitHub 用户名格式看起来不对: ' + owner)
  process.exit(1)
}
if (!/^[A-Za-z0-9._-]+$/.test(repo)) {
  console.error('仓库名格式看起来不对: ' + repo)
  process.exit(1)
}
const ALLOWED = ['agi','ui','usage','theme','model','identity','session','memory','tools','wsl','browser','vision','voice','docs','skill','workflow','git','notify','dev','security','remote','market','fun']
if (!ALLOWED.includes(category)) {
  console.error('category 不在允许列表内: ' + category)
  console.error('可选: ' + ALLOWED.join(' '))
  process.exit(1)
}

const en = 'Injects a fixed character persona into the system prompt of every session, with adjustable tsundere level, care level, self name and user title. The persona text is read from a local Markdown file and the plugin makes no network requests.'
const zh = '为每个会话的 system prompt 注入固定角色人设，可调傲娇程度、关心程度、自称与对用户的称呼。人设文本取自本地 Markdown 文件，插件不发起任何网络请求。'
const yaml = [
  'url: https://github.com/' + owner + '/' + repo,
  'name: ' + owner + '/' + repo,
  'category: ' + category,
  'description:',
  '  en: ' + JSON.stringify(en),
  '  zh: ' + JSON.stringify(zh),
  ''
].join('\n')

const outDir = join(dirname(fileURLToPath(import.meta.url)), 'data-plugins')
mkdirSync(outDir, { recursive: true })
const file = join(outDir, owner + '__' + repo + '.yml')
writeFileSync(file, yaml, 'utf8')
console.log('已生成: ' + file)
console.log('请复制到 awesome-dsh-plugin 仓库的 data/plugins/ 目录（文件名保持不变）。')
