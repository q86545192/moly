<template>
  <div class="step-indicator">
    <div
      v-for="(step, idx) in steps"
      :key="idx"
      class="step-item"
      :class="{
        active: idx === current,
        completed: idx < current,
        upcoming: idx > current,
      }"
    >
      <div class="step-dot">
        <CheckOutlined v-if="idx < current" />
        <span v-else>{{ idx + 1 }}</span>
      </div>
      <span class="step-label">{{ step }}</span>
      <div v-if="idx < steps.length - 1" class="step-line" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckOutlined } from '@ant-design/icons-vue'

defineProps<{
  steps: string[]
  current: number
}>()
</script>

<style scoped lang="scss">
.step-indicator {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 20px 0;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;

  .step-dot {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    flex-shrink: 0;
    transition: all 0.3s;
  }

  .step-label {
    font-size: 13px;
    white-space: nowrap;
    transition: color 0.3s;
  }

  .step-line {
    width: 40px;
    height: 2px;
    margin: 0 8px;
    transition: background 0.3s;
  }

  &.completed {
    .step-dot { background: #2563eb; color: #fff; }
    .step-label { color: #2563eb; font-weight: 600; }
    .step-line { background: #2563eb; }
  }

  &.active {
    .step-dot { background: #2563eb; color: #fff; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.2); }
    .step-label { color: #111827; font-weight: 600; }
    .step-line { background: #d1d5db; }
  }

  &.upcoming {
    .step-dot { background: #f3f4f6; color: #9ca3af; border: 1px solid #d1d5db; }
    .step-label { color: #9ca3af; }
    .step-line { background: #e5e7eb; }
  }
}
</style>
