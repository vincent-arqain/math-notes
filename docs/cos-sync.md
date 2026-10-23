# COS 增量同步与失败诊断

首次失败记录：[Actions run 39963059967](https://github.com/vincent-arqain/math-notes/actions/runs/39963059967/job/120445728598)。第 13 步从 13:41:34 运行到 14:19:32，约 37 分 58 秒。

当时使用 Ubuntu 软件源中的 rclone 1.60.1，通过 S3 兼容接口和 `TencentCOS` provider 上传。COS 对以下四个文件反复返回 **HTTP 400 `UserNetworkTooSlow: User network is too slow`**：

- `files/papers/21-7_中文译文全集.zip`
- `files/books/数学分析技巧选讲 (楼红卫) (Z-Library).pdf`
- `fonts/fandol/FandolSong-Regular.woff2`
- `fonts/fandol/FandolSong-Bold.woff2`

日志明确记录了 `Attempt 1/3`、`2/3`、`3/3`。原命令未覆盖 rclone 的默认连接超时 1 分钟、I/O 空闲超时 5 分钟、任务尝试 3 次、底层重试配置 10。底层重试的实际次数没有出现在原日志中，不能据此断言每轮都重试了 10 次。空闲超时也不能限制一直有少量数据传输的文件总耗时，因此慢上传叠加多轮尝试会拖长任务。

原来的 `sync --checksum` 已按大小和 MD5 跳过相同文件，并默认使用 4 路文件传输；`sync` 不等于全量重传。默认 NOTICE 日志隐藏了成功文件和 DEBUG 级的底层重试。Secrets 检查只验证存在性和格式，build/verify 只证明本地产物通过检查，均不能证明上传链路正常。这次错误明确来自 COS 的慢上传响应，现有日志不足以确定公网链路的具体瓶颈。

## 安装阶段的慢下载

旧运行记录删除后，重新执行 main 的 [run 39975406536](https://github.com/vincent-arqain/math-notes/actions/runs/39975406536)。本次尚未进入测试、构建或 COS 上传：APT 索引约 4 秒完成，但 `azure.archive.ubuntu.com` 的 HTTP 软件包下载约为 60 kB/s；仅 16.5 MB 的 rclone 包就从 15:09:26 UTC 下载到 15:14:12 UTC。安装运行超过 10 分钟后主动取消，桶内对象未因本次运行发生变化。此前成功的 Pages 工作流中，同类 TeX 安装约需 77 秒。

COS 工作流现将 Ubuntu Azure HTTP 镜像替换为 Ubuntu 官方 `https://archive.ubuntu.com/ubuntu`，保留发行版、组件和软件包签名校验。仅处理 runner 的 APT 源文件和镜像列表，不修改仓库的依赖版本。APT 连接/空闲超时为 20 秒，最多重试 2 次；整个安装步骤另设 **5 分钟硬上限**，持续但过慢的下载也不能无限等待。安装失败或超时会阻止后续上传。

## 当前同步行为

工作流调用 `npm run sync:cos`，由 `scripts/sync-cos.ts` 安排增量同步，继续使用原有四项 Secrets。rclone 负责清单、小文件和删除；大文件由 `scripts/cos-upload.ts` 使用 COS 原生分片 API 上传。

1. 读取本地文件和桶内对象的大小、MD5，忽略构建时间和对象修改时间。只把新增、大小变化、MD5 变化的文件放进上传队列。远端缺少可用 MD5 时上传一次，建立可用于下次比较的校验信息；不会按大小相同就跳过。
2. 默认最多同时上传 **8 个文件**。1 MiB 及以上文件采用 COS 原生 **1 MiB 分片**，每个文件最多并发上传 8 个分片；小文件沿用 rclone 普通上传。每片通过 Content-MD5 校验，合并后核对对象大小与 MD5 元数据；写入与 rclone 兼容的 `md5chksum` 元数据，使后续清单可比较完整文件 MD5。普通失败会中止未完成分片任务。
3. 每个文件的**每次完整尝试最多 120 秒**，到时直接终止该 rclone 进程；每文件最多 **3 次尝试（首次加 2 次重试）**。连接超时 10 秒，I/O 空闲超时 30 秒。目录清单操作也有 120 秒期限及最多 3 次尝试，整个 Actions 同步步骤另有 15 分钟上限。
4. `--retries 1` 禁止 rclone 整轮重跑；`--low-level-retries 0` 禁止其 S3 AWS SDK 隐藏重试（该配置为 1 时 SDK 仍可重试一次）。原生请求仅使用锁定版本的官方 Node SDK 计算签名，HTTP 请求由 fetch 执行，不进入 SDK 重试循环；请求上限 90 秒，110 秒触发清理，清理最多 5 秒，父进程仍执行 120 秒硬上限。实时转发操作日志与 DEBUG 中的 pacer/重试诊断，过滤 DEBUG 配置行，并在输出及错误缓存前脱敏凭据；不启用 HTTP 请求头或请求体转储。
5. 每次操作开始都打印文件名、尝试次数和期限。每次失败立即输出含文件名和具体错误的 Actions warning/error，再决定是否重试该文件。某文件耗尽尝试后停止领取新文件，等待已经开始的其他文件结束，任务以非零退出。
6. 全部上传成功后才删除桶内多余对象，包括旧配置排除的 `.git/**`、`tauri/**`、`.github/workflows/**`，保留原来的桶根目录镜像语义。清单失败、清单格式无效、缺少非空 `index.html` 或上传失败时均不执行删除。删除操作同样受并发、期限和尝试次数限制。

`copyto --ignore-times` 仅作用于清单比较后选出的新增/变化文件，保证远端缺少校验值时不会退回按大小跳过；它不作用于整个 `dist/`。所有凭据仍通过工作流环境变量传入，不落盘。

工作流可通过 `COS_UPLOAD_CONCURRENCY`、`COS_FILE_TIMEOUT_SECONDS`、`COS_MAX_ATTEMPTS` 调整默认值，必须为正整数。

## 合并后验证

合并到 main 会自动触发同步。也可以在 Actions → **Sync website to Tencent COS** → **Run workflow** 选择 main。重新运行旧的失败 run 会沿用旧提交，无法验证本次修改。

- 查看 `PLAN upload=…, unchanged=…, delete-after-upload=…`，确认此前已成功上传且内容相同的文件被跳过。
- 成功文件显示 `UPLOADED "文件名"`，最后显示 `DONE uploaded=…, unchanged=…, deleted=…`。
- 如果慢网络继续出现，应立即看到对应文件和 `UserNetworkTooSlow` 或明确的 120 秒超时；同一文件最多出现三次尝试，失败时不清理旧对象。超时限制缩短失败等待，并发与分片也不能保证消除公网链路问题。
- 对同一份 `dist/` 再同步应无文件上传。重新 build 后，`storage.json` 中的校验时间通常会更新；该文件再次上传属于正常增量。

本地回归测试使用模拟远端和真实子进程，覆盖大小/MD5 比较、同大小修改、重复同步、并发上限、逐文件有限重试、实时错误、持续活动传输的硬超时、日志脱敏、中文文件名跨输出分块、失败禁止删除。无需 COS 凭据，也不会访问真实桶：

```sh
npx tsx --test scripts/sync-cos.test.ts
```
