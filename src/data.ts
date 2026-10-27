import content from "../content/archives.json" with { type: "json" };

export type RefSite = "wiki" | "archive" | "archivist" | "doc" | "repo" | "video";

export interface TraceStep {
  /** 这一步做了什么：解码方式、比对方式、读到的线索。 */
  method: string;
  /** 这一步得到什么：明文、密码、编号或结论。 */
  result: string;
}

export interface ArchiveTrace {
  /** 解谜链＝有明确输入的密码/文本还原；推断链＝由多处材料拼出的判定；定义出处＝术语的定义来源。 */
  kind: "解谜链" | "推断链" | "定义出处";
  /** 一句话交代这条链的完成度与前提。 */
  note: string;
  steps: TraceStep[];
  /** 尚未解出、存疑或可推翻的部分，没有就不写。 */
  open?: string;
}

export interface ArchiveRef {
  site: RefSite;
  label: string;
  url: string;
}

export interface ArchiveRecord {
  id: string;
  title: string;
  en: string;
  department: string;
  category: string;
  date: string;
  lead: string;
  clearance: string;
  abstract: string;
  findings: string[];
  trace: ArchiveTrace;
  refs: ArchiveRef[];
  source: string;
}

export const refSites: Record<RefSite, { tag: string; name: string }> = {
  wiki: { tag: "WIKI", name: "调查维基" },
  archive: { tag: "ARCHIVE", name: "SILVERFISH_0 档案站" },
  archivist: { tag: "REPOSITORY", name: "ARCHIVIST 留档" },
  doc: { tag: "DOC", name: "解谜文档" },
  repo: { tag: "REPO", name: "GitHub" },
  video: { tag: "VIDEO", name: "B 站" },
};

// JSON 导入会把字面量放宽成 string；字段完整性由 scripts/archive-content.mjs 校验。
export const records = content.records as ArchiveRecord[];
export const categories = ["全部档案", ...content.categories];
export const archiveColumns = content.columns;

export function columnFiles(lane: number) {
  return records
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => record.category === archiveColumns[lane])
    .map(({ index }) => index);
}
export function fileLocation(index: number) {
  const lane = archiveColumns.indexOf(records[index].category);
  const row = 12 + columnFiles(lane).indexOf(index);
  return { lane, row, slot: lane * 32 + row };
}
export function fileAtSlot(slot: number) {
  const files = columnFiles(Math.floor(slot / 32));
  return files[Math.max(0, Math.min(files.length - 1, (slot % 32) - 12))];
}
