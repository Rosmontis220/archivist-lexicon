import fs from "node:fs/promises";

const requiredFields = [
  "id",
  "title",
  "en",
  "department",
  "category",
  "date",
  "lead",
  "clearance",
  "abstract",
  "source",
];
const TRACE_KINDS = ["解谜链", "推断链", "定义出处"];
const REF_SITES = ["wiki", "archive", "archivist", "doc", "repo", "video"];
// 三维阵列每列 32 格、从第 12 格起排，因此一列最多容纳 20 份档案。
const MIN_PER_COLUMN = 8;
const MAX_PER_COLUMN = 20;
const isText = (value) => typeof value === "string" && value.trim().length > 0;

export function validateContent(content) {
  const errors = [];
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    throw new Error("档案数据必须是 JSON 对象。");
  }
  for (const key of ["categories", "columns"]) {
    const names = content[key];
    if (!Array.isArray(names) || names.length !== 5 || !names.every(isText)) {
      errors.push(`${key}：必须包含五个非空分类名称`);
    } else if (new Set(names).size !== 5 || names.includes("全部档案")) {
      errors.push(`${key}：分类名称不能重复，也不能使用“全部档案”`);
    }
  }
  const categories = Array.isArray(content.categories)
    ? content.categories
    : [];
  const columns = Array.isArray(content.columns) ? content.columns : [];
  if (
    categories.some((name) => !columns.includes(name)) ||
    columns.some((name) => !categories.includes(name))
  ) {
    errors.push("categories 与 columns 必须包含相同的五个分类（顺序可以不同）");
  }
  const records = Array.isArray(content.records) ? content.records : [];
  if (records.length === 0) errors.push("records：至少要有一份档案");
  const ids = new Set();
  records.forEach((record, index) => {
    const label = `records[${index}]`;
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      errors.push(`${label}：必须是档案对象`);
      return;
    }
    for (const key of requiredFields) {
      if (!isText(record[key])) errors.push(`${label}.${key}：必须是非空文本`);
    }
    const expectedId = `X-${String(index + 1).padStart(3, "0")}`;
    if (record.id !== expectedId)
      errors.push(`${label}.id：应为 ${expectedId}，编号须按顺序保持稳定`);
    if (ids.has(record.id)) errors.push(`${label}.id：重复编号 ${record.id}`);
    ids.add(record.id);
    if (!categories.includes(record.category))
      errors.push(`${label}.category：未知分类 ${record.category}`);
    if (
      !Array.isArray(record.findings) ||
      record.findings.length === 0 ||
      !record.findings.every(isText)
    ) {
      errors.push(`${label}.findings：必须包含至少一条非空研究记录`);
    }
    try {
      const url = new URL(record.source);
      if (!["https:", "http:"].includes(url.protocol)) throw new Error();
    } catch {
      errors.push(`${label}.source：必须是有效的 HTTP 或 HTTPS 链接`);
    }
    const trace = record.trace;
    if (!trace || typeof trace !== "object" || Array.isArray(trace)) {
      errors.push(`${label}.trace：必须给出推演链`);
    } else {
      if (!TRACE_KINDS.includes(trace.kind))
        errors.push(`${label}.trace.kind：须为 ${TRACE_KINDS.join(" / ")}`);
      if (!isText(trace.note))
        errors.push(`${label}.trace.note：必须说明这条链的性质`);
      if (
        !Array.isArray(trace.steps) ||
        trace.steps.length === 0 ||
        !trace.steps.every(
          (s) => s && isText(s.method) && isText(s.result),
        )
      ) {
        errors.push(`${label}.trace.steps：每一步都要有 method 与 result`);
      }
    }
    if (!Array.isArray(record.refs) || record.refs.length === 0) {
      errors.push(`${label}.refs：至少要给一个溯源入口`);
    } else {
      record.refs.forEach((ref, i) => {
        if (!ref || !REF_SITES.includes(ref.site))
          errors.push(`${label}.refs[${i}].site：未知站点 ${ref?.site}`);
        if (!isText(ref?.label))
          errors.push(`${label}.refs[${i}].label：必须是非空文本`);
        try {
          const url = new URL(ref?.url);
          if (!["https:", "http:"].includes(url.protocol)) throw new Error();
        } catch {
          errors.push(`${label}.refs[${i}].url：必须是有效的 HTTP 或 HTTPS 链接`);
        }
      });
    }
  });
  // 阵列每列从第 12 格开始排，一层共 32 格，可放 20 份；列太少或太多都会让导航跳空。
  for (const name of columns) {
    const count = records.filter((record) => record?.category === name).length;
    if (count < MIN_PER_COLUMN)
      errors.push(`分类“${name}”：至少要有 ${MIN_PER_COLUMN} 份档案`);
    if (count > MAX_PER_COLUMN)
      errors.push(`分类“${name}”：每列最多 ${MAX_PER_COLUMN} 份档案`);
  }
  if (errors.length)
    throw new Error(`档案数据校验失败：\n- ${errors.join("\n- ")}`);
  return content;
}

export async function loadContent() {
  return validateContent(
    JSON.parse(
      await fs.readFile(
        new URL("../content/archives.json", import.meta.url),
        "utf8",
      ),
    ),
  );
}

export function archiveText(r) {
  const trace = r.trace;
  const steps = trace.steps
    .map((s, i) => `${i + 1}. ${s.method}\n   → ${s.result}`)
    .join("\n");
  const refs = r.refs
    .map((ref) => `- [${ref.site.toUpperCase()}] ${ref.label}\n  ${ref.url}`)
    .join("\n");
  return `\uFEFFARCHIVIST · LEXICON
FILE ${r.id} / ${r.title}
${r.en}

归属：${r.department}
编目范围：${r.date}
相关人物：${r.lead}
访问范围：${r.clearance}

${r.abstract}

推演链（${trace.kind}）
${trace.note}

${steps}
${trace.open ? `\n未闭合：${trace.open}\n` : ""}
附注
${r.findings.map((f, i) => `${i + 1}. ${f}`).join("\n")}

溯源
${refs}

本文为基于公开材料的档案式改写，非游戏原文。
`;
}
