import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  AsinAnalysisResult,
  CompetitorAnalysisResult,
  ImageAnalysisResult,
  GeneratedListing,
  ProductInfo,
  ComplianceResult,
  FetchedListing,
} from '@/services/listing.service'

export type ListingMode = 'create' | 'optimize'

export const useListingStore = defineStore('listing', () => {
  const mode = ref<ListingMode>('create')
  const currentStep = ref(0)

  // 首次创作 - 商品信息
  const productInfo = ref<ProductInfo>({
    name: '',
    category: 'other',
    features: '',
    market: 'us',
    language: 'en',
    images: [],
  })

  // 优化模式 - ASIN
  const asinInput = ref('')
  const extractedAsin = ref('')

  // 抓取的真实 Listing 数据
  const fetchedListing = ref<FetchedListing | null>(null)

  // 分析结果
  const asinAnalysis = ref<AsinAnalysisResult | null>(null)
  const competitorAnalysis = ref<CompetitorAnalysisResult | null>(null)
  const imageAnalysis = ref<ImageAnalysisResult | null>(null)

  // 竞品 ASIN 列表
  const competitorAsins = ref<string[]>([''])

  // 生成结果
  const generatedListing = ref<GeneratedListing | null>(null)
  const generatedImages = ref<string[]>([])

  // 主图 + 合规检测
  const mainImageUrl = ref<string | null>(null)
  const complianceResult = ref<ComplianceResult | null>(null)
  const isCheckingCompliance = ref(false)

  // 进度状态
  const isAnalyzing = ref(false)
  const isGenerating = ref(false)
  const progress = ref(0)
  const progressMessage = ref('')

  // 计算属性
  const hasProductInfo = computed(() =>
    productInfo.value.name.trim().length > 0 && productInfo.value.images.length > 0
  )

  const hasAsinAnalysis = computed(() => asinAnalysis.value !== null)
  const hasCompetitorAnalysis = computed(() => competitorAnalysis.value !== null)
  const hasGeneratedListing = computed(() => generatedListing.value !== null)
  const hasMainImage = computed(() => mainImageUrl.value !== null)
  const hasComplianceResult = computed(() => complianceResult.value !== null)

  const totalPointsCost = computed(() => {
    let cost = 0
    if (generatedListing.value) {
      cost += 75 // text (45) + main image (30) bundled
    }
    if (competitorAnalysis.value) cost += 20
    if (asinAnalysis.value && mode.value === 'optimize') cost += 20
    return cost
  })

  function setMode(m: ListingMode) {
    mode.value = m
    reset()
  }

  function setStep(step: number) {
    currentStep.value = step
  }

  function nextStep() {
    currentStep.value++
  }

  function prevStep() {
    if (currentStep.value > 0) currentStep.value--
  }

  function updateProgress(p: number, msg: string) {
    progress.value = p
    progressMessage.value = msg
  }

  function updateProductInfo(info: Partial<ProductInfo>) {
    productInfo.value = { ...productInfo.value, ...info }
  }

  function addProductImage(url: string) {
    if (productInfo.value.images.length < 5) {
      productInfo.value.images.push(url)
    }
  }

  function removeProductImage(index: number) {
    productInfo.value.images.splice(index, 1)
  }

  function addCompetitorAsin() {
    if (competitorAsins.value.length < 3) {
      competitorAsins.value.push('')
    }
  }

  function removeCompetitorAsin(index: number) {
    competitorAsins.value.splice(index, 1)
  }

  function updateCompetitorAsin(index: number, value: string) {
    competitorAsins.value[index] = value
  }

  function reset() {
    currentStep.value = 0
    productInfo.value = { name: '', category: 'other', features: '', market: 'us', language: 'en', images: [] }
    asinInput.value = ''
    extractedAsin.value = ''
    fetchedListing.value = null
    asinAnalysis.value = null
    competitorAnalysis.value = null
    imageAnalysis.value = null
    competitorAsins.value = ['']
    generatedListing.value = null
    generatedImages.value = []
    mainImageUrl.value = null
    complianceResult.value = null
    isCheckingCompliance.value = false
    isAnalyzing.value = false
    isGenerating.value = false
    progress.value = 0
    progressMessage.value = ''
  }

  return {
    mode,
    currentStep,
    productInfo,
    asinInput,
    extractedAsin,
    fetchedListing,
    asinAnalysis,
    competitorAnalysis,
    imageAnalysis,
    competitorAsins,
    generatedListing,
    generatedImages,
    mainImageUrl,
    complianceResult,
    isCheckingCompliance,
    isAnalyzing,
    isGenerating,
    progress,
    progressMessage,

    hasProductInfo,
    hasAsinAnalysis,
    hasCompetitorAnalysis,
    hasGeneratedListing,
    hasMainImage,
    hasComplianceResult,
    totalPointsCost,

    setMode,
    setStep,
    nextStep,
    prevStep,
    updateProgress,
    updateProductInfo,
    addProductImage,
    removeProductImage,
    addCompetitorAsin,
    removeCompetitorAsin,
    updateCompetitorAsin,
    reset,
  }
})
