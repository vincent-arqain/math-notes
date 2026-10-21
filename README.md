# 数学手记 · GitHub 公开书房

网站、字体、数学公式和附件全部托管在 GitHub。读者无需登录；站主通过 GitHub 登录管理。网页由 Pages 发布，大附件存放在 Releases，GitHub Actions 校验通过后自动更新网站。

部署目标：https://vincent-arqain.github.io/math-notes/

## 上传资料

总容量 **50 GB**，单个文件统一不超过 **500 MB**。单位采用十进制：1 MB = 1,000,000 字节，1 GB = 1,000,000,000 字节；恰好达到上限允许上传。

1. 打开网站底部“管理资料”，选择栏目、英语分类和文件，填写标题与简介。
2. 点击“检查容量并准备上传”。超出单文件限制、剩余空间不足或容量查询失败时，不会生成上传入口。
3. 点击“前往 GitHub 上传”。登录 GitHub 后，确认页面的标签、标题和资料说明；若说明未自动填入，点击书房中的“复制资料说明”后粘贴。
4. 在 GitHub 页面底部附件框选择刚才的同一个文件，等待上传完成，再点击 **Publish release**。保持正式发布状态，不选 Pre-release。
5. 在 **Actions → Publish mathematics website** 等待绿色成功标记，再刷新网站。资料会按说明中的栏目自动收录。

每次选择一份文件。PDF、Markdown、TXT、ZIP、RAR、7Z 都支持；文件保持原始字节，不压缩、不拆分、不解压。Releases 中的 Markdown/TXT 作为可下载的附件，网页正文请用“新建文章”编辑。新上传的大附件不会复制到 Pages 发布包，也不进入 Git 提交历史。

修改 Release 说明、发布或删除 Release 会触发更新。如果只改动附件后没有出现发布任务，请在 Actions 的该工作流中点击 **Run workflow** 手动更新。

网页文章继续保存在下列目录；管理页的“新建文章”会打开对应的 GitHub 编辑器：

| 目录 | 栏目 |
| --- | --- |
| `content/notes/` | 讲义 |
| `content/problems/` | 题库 |
| `content/essays/` | 随笔 |
| `content/books/` | 书架 |
| `content/papers/` | 论文 |
| `content/links/` | 链接，使用下述 Markdown 格式并填写 source_url |
| `content/english/` | 英语 |

现有 `content/` 附件继续使用原地址。GitHub 仓库的原生网页上传另有 25 MiB 平台限制，因此大文件必须使用上方 Releases 流程。搜索覆盖标题、简介、主题、标签、网址和网页正文，不搜索附件内文。

### 容量计算与发布校验

50 GB 统计当前 `content/` 资料（同一附件只计一次）以及本仓库全部 Releases 附件，包括保留的旧附件版本、未分类附件和草稿附件。Git 历史、网站程序、字体及 Actions 产物不属于此资料配额；这是书房的应用配额，不是 GitHub 账户硬配额。建议及时清理不再需要的 Release 附件；删除网页介绍不会自动释放附件空间。

管理页显示已用量、剩余容量，并在达到 40 GB 时提醒。上传前重新读取公开 Releases 数据，仓库资料与草稿使用最近成功发布的容量快照；草稿对匿名访客不可见，实时统计可能滞后。GitHub Actions 使用只读 `GITHUB_TOKEN` 完整遍历所有 Release 与附件分页，并重新检查 500 MB / 50 GB 上限。获取失败、任何文件超限或总量超限时停止发布，保留上一版网站。

GitHub 原生 Releases 上传不受网站控制，无法在 GitHub 平台层拦截超限上传。若绕过书房入口或并发上传导致超限，附件可能已保存在 GitHub，但书房不会更新；需在 Releases 删除超限附件并重新运行发布。检查流程不会擅自删除用户文件。

网站构建仅读取 Release 元数据，不下载大附件；下载链接使用 GitHub 实际返回的附件地址。Pages 发布包另设 900 MB 检查阈值，给 1 GB 平台上限留出余量。

### Release 资料说明格式

管理页会自动生成以下字段，`library: true` 用于识别资料。普通软件 Release 不生成文章，但其中的附件仍计入容量。

```yaml
---
library: true
section: books
category: ""
title: "资料标题"
description: "简介"
subject: ""
tags: []
---
可在这里写网页正文和数学公式。
```

一份 Release 可以包含多份附件，每份都独立遵守 500 MB 限制，并生成各自的资料入口。入口地址按附件 ID 生成，改标题不会改变地址；删除并重新上传附件会产生新地址。

**公开仓库里的全部文件和提交历史都可访问。草稿、私人文件、密码及密钥不要上传；即使从网页隐藏，也不能让仓库文件变成私有。** 已误传敏感资料时，仅删除最新版本不能清除历史。

## 写文章与公式

管理页的“新建文章”会打开 GitHub 编辑器。输入以 `.md` 结尾的文件名，填写文字后提交。格式如下（这段仅为格式说明，不会生成示例文章）：

```markdown
---
title: "文章标题"
description: "简介"
subject: "数学分析"
tags: [极限, 证明]
updated_at: "2026-10-12"
---

在这里写正文。行内公式写作 $a^2+b^2=c^2$。

$$
\sum_{k=1}^{n} k = \frac{n(n+1)}{2}
$$
```

可选字段：`source_url` 为完整的 HTTP/HTTPS 来源网址；`attachment` 为相对于 `content/` 的原始附件路径，例如 `notes/讲义.pdf`。附件必须已经存在，或与 Markdown 在同一次提交中上传。被引用的附件不会重复生成一篇文章。`created_at` / `updated_at` 未填写时使用文件最近 Git 提交日期。日期建议加双引号。

在 `content/links/` 新建 Markdown 时必须填写 `source_url`。站点不执行 Markdown 内的 HTML 和脚本。为保持原网站行为，Markdown 图片显示替代文字。

正文标题会生成可用于页内导航的锚点。例如 `## 细节题` 可用 `[细节题](#细节题)` 跳转。锚点保留中文、字母、数字、下划线与连字符，英文转小写，删除其他标点，空白改为连字符；同页重复标题按顺序加 `-1`、`-2` 等后缀以避免冲突；页面保留 `main` 供“跳到正文”链接使用，同名标题会从 `main-1` 开始。使用标准 Markdown 链接即可，无需写 HTML。`npm run verify` 会同时检查本地 HTML 链接的锚点是否存在。

在 GitHub 中打开 `.md` 文件并点击铅笔可修改。移动或重命名文件会改变网页地址。删除资料并成功发布后，网站入口和网站地图会移除它；GitHub 提交历史仍保留，可在 GitHub 恢复。

题库专题可以使用独占一行的二级标题，例如 `## 2020S17`。题库与搜索结果会自动显示这些题号的页内直达链接（识别 `20` 开头的四位年份、`A` 或 `S`、两位序号）；代码块中的示例标题会被忽略。将简写题号（如 `20S17`）写入正文即可沿用全文搜索，不会拆分成重复条目。

总专题可在 `category: reading-types` 下添加 `reading_topics` 数组，填写实际涵盖的子分类（例如 `[reading-types/detail, reading-types/inference]`）。正文必须有对应中文二级标题（如 `## 细节题`、`## 推理题`）。文章会在这些子分类中显示，并提供直达章节的链接；未声明的分类不会因标签文字相同而自动收录。构建验证会检查章节链接目标。

## 首页内容选取

首页先按栏目展示近期内容：数学讲义、题库各取最近两篇；英语取最近三个不同一级分类中的最新一篇，阅读题型的子分类合并计为一类。栏目没有内容时显示真实空状态，不借用其他栏目的文章填充。

下方“最近更新”仍展示全站最新六篇。两处都沿用真实更新时间降序、同时间按文章 ID 升序的规则，不修改文章日期。首页另有论文与研究、高等代数专题及英语写作、阅读题型、熟词生义入口；栏目和全站搜索继续收录全部资料。栏目精选在窄屏下按讲义、题库、英语顺序显示。

## 英语目录

目录与分类一致：`exams`（考研真题）、`vocabulary`（熟词生义）、`sentences`（长难句）、`writing`（作文模板）、`translation`（翻译技巧）、`reading-logic`（阅读逻辑）、`reading-types`（阅读题型分类）。

七种阅读题型位于 `content/english/reading-types/` 下：`detail`、`main-idea`、`inference`、`meaning`、`attitude`、`example`、`structure`，对应细节题、主旨题、推理题、词义句意题、作者态度题、例证题、篇章结构题。放在 `content/english/` 根目录的文件为待分类；Markdown 也可用 `category` 字段指定同名分类。

## 自动发布与本机检查

GitHub 仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。推送到 main，或发布、编辑、删除 Release，会运行检查、内容与容量测试、构建、链接验证，全部成功后才发布；失败会保留上一个成功版本。在 Actions 查看错误，修正资料并再次提交即可。

本机使用 Node.js 22.13 或更新版本，并安装 XeLaTeX、standalone/AMS 宏包和 Poppler（pdftocairo、pdffonts）；构建需要访问 GitHub API，本机未配置 `GITHUB_TOKEN` 时只能统计公开 Releases（页面会显示核对范围）。Actions 已配置只读令牌用于完整发布校验：

```sh
npm ci
npm run check
npm test
npm run build
npm run verify
npm run preview
```

预览：http://127.0.0.1:4178/math-notes/ 。发布只上传 `dist/`，不依赖本机电脑持续运行。

`site.config.json` 集中配置仓库和网址。首页、栏目、文章均预先生成完整 HTML；搜索在浏览器内进行。`robots.txt` 和 `sitemap.xml` 随构建生成，搜索与管理页为 noindex。搜索引擎收录由搜索引擎决定，GitHub Pages 无法保证所有网络均可访问。

## 字体与内容

保留纯白阅读背景。中文正文使用 Fandol 宋体，标题使用其真实粗体，英文使用 Times New Roman。可见数学公式由 XeLaTeX 使用原版 Computer Modern / AMS 字体排版，转换为矢量 SVG；KaTeX 仅提供辅助阅读的 MathML。正文与公式不使用描边、阴影或人工加粗。

Fandol 字体随站部署，原始 OTF 位于 `assets/fonts/fandol/`，网页使用同一字体的 WOFF2 编码；许可证为带字体嵌入例外的 GPL-3.0，见 `public/fonts/fandol/COPYING`。公式以内容和排版器版本缓存到忽略的 `.latex-cache/`，发布只复制本次实际用到的公式。编译禁止 shell、文件读取命令和宏定义；公式编译错误会阻止发布。

Debian / Ubuntu 可用 `sudo apt-get install texlive-xetex texlive-latex-extra texlive-fonts-recommended poppler-utils poppler-data` 安装构建工具。GitHub Actions 已执行相同安装，并缓存公式以加快后续发布。打印版使用 A4 纸、25 mm 页边距、12pt 正文和 1.5 倍行距。附件与外部资料的使用条件以原作者和来源说明为准。

此目录不包含原 Sites 的数据库、R2 数据、草稿或本机私有资料。2026-10-12 迁移时，原站公开网站地图没有文章条目，因此初始目录保留真实空状态。
