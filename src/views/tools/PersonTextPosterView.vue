<template>
  <div class="tool-page person-text-poster-page">
    <header class="tool-header">
      <div class="header-inner">
        <div class="breadcrumb">
          <router-link to="/tools">工具</router-link>
          <RightOutlined class="crumb-icon" />
          <span>人物文字海报</span>
        </div>
        <div class="header-right">
          <span class="points"><ThunderboltFilled /> {{ auth.points }} 积分</span>
          <router-link to="/tools/recharge" class="recharge-link">去充值</router-link>
        </div>
      </div>
    </header>

    <main class="tool-main">
      <section class="upload-panel">
        <section class="hero-panel">
          <div class="hero-copy">
            <h1>上传两张图，直接出海报。</h1>
            <p>人物图负责主体，全文字图负责内容。其余交给 AI 完成。</p>
          </div>
        </section>

        <div class="dual-upload-grid">
          <section class="upload-card upload-card--person">
            <div class="upload-card__head">
              <div>
                <span class="upload-card__eyebrow">图 1</span>
                <h2>人物图</h2>
              </div>
            </div>

            <p class="upload-card__description">
              清晰、人物突出即可。
            </p>

            <ImageUpload
              :model-value="personImage"
              :disabled="isGenerating"
              @update:modelValue="updatePersonImage"
              @delete="clearPersonImage"
              @error="handleUploadError"
            >
              <template #icon>
                <PictureOutlined class="upload-slot-icon" />
              </template>
              <template #text>
                <span class="upload-slot-text">上传人物图</span>
              </template>
              <template #hint>
                <span class="upload-slot-hint">支持 JPG / PNG，建议选择人物特征清晰、光线干净的素材</span>
              </template>
            </ImageUpload>

            <ul class="upload-notes">
              <li>建议半身或近景</li>
            </ul>
          </section>

          <section class="upload-card upload-card--text">
            <div class="upload-card__head">
              <div>
                <span class="upload-card__eyebrow">图 2</span>
                <h2>全文字信息图</h2>
              </div>
            </div>

            <p class="upload-card__description">
              文字完整、可看清即可。
            </p>

            <ImageUpload
              :model-value="textImage"
              :disabled="isGenerating"
              @update:modelValue="updateTextImage"
              @delete="clearTextImage"
              @error="handleUploadError"
            >
              <template #icon>
                <FileTextOutlined class="upload-slot-icon" />
              </template>
              <template #text>
                <span class="upload-slot-text">上传全文字图</span>
              </template>
              <template #hint>
                <span class="upload-slot-hint">系统会保留图中关键信息，但会优化信息层级与视觉节奏</span>
              </template>
            </ImageUpload>

            <ul class="upload-notes">
              <li>尽量不要裁切文字</li>
            </ul>
          </section>
        </div>
      </section>

      <aside class="right-panel">
        <section class="side-card">
          <div class="side-card__header">
            <div>
              <span class="side-card__eyebrow">Info</span>
              <h2>补充信息</h2>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">
              嘉宾名
              <span class="required-mark">必填</span>
            </label>
            <input
              v-model="guestName"
              class="field-input"
              :disabled="isGenerating"
              placeholder="如：李明 / Luna Chen"
            />
          </div>

          <div class="compact-grid">
            <div class="field-group">
              <label class="field-label">
                日期
                <span class="optional-mark">可选</span>
              </label>
              <input
                v-model="date"
                class="field-input"
                :disabled="isGenerating"
                placeholder="如：2026.04.18"
              />
            </div>

            <div class="field-group">
              <label class="field-label">
                地点
                <span class="optional-mark">可选</span>
              </label>
              <input
                v-model="location"
                class="field-input"
                :disabled="isGenerating"
                placeholder="如：上海 / Online"
              />
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">
              人物介绍
              <span class="required-mark">必填</span>
            </label>
            <textarea
              v-model="personIntroduction"
              rows="4"
              class="field-textarea"
              :disabled="isGenerating"
              placeholder="如：品牌创始人 / 主理人 / 讲师简介，帮助系统更准确地融入人物身份与表达重点"
            />
          </div>

        </section>

        <section class="side-card side-card--preview">
          <div class="side-card__header">
            <div>
              <span class="side-card__eyebrow">Preview</span>
              <h2>生成结果</h2>
            </div>
            <span class="pill">预计 20–40 秒</span>
          </div>

          <div class="preview-area preview-area--elevated">
            <div v-if="!resultImage && !isGenerating" class="preview-empty">
              <span class="preview-empty__title">等待生成</span>
              <span>完成图片与必填信息后，即可生成人物文字海报。</span>
            </div>
            <div v-else-if="isGenerating" class="preview-loading">
              <LoadingOutlined class="spin" />
              <span>AI 正在重组版面与视觉层级，请稍候…</span>
            </div>
            <template v-else-if="resultImage">
              <button class="preview-result-button" type="button" @click="openPreviewLightbox">
                <img :src="resultImage" alt="生成结果" class="preview-result" />
                <span class="preview-result-overlay">点击放大预览</span>
              </button>
              <button class="preview-secondary-btn" type="button" @click="openPreviewLightbox">
                放大预览
              </button>
              <a :href="resultImage" download="person-text-poster.png" class="download-btn">
                <DownloadOutlined />
                下载结果
              </a>
            </template>
          </div>

          <div class="cost-row">
            <span>预计消耗</span>
            <span class="cost-value"><ThunderboltFilled class="icon" /> {{ COST }} 积分</span>
          </div>

          <button
            class="generate-btn"
            :class="{ disabled: !canGenerate }"
            :disabled="!canGenerate"
            @click="generate"
          >
            <ExperimentOutlined v-if="!isGenerating" />
            <LoadingOutlined v-else class="spin" />
            {{ isGenerating ? '生成中…' : '一键生成海报' }}
          </button>
        </section>
      </aside>
    </main>

    <Teleport to="body">
      <div
        v-if="previewLightboxVisible && resultImage"
        class="lightbox"
        @click="closePreviewLightbox"
      >
        <div class="lightbox-dialog" @click.stop>
          <button class="lightbox-close" type="button" @click="closePreviewLightbox">
            ×
          </button>
          <img :src="resultImage" alt="海报大图预览" class="lightbox-image" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  DownloadOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  LoadingOutlined,
  PictureOutlined,
  RightOutlined,
  ThunderboltFilled
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import ImageUpload from '@/components/ImageUpload.vue'
import { generatePersonTextPoster } from '@/services/personTextPoster.service'
import { useAuthStore } from '@/stores/auth'

const COST = 10

const auth = useAuthStore()
const personImage = ref('')
const textImage = ref('')
const guestName = ref('')
const personIntroduction = ref('')
const date = ref('')
const location = ref('')
const resultImage = ref('')
const isGenerating = ref(false)
const previewLightboxVisible = ref(false)

const normalizedGuestName = computed(() => guestName.value.trim())
const normalizedPersonIntroduction = computed(() => personIntroduction.value.trim())
const normalizedDate = computed(() => date.value.trim())
const normalizedLocation = computed(() => location.value.trim())

const canGenerate = computed(() => {
  return Boolean(
    personImage.value &&
      textImage.value &&
      normalizedGuestName.value &&
      normalizedPersonIntroduction.value &&
      !isGenerating.value
  )
})

watch([personImage, textImage, guestName, personIntroduction, date, location], () => {
  resetResult()
})

watch(previewLightboxVisible, (visible) => {
  document.body.style.overflow = visible ? 'hidden' : ''
})

function resetResult() {
  resultImage.value = ''
  previewLightboxVisible.value = false
}

function updatePersonImage(value: string) {
  personImage.value = value
}

function updateTextImage(value: string) {
  textImage.value = value
}

function clearPersonImage() {
  personImage.value = ''
}

function clearTextImage() {
  textImage.value = ''
}

function handleUploadError(errorMessage: string) {
  message.error(errorMessage)
}

function openPreviewLightbox() {
  if (!resultImage.value) return
  previewLightboxVisible.value = true
}

function closePreviewLightbox() {
  previewLightboxVisible.value = false
}

function handleWindowKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closePreviewLightbox()
  }
}

function refundFailedGeneration(taskId: string, errorMessage: string) {
  auth.refundPoints(COST, '人物文字海报生成失败退款', taskId)
  message.error(errorMessage)
}

async function generate() {
  if (!personImage.value || !textImage.value) {
    message.warning('请先上传人物图和全文字图')
    return
  }

  if (!normalizedGuestName.value || !normalizedPersonIntroduction.value) {
    message.warning('请先填写嘉宾名和人物介绍')
    return
  }

  if (auth.points < COST) {
    message.warning(`积分不足，当前剩余 ${auth.points} 积分`)
    return
  }

  const taskId = Date.now().toString()

  if (!auth.deductPoints(COST, '人物文字海报生成', taskId)) return

  isGenerating.value = true
  resetResult()

  try {
    const generatedImage = await generatePersonTextPoster({
      personImage: personImage.value,
      textImage: textImage.value,
      guestName: normalizedGuestName.value,
      personIntroduction: normalizedPersonIntroduction.value,
      date: normalizedDate.value || undefined,
      location: normalizedLocation.value || undefined
    })

    if (!generatedImage.startsWith('data:image')) {
      refundFailedGeneration(taskId, '生成失败，积分已退还，请重试')
      return
    }

    resultImage.value = generatedImage
    message.success('海报生成成功')
  } catch (error) {
    console.error('[PersonTextPosterView] generate failed:', error)
    refundFailedGeneration(taskId, '生成失败，积分已退还，请稍后重试')
  } finally {
    isGenerating.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleWindowKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleWindowKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped lang="scss">
@import './tool-page-common.scss';

.person-text-poster-page {
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.08), transparent 28%),
    radial-gradient(circle at top right, rgba(99, 102, 241, 0.08), transparent 24%);
}

.tool-header {
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(14px);

  .points {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #475569;
  }
}

.tool-main {
  align-items: start;
}

.upload-panel {
  gap: 16px;
}

.hero-panel,
.upload-card,
.side-card {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 20px 45px -32px rgba(15, 23, 42, 0.28);
}

.hero-panel {
  position: relative;
  overflow: hidden;
  padding: 20px 22px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  &::after {
    content: '';
    position: absolute;
    inset: auto -40px -50px auto;
    width: 180px;
    height: 180px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0) 72%);
    pointer-events: none;
  }
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  z-index: 1;

  h1 {
    margin: 0;
    font-size: clamp(24px, 3vw, 32px);
    line-height: 1.15;
    letter-spacing: -0.03em;
    color: #0f172a;
  }

  p {
    margin: 0;
    max-width: 560px;
    color: #526277;
    font-size: 14px;
    line-height: 1.7;
  }
}

.pill,
.required-mark,
.optional-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-weight: 600;
}

.dual-upload-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.upload-card {
  --panel-accent: #2563eb;
  --panel-surface: rgba(37, 99, 235, 0.06);

  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 20px;
  transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(59, 130, 246, 0.26);
    box-shadow: 0 26px 50px -34px rgba(37, 99, 235, 0.25);
  }

  :deep(.upload-area) {
    min-height: 170px;
    aspect-ratio: 1 / 1;
    border-radius: 16px;
    border-width: 1.5px;
    border-color: rgba(148, 163, 184, 0.22);
    background:
      linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(241, 245, 249, 0.88)),
      var(--panel-surface);
    transition: border-color 220ms ease, transform 220ms ease, background 220ms ease;
  }

  :deep(.upload-area:hover:not(.is-disabled)) {
    border-color: rgba(59, 130, 246, 0.42);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(239, 246, 255, 0.92)),
      var(--panel-surface);
  }

  :deep(.preview-img) {
    object-fit: cover;
  }

  :deep(.image-overlay) {
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.04), rgba(15, 23, 42, 0.52));
  }
}

.upload-card--person {
  --panel-accent: #2563eb;
  --panel-surface: rgba(37, 99, 235, 0.07);
}

.upload-card--text {
  --panel-accent: #4f46e5;
  --panel-surface: rgba(79, 70, 229, 0.07);

  :deep(.preview-img) {
    object-fit: contain;
    background: linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.98));
  }
}

.upload-card__head {
  display: flex;
  align-items: flex-start;
  gap: 14px;

  h2 {
    margin: 4px 0 0;
    font-size: 17px;
    color: #0f172a;
    letter-spacing: -0.02em;
  }
}

.upload-card__eyebrow,
.side-card__eyebrow {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #64748b;
}

.upload-card__description {
  margin: 0;
  color: #5b687a;
  font-size: 13px;
  line-height: 1.65;
}

.upload-slot-icon {
  font-size: 20px;
  color: var(--panel-accent);
}

.upload-slot-text {
  color: #1f2937;
  font-size: 13px;
  font-weight: 700;
}

.upload-slot-hint {
  max-width: 180px;
  color: #64748b;
  font-size: 11px;
  line-height: 1.45;
  text-align: center;
}

.upload-notes {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  li {
    position: relative;
    padding: 6px 10px 6px 18px;
    border-radius: 999px;
    background: #f8fafc;
    color: #5f6c7f;
    font-size: 12px;
    line-height: 1.4;

    &::before {
      content: '';
      position: absolute;
      left: 9px;
      top: 50%;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--panel-accent);
      opacity: 0.7;
      transform: translateY(-50%);
    }
  }
}

.right-panel {
  position: sticky;
  top: 24px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  gap: 14px;
}

.side-card {
  padding: 18px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.side-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  h2 {
    margin: 4px 0 0;
    font-size: 18px;
    color: #0f172a;
    letter-spacing: -0.02em;
  }
}

.pill {
  padding: 6px 10px;
  background: #f8fafc;
  color: #475569;
  font-size: 11px;
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.compact-grid,
.details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}

.field-input,
.field-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 14px;
  background: #fbfdff;
  color: #0f172a;
  font-size: 14px;
  line-height: 1.6;
  transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;

  &::placeholder {
    color: #94a3b8;
  }

  &:focus {
    border-color: rgba(59, 130, 246, 0.55);
    background: #ffffff;
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.08);
  }

  &:disabled {
    cursor: not-allowed;
    color: #64748b;
    background: #f8fafc;
  }
}

.field-textarea {
  min-height: 92px;
  resize: vertical;
}

.required-mark,
.optional-mark {
  padding: 3px 8px;
  font-size: 11px;
}

.required-mark {
  background: #fee2e2;
  color: #dc2626;
}

.optional-mark {
  background: #eff6ff;
  color: #3158d5;
}

.side-card--preview {
  gap: 14px;
}

.preview-area--elevated {
  min-height: 280px;
  padding: 14px;
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.92)),
    #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.preview-empty,
.preview-loading {
  gap: 10px;
  text-align: center;
  color: #64748b;
  font-size: 14px;
  line-height: 1.7;

}

.preview-empty__title {
  color: inherit;
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
  font-family: inherit;
}

.preview-loading {
  color: #475569;
}

.preview-result {
  width: 100%;
  max-height: 360px;
  border-radius: 14px;
  object-fit: contain;
  background: #ffffff;
  box-shadow: 0 18px 35px -28px rgba(15, 23, 42, 0.4);
}

.preview-result-button,
.preview-secondary-btn {
  appearance: none;
  border: 0;
  cursor: pointer;
}

.preview-result-button {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  border-radius: 18px;
  overflow: hidden;
  background: transparent;

  &:hover .preview-result-overlay {
    opacity: 1;
  }
}

.preview-result-overlay {
  position: absolute;
  inset: auto 12px 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.7);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  opacity: 0;
  transition: opacity 180ms ease;
}

.preview-secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  background: #f8fafc;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid rgba(148, 163, 184, 0.2);
  transition: all 180ms ease;

  &:hover {
    background: #eff6ff;
    color: #1d4ed8;
    border-color: rgba(59, 130, 246, 0.25);
  }
}

.download-btn {
  margin-top: 12px;
  width: 100%;
  justify-content: center;
  padding: 11px 14px;
  border-radius: 12px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;

  &:hover {
    background: #dbeafe;
    color: #1d4ed8;
  }
}

.cost-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: #64748b;
}

.cost-value {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #0f172a;
  font-weight: 700;

  .icon {
    color: #f59e0b;
  }
}

.generate-btn {
  min-height: 46px;
  border-radius: 14px;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  box-shadow: 0 18px 30px -20px rgba(59, 130, 246, 0.6);

  &:hover:not(.disabled) {
    background: linear-gradient(135deg, #1d4ed8, #4338ca);
    transform: translateY(-1px);
  }

  &.disabled {
    background: linear-gradient(135deg, #94a3b8, #cbd5e1);
  }
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.76);
  backdrop-filter: blur(10px);
}

.lightbox-dialog {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(92vw, 920px);
  max-height: calc(100vh - 48px);
  padding: 16px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 30px 80px -36px rgba(15, 23, 42, 0.45);
}

.lightbox-image {
  display: block;
  max-width: 100%;
  max-height: calc(100vh - 96px);
  border-radius: 18px;
  object-fit: contain;
  background: #fff;
}

.lightbox-close {
  position: absolute;
  top: 14px;
  right: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  color: #0f172a;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  transition: background 180ms ease, transform 180ms ease;

  &:hover {
    background: rgba(15, 23, 42, 0.14);
    transform: scale(1.04);
  }
}

@media (max-width: 1024px) {
  .right-panel {
    position: static;
  }
}

@media (max-width: 768px) {
  .hero-panel,
  .upload-card,
  .side-card {
    padding: 16px;
    border-radius: 18px;
  }

  .tool-header {
    padding-inline: 14px;

    .header-inner {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  .hero-copy h1 {
    font-size: 24px;
  }

  .preview-result-overlay {
    opacity: 1;
  }

  .upload-card__head,
  .side-card__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .lightbox {
    padding: 12px;
  }

  .lightbox-dialog {
    width: 100%;
    padding: 12px;
    border-radius: 20px;
  }
}
</style>
