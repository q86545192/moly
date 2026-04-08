import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const rootDir = path.resolve(import.meta.dirname, '..')

const sourceFiles = [
  '.env',
  'src/types/jewelryPromo.types.ts',
  'src/types/ai.types.ts',
  'src/services/imaVideo.core.ts',
  'src/services/jewelryPromo.service.ts',
  'src/views/tools/JewelryPromoVideoView.vue',
]

test('frontend video flow no longer contains kling-specific env or type names', () => {
  const forbiddenPatterns = ['VITE_KLING_', 'KlingVideoTask']

  for (const relativePath of sourceFiles) {
    const content = fs.readFileSync(path.join(rootDir, relativePath), 'utf8')

    for (const pattern of forbiddenPatterns) {
      assert.equal(
        content.includes(pattern),
        false,
        `${relativePath} should not contain ${pattern}`
      )
    }
  }
})

test('frontend env keeps IMA Pro video endpoint configured', () => {
  const envContent = fs.readFileSync(path.join(rootDir, '.env'), 'utf8')

  assert.match(envContent, /^VITE_IMA_VIDEO_BASE_URL=https:\/\/open-route\.fashionlabs\.cn\/?$/m)
  assert.match(envContent, /^VITE_IMA_VIDEO_API_KEY=.+$/m)
})
