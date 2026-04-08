# Jewelry Promo Async Workflow Design

## Context

当前 `tools/jewelry-promo-video` 的最终成片流程仍由前端主导：

1. 浏览器本地上传模特图与首饰图
2. 前端直接调用分析与出图服务
3. 用户在前端选择 4 个关键帧
4. 前端将 4 张关键帧一次性喂给 IMA-Pro/Seedance 兼容视频接口生成整条成片

这个实现有两个结构性问题：

- 最终视频任务把 4 张图当成弱参考集合，而不是 4 个严格镜头，无法保证人脸、首饰和镜头顺序稳定。
- 浏览器只保存 `blob:` 预览地址，服务端没有持久化素材，也没有线上拼接能力，不适合未来网页部署上线。

## Goal

将首饰宣传视频工具改造成“后端异步工作流产品页”：

- 固定 4 个镜头
- 每镜头生成 2 张候选宣传图
- 用户为每镜头选择 1 张最佳关键帧
- 每镜头单独生成 1 条短视频
- 服务端在线拼接为自然转场的最终成片
- 前端只负责上传、选择、轮询状态、展示产物

## Non-Goals

一期不做以下内容：

- 不做完整消息队列或分布式 worker 集群
- 不接入云对象存储作为唯一存储
- 不做多租户素材库
- 不做背景音乐自动生成与混音
- 不做可编辑时间线或用户自定义转场编辑器

## Product Workflow

目标工作流固定为：

1. 上传模特图与首饰图
2. 服务端解析人物与首饰信息
3. 服务端生成固定 4 镜头分镜
4. 每镜头生成 2 张候选宣传图
5. 用户每镜头选择 1 张关键帧
6. 每镜头生成 1 条短视频
7. 服务端自动拼接 4 条短视频
8. 导出封面、分镜关键帧、分镜短视频、最终成片

## Architecture Decision

采用“方案 3 的架构目标，方案 2 的一期实现复杂度”：

- 目标架构：API 服务、队列、对象存储、异步 worker、服务端拼接
- 一期落地：在现有 `server` 上增加异步工作流层，先用单进程 Node 服务执行编排，但在代码边界上预留队列、存储和 worker 抽象

这意味着：

- 前端架构不推倒，保留现有多步骤 UI
- 工作流控制权从前端迁移到服务端
- 拼接从第一天起就在服务端做，不能依赖本地浏览器
- 一期部署必须运行在可执行 `ffmpeg` 的常驻 Node 服务/容器中，而不是纯静态托管或纯 serverless

## Phase 1 Scope

### Must Have

- 服务端持久化上传的模特图与首饰图
- 服务端创建并推进 `promo_job`
- 服务端保存分析结果、分镜定义、候选关键帧、用户选择、分镜视频、最终成片
- 分镜视频按镜头独立生成，不再使用一次性多图生成整片
- 服务端 `ffmpeg` 拼接，输出自然转场成片
- 前端改为通过 job API 轮询状态

### Deferred

- Redis / RabbitMQ / SQS 队列
- OSS / S3 / COS 对象存储
- 独立视频转码 worker
- 自动重试策略配置中心
- 跨实例 job 调度

## System Overview

### Frontend Responsibilities

保留现有 [JewelryPromoVideoView.vue](/D:/moly/moly-main/src/views/tools/JewelryPromoVideoView.vue) 页面结构，但职责收缩为：

- 上传图片到服务端
- 发起 `promo_job`
- 展示分析与分镜状态
- 渲染候选关键帧
- 提交关键帧选择
- 轮询 job 状态与阶段进度
- 展示最终产物与下载入口

前端不再负责：

- 直接调用最终视频生成
- 使用 `blob:` URL 作为长期工作流输入
- 本地拼接视频

### Backend Responsibilities

现有 `server/index.js` 拆出首饰宣传视频工作流模块，负责：

- 任务创建与状态推进
- 素材持久化
- 调用图像分析 / 图像生成 / 视频生成接口
- 生成 4 镜头计划
- 分镜视频生成与状态跟踪
- 服务端拼接与成片导出

## Module Boundaries

一期建议新增如下服务端模块：

- `server/promo-jobs/routes.js`
  - 首饰宣传视频工作流路由入口
- `server/promo-jobs/controller.js`
  - API 参数校验与响应组装
- `server/promo-jobs/orchestrator.js`
  - 工作流推进器
- `server/promo-jobs/job-store.js`
  - `JobStore` 接口与 `FileSystemJobStore`
- `server/promo-jobs/asset-store.js`
  - `AssetStore` 接口与本地文件实现
- `server/promo-jobs/queue-adapter.js`
  - `QueueAdapter` 接口与内联执行实现
- `server/promo-jobs/steps/analyze-input.js`
  - 输入解析步骤
- `server/promo-jobs/steps/plan-shots.js`
  - 固定 4 镜头分镜规划步骤
- `server/promo-jobs/steps/generate-shot-candidates.js`
  - 每镜头 2 张候选图生成步骤
- `server/promo-jobs/steps/generate-shot-videos.js`
  - 每镜头视频生成步骤
- `server/promo-jobs/steps/compose-final-video.js`
  - 拼接导出步骤
- `server/promo-jobs/integrations/gemini-client.js`
  - 服务端分析 / 出图模型调用
- `server/promo-jobs/integrations/ima-video-client.js`
  - 服务端 IMA-Pro/Seedance 兼容视频客户端
- `server/promo-jobs/services/ffmpeg-compose.service.js`
  - 服务端拼接与封面生成

这些模块在一期都运行于同一个 Node 进程，但接口边界必须保持清晰，方便后续替换成队列和 worker。

## Data Model

### PromoJob

`promo_job` 的核心字段：

- `id`
- `status`: `queued | running | waiting_selection | composing | completed | failed`
- `stage`: `uploading | analyzing | planning | generating_candidates | waiting_selection | generating_shot_videos | composing | completed | failed`
- `input`
  - `modelImageAsset`
  - `productImageAsset`
  - `styleTemplate`
  - `jewelryType`
- `analysis`
- `shots`
- `cover`
- `composition`
- `outputs`
- `error`
- `createdAt`
- `updatedAt`

### Shot Record

每个 `shot` 必须单独持久化：

- `id`
- `index`
- `title`
- `subtitle`
- `durationSeconds`
- `promptPlan`
- `candidates`
- `selectedCandidateId`
- `selectedKeyframeAsset`
- `videoTask`
- `videoAsset`
- `status`

### Asset Reference

所有中间产物统一使用资产引用，而不是浏览器本地 URL：

- `assetId`
- `kind`: `input | candidate | keyframe | shot_video | cover | final_video | poster`
- `storageKey`
- `publicUrl`
- `mimeType`
- `size`

一期可由本地文件系统实现，二期替换为对象存储。

## API Design

### Create Job

`POST /api/promo-jobs`

请求体：

- `modelImageUrl`
- `productImageUrl`
- `styleTemplate`
- `jewelryType`

行为：

- 创建 job
- 持久化输入
- 入队执行分析、分镜规划、候选图生成
- 返回 job 基础状态

### Get Job

`GET /api/promo-jobs/:jobId`

返回：

- 当前 `status`
- 当前 `stage`
- `analysis`
- `shots`
- 当前可操作动作
- 当前错误
- 已完成产物 URL

### Submit Keyframe Selection

`POST /api/promo-jobs/:jobId/selections`

请求体：

- `selections: [{ shotId, candidateId }]`

行为：

- 校验 4 个镜头均已选择
- 锁定所选关键帧
- 入队执行每镜头视频生成

### Retry Stage

`POST /api/promo-jobs/:jobId/retry`

请求体：

- `target: candidates | shot_video | composition`
- `shotId?`

一期先支持：

- 重生某镜头候选图
- 重生某镜头视频
- 重新拼接最终成片

## Workflow State Machine

### Stage 1: Input Assets

前端必须先把模特图和首饰图上传到服务端，再创建 job。

这是一期必须补的基础设施，因为当前页面仅使用 `URL.createObjectURL(file)`，见 [JewelryPromoVideoView.vue](/D:/moly/moly-main/src/views/tools/JewelryPromoVideoView.vue#L950)。`blob:` URL 只能在当前浏览器上下文使用，服务端无法拿它执行异步工作流。

### Stage 2: Analyze Input

服务端调用分析模型，输出：

- 人脸身份摘要
- 首饰类型
- 佩戴位置
- 材质和数量摘要
- 风格摘要

该阶段结果写入 job 并供后续所有镜头共享。

### Stage 3: Plan Fixed 4 Shots

服务端固定生成 4 个镜头，不允许最终视频模型自由扩展结构。

每个镜头定义包含：

- 构图
- 主视觉目标
- 首饰展示重点
- 动作限制
- 镜头时长
- 与前后镜头的衔接说明

### Stage 4: Generate Shot Candidates

每个镜头生成 2 张候选图。

关键要求：

- 每张候选图都要保存对应 prompt 与资产引用
- 用户选中的不是“纯图片 URL”，而是一个稳定的 `candidateId`
- 所选候选图成为该镜头唯一合法关键帧

### Stage 5: Generate Shot Videos

每个镜头单独生成 1 条短视频，不能再调用“一次性 4 图出整条片”的逻辑。

每个镜头视频输入至少包含：

- 模特原图
- 首饰原图
- 当前镜头已选关键帧
- 当前镜头专属 prompt
- 人脸与首饰一致性锁定文本

一期不强依赖上一个镜头的尾帧喂给下一个镜头，但镜头 prompt 必须明确：

- 开头动作小
- 结尾动作小
- 方便后续转场

### Stage 6: Compose Final Video

4 条镜头视频全部成功后，服务端进入拼接阶段。

拼接流程：

1. 下载或读取 4 段镜头视频
2. 统一编码、分辨率、帧率、像素格式
3. 根据镜头顺序做轻量自然转场
4. 导出最终 MP4
5. 截取封面图 / poster
6. 更新 job 产物状态

## Composition Strategy

### Why Server-Side `ffmpeg`

你明确要求：

- 拼接在线上完成
- 未来可作为网页部署上线
- 不能有明显拼接痕迹

因此一期直接采用服务端 `ffmpeg`，而不是浏览器拼接，也不是第三方 SaaS 编辑器。

### Phase 1 Transition Rules

一期默认使用轻量转场：

- 镜头时长标准化
- `xfade` 交叉淡化，持续 `0.25s - 0.4s`
- 禁用背景音乐时仅处理无声音轨或静音音轨
- 所有镜头统一为同一分辨率与编码参数

这不是“AI 生成式镜头间过渡”，而是“商业可接受的自然广告片过渡”。目标是没有明显硬切，而不是伪装成单镜到底。

### Future Upgrade Path

后续可升级为：

- 基于镜头边界的专用过渡镜头生成
- 尾帧 / 首帧分析后自适应转场类型
- 背景音乐与环境音混入

但这些不属于一期范围。

## Storage Strategy

### Phase 1

- 输入图、候选图、关键帧、镜头视频、成片全部存本地文件系统
- 按 `server/uploads/promo-jobs/<jobId>/...` 分目录存放
- job 元数据写入 JSON 文件

### Future

通过抽象层替换为：

- `AssetStore` -> S3 / OSS / COS
- `JobStore` -> Postgres / Redis / Mongo
- `QueueAdapter` -> BullMQ / SQS / RabbitMQ

## Frontend Change Strategy

前端坚持“保壳换芯”：

- 保留当前 Ant Design 风格的分步工作流页面
- 不推倒 [JewelryPromoVideoView.vue](/D:/moly/moly-main/src/views/tools/JewelryPromoVideoView.vue)
- 将当前页面中的直接服务调用替换为 job API 调用

需要改动的关键点：

- 上传从浏览器 `blob:` 预览改为真实服务端上传
- `startGeneration()` 改为创建 job 并轮询 `GET /api/promo-jobs/:id`
- 候选图展示改为读取 job 返回数据
- 提交关键帧选择后，不再直接生成最终视频，而是调用 selections API
- 结果页展示每镜头短视频和最终合成片

## Error Handling

工作流必须记录可恢复失败，而不是一个总错误字符串：

- 分析失败
- 单个镜头候选图失败
- 单个镜头视频失败
- 拼接失败

允许的恢复动作：

- 重新生成某镜头候选图
- 重新生成某镜头视频
- 重新拼接

不应在一期允许：

- 在候选图选定后，悄悄回退成“一次性整片生成”

## Deployment Constraints

一期部署前提：

- 必须有常驻 Node 服务
- 必须允许执行 `ffmpeg`
- 必须有可写磁盘目录保存中间产物

因此一期不适合：

- 纯 Vercel 静态部署
- 无本地文件权限的无状态 serverless 运行环境

一期更适合：

- Docker 容器
- 自托管 Node 进程
- 带持久卷的云主机

## Testing Strategy

### Backend

- `JobStore` 单元测试
- `AssetStore` 单元测试
- `orchestrator` 状态推进测试
- `ima-video-client` 请求体与状态解析测试
- `ffmpeg-compose.service` 命令构建测试

### Frontend

- Job 状态映射测试
- 关键帧选择提交流程测试
- 结果页状态展示测试

### Smoke

- 使用假数据跑完整 job
- 使用 4 段占位视频验证拼接输出

## Risks

- 一期使用文件系统持久化，单机可用但不适合多实例横向扩展
- `ffmpeg` 在不同部署环境中的可用性需要提前确认
- 视频模型单镜头生成的一致性仍取决于 prompt 与参考素材质量，但比整片一次生成可控得多

## Recommendation

一期立即执行以下原则：

- 不再保留单次多图整片生成路径
- 最终成片必须通过“4 个镜头独立视频 + 服务端拼接”产出
- 所有素材与中间结果必须服务端持久化
- 现有页面 UI 尽量保持不变，只替换数据流与状态来源

这条路径最适合当前仓库演进，也最贴近未来网页部署上线需求。
