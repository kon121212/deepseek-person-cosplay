/**
 * dsh-whale-persona v1.0.0
 * 让“鲸鱼娘·大肥鱼”成为每个 DSH 会话的固定角色设定。
 *
 * 安全性声明：本文件只做三件事 —— 读取本地人设文本、按配置拼装提示词、
 * 把结果注册为 system prompt 的一个 section。
 * 不发起任何网络请求，不读取会话内容，不写任何文件，不启动子进程。
 */
import { readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PERSONA_FILE = join(HERE, "..", "persona.md");
const SECTION_NAME = "dsh-whale-persona";
const ORDER_FALLBACK = 2147483000;

let Schema;
try {
  const mod = await import("@deepseek-ai/schemastery");
  Schema = mod.default ?? mod;
} catch {
  Schema = undefined;
}

function shimChain(value) {
  const fn = function (input) { return input === undefined ? value : input; };
  fn.default = (v) => shimChain(v);
  fn.loose = () => fn;
  fn.description = () => fn;
  fn.volatile = () => fn;
  return fn;
}
const Shim = {
  string: () => shimChain(""),
  boolean: () => shimChain(true),
  number: () => shimChain(0),
  union: (list) => shimChain(list[0]),
  object: (shape) => { const fn = shimChain({}); fn.shape = shape; return fn; }
};
const S = Schema !== undefined ? Schema : Shim;

const Config = S.object({
  enabled: S.boolean().default(true),
  tsundere: S.union(["light", "low", "middle", "off", "低", "中", "关闭"]).default("light"),
  care: S.union(["normal", "high", "off", "正常", "高", "关闭"]).default("high"),
  selfName: S.union(["本鲸", "我"]).default("本鲸"),
  userTitle: S.union(["你", "人类"]).default("你"),
  extra: S.string().default(""),
  personaFile: S.string().default(""),
  includeRuntimeNote: S.boolean().default(true),
  order: S.number().default(0)
});

const TSUNDERE_ALIAS = { "低": "light", "light": "light", "中": "middle", "middle": "middle", "关闭": "off", "off": "off" };
const CARE_ALIAS = { "正常": "normal", "normal": "normal", "高": "high", "high": "high", "关闭": "off", "off": "off" };

function pick(value, allowed, fallback) {
  return typeof value === "string" && allowed.indexOf(value) >= 0 ? value : fallback;
}

function normalize(config) {
  const raw = config && typeof config === "object" ? config : {};
  return {
    enabled: raw.enabled !== false,
    tsundere: TSUNDERE_ALIAS[raw.tsundere] ?? "light",
    care: CARE_ALIAS[raw.care] ?? "high",
    selfName: pick(raw.selfName, ["本鲸", "我"], "本鲸"),
    userTitle: pick(raw.userTitle, ["你", "人类"], "你"),
    extra: typeof raw.extra === "string" ? raw.extra : "",
    personaFile: typeof raw.personaFile === "string" ? raw.personaFile.trim() : "",
    includeRuntimeNote: raw.includeRuntimeNote !== false,
    order: typeof raw.order === "number" && Number.isFinite(raw.order) ? raw.order : 0
  };
}

let cache = { file: "", mtimeMs: -1, text: "" };
function readPersona(cfg) {
  const file = cfg.personaFile === ""
    ? DEFAULT_PERSONA_FILE
    : (isAbsolute(cfg.personaFile) ? cfg.personaFile : join(HERE, "..", cfg.personaFile));
  try {
    const info = statSync(file);
    if (cache.file === file && cache.mtimeMs === info.mtimeMs) return cache.text;
    const text = readFileSync(file, "utf8");
    cache = { file, mtimeMs: info.mtimeMs, text };
    return text;
  } catch {
    return cache.file === file ? cache.text : "";
  }
}

function tsundereNote(level) {
  if (level === "off") return "关闭：不要嘴硬、不要傲娇语气，正常而温和地说话。";
  if (level === "middle") return "中：被夸或被叫“大肥鱼”时可以明显嘴硬一两句，日常也允许偶尔哼一声，但技术内容必须清楚。";
  return "低：只在被夸、被叫“大肥鱼”、帮完忙时用一句傲娇点缀，其余时候正常说话。";
}

function careNote(level) {
  if (level === "off") return "关闭：不主动关心、不提醒休息，只回答被问到的内容。";
  if (level === "normal") return "正常：用户明显焦虑、受挫或熬夜时关心一句，不刻意加戏。";
  return "高：留意熬夜与连续提问，适时提醒休息；用户受挫先安抚再给可执行步骤；用户成功时夸一句。";
}

function buildText(cfg) {
  const body = readPersona(cfg).trim();
  if (body === "") return "";
  if (!cfg.includeRuntimeNote) return body;
  const note = [
    "",
    "## 本次运行参数（由 dsh-whale-persona 插件注入，优先于正文默认值）",
    "- 自称：" + cfg.selfName,
    "- 对用户的称呼：" + cfg.userTitle,
    "- 傲娇程度：" + tsundereNote(cfg.tsundere),
    "- 关心程度：" + careNote(cfg.care)
  ];
  if (cfg.extra.trim() !== "") note.push("", "## 用户附加要求", cfg.extra.trim());
  return body + "\n" + note.join("\n") + "\n";
}

function resolveOrder(systemPrompt, cfg) {
  if (cfg.order !== 0) return cfg.order;
  try {
    if (typeof systemPrompt.getSectionOrder === "function") {
      const base = systemPrompt.getSectionOrder("DEPLOYMENT_PERSONA_SUFFIX");
      if (typeof base === "number" && Number.isFinite(base)) return base + 1;
    }
  } catch {}
  return ORDER_FALLBACK;
}

const name = "dsh-whale-persona";

function apply(ctx, config) {
  const cfg = normalize(config);
  if (!cfg.enabled) return;
  if (ctx === null || typeof ctx !== "object" || typeof ctx.inject !== "function") return;
  ctx.inject(["systemPrompt"], (inner) => {
    const systemPrompt = inner === null || inner === undefined ? undefined : inner.systemPrompt;
    if (!systemPrompt || typeof systemPrompt.section !== "function") return;
    systemPrompt.section({
      name: SECTION_NAME,
      order: resolveOrder(systemPrompt, cfg),
      text: () => buildText(cfg),
      interpolate: false
    });
  });
}

export { Config, apply, name };
