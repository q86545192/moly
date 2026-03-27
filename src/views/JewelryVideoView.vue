<template>
  <div class="jewelry-page">

    <header class="page-header">
      <button class="back-btn" @click="$router.back()">← 返回</button>
      <h1 class="page-title">首饰视频工坊</h1>
      <span class="page-sub">模特 · 首饰 · 场景 → 专业展示视频</span>
    </header>

    <div class="page-body">

      <!-- 左侧上传区 -->
      <div class="upload-col">

        <!-- 01 模特图 -->
        <div class="section">
          <div class="section-label">
            <span class="num">01</span>
            <span class="title">模特图片</span>
            <span class="hint">必填</span>
          </div>
          <div
            class="drop-zone"
            :class="{ filled: modelImage }"
            @click="!modelImage && modelRef?.click()"
            @dragover.prevent
            @drop.prevent="e => onDrop(e, 'model')"
          >
            <img v-if="modelImage" :src="modelImage" class="preview" />
            <div v-if="modelImage" class="overlay">
              <button class="ov-btn del" @click.stop="modelImage = null">✕</button>
              <button class="ov-btn rep" @click.stop="modelRef?.click()">↺</button>
            </div>
            <div v-else class="placeholder">
              <span class="ph-icon">👤</span>
              <span class="ph-text">点击上传或拖拽</span>
              <span class="ph-sub">建议正面 / 半身照</span>
            </div>
          </div>
          <input ref="modelRef" type="file" accept="image/*" class="hidden" @change="e => onFile(e, 'model')" />
        </div>

        <!-- 02 首饰图（素材库 + 点击选中） -->
        <div class="section">
          <div class="section-label">
            <span class="num">02</span>
            <span class="title">首饰图片</span>
            <span class="hint">点击选中要展示的（建议≤2件）</span>
          </div>
          <div class="jewelry-grid">
            <div
              v-for="(item, i) in jewelryImages"
              :key="i"
              class="jewelry-thumb"
              :class="{ selected: item.selected }"
              @click="toggleJewelry(i)"
            >
              <img :src="item.url" class="thumb-img" />
              <div v-if="item.selected" class="thumb-check">✓</div>
              <button class="thumb-del" @click.stop="removeJewelry(i)">✕</button>
            </div>
            <div
              class="jewelry-add"
              @click="jewelryInputRef?.click()"
              @dragover.prevent
              @drop.prevent="onDropJewelry"
            >
              <span class="add-icon">+</span>
              <span class="add-text">添加首饰</span>
            </div>
          </div>
          <div v-if="selectedJewelry.length > 0" class="jewelry-tip">
            已选 {{ selectedJewelry.length }} 件首饰参与生成
          </div>
          <input
            ref="jewelryInputRef"
            type="file"
            accept="image/*"
            multiple
            class="hidden"
            @change="onJewelryFiles"
          />
        </div>

        <!-- 03 场景图 -->
        <div class="section">
          <div class="section-label">
            <span class="num">03</span>
            <span class="title">场景图片</span>
            <span class="hint">可选</span>
          </div>
          <div
            class="drop-zone small"
            :class="{ filled: sceneImage }"
            @click="!sceneImage && sceneRef?.click()"
            @dragover.prevent
            @drop.prevent="e => onDrop(e, 'scene')"
          >
            <img v-if="sceneImage" :src="sceneImage" class="preview" />
            <div v-if="sceneImage" class="overlay">
              <button class="ov-btn del" @click.stop="sceneImage = null">✕</button>
              <button class="ov-btn rep" @click.stop="sceneRef?.click()">↺</button>
            </div>
            <div v-else class="placeholder">
              <span class="ph-icon">🏙️</span>
              <span class="ph-text">上传场景 / 背景参考图</span>
            </div>
          </div>
          <input ref="sceneRef" type="file" accept="image/*" class="hidden" @change="e => onFile(e, 'scene')" />
        </div>

        <!-- 04 额外要求 -->
        <div class="section">
          <div class="section-label">
            <span class="num">04</span>
            <span class="title">额外要求</span>
            <span class="hint">可选</span>
          </div>
          <textarea
            v-model="extraPrompt"
            class="extra-input"
            placeholder="例如：突出闪光效果、慢镜头特写、暖光氛围..."
            rows="2"
          />
        </div>

        <button
          class="generate-btn"
          :class="{ loading: isGenerating }"
          :disabled="!modelImage || isGenerating"
          @click="generate"
        >
          <span v-if="!isGenerating">生成视频</span>
          <span v-else class="btn-loading">
            <span class="spin-dot"></span>{{ statusText }}
          </span>
        </button>

        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
      </div>

      <!-- 右侧结果 -->
      <div class="result-col">
        <template v-if="!videoUrl && !isGenerating">
          <div class="result-empty">
            <div class="empty-icon">🎬</div>
            <div class="empty-text">生成的视频将在这里播放</div>
            <div class="empty-sub">上传模特图后点击「生成视频」</div>
          </div>
        </template>

        <template v-else-if="isGenerating && !videoUrl">
          <div class="result-loading">
            <div class="spinner"></div>
            <div class="loading-text">{{ statusText }}</div>
            <div class="loading-sub">可灵生成约需 2–5 分钟，请耐心等待</div>
          </div>
        </template>

        <template v-else-if="videoUrl">
          <div class="result-video">
            <video :src="videoUrl" controls autoplay loop class="video-player" />
            <div class="result-actions">
              <a :href="videoUrl" download="jewelry-video.mp4" class="action-btn">下载视频</a>
              <button class="action-btn outline" @click="generate" :disabled="isGenerating">重新生成</button>
            </div>
          </div>
        </template>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { klingService } from '@/services/kling.service';
import { geminiService } from '@/services/gemini.service';

const modelRef = ref<HTMLInputElement | null>(null);
const sceneRef = ref<HTMLInputElement | null>(null);
const jewelryInputRef = ref<HTMLInputElement | null>(null);

const modelImage = ref<string | null>(null);
const sceneImage = ref<string | null>(null);
const jewelryImages = ref<{ url: string; selected: boolean }[]>([]);

const extraPrompt = ref('');
const isGenerating = ref(false);
const statusText = ref('');
const videoUrl = ref<string | null>(null);
const errorMsg = ref('');

// ── 文件处理 ──────────────────────────────────────────────────────────────────

function onFile(e: Event, type: 'model' | 'scene') {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  if (type === 'model') modelImage.value = url;
  else sceneImage.value = url;
  (e.target as HTMLInputElement).value = '';
}

function onDrop(e: DragEvent, type: 'model' | 'scene') {
  const file = e.dataTransfer?.files?.[0];
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  if (type === 'model') modelImage.value = url;
  else sceneImage.value = url;
}

const selectedJewelry = computed(() => jewelryImages.value.filter(j => j.selected));

function onJewelryFiles(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (!files) return;
  for (const file of Array.from(files)) {
    jewelryImages.value.push({ url: URL.createObjectURL(file), selected: false });
  }
  (e.target as HTMLInputElement).value = '';
}

function onDropJewelry(e: DragEvent) {
  const files = e.dataTransfer?.files;
  if (!files) return;
  for (const file of Array.from(files)) {
    if (file.type.startsWith('image/')) {
      jewelryImages.value.push({ url: URL.createObjectURL(file), selected: false });
    }
  }
}

function removeJewelry(i: number) {
  jewelryImages.value.splice(i, 1);
}

function toggleJewelry(i: number) {
  const item = jewelryImages.value[i];
  // 最多选2件
  if (!item.selected && selectedJewelry.value.length >= 2) return;
  item.selected = !item.selected;
}

// ── 生成逻辑 ──────────────────────────────────────────────────────────────────

async function generate() {
  if (!modelImage.value) return;
  isGenerating.value = true;
  errorMsg.value = '';
  videoUrl.value = null;

  try {
    // Step 1: Gemini 合成参考图（模特 + 首饰 + 场景 → 单张合成图）
    statusText.value = 'Gemini 合成参考图...';
    const selected = selectedJewelry.value;
    const refImages: string[] = [modelImage.value];
    for (const item of selected) refImages.push(item.url);
    if (sceneImage.value) refImages.push(sceneImage.value);

    const jewelryCount = selected.length;
    const hasScene = !!sceneImage.value;
    const userExtra = extraPrompt.value.trim();

    const compositePrompt = [
      '你是资深电商视觉设计师，请严格遵循以下指令合成图像。',
      '输出真实摄影质感，避免插画风，保持光影自然。',
      `图1是模特原图。${jewelryCount > 0 ? `图2${jewelryCount > 1 ? '至图' + (jewelryCount + 1) : ''}是首饰参考图。` : ''}${hasScene ? `图${refImages.length}是场景参考图。` : ''}`,
      '任务：',
      jewelryCount > 0 ? '- 将参考图中的首饰自然地佩戴在模特身上，保持首饰款式、颜色、材质100%还原。' : '',
      hasScene ? '- 将模特置于场景图的背景环境中，保持场景氛围和光线风格。' : '',
      '- 保持模特的面部特征、身材比例、姿势完全不变。',
      '- 输出一张完整的高质量合成照片，适合用于视频生成的首帧。',
      userExtra ? `用户补充要求：${userExtra}` : '',
    ].filter(Boolean).join('\n');

    let compositeImage: string;
    try {
      const result = await geminiService.generateImage(compositePrompt, refImages, { aspectRatio: '9:16', imageSize: '1K' });
      compositeImage = result.startsWith('data:image') ? result : modelImage.value;
    } catch {
      compositeImage = modelImage.value;
    }

    // Step 2: 将合成图传给可灵生成视频
    statusText.value = '生成视频，约需 2–4 分钟…';
    const videoPrompt = `高端首饰商业广告视频，镜头从全身缓慢推进，展示模特整体气质，运镜至耳部给耳饰特写，再平移至颈部给项链特写，慢动作拍摄，专业摄影灯光，精致奢华风格，画面稳定流畅。`;
    videoUrl.value = await klingService.imageToVideo(
      compositeImage,
      videoPrompt,
      { model: 'kling-v1-6', duration: '10', mode: 'std', maxPollingTime: 600000 }
    );
  } catch (err: any) {
    errorMsg.value = `生成失败：${err.message || '请重试'}`;
  } finally {
    isGenerating.value = false;
    statusText.value = '';
  }
}
</script>

<style scoped lang="scss">
.jewelry-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0f0f0f;
  color: #e5e7eb;
  overflow: hidden;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}

.back-btn {
  background: none; border: none; color: #6b7280;
  cursor: pointer; font-size: 14px; padding: 4px 8px; border-radius: 6px;
  &:hover { color: #fff; background: rgba(255,255,255,0.05); }
}
.page-title { font-size: 18px; font-weight: 600; margin: 0; }
.page-sub { font-size: 13px; color: #6b7280; }

.page-body { flex: 1; display: flex; overflow: hidden; }

// ── 左侧 ────────────────────────────────────────────
.upload-col {
  width: 340px;
  flex-shrink: 0;
  border-right: 1px solid rgba(255,255,255,0.08);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}

.section { display: flex; flex-direction: column; gap: 7px; }

.section-label { display: flex; align-items: baseline; gap: 7px; }
.num { font-size: 11px; font-weight: 700; color: #3b82f6; letter-spacing: 1px; }
.title { font-size: 13px; font-weight: 500; color: #d1d5db; }
.hint { font-size: 11px; color: #4b5563; margin-left: auto; }

// 通用上传区
.drop-zone {
  height: 140px;
  border-radius: 10px;
  border: 1.5px dashed rgba(255,255,255,0.12);
  background: #161616;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s, background 0.2s;

  &:hover:not(.filled) { border-color: rgba(59,130,246,0.5); background: #1a1a1a; }
  &.filled { border-style: solid; border-color: rgba(59,130,246,0.25); cursor: default; }
  &.small { height: 100px; }
}

.preview { width: 100%; height: 100%; object-fit: contain; }

.overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.55);
  display: flex; align-items: center; justify-content: center; gap: 10px;
  opacity: 0; transition: opacity 0.2s;
  .drop-zone:hover & { opacity: 1; }
}

.ov-btn {
  width: 32px; height: 32px; border-radius: 50%; border: none;
  font-size: 13px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  &.del { background: rgba(239,68,68,0.9); color: #fff; }
  &.rep { background: rgba(59,130,246,0.9); color: #fff; }
  &:hover { transform: scale(1.1); }
}

.placeholder {
  display: flex; flex-direction: column;
  align-items: center; gap: 5px; pointer-events: none;
}
.ph-icon { font-size: 26px; }
.ph-text { font-size: 12px; color: #6b7280; }
.ph-sub { font-size: 11px; color: #374151; }

// 首饰多图格子
.jewelry-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.jewelry-thumb {
  position: relative;
  height: 90px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid rgba(255,255,255,0.08);
  cursor: pointer;
  transition: border-color 0.15s;

  .thumb-img { width: 100%; height: 100%; object-fit: cover; display: block; }

  &.selected {
    border-color: #3b82f6;
    box-shadow: 0 0 0 1px #3b82f6;
  }

  .thumb-check {
    position: absolute; top: 4px; left: 4px;
    width: 18px; height: 18px;
    background: #3b82f6; color: #fff;
    border-radius: 50%; font-size: 10px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }

  .thumb-del {
    position: absolute; top: 4px; right: 4px;
    width: 18px; height: 18px;
    background: rgba(0,0,0,0.75); color: #fff;
    border: none; border-radius: 50%; font-size: 9px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.15s;
  }

  &:hover .thumb-del { opacity: 1; }
}

.jewelry-add {
  height: 90px;
  border-radius: 8px;
  border: 1.5px dashed rgba(255,255,255,0.12);
  background: #161616;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;

  &:hover { border-color: rgba(59,130,246,0.5); background: #1a1a1a; }
}

.add-icon { font-size: 20px; color: #4b5563; }
.add-text { font-size: 10px; color: #4b5563; }

.jewelry-tip {
  font-size: 11px;
  color: #3b82f6;
  padding: 4px 8px;
  background: rgba(59,130,246,0.08);
  border-radius: 6px;
  text-align: center;
}

.hidden { display: none; }

.extra-input {
  width: 100%; box-sizing: border-box;
  background: #161616;
  border: 1.5px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  color: #d1d5db; font-size: 13px; font-family: inherit;
  padding: 10px 12px; resize: none; outline: none;
  &::placeholder { color: #374151; }
  &:focus { border-color: rgba(59,130,246,0.4); }
}

.generate-btn {
  width: 100%; padding: 12px;
  background: #2563eb; color: #fff;
  border: none; border-radius: 10px;
  font-size: 15px; font-weight: 600; cursor: pointer;
  transition: background 0.2s;
  &:hover:not(:disabled) { background: #1d4ed8; }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
  &.loading { background: #1e3a6e; }
}

.btn-loading {
  display: flex; align-items: center; justify-content: center; gap: 8px;
}

.spin-dot {
  width: 14px; height: 14px; flex-shrink: 0;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.error-msg {
  font-size: 12px; color: #f87171;
  padding: 8px 12px;
  background: rgba(239,68,68,0.08); border-radius: 8px;
}

// ── 右侧 ────────────────────────────────────────────
.result-col {
  flex: 1; display: flex;
  align-items: center; justify-content: center;
  padding: 24px; overflow: hidden;
}

.result-empty {
  text-align: center; display: flex;
  flex-direction: column; align-items: center; gap: 10px;
}
.empty-icon { font-size: 52px; opacity: 0.25; }
.empty-text { font-size: 16px; color: #4b5563; }
.empty-sub { font-size: 13px; color: #374151; }

.result-loading {
  text-align: center; display: flex;
  flex-direction: column; align-items: center; gap: 16px;
}

.spinner {
  width: 44px; height: 44px;
  border: 3px solid rgba(255,255,255,0.08);
  border-top-color: #3b82f6; border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.loading-text { font-size: 15px; color: #9ca3af; }
.loading-sub { font-size: 12px; color: #4b5563; }

.result-video {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 16px;
}

.video-player {
  max-width: 100%; max-height: calc(100% - 60px);
  border-radius: 12px; background: #000;
}

.result-actions { display: flex; gap: 12px; }

.action-btn {
  padding: 8px 20px; border-radius: 8px; font-size: 13px;
  text-decoration: none; cursor: pointer;
  background: rgba(255,255,255,0.06);
  color: #d1d5db; border: 1px solid rgba(255,255,255,0.1);
  &:hover { background: rgba(255,255,255,0.1); color: #fff; }
  &.outline {
    background: rgba(37,99,235,0.1); color: #60a5fa;
    border-color: rgba(37,99,235,0.3);
    &:hover:not(:disabled) { background: rgba(37,99,235,0.2); }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
  }
}
</style>
