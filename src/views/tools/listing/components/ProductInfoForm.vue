<template>
  <div class="product-info-form">
    <h3 class="form-title">商品信息</h3>
    <p class="form-hint">填写基本信息，AI 将据此生成完整 Listing（带 * 为必填）</p>

    <div class="form-section">
      <label class="field-label">商品图片 *<span class="field-tip">最多 5 张，建议上传白底图</span></label>
      <div class="image-upload-grid">
        <div
          v-for="(img, idx) in store.productInfo.images"
          :key="idx"
          class="image-thumb"
        >
          <img :src="img" alt="商品图" />
          <button class="remove-btn" @click="store.removeProductImage(idx)">
            <CloseOutlined />
          </button>
        </div>
        <div
          v-if="store.productInfo.images.length < 5"
          class="image-add"
          @click="triggerUpload"
          @dragover.prevent
          @drop.prevent="onDrop"
        >
          <PlusOutlined class="add-icon" />
          <span>上传图片</span>
        </div>
      </div>
      <input
        ref="fileRef"
        type="file"
        accept="image/*"
        multiple
        class="hidden-input"
        @change="onFileChange"
      />
    </div>

    <div class="form-section">
      <label class="field-label">商品名称 *</label>
      <input
        v-model="store.productInfo.name"
        type="text"
        class="field-input"
        placeholder="如：便携式蓝牙音箱、瑜伽垫、不锈钢保温杯..."
      />
    </div>

    <div class="form-row">
      <div class="form-section flex-1">
        <label class="field-label">商品类目</label>
        <select v-model="store.productInfo.category" class="field-select">
          <option v-for="cat in categories" :key="cat.value" :value="cat.value">
            {{ cat.label }}
          </option>
        </select>
      </div>
      <div class="form-section flex-1">
        <label class="field-label">目标市场</label>
        <select v-model="store.productInfo.market" class="field-select">
          <option v-for="m in markets" :key="m.value" :value="m.value">
            {{ m.label }}
          </option>
        </select>
      </div>
    </div>

    <div class="form-section">
      <label class="field-label">
        商品卖点/特点
        <span class="field-tip">用逗号或换行分隔多个特点</span>
      </label>
      <textarea
        v-model="store.productInfo.features"
        rows="3"
        class="field-textarea"
        placeholder="如：IPX7 防水、20小时续航、重量仅 180g、支持 TWS 双联..."
      ></textarea>
    </div>

    <div class="form-section">
      <label class="field-label">生成语言</label>
      <div class="lang-toggle">
        <button
          class="lang-btn"
          :class="{ active: store.productInfo.language === 'en' }"
          @click="store.updateProductInfo({ language: 'en' })"
        >English</button>
        <button
          class="lang-btn"
          :class="{ active: store.productInfo.language === 'zh' }"
          @click="store.updateProductInfo({ language: 'zh' })"
        >中文</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { PlusOutlined, CloseOutlined } from '@ant-design/icons-vue'
import { useListingStore } from '@/stores/listing'
import { AMAZON_CATEGORIES, TARGET_MARKETS } from '@/config/listing.config'

const store = useListingStore()
const fileRef = ref<HTMLInputElement | null>(null)
const categories = AMAZON_CATEGORIES
const markets = TARGET_MARKETS

function triggerUpload() {
  fileRef.value?.click()
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (!files) return
  for (let i = 0; i < files.length; i++) {
    if (store.productInfo.images.length >= 5) break
    store.addProductImage(URL.createObjectURL(files[i]))
  }
  target.value = ''
}

function onDrop(e: DragEvent) {
  const files = e.dataTransfer?.files
  if (!files) return
  for (let i = 0; i < files.length; i++) {
    if (!files[i].type.startsWith('image/')) continue
    if (store.productInfo.images.length >= 5) break
    store.addProductImage(URL.createObjectURL(files[i]))
  }
}
</script>

<style scoped lang="scss">
.product-info-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-title {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.form-hint {
  font-size: 14px;
  color: #6b7280;
  margin: -12px 0 0;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row {
  display: flex;
  gap: 16px;
  .flex-1 { flex: 1; }
  @media (max-width: 640px) { flex-direction: column; }
}

.field-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-tip {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 400;
}

.field-input, .field-select, .field-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #111827;
  background: #fff;
  transition: border-color 0.2s;
  &:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
}

.field-textarea { resize: vertical; min-height: 72px; }

.hidden-input { display: none; }

.image-upload-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.image-thumb {
  width: 100px;
  height: 100px;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  border: 1px solid #e5e7eb;

  img { width: 100%; height: 100%; object-fit: cover; }

  .remove-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(0,0,0,0.5);
    color: #fff;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover .remove-btn { opacity: 1; }
}

.image-add {
  width: 100px;
  height: 100px;
  border: 2px dashed #d1d5db;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  color: #9ca3af;
  font-size: 12px;
  transition: all 0.2s;

  .add-icon { font-size: 20px; }

  &:hover { border-color: #2563eb; color: #2563eb; background: #f9fafb; }
}

.lang-toggle {
  display: flex;
  gap: 0;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
  width: fit-content;

  .lang-btn {
    padding: 8px 20px;
    font-size: 14px;
    border: none;
    background: #fff;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s;

    &.active {
      background: #2563eb;
      color: #fff;
    }

    &:not(.active):hover { background: #f3f4f6; }
  }
}
</style>
