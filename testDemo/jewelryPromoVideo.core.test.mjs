import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildJewelryFinalVideoRequest,
  buildJewelryVideoPrompt,
  buildJewelryVideoReferenceImages,
} from '../src/services/jewelryPromoVideo.core.ts'

test('buildJewelryVideoReferenceImages keeps the four user-selected keyframes in order', () => {
  const images = buildJewelryVideoReferenceImages([
    {
      shotId: 'earring-shot-1',
      candidateId: 'candidate-1',
      imageUrl: 'https://example.com/shot-1.png',
      sourceUrl: 'https://example.com/source-1.png',
      prompt: 'shot 1',
    },
    {
      shotId: 'earring-shot-2',
      candidateId: 'candidate-2',
      imageUrl: 'https://example.com/shot-2.png',
      sourceUrl: 'https://example.com/source-2.png',
      prompt: 'shot 2',
    },
    {
      shotId: 'earring-shot-3',
      candidateId: 'candidate-3',
      imageUrl: 'https://example.com/shot-3.png',
      sourceUrl: 'https://example.com/source-3.png',
      prompt: 'shot 3',
    },
    {
      shotId: 'earring-shot-4',
      candidateId: 'candidate-4',
      imageUrl: 'https://example.com/shot-4.png',
      sourceUrl: 'https://example.com/source-4.png',
      prompt: 'shot 4',
    },
  ])

  assert.deepEqual(images, [
    'https://example.com/source-1.png',
    'https://example.com/source-2.png',
    'https://example.com/source-3.png',
    'https://example.com/source-4.png',
  ])
})

test('buildJewelryFinalVideoRequest locks the final video to the four selected keyframes and 12 seconds', () => {
  const request = buildJewelryFinalVideoRequest(
    'Create a jewelry promo video.',
    [
      {
        shotId: 'earring-shot-1',
        candidateId: 'candidate-1',
        imageUrl: 'https://example.com/shot-1.png',
        sourceUrl: 'https://example.com/source-1.png',
        prompt: 'shot 1',
      },
      {
        shotId: 'earring-shot-2',
        candidateId: 'candidate-2',
        imageUrl: 'https://example.com/shot-2.png',
        sourceUrl: 'https://example.com/source-2.png',
        prompt: 'shot 2',
      },
      {
        shotId: 'earring-shot-3',
        candidateId: 'candidate-3',
        imageUrl: 'https://example.com/shot-3.png',
        sourceUrl: 'https://example.com/source-3.png',
        prompt: 'shot 3',
      },
      {
        shotId: 'earring-shot-4',
        candidateId: 'candidate-4',
        imageUrl: 'https://example.com/shot-4.png',
        sourceUrl: 'https://example.com/source-4.png',
        prompt: 'shot 4',
      },
    ],
    'https://example.com/product.png'
  )

  assert.equal(request.prompt, 'Create a jewelry promo video.')
  assert.deepEqual(request.images, [
    'https://example.com/source-1.png',
    'https://example.com/source-2.png',
    'https://example.com/source-3.png',
    'https://example.com/source-4.png',
  ])
  assert.equal(request.duration, 12)
  assert.equal(request.aspectRatio, '9:16')
  assert.equal(request.audio, false)
})

test('buildJewelryVideoPrompt no longer uses the product-only anonymous-model workaround', () => {
  const prompt = buildJewelryVideoPrompt({
    styleLabel: '高级杂志',
    styleDirection: 'luxury editorial magazine style',
    styleSummary: '干净高级的珠宝广告风格',
    jewelryCategory: 'earring',
    materialSummary: '18k金镶嵌宝石耳饰',
    quantitySummary: '一对耳饰',
    jewelryPosition: '耳部区域',
    shots: [
      {
        index: 1,
        title: 'Side Profile Establishing',
        subtitle: 'Use a clean side angle.',
        framing: '9:16 vertical',
        focusPoint: 'earring position',
        motionHint: 'breathing only',
        promptHint: 'keep the earring visible',
      },
    ],
  })

  assert.equal(/anonymous adult fashion model/i.test(prompt), false)
  assert.equal(/reference product image only/i.test(prompt), false)
  assert.match(prompt, /selected keyframe images/i)
  assert.match(prompt, /same jewelry design/i)
})
