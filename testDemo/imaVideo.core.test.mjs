import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ImaVideoClient,
  buildImaVideoCreateBody,
  parseImaVideoTask,
} from '../src/services/imaVideo.core.ts'

test('buildImaVideoCreateBody uses the ima-pro relay body with seedance-compatible fields', () => {
  const body = buildImaVideoCreateBody({
    prompt: 'Create a jewelry promo video.',
    images: ['https://example.com/shot-1.png'],
    duration: 12,
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

test('buildImaVideoCreateBody keeps prompt-only requests valid for ima-pro', () => {
  const body = buildImaVideoCreateBody({
    prompt: 'Create a jewelry promo video.',
  })

  assert.deepEqual(body, {
    model: 'ima-pro',
    prompt: 'Create a jewelry promo video.',
    aspect_ratio: '9:16',
    resolution: '720p',
    duration: 8,
    generate_audio: false,
    fixed_lens: false,
  })
})

test('parseImaVideoTask normalizes completed payload with results array', () => {
  const task = parseImaVideoTask({
    id: 'task_123',
    status: 'completed',
    results: [
      {
        url: 'https://cdn.example.com/video.mp4',
        duration: 10,
      },
    ],
  })

  assert.equal(task.id, 'task_123')
  assert.equal(task.status, 'succeed')
  assert.equal(task.videoUrl, 'https://cdn.example.com/video.mp4')
})

test('ImaVideoClient waits for completion and returns the final video url', async () => {
  const calls = []
  let createBody = null

  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, method: init.method ?? 'GET' })

    if (url === 'https://relay.example.com/v1/videos' && init.method === 'POST') {
      createBody = JSON.parse(String(init.body || '{}'))

      return new Response(
        JSON.stringify({
          id: 'task_456',
          status: '',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (url === 'https://relay.example.com/v1/videos/task_456' && init.method === 'GET') {
      return new Response(
        JSON.stringify({
          id: 'task_456',
          status: 'completed',
          results: [
            {
              url: 'https://cdn.example.com/final.mp4',
              duration: 12,
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    throw new Error(`Unexpected request: ${init.method ?? 'GET'} ${url}`)
  }

  const client = new ImaVideoClient({
    apiKey: 'sk-test',
    baseUrl: 'https://relay.example.com',
    fetchImpl,
  })

  const createdTask = await client.createVideoTask({
    prompt: 'Create a jewelry promo video.',
    images: ['https://example.com/shot-1.png'],
    duration: 12,
  })

  const finalTask = await client.waitForVideo(createdTask.id, {
    intervalMs: 0,
    timeoutMs: 100,
  })

  assert.equal(createdTask.id, 'task_456')
  assert.equal(createdTask.status, 'submitted')
  assert.equal(finalTask.status, 'succeed')
  assert.equal(finalTask.videoUrl, 'https://cdn.example.com/final.mp4')
  assert.deepEqual(createBody, {
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
  assert.deepEqual(calls, [
    { url: 'https://relay.example.com/v1/videos', method: 'POST' },
    { url: 'https://relay.example.com/v1/videos/task_456', method: 'GET' },
  ])
})

test('ImaVideoClient binds the default global fetch so browser-style fetch does not throw illegal invocation', async () => {
  const originalFetch = globalThis.fetch

  try {
    globalThis.fetch = async function (url, init = {}) {
      if (this !== globalThis) {
        throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation")
      }

      return new Response(
        JSON.stringify({
          id: 'task_789',
          status: 'in_progress',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const client = new ImaVideoClient({
      apiKey: 'sk-test',
      baseUrl: 'https://relay.example.com',
    })

    const task = await client.createVideoTask({
      prompt: 'Create a jewelry promo video.',
      images: ['https://example.com/shot-1.png'],
      duration: 12,
    })

    assert.equal(task.id, 'task_789')
    assert.equal(task.status, 'processing')
  } finally {
    globalThis.fetch = originalFetch
  }
})
