# Jewelry Promo Async Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `tools/jewelry-promo-video` from a frontend-driven one-shot generation flow to a server-driven async workflow that generates 4 shot videos and composes the final video on the server.

**Architecture:** Keep the existing Vue page shell, but move orchestration into `server/promo-jobs/*`. Phase 1 runs everything inside the current Node server with filesystem-backed job and asset persistence plus server-side `ffmpeg` composition, while preserving queue/store abstractions for later worker and object-storage migration.

**Tech Stack:** Vue 3, TypeScript, existing Gemini/IMA-Pro integrations, Express 5, Node built-in `fetch`, Node built-in test runner, local filesystem storage, `ffmpeg` on the server host.

**Git Note:** `master` currently has no initial commit in this workspace. Skip task-level commits until the repository is initialized; keep changes scoped and reviewable per task.

---

### Task 1: Extract Server Promo Job Foundations

**Files:**
- Create: `D:\moly\moly-main\server\promo-jobs\job-store.js`
- Create: `D:\moly\moly-main\server\promo-jobs\asset-store.js`
- Create: `D:\moly\moly-main\server\promo-jobs\queue-adapter.js`
- Create: `D:\moly\moly-main\server\promo-jobs\types.js`
- Create: `D:\moly\moly-main\server\promo-jobs\__tests__\job-store.test.mjs`
- Modify: `D:\moly\moly-main\server\index.js`

- [ ] **Step 1: Write the failing tests for filesystem-backed job persistence**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createFileSystemJobStore } from '../job-store.js'

test('job store persists and reloads promo jobs by id', async () => {
  const rootDir = mkdtempSync(join(tmpdir(), 'promo-job-store-'))
  const store = createFileSystemJobStore({ rootDir })

  await store.save({
    id: 'job_123',
    status: 'queued',
    stage: 'uploading',
    shots: [],
  })

  const reloaded = await store.get('job_123')
  assert.equal(reloaded.id, 'job_123')
  assert.equal(reloaded.stage, 'uploading')
})

test('job store updates stage transitions without losing nested shot data', async () => {
  const rootDir = mkdtempSync(join(tmpdir(), 'promo-job-store-'))
  const store = createFileSystemJobStore({ rootDir })

  await store.save({
    id: 'job_456',
    status: 'running',
    stage: 'waiting_selection',
    shots: [{ id: 'shot-1', status: 'ready', candidates: [{ id: 'c1' }] }],
  })

  await store.update('job_456', {
    stage: 'generating_shot_videos',
    shots: [{ id: 'shot-1', status: 'rendering', candidates: [{ id: 'c1' }] }],
  })

  const reloaded = await store.get('job_456')
  assert.equal(reloaded.stage, 'generating_shot_videos')
  assert.equal(reloaded.shots[0].status, 'rendering')
  assert.equal(reloaded.shots[0].candidates[0].id, 'c1')
})
```

- [ ] **Step 2: Run the tests to verify they fail because the store module does not exist**

Run: `node --test server/promo-jobs/__tests__/job-store.test.mjs`

Expected: FAIL with module resolution errors for `job-store.js`

- [ ] **Step 3: Add the core promo job type helpers**

```js
export const PROMO_JOB_STAGES = [
  'uploading',
  'analyzing',
  'planning',
  'generating_candidates',
  'waiting_selection',
  'generating_shot_videos',
  'composing',
  'completed',
  'failed',
]

export function createPromoJobRecord(input) {
  return {
    id: input.id,
    status: 'queued',
    stage: 'uploading',
    input: input.payload,
    analysis: null,
    shots: [],
    cover: null,
    composition: null,
    outputs: {},
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
```

- [ ] **Step 4: Implement the filesystem job store and local asset store**

```js
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

function jobFile(rootDir, jobId) {
  return join(rootDir, `${jobId}.json`)
}

export function createFileSystemJobStore({ rootDir }) {
  return {
    async save(job) {
      await mkdir(rootDir, { recursive: true })
      await writeFile(jobFile(rootDir, job.id), JSON.stringify(job, null, 2), 'utf8')
      return job
    },
    async get(jobId) {
      const raw = await readFile(jobFile(rootDir, jobId), 'utf8')
      return JSON.parse(raw)
    },
    async update(jobId, patch) {
      const current = await this.get(jobId)
      const next = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      }
      await this.save(next)
      return next
    },
  }
}
```

- [ ] **Step 5: Add a minimal inline queue adapter interface**

```js
export function createInlineQueueAdapter() {
  return {
    async enqueue(taskName, handler) {
      return await handler()
    },
  }
}
```

- [ ] **Step 6: Wire the new module roots into `server/index.js` without changing routes yet**

```js
import { createFileSystemJobStore } from './promo-jobs/job-store.js'
import { createLocalAssetStore } from './promo-jobs/asset-store.js'
import { createInlineQueueAdapter } from './promo-jobs/queue-adapter.js'

const promoJobStore = createFileSystemJobStore({ rootDir: join(UPLOAD_DIR, 'promo-jobs', 'jobs') })
const promoAssetStore = createLocalAssetStore({ rootDir: join(UPLOAD_DIR, 'promo-jobs', 'assets') })
const promoQueue = createInlineQueueAdapter()
```

- [ ] **Step 7: Run the tests to verify the store passes**

Run: `node --test server/promo-jobs/__tests__/job-store.test.mjs`

Expected: PASS, 2 tests passing

### Task 2: Add Promo Job API Surface and Input Asset Persistence

**Files:**
- Create: `D:\moly\moly-main\server\promo-jobs\routes.js`
- Create: `D:\moly\moly-main\server\promo-jobs\controller.js`
- Create: `D:\moly\moly-main\server\promo-jobs\__tests__\controller.test.mjs`
- Modify: `D:\moly\moly-main\server\index.js`
- Modify: `D:\moly\moly-main\src\views\tools\JewelryPromoVideoView.vue`

- [ ] **Step 1: Write the failing controller test for job creation**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import request from 'supertest'

import { createPromoJobRouter } from '../routes.js'

test('POST /api/promo-jobs creates a job from persisted image URLs', async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/promo-jobs', createPromoJobRouter({
    createJob: async (payload) => ({ id: 'job_123', stage: 'analyzing', input: payload }),
  }))

  const response = await request(app)
    .post('/api/promo-jobs')
    .send({
      modelImageUrl: '/api/upload/files/model.png',
      productImageUrl: '/api/upload/files/product.png',
      styleTemplate: 'magazine',
      jewelryType: 'earring',
    })

  assert.equal(response.statusCode, 202)
  assert.equal(response.body.id, 'job_123')
  assert.equal(response.body.stage, 'analyzing')
})
```

- [ ] **Step 2: Run the route test to verify it fails because the router is missing**

Run: `node --test server/promo-jobs/__tests__/controller.test.mjs`

Expected: FAIL with module resolution errors for `routes.js`

- [ ] **Step 3: Add promo job controller and router**

```js
export function createPromoJobController({ orchestrator }) {
  return {
    createJob: async (req, res) => {
      const job = await orchestrator.createJob(req.body)
      res.status(202).json(job)
    },
    getJob: async (req, res) => {
      const job = await orchestrator.getJob(req.params.jobId)
      res.json(job)
    },
    submitSelections: async (req, res) => {
      const job = await orchestrator.submitSelections(req.params.jobId, req.body.selections)
      res.status(202).json(job)
    },
  }
}
```

- [ ] **Step 4: Mount `/api/promo-jobs` in `server/index.js`**

```js
import { createPromoJobRouter } from './promo-jobs/routes.js'

app.use('/api/promo-jobs', createPromoJobRouter({ orchestrator: promoOrchestrator }))
```

- [ ] **Step 5: Change frontend uploads from `blob:`-only workflow to persisted upload assets**

```ts
async function uploadSourceImage(file: File) {
  const formData = new FormData()
  formData.append('token', await createUploadToken())
  formData.append('file', file)

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  const payload = await response.json()
  return payload.url
}
```

- [ ] **Step 6: Replace `URL.createObjectURL(file)` as the canonical workflow input**

Use preview URLs only for local UX. Persisted `modelImageUrl` and `productImageUrl` must become the source of truth stored in the page state.

- [ ] **Step 7: Run the route tests**

Run: `node --test server/promo-jobs/__tests__/controller.test.mjs`

Expected: PASS, job creation route returns `202`

### Task 3: Move Analysis, Shot Planning, and Candidate Generation to the Server

**Files:**
- Create: `D:\moly\moly-main\server\promo-jobs\orchestrator.js`
- Create: `D:\moly\moly-main\server\promo-jobs\steps\analyze-input.js`
- Create: `D:\moly\moly-main\server\promo-jobs\steps\plan-shots.js`
- Create: `D:\moly\moly-main\server\promo-jobs\steps\generate-shot-candidates.js`
- Create: `D:\moly\moly-main\server\promo-jobs\integrations\gemini-client.js`
- Create: `D:\moly\moly-main\server\promo-jobs\__tests__\orchestrator.test.mjs`
- Modify: `D:\moly\moly-main\src\services\jewelryPromo.service.ts`

- [ ] **Step 1: Write the failing orchestrator test for analysis-to-candidate progression**

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { createPromoOrchestrator } from '../orchestrator.js'

test('createJob analyzes input, plans 4 shots, and stores 2 candidates per shot', async () => {
  const orchestrator = createPromoOrchestrator({
    jobStore: fakeJobStore(),
    queueAdapter: { enqueue: async (_name, handler) => handler() },
    analyzeInput: async () => ({ resolvedJewelryType: 'earring', identitySummary: 'same face' }),
    planShots: async () => [{ id: 'shot-1' }, { id: 'shot-2' }, { id: 'shot-3' }, { id: 'shot-4' }],
    generateShotCandidates: async (shot) => [{ id: `${shot.id}-a` }, { id: `${shot.id}-b` }],
  })

  const job = await orchestrator.createJob({
    modelImageUrl: '/api/upload/files/model.png',
    productImageUrl: '/api/upload/files/product.png',
    styleTemplate: 'magazine',
    jewelryType: 'earring',
  })

  assert.equal(job.stage, 'waiting_selection')
  assert.equal(job.shots.length, 4)
  assert.equal(job.shots[0].candidates.length, 2)
})
```

- [ ] **Step 2: Run the orchestrator tests to confirm failure**

Run: `node --test server/promo-jobs/__tests__/orchestrator.test.mjs`

Expected: FAIL because `orchestrator.js` does not exist

- [ ] **Step 3: Implement `createPromoOrchestrator()`**

```js
export function createPromoOrchestrator(deps) {
  return {
    async createJob(input) {
      const job = await deps.jobStore.save(createPromoJobRecord({
        id: `promo_${Date.now()}`,
        payload: input,
      }))

      return await deps.queueAdapter.enqueue('promo-job:create', async () => {
        const analysis = await deps.analyzeInput(job.input)
        const plannedShots = await deps.planShots({ input: job.input, analysis })
        const shots = []

        for (const shot of plannedShots) {
          const candidates = await deps.generateShotCandidates({ input: job.input, analysis, shot })
          shots.push({ ...shot, status: 'ready', candidates, selectedCandidateId: null, videoTask: null, videoAsset: null })
        }

        return await deps.jobStore.update(job.id, {
          status: 'running',
          stage: 'waiting_selection',
          analysis,
          shots,
        })
      })
    },
  }
}
```

- [ ] **Step 4: Move reusable prompt-building logic out of the frontend-only service**

Use existing `src/services/jewelryPromo.service.ts` and `src/services/jewelryPromoVideo.core.ts` as reference, but create server-safe modules that do not depend on `import.meta` or browser APIs.

- [ ] **Step 5: Keep the frontend service as a thin API client**

`src/services/jewelryPromo.service.ts` should stop orchestrating Gemini + IMA directly and instead call promo job endpoints:

```ts
async function createPromoJob(input: CreatePromoJobRequest) {
  return await fetchJson('/api/promo-jobs', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
```

- [ ] **Step 6: Run orchestrator tests**

Run: `node --test server/promo-jobs/__tests__/orchestrator.test.mjs`

Expected: PASS, stage reaches `waiting_selection`

### Task 4: Add Selection Submission and Per-Shot Video Generation

**Files:**
- Create: `D:\moly\moly-main\server\promo-jobs\steps\generate-shot-videos.js`
- Create: `D:\moly\moly-main\server\promo-jobs\integrations\ima-video-client.js`
- Create: `D:\moly\moly-main\server\promo-jobs\__tests__\shot-video.test.mjs`
- Modify: `D:\moly\moly-main\server\promo-jobs\orchestrator.js`
- Modify: `D:\moly\moly-main\src\views\tools\JewelryPromoVideoView.vue`

- [ ] **Step 1: Write the failing selection-to-video test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'

test('submitSelections locks keyframes and generates one video task per shot', async () => {
  const orchestrator = createPromoOrchestrator({
    jobStore: fakeJobStoreWithJob({
      id: 'job_123',
      stage: 'waiting_selection',
      shots: [
        { id: 'shot-1', candidates: [{ id: 'c1' }, { id: 'c2' }] },
        { id: 'shot-2', candidates: [{ id: 'c3' }, { id: 'c4' }] },
        { id: 'shot-3', candidates: [{ id: 'c5' }, { id: 'c6' }] },
        { id: 'shot-4', candidates: [{ id: 'c7' }, { id: 'c8' }] },
      ],
    }),
    generateShotVideos: async (job) => job.shots.map((shot) => ({
      shotId: shot.id,
      taskId: `video-${shot.id}`,
      status: 'submitted',
    })),
  })

  const job = await orchestrator.submitSelections('job_123', [
    { shotId: 'shot-1', candidateId: 'c1' },
    { shotId: 'shot-2', candidateId: 'c3' },
    { shotId: 'shot-3', candidateId: 'c5' },
    { shotId: 'shot-4', candidateId: 'c7' },
  ])

  assert.equal(job.stage, 'generating_shot_videos')
  assert.equal(job.shots[0].selectedCandidateId, 'c1')
  assert.equal(job.shots[0].videoTask.taskId, 'video-shot-1')
})
```

- [ ] **Step 2: Run the shot-video tests to verify failure**

Run: `node --test server/promo-jobs/__tests__/shot-video.test.mjs`

Expected: FAIL because `submitSelections()` or `generateShotVideos()` is missing

- [ ] **Step 3: Add a server-side IMA video client that generates one task per shot**

```js
export async function createShotVideoTask({ prompt, images, duration }) {
  const body = {
    model: 'ima-pro',
    prompt,
    aspect_ratio: '9:16',
    resolution: '720p',
    duration,
    generate_audio: false,
    references: images.map((url) => ({
      type: 'image',
      url,
      weight: 0.8,
      role: 'subject',
    })),
  }

  return await postJson('/v1/videos', body)
}
```

- [ ] **Step 4: Update orchestrator selection handling**

```js
async submitSelections(jobId, selections) {
  const job = await deps.jobStore.get(jobId)
  const selectedByShot = new Map(selections.map((item) => [item.shotId, item.candidateId]))

  const shots = job.shots.map((shot) => {
    const candidateId = selectedByShot.get(shot.id)
    return {
      ...shot,
      selectedCandidateId: candidateId,
      selectedKeyframeAsset: shot.candidates.find((candidate) => candidate.id === candidateId) ?? null,
      status: 'queued',
    }
  })

  const queued = await deps.jobStore.update(jobId, {
    stage: 'generating_shot_videos',
    shots,
  })

  return await deps.generateShotVideos(queued)
}
```

- [ ] **Step 5: Rewire the frontend finalize step**

`generateFinalAssets()` must submit selections to `/api/promo-jobs/:jobId/selections` and then switch the page into polling mode instead of calling `jewelryPromoService.generateFinalVideo()` directly.

- [ ] **Step 6: Run the shot-video tests**

Run: `node --test server/promo-jobs/__tests__/shot-video.test.mjs`

Expected: PASS, one video task exists per shot

### Task 5: Add Server-Side Composition with `ffmpeg`

**Files:**
- Create: `D:\moly\moly-main\server\promo-jobs\services\ffmpeg-compose.service.js`
- Create: `D:\moly\moly-main\server\promo-jobs\steps\compose-final-video.js`
- Create: `D:\moly\moly-main\server\promo-jobs\__tests__\compose.test.mjs`
- Modify: `D:\moly\moly-main\server\promo-jobs\orchestrator.js`

- [ ] **Step 1: Write the failing composition test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { buildComposeCommand } from '../services/ffmpeg-compose.service.js'

test('compose command uses xfade transitions across 4 normalized shot videos', () => {
  const command = buildComposeCommand({
    inputFiles: ['shot-1.mp4', 'shot-2.mp4', 'shot-3.mp4', 'shot-4.mp4'],
    outputFile: 'final.mp4',
    width: 720,
    height: 1280,
    transitionSeconds: 0.3,
  })

  assert.match(command.join(' '), /xfade/)
  assert.match(command.join(' '), /shot-1\.mp4/)
  assert.match(command.join(' '), /final\.mp4/)
})
```

- [ ] **Step 2: Run the composition tests to confirm failure**

Run: `node --test server/promo-jobs/__tests__/compose.test.mjs`

Expected: FAIL because `ffmpeg-compose.service.js` does not exist

- [ ] **Step 3: Implement the `ffmpeg` command builder**

```js
export function buildComposeCommand({ inputFiles, outputFile, width, height, transitionSeconds }) {
  const args = [
    'ffmpeg',
    ...inputFiles.flatMap((file) => ['-i', file]),
    '-filter_complex',
    [
      `[0:v]fps=24,scale=${width}:${height}:force_original_aspect_ratio=cover,setsar=1[v0]`,
      `[1:v]fps=24,scale=${width}:${height}:force_original_aspect_ratio=cover,setsar=1[v1]`,
      `[v0][v1]xfade=transition=fade:duration=${transitionSeconds}:offset=2.7[x1]`,
    ].join(';'),
    '-map',
    '[x1]',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outputFile,
  ]

  return args
}
```

- [ ] **Step 4: Add the composition step to the orchestrator**

When all shot videos reach `succeed`, update the job to `stage: 'composing'`, invoke `composeFinalVideo()`, then persist:

```js
{
  composition: {
    status: 'completed',
    finalVideoAsset,
    posterAsset,
  },
  outputs: {
    finalVideoUrl: finalVideoAsset.publicUrl,
    posterUrl: posterAsset.publicUrl,
  },
  status: 'completed',
  stage: 'completed',
}
```

- [ ] **Step 5: Add a startup check for `ffmpeg` availability**

```js
import { spawnSync } from 'node:child_process'

const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' })
if (probe.status !== 0) {
  console.warn('[PromoJob] ffmpeg is not available; composition jobs will fail until it is installed')
}
```

- [ ] **Step 6: Run the composition tests**

Run: `node --test server/promo-jobs/__tests__/compose.test.mjs`

Expected: PASS, command contains `xfade`

### Task 6: Rewire the Frontend to Poll Promo Jobs Instead of Running the Workflow Locally

**Files:**
- Modify: `D:\moly\moly-main\src\views\tools\JewelryPromoVideoView.vue`
- Create: `D:\moly\moly-main\src\services\jewelryPromo.api.ts`
- Create: `D:\moly\moly-main\src\types\jewelryPromoJob.types.ts`
- Create: `D:\moly\moly-main\testDemo\jewelryPromoJob.api.test.mjs`

- [ ] **Step 1: Write the failing API client test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { mapPromoJobToViewState } from '../src/services/jewelryPromo.api.ts'

test('mapPromoJobToViewState exposes server-generated shot and output data', () => {
  const viewState = mapPromoJobToViewState({
    id: 'job_123',
    stage: 'completed',
    shots: [{ id: 'shot-1', selectedCandidateId: 'c1', videoAsset: { publicUrl: '/video-1.mp4' } }],
    outputs: { finalVideoUrl: '/final.mp4' },
  })

  assert.equal(viewState.videoTask.videoUrl, '/final.mp4')
  assert.equal(viewState.shotVideos[0].url, '/video-1.mp4')
})
```

- [ ] **Step 2: Run the frontend API test to confirm failure**

Run: `node --test --experimental-strip-types testDemo/jewelryPromoJob.api.test.mjs`

Expected: FAIL because `jewelryPromo.api.ts` does not exist

- [ ] **Step 3: Add a thin frontend API client**

```ts
export async function createPromoJob(payload: CreatePromoJobPayload) {
  return await apiClient.post('/promo-jobs', payload)
}

export async function getPromoJob(jobId: string) {
  return await apiClient.get(`/promo-jobs/${jobId}`)
}

export async function submitPromoSelections(jobId: string, selections: PromoSelectionPayload[]) {
  return await apiClient.post(`/promo-jobs/${jobId}/selections`, { selections })
}
```

- [ ] **Step 4: Replace local orchestration in `JewelryPromoVideoView.vue`**

Key changes:

- `handleFileChange()` uploads files and stores persisted asset URLs
- `startGeneration()` calls `createPromoJob()`
- `generateFinalAssets()` calls `submitPromoSelections()`
- add a polling loop that calls `getPromoJob(jobId)` until stage `completed | failed`
- map returned shots, candidates, shot videos, final outputs into the existing UI sections

- [ ] **Step 5: Keep the current UI shell intact**

Do not redesign the page. Preserve the current Ant Design-like multi-step structure and update only the data flow, labels, and status handling.

- [ ] **Step 6: Run the frontend API test**

Run: `node --test --experimental-strip-types testDemo/jewelryPromoJob.api.test.mjs`

Expected: PASS, server job payload maps to view state

### Task 7: Verification, Deployment Notes, and Regression Coverage

**Files:**
- Create: `D:\moly\moly-main\server\promo-jobs\__tests__\smoke.test.mjs`
- Modify: `D:\moly\moly-main\README.md`
- Modify: `D:\moly\moly-main\server\README.md`
- Modify: `D:\moly\moly-main\testDemo\imaVideo.core.test.mjs`
- Modify: `D:\moly\moly-main\testDemo\imaVideo.seedance.test.mjs`

- [ ] **Step 1: Add a smoke test for the staged workflow**

```js
import test from 'node:test'
import assert from 'node:assert/strict'

test('promo job lifecycle reaches completed with stubbed analysis, shot videos, and composition', async () => {
  const orchestrator = createPromoOrchestrator({
    jobStore: fakeJobStore(),
    queueAdapter: { enqueue: async (_name, handler) => handler() },
    analyzeInput: async () => ({ resolvedJewelryType: 'earring' }),
    planShots: async () => [{ id: 'shot-1' }, { id: 'shot-2' }, { id: 'shot-3' }, { id: 'shot-4' }],
    generateShotCandidates: async (ctx) => [{ id: `${ctx.shot.id}-a` }, { id: `${ctx.shot.id}-b` }],
    generateShotVideos: async (job) => markAllShotsSucceeded(job),
    composeFinalVideo: async () => ({ finalVideoUrl: '/final.mp4', posterUrl: '/poster.png' }),
  })

  const created = await orchestrator.createJob({
    modelImageUrl: '/api/upload/files/model.png',
    productImageUrl: '/api/upload/files/product.png',
    styleTemplate: 'magazine',
    jewelryType: 'earring',
  })

  const completed = await orchestrator.submitSelections(created.id, [
    { shotId: 'shot-1', candidateId: 'shot-1-a' },
    { shotId: 'shot-2', candidateId: 'shot-2-a' },
    { shotId: 'shot-3', candidateId: 'shot-3-a' },
    { shotId: 'shot-4', candidateId: 'shot-4-a' },
  ])

  assert.equal(completed.stage, 'completed')
  assert.equal(completed.outputs.finalVideoUrl, '/final.mp4')
})
```

- [ ] **Step 2: Run the smoke test and all touched suites**

Run: `node --test server/promo-jobs/__tests__/*.test.mjs`

Expected: PASS, all new server workflow tests passing

- [ ] **Step 3: Update the READMEs with deployment requirements**

Add exact notes:

- `ffmpeg` must be installed on the server
- `server/uploads/promo-jobs` must be writable
- production should use a long-running Node process or container

- [ ] **Step 4: Re-run the existing video client tests**

Run: `node --test --experimental-strip-types testDemo/imaVideo.core.test.mjs`

Expected: PASS

Run: `node --test --experimental-strip-types testDemo/imaVideo.seedance.test.mjs`

Expected: PASS

- [ ] **Step 5: Run the jewelry promo regression tests**

Run: `node --test --experimental-strip-types testDemo/jewelryPromoVideo.core.test.mjs`

Expected: PASS

