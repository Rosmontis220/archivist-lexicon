# 维护词条

[`archives.json`](archives.json) 是页面与 TXT 下载共用的词条数据。改词条不必碰 TypeScript；`src/data.ts` 只保留类型和三维阵列的位置映射。

## 文件结构

- `categories`：检索筛选器的五个分类，按显示顺序排列。「全部档案」由界面添加，无需填写。
- `columns`：三维阵列从左到右的五个分类。与 `categories` 包含相同名称，顺序可以不同。
- `records`：词条本体。编号一经发布就不再改动，新增词条接在编号末尾（当前到 `X-052`）。每个分类至少八条、最多二十条——阵列每列 32 格、从第 12 格起排，所以一列放不下超过二十份。同分类在数组中的顺序决定列内顺序。

| 字段                        | 内容                                                       |
| --------------------------- | ---------------------------------------------------------- |
| `id`                        | 稳定编号，用于收藏、定位和下载文件名                       |
| `title`、`en`               | 词条名、英文或原文写法                                     |
| `department`、`category`    | 资料归属、所属分类；分类须与上面的名称完全一致             |
| `date`、`lead`、`clearance` | 出处、相关词条、重要度；`CORE` / `KEY` / `NOTE` 三档       |
| `abstract`                  | 一句话定义                                                 |
| `findings`                  | 至少一条附注（词源、辨析、常见误读），使用字符串数组       |
| `trace`                     | 推演链，见下                                               |
| `refs`                      | 溯源入口，至少一条 `{ site, label, url }`                  |
| `source`                    | 兜底参考链接，完整的 HTTP 或 HTTPS 链接                    |

### trace：推演链

`trace.kind` 只有三种，按材料的实际情况选，不要为了好看都写成解谜链：

- **解谜链**：有明确输入，经过具体步骤还原出明文或密码。`steps` 按执行顺序写，每步 `method` 写用了什么方法或线索，`result` 写得到什么。
- **推断链**：由多处材料互相印证得出的判定，不含密码还原。写清每一步拿什么材料、比出什么。
- **定义出处**：术语的定义来源，材料里没有对应的还原过程。写清定义出现在哪一处、被哪些例子支撑。

`note` 一句话交代这条链的完成度与前提。`open` 可选，写尚未解出、存疑或可推翻的部分；没有就不要写——不要用「待补充」占位。

`steps[].method` 与 `steps[].result` 都必填。宁可步骤少而实，也不要为了凑数把一句话拆成三步。

### refs：溯源入口

每条至少一个入口，指向该词条原始材料所在的模块。`site` 只能是 `wiki`（xikmwiki）、`archive`（SILVERFISH_0 档案站）、`archivist`（ARCHIVIST 留档）、`doc`（腾讯文档）、`repo`（GitHub）、`video`（B 站）。`label` 写模块名而非站点名，例如「WEST · 解谜链」比「调查维基」有用。

界面按 `wiki → archive → archivist → doc → repo → video` 排序展示，顺序不用手写。

以上字段均必填，文本不能只包含空白。所有内容按纯文本显示，不支持 Markdown 或 HTML；引号按 JSON 规则写为 `\"`，换行写为 `\n`。页面会转义 HTML 特殊字符，TXT 下载保留原文。`source` 与 `refs[].url` 必须是可访问的链接，校验会拒绝相对路径。

## 修改与验证

1. 编辑 JSON 中对应词条的字段。改分类名时，同时更新 `categories`、`columns` 和各条 `category`。补新词条时，`trace` 与 `refs` 必须一起写——界面上的「推演」「溯源」两个面板直接读这两个字段，缺一个就会在读面板时空白。
2. 执行 `npm run export:archives`，校验数据并更新 `public/archives/` 中的下载文件。校验失败时不会写入任何下载文件。
3. 执行 `npm run check:content` 检查校验规则与下载一致性，再运行 `npm run build` 验证构建。将 JSON 与更新后的 TXT 一起提交。
4. 在 `npm run dev` 中查看标题、详情、检索和下载结果，尤其检查长词条名与较长正文的实际布局。

`npm run dev` 启动前和 `npm run build` 构建前都会自动校验并导出。开发服务器运行期间，JSON 修改会更新页面；下载文件需再次执行 `npm run export:archives` 或重启开发服务器。

当前五列、每列八条与阵列布局相连。校验会拒绝增减条目或改变分类数量；调整这些数量需要另行修改阵列逻辑。不要靠交换或重编号来调整顺序，已有收藏会随之指向别的内容。

界面骨架来自 [RhineLabUI](https://github.com/LBEILC/RhineLabUI)（MIT）。内容分离的做法参考其 [PR #3](https://github.com/LBEILC/RhineLabUI/pull/3)。
