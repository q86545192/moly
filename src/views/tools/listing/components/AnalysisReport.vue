<template>
  <div class="analysis-report">
    <div class="report-header">
      <h3 class="report-title">{{ title }}</h3>
      <div v-if="score !== undefined" class="score-badge" :class="scoreClass">
        {{ score }} 分
      </div>
    </div>

    <div v-if="strengths.length" class="report-section">
      <h4 class="section-label strengths-label">
        <CheckCircleFilled class="label-icon" /> 亮点
      </h4>
      <div class="tag-list">
        <div v-for="(s, i) in strengths" :key="i" class="report-tag strength">
          <span class="tag-aspect">{{ s.aspect }}</span>
          <span class="tag-detail">{{ s.detail }}</span>
        </div>
      </div>
    </div>

    <div v-if="weaknesses.length" class="report-section">
      <h4 class="section-label weaknesses-label">
        <CloseCircleFilled class="label-icon" /> 不足
      </h4>
      <div class="tag-list">
        <div v-for="(w, i) in weaknesses" :key="i" class="report-tag weakness">
          <span class="tag-aspect">{{ w.aspect }}</span>
          <span class="tag-detail">{{ w.detail }}</span>
        </div>
      </div>
    </div>

    <div v-if="suggestions.length" class="report-section">
      <h4 class="section-label suggestions-label">
        <BulbOutlined class="label-icon" /> 优化建议
      </h4>
      <ul class="suggestion-list">
        <li v-for="(s, i) in suggestions" :key="i">{{ s }}</li>
      </ul>
    </div>

    <div v-if="keywords.length" class="report-section">
      <h4 class="section-label keywords-label">
        <TagOutlined class="label-icon" /> 关键词
      </h4>
      <div class="keyword-cloud">
        <span v-for="(kw, i) in keywords" :key="i" class="keyword-tag">{{ kw }}</span>
      </div>
    </div>

    <div v-if="missingKeywords.length" class="report-section">
      <h4 class="section-label missing-label">
        <WarningOutlined class="label-icon" /> 缺失关键词
      </h4>
      <div class="keyword-cloud">
        <span v-for="(kw, i) in missingKeywords" :key="i" class="keyword-tag missing">{{ kw }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  CheckCircleFilled,
  CloseCircleFilled,
  BulbOutlined,
  TagOutlined,
  WarningOutlined,
} from '@ant-design/icons-vue'

const props = defineProps<{
  title: string
  score?: number
  strengths: { aspect: string; detail: string }[]
  weaknesses: { aspect: string; detail: string }[]
  suggestions: string[]
  keywords: string[]
  missingKeywords?: string[]
}>()

const scoreClass = computed(() => {
  if (!props.score) return ''
  if (props.score >= 80) return 'score-good'
  if (props.score >= 60) return 'score-mid'
  return 'score-low'
})
</script>

<style scoped lang="scss">
.analysis-report {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.report-title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.score-badge {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 700;
  &.score-good { background: #ecfdf5; color: #059669; }
  &.score-mid { background: #fffbeb; color: #d97706; }
  &.score-low { background: #fef2f2; color: #dc2626; }
}

.report-section { display: flex; flex-direction: column; gap: 8px; }

.section-label {
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  .label-icon { font-size: 15px; }

  &.strengths-label { color: #059669; }
  &.weaknesses-label { color: #dc2626; }
  &.suggestions-label { color: #d97706; }
  &.keywords-label { color: #2563eb; }
  &.missing-label { color: #9333ea; }
}

.tag-list { display: flex; flex-direction: column; gap: 8px; }

.report-tag {
  padding: 10px 14px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;

  .tag-aspect { font-size: 13px; font-weight: 600; }
  .tag-detail { font-size: 13px; color: #374151; }

  &.strength { background: #ecfdf5; .tag-aspect { color: #059669; } }
  &.weakness { background: #fef2f2; .tag-aspect { color: #dc2626; } }
}

.suggestion-list {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  li { font-size: 13px; color: #374151; line-height: 1.5; }
}

.keyword-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.keyword-tag {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 13px;
  background: #eff6ff;
  color: #2563eb;

  &.missing { background: #faf5ff; color: #9333ea; }
}
</style>
