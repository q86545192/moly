<template>
  <div class="listing-create">
    <header class="tool-header">
      <div class="header-inner">
        <div class="breadcrumb">
          <router-link to="/tools">AI 工具</router-link>
          <RightOutlined class="crumb-icon" />
          <router-link to="/tools/listing">一键生成 Listing</router-link>
          <RightOutlined class="crumb-icon" />
          <span>首次创作</span>
        </div>
        <div class="header-right">
          <span class="points"><ThunderboltFilled /> {{ auth.points }} 积分</span>
          <router-link to="/recharge" class="recharge-link">充值</router-link>
        </div>
      </div>
    </header>

    <main class="create-main">
      <StepIndicator
        :steps="['商品信息', '竞品分析', 'AI 生成', '结果预览']"
        :current="store.currentStep"
      />

      <!-- Step 0: 商品信息 -->
      <div v-show="store.currentStep === 0" class="step-content">
        <ProductInfoForm />
        <div class="step-footer">
          <div class="cost-hint">
            <ThunderboltFilled class="cost-icon" />
            预估消耗 <strong>75</strong> 积分（含文案 + 合规主图）
          </div>
          <div class="footer-actions">
            <button class="btn-back" @click="$router.push('/tools/listing')">
              <ArrowLeftOutlined /> 返回
            </button>
            <button
              class="btn-next"
              :disabled="!store.hasProductInfo"
              @click="store.nextStep()"
            >
              下一步：竞品分析 <ArrowRightOutlined />
            </button>
          </div>
        </div>
      </div>

      <!-- Step 1: 竞品分析 -->
      <div v-show="store.currentStep === 1" class="step-content">
        <CompetitorAnalysis
          @analyze="runCompetitorAnalysis"
          @skip="store.nextStep()"
        />
        <div v-if="store.hasCompetitorAnalysis" class="step-footer">
          <div></div>
          <div class="footer-actions">
            <button class="btn-back" @click="store.prevStep()">
              <ArrowLeftOutlined /> 上一步
            </button>
            <button class="btn-next" @click="store.nextStep()">
              下一步：AI 生成 <ArrowRightOutlined />
            </button>
          </div>
        </div>
        <div v-else-if="!store.isAnalyzing" class="step-footer">
          <div></div>
          <div class="footer-actions">
            <button class="btn-back" @click="store.prevStep()">
              <ArrowLeftOutlined /> 上一步
            </button>
          </div>
        </div>
      </div>

      <!-- Step 2: AI 生成中 -->
      <div v-show="store.currentStep === 2" class="step-content">
        <div class="generating-layout">
          <aside class="ai-status-panel">
            <div class="ai-avatar">
              <RobotOutlined class="ai-icon" />
            </div>
            <h4 class="ai-name">Moly AI</h4>
            <p class="ai-status-text">{{ store.isGenerating ? '正在为你生成 Listing...' : '准备就绪' }}</p>

            <div class="task-list">
              <div class="task-item" :class="taskStatus('analyze')">
                <span class="task-dot" />
                <span>分析商品图片</span>
              </div>
              <div class="task-item" :class="taskStatus('title')">
                <span class="task-dot" />
                <span>生成标题与关键词</span>
              </div>
              <div class="task-item" :class="taskStatus('bullets')">
                <span class="task-dot" />
                <span>撰写五点描述</span>
              </div>
              <div class="task-item" :class="taskStatus('description')">
                <span class="task-dot" />
                <span>撰写产品描述</span>
              </div>
              <div class="task-item" :class="taskStatus('mainImage')">
                <span class="task-dot" />
                <span>生成 Amazon 合规主图</span>
              </div>
              <div class="task-item" :class="taskStatus('compliance')">
                <span class="task-dot" />
                <span>主图合规检测</span>
              </div>
            </div>

            <div class="overall-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: store.progress + '%' }"></div>
              </div>
              <span class="progress-label">{{ store.progress }}%</span>
            </div>
          </aside>

          <div class="gen-content">
            <div v-if="!store.isGenerating && !store.hasGeneratedListing" class="gen-start">
              <div class="gen-start-info">
                <h3>准备生成 Listing</h3>
                <p>AI 将基于你提供的商品信息{{ store.hasCompetitorAnalysis ? '和竞品分析结果' : '' }}，自动生成完整的 Amazon Listing 和合规主图。</p>
                <div class="cost-summary">
                  <div class="cost-row">
                    <span>标题 + 五点描述</span>
                    <span><ThunderboltFilled class="cost-icon" /> 20 积分</span>
                  </div>
                  <div class="cost-row">
                    <span>产品描述</span>
                    <span><ThunderboltFilled class="cost-icon" /> 15 积分</span>
                  </div>
                  <div class="cost-row">
                    <span>搜索关键词</span>
                    <span><ThunderboltFilled class="cost-icon" /> 10 积分</span>
                  </div>
                  <div class="cost-row">
                    <span>Amazon 合规主图</span>
                    <span><ThunderboltFilled class="cost-icon" /> 30 积分</span>
                  </div>
                  <div class="cost-row total">
                    <span>合计</span>
                    <span><ThunderboltFilled class="cost-icon" /> 75 积分</span>
                  </div>
                </div>
              </div>
              <button class="btn-generate" @click="startGeneration">
                <ExperimentOutlined /> 开始生成
              </button>
            </div>

            <div v-if="store.isGenerating" class="gen-progress-hint">
              <LoadingOutlined class="spin" />
              <span>{{ store.progressMessage || '生成中，请稍候...' }}</span>
            </div>

            <ListingResult
              v-if="store.hasGeneratedListing"
              :listing="store.generatedListing"
              :images="store.generatedImages"
              :main-image="store.mainImageUrl"
              :compliance-result="store.complianceResult"
              @regenerate="handleRegenerate"
            />
          </div>
        </div>

        <div v-if="store.hasGeneratedListing" class="step-footer">
          <div></div>
          <div class="footer-actions">
            <button class="btn-back" @click="store.prevStep()">
              <ArrowLeftOutlined /> 上一步
            </button>
            <button class="btn-next" @click="goToResult">
              查看完整结果 <ArrowRightOutlined />
            </button>
          </div>
        </div>
        <div v-else-if="!store.isGenerating" class="step-footer">
          <div></div>
          <div class="footer-actions">
            <button class="btn-back" @click="store.prevStep()">
              <ArrowLeftOutlined /> 上一步
            </button>
          </div>
        </div>
      </div>

      <!-- Step 3: 结果预览 -->
      <div v-show="store.currentStep === 3" class="step-content">
        <ListingResult
          :listing="store.generatedListing"
          :images="store.generatedImages"
          :main-image="store.mainImageUrl"
          :compliance-result="store.complianceResult"
          @regenerate="handleRegenerate"
        />

        <MainImageCompliance
          v-if="store.complianceResult"
          :result="store.complianceResult"
          :is-regenerating="store.isGenerating"
          @regenerate="regenerateMainImage"
        />

        <AddonServices />

        <div class="step-footer">
          <div class="cost-hint">
            <ThunderboltFilled class="cost-icon" />
            本次共消耗 <strong>{{ store.totalPointsCost }}</strong> 积分
          </div>
          <div class="footer-actions">
            <button class="btn-back" @click="store.prevStep()">
              <ArrowLeftOutlined /> 上一步
            </button>
            <button class="btn-finish" @click="$router.push('/tools/listing')">
              完成
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  RightOutlined, ThunderboltFilled, ArrowLeftOutlined, ArrowRightOutlined,
  ExperimentOutlined, LoadingOutlined, RobotOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'
import { useListingStore } from '@/stores/listing'
import { listingService } from '@/services/listing.service'
import StepIndicator from './components/StepIndicator.vue'
import ProductInfoForm from './components/ProductInfoForm.vue'
import CompetitorAnalysis from './components/CompetitorAnalysis.vue'
import ListingResult from './components/ListingResult.vue'
import MainImageCompliance from './components/MainImageCompliance.vue'
import AddonServices from './components/AddonServices.vue'

const auth = useAuthStore()
const store = useListingStore()

type GenPhase = 'idle' | 'analyze' | 'title' | 'bullets' | 'description' | 'mainImage' | 'compliance' | 'done'
const genPhase = ref<GenPhase>('idle')

function taskStatus(phase: string) {
  const order: GenPhase[] = ['analyze', 'title', 'bullets', 'description', 'mainImage', 'compliance']
  const currentIdx = order.indexOf(genPhase.value as GenPhase)
  const phaseIdx = order.indexOf(phase as GenPhase)
  if (genPhase.value === 'done') return 'completed'
  if (phaseIdx < currentIdx) return 'completed'
  if (phaseIdx === currentIdx) return 'active'
  return 'pending'
}

async function runCompetitorAnalysis() {
  const validAsins = store.competitorAsins
    .map(a => a.trim())
    .filter(a => a.length >= 10 || a.includes('amazon'))

  if (!validAsins.length) {
    message.warning('请输入至少一个有效的竞品 ASIN')
    return
  }

  const extractedAsins = validAsins.map(a => {
    const extracted = listingService.extractAsin(a)
    return extracted || a.trim().substring(0, 10).toUpperCase()
  })

  if (auth.points < 20) {
    message.warning('积分不足，竞品分析需要 20 积分')
    return
  }

  store.isAnalyzing = true
  store.progress = 0
  store.progressMessage = '开始分析...'

  try {
    const result = await listingService.analyzeCompetitors(
      extractedAsins,
      store.productInfo.name,
      (p, msg) => store.updateProgress(p, msg)
    )
    store.competitorAnalysis = result
    auth.deductPoints(20, '竞品分析')
    message.success('竞品分析完成')
  } catch (err) {
    message.error('竞品分析失败，请重试')
    console.error('[ListingCreate] competitor analysis error:', err)
  } finally {
    store.isAnalyzing = false
  }
}

async function startGeneration() {
  const totalCost = 75
  if (auth.points < totalCost) {
    message.warning(`积分不足，生成需要 ${totalCost} 积分（当前 ${auth.points}）`)
    return
  }

  store.isGenerating = true
  store.progress = 0

  try {
    // Phase 1: Analyze images
    genPhase.value = 'analyze'
    store.updateProgress(5, '正在分析商品图片...')

    let imageAnalysisStr = ''
    if (store.productInfo.images.length > 0) {
      const imageResult = await listingService.analyzeProductImages(
        store.productInfo.images,
        store.productInfo.name,
        store.productInfo.features,
        (p, msg) => store.updateProgress(Math.min(15, 5 + p * 0.1), msg)
      )
      store.imageAnalysis = imageResult
      imageAnalysisStr = JSON.stringify(imageResult)
    }

    // Phase 2-4: Generate text (title, bullets, description, keywords)
    genPhase.value = 'title'
    store.updateProgress(18, '正在生成标题...')

    const competitorStr = store.competitorAnalysis
      ? JSON.stringify(store.competitorAnalysis)
      : undefined

    genPhase.value = 'bullets'
    store.updateProgress(30, '正在撰写五点描述...')

    genPhase.value = 'description'
    store.updateProgress(42, '正在撰写产品描述...')

    const listing = await listingService.generateListingText(
      store.productInfo,
      imageAnalysisStr || undefined,
      competitorStr,
      (p, msg) => {
        const mapped = 18 + p * 0.37
        store.updateProgress(Math.min(55, mapped), msg)
      }
    )
    store.generatedListing = listing

    // Phase 5: Generate Amazon-compliant main image
    genPhase.value = 'mainImage'
    store.updateProgress(58, '正在生成 Amazon 合规主图...')

    const imgResult = await listingService.generateMainImage(
      store.productInfo.images,
      store.productInfo.name,
      store.productInfo.features,
      (p, msg) => store.updateProgress(Math.min(80, 58 + p * 0.22), msg)
    )

    if (imgResult.success && imgResult.imageUrl) {
      store.mainImageUrl = imgResult.imageUrl
      store.generatedImages = [imgResult.imageUrl]

      // Phase 6: Compliance check
      genPhase.value = 'compliance'
      store.updateProgress(82, '正在进行主图合规检测...')

      const compliance = await listingService.checkMainImageCompliance(
        imgResult.imageUrl,
        (p, msg) => store.updateProgress(Math.min(98, 82 + p * 0.16), msg)
      )
      store.complianceResult = compliance
    } else {
      store.mainImageUrl = null
      store.complianceResult = null
      message.warning('主图生成失败，文案已生成成功，可稍后重试主图')
    }

    genPhase.value = 'done'
    store.updateProgress(100, '生成完成！')

    auth.deductPoints(totalCost, 'Listing 一键生成（文案 + 合规主图）')
    message.success('Listing 生成成功！')
  } catch (err) {
    message.error('生成失败，请重试')
    console.error('[ListingCreate] generation error:', err)
    genPhase.value = 'idle'
  } finally {
    store.isGenerating = false
  }
}

async function regenerateMainImage() {
  if (!store.productInfo.images.length) {
    message.warning('请先上传商品实拍图')
    return
  }

  store.isGenerating = true
  store.updateProgress(0, '正在重新生成主图...')

  try {
    const imgResult = await listingService.generateMainImage(
      store.productInfo.images,
      store.productInfo.name,
      store.productInfo.features,
      (p, msg) => store.updateProgress(Math.min(60, p * 0.6), msg)
    )

    if (imgResult.success && imgResult.imageUrl) {
      store.mainImageUrl = imgResult.imageUrl
      store.generatedImages = [imgResult.imageUrl]

      store.updateProgress(65, '正在重新检测合规...')
      const compliance = await listingService.checkMainImageCompliance(
        imgResult.imageUrl,
        (p, msg) => store.updateProgress(Math.min(98, 65 + p * 0.33), msg)
      )
      store.complianceResult = compliance
      store.updateProgress(100, '完成')
      message.success(compliance.passed ? '主图合规检测通过！' : '主图已重新生成，请查看合规报告')
    } else {
      message.error(imgResult.error || '主图重新生成失败')
    }
  } catch (err) {
    message.error('重新生成失败，请重试')
    console.error('[ListingCreate] main image regeneration error:', err)
  } finally {
    store.isGenerating = false
  }
}

function goToResult() {
  store.setStep(3)
}

async function handleRegenerate(field: string) {
  message.info(`正在重新生成${field === 'title' ? '标题' : field === 'bullets' ? '五点描述' : '产品描述'}...`)
  await startGeneration()
}
</script>

<style scoped lang="scss">
.listing-create {
  min-height: 100vh;
  background: #ffffff;
}

.tool-header {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  padding: 12px 20px;
  .header-inner {
    max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;
  }
  .breadcrumb {
    font-size: 14px; color: #6b7280; display: flex; align-items: center; gap: 8px;
    a { color: #2563eb; text-decoration: none; &:hover { text-decoration: underline; } }
    .crumb-icon { font-size: 10px; }
  }
  .header-right { display: flex; align-items: center; gap: 16px; font-size: 14px; }
  .points { color: #6b7280; }
  .recharge-link { color: #2563eb; text-decoration: none; }
}

.create-main {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 24px 80px;
}

.step-content { margin-top: 8px; }

.step-footer {
  margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb;
  display: flex; align-items: center; justify-content: space-between;
}

.cost-hint {
  font-size: 13px; color: #6b7280;
  .cost-icon { color: #f59e0b; margin-right: 2px; }
  strong { color: #111827; }
}

.footer-actions { display: flex; gap: 12px; }

.btn-back, .btn-next, .btn-finish, .btn-generate {
  display: flex; align-items: center; gap: 6px; padding: 10px 20px;
  border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer;
  transition: all 0.2s; border: none;
}

.btn-back {
  background: #fff; color: #6b7280; border: 1px solid #d1d5db;
  &:hover { background: #f3f4f6; color: #374151; }
}

.btn-next {
  background: #2563eb; color: #fff;
  &:hover:not(:disabled) { background: #1d4ed8; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.btn-finish {
  background: #059669; color: #fff;
  &:hover { background: #047857; }
}

.btn-generate {
  background: linear-gradient(135deg, #2563eb, #7c3aed); color: #fff; font-size: 16px; padding: 14px 32px;
  border-radius: 12px;
  &:hover { opacity: 0.9; }
}

.generating-layout {
  display: grid; grid-template-columns: 260px 1fr; gap: 28px; align-items: start;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
}

.ai-status-panel {
  background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 14px;
  padding: 24px 20px; display: flex; flex-direction: column; align-items: center;
  gap: 12px; position: sticky; top: 24px;

  .ai-avatar {
    width: 56px; height: 56px; border-radius: 50%;
    background: linear-gradient(135deg, #2563eb, #7c3aed);
    display: flex; align-items: center; justify-content: center;
    .ai-icon { font-size: 26px; color: #fff; }
  }
  .ai-name { font-size: 16px; font-weight: 700; color: #111827; margin: 0; }
  .ai-status-text { font-size: 13px; color: #6b7280; margin: 0; text-align: center; }
}

.task-list { width: 100%; display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }

.task-item {
  display: flex; align-items: center; gap: 10px; font-size: 13px; color: #9ca3af;
  .task-dot {
    width: 10px; height: 10px; border-radius: 50%; background: #d1d5db; flex-shrink: 0; transition: all 0.3s;
  }
  &.completed { color: #059669; .task-dot { background: #059669; } }
  &.active { color: #2563eb; font-weight: 600; .task-dot { background: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2); } }
}

.overall-progress {
  width: 100%; display: flex; align-items: center; gap: 8px; margin-top: 8px;
  .progress-bar { flex: 1; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
  .progress-fill { height: 100%; background: #2563eb; border-radius: 3px; transition: width 0.3s; }
  .progress-label { font-size: 12px; font-weight: 700; color: #2563eb; min-width: 32px; text-align: right; }
}

.gen-content { min-height: 300px; }

.gen-start {
  background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 14px;
  padding: 32px; display: flex; flex-direction: column; align-items: center; gap: 24px; text-align: center;
  h3 { font-size: 20px; font-weight: 700; color: #111827; margin: 0; }
  p { font-size: 14px; color: #6b7280; margin: 0; max-width: 460px; }
}

.cost-summary {
  width: 100%; max-width: 320px; margin-top: 8px;
  display: flex; flex-direction: column; gap: 8px;
  .cost-row {
    display: flex; justify-content: space-between; font-size: 13px; color: #374151;
    .cost-icon { color: #f59e0b; font-size: 12px; }
    &.total { padding-top: 8px; border-top: 1px solid #e5e7eb; font-weight: 700; color: #111827; }
  }
}

.gen-progress-hint {
  display: flex; align-items: center; gap: 10px;
  padding: 16px; background: #eff6ff; border-radius: 10px;
  font-size: 14px; color: #2563eb; margin-bottom: 20px;
}

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
