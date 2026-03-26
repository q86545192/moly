import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ImaVideoClient,
  buildImaVideoCreateBody,
  parseImaVideoTask,
} from '../src/services/imaVideo.core.ts'

test('buildImaVideoCreateBody keeps ima-pro as the relay model name while using seedance-compatible fields', () => {
  const body = buildImaVideoCreateBody({
    prompt: 'Create a jewelry promo video.',
    images: ['https://example.com/shot-1.png'],
    duration: 12,
    aspectRatio: '9:16',
    resolution: '720p',
    audio: false,
  })

  assert.deepEqual(body, {
    model: 'ima-pro',
    prompt: 'Create a jewelry promo video.',
    aspect_ratio: '9:16',
    resolution: '720p',
    duration: 12,
    generate_audio: false,
    fixed_lens: false,
    references: [
      {
        type: 'image',
        url: 'https://example.com/shot-1.png',
        weight: 0.8,
        role: 'subject',
      },
    ],
  })
})

test('buildImaVideoCreateBody preserves the requested 12-second duration', () => {
  const body = buildImaVideoCreateBody({
    prompt: 'Create a jewelry promo video.',
    duration: 12,
  })

  assert.equal(body.duration, 12)
})

test('parseImaVideoTask reads seedance success payloads with response array URLs', () => {
  const task = parseImaVideoTask({
    code: 200,
    message: 'success',
    data: {
      task_id: 'seed-task-123',
      status: 'SUCCESS',
      request: {
        duration: 12,
      },
      response: ['https://cdn.example.com/final.mp4'],
    },
  })

  assert.equal(task.id, 'seed-task-123')
  assert.equal(task.status, 'succeed')
  assert.equal(task.videoUrl, 'https://cdn.example.com/final.mp4')
  assert.equal(task.duration, 12)
})

test('ImaVideoClient sends the seedance compatibility header and ima-pro relay model body', async () => {
  let capturedHeaders = null
  let capturedBody = null

  const client = new ImaVideoClient({
    apiKey: 'sk-test',
    baseUrl: 'https://relay.example.com',
    fetchImpl: async (url, init = {}) => {
      if (url === 'https://relay.example.com/v1/videos') {
        capturedHeaders = init.headers
        capturedBody = JSON.parse(String(init.body || '{}'))

        return new Response(
          JSON.stringify({
            code: 200,
            message: 'success',
            data: {
              task_id: 'seed-task-456',
              status: 'IN_PROGRESS',
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      throw new Error(`Unexpected request: ${init.method ?? 'GET'} ${url}`)
    },
  })

  const task = await client.createVideoTask({
    prompt: 'Create a jewelry promo video.',
    images: ['https://example.com/shot-1.png'],
    duration: 12,
  })

  assert.equal(task.id, 'seed-task-456')
  assert.equal(task.status, 'processing')
  assert.equal(capturedHeaders['X-Seedance-Version'], '2.0')
  assert.equal(capturedBody.model, 'ima-pro')
  assert.ok(Array.isArray(capturedBody.references))
})

test('ImaVideoClient surfaces 601400 validation details from seedance-style payloads', async () => {
  const client = new ImaVideoClient({
    apiKey: 'sk-test',
    baseUrl: 'https://relay.example.com',
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          code: 601400,
          message: '参数校验失败',
          data: {
            error_details: '素材数量超出最大限制12个',
            error_field: 'references',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
  })

  await assert.rejects(
    () =>
      client.createVideoTask({
        prompt: 'Create a jewelry promo video.',
        images: ['https://example.com/shot-1.png'],
      }),
    /601400.*references.*素材数量超出最大限制12个/
  )
})

test('ImaVideoClient keeps polling long-running ima-pro tasks beyond four minutes by default', async () => {
  const originalDateNow = Date.now
  const originalSetTimeout = globalThis.setTimeout
  let now = 0

  Date.now = () => now
  globalThis.setTimeout = (callback, delay = 0) => {
    now += Number(delay)
    callback()
    return 0
  }

  try {
    const client = new ImaVideoClient({
      apiKey: 'sk-test',
      baseUrl: 'https://relay.example.com',
      fetchImpl: async (url) => {
        if (url === 'https://relay.example.com/v1/videos/seed-task-long') {
          return new Response(
            JSON.stringify(
              now >= 300000
                ? {
                    id: 'seed-task-long',
                    status: 'completed',
                    results: [
                      {
                        url: 'https://cdn.example.com/long-task.mp4',
                        duration: 12,
                      },
                    ],
                  }
                : {
                    id: 'seed-task-long',
                    status: 'in_progress',
                    progress: Math.min(99, Math.floor(now / 3000)),
                  }
            ),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }

        throw new Error(`Unexpected request: ${url}`)
      },
    })

    const task = await client.waitForVideo('seed-task-long', {
      intervalMs: 60000,
    })

    assert.equal(task.status, 'succeed')
    assert.equal(task.videoUrl, 'https://cdn.example.com/long-task.mp4')
  } finally {
    Date.now = originalDateNow
    globalThis.setTimeout = originalSetTimeout
  }
})
