/**
 * Listing 业务服务
 *
 * 封装 ASIN 分析、竞品分析、Listing 文案生成、图片生成、优化等能力，
 * 底层复用 geminiService 和 imageGenerationService。
 */

import { geminiService } from './gemini.service'
import { imageGenerationService, type GenerationResult } from './atomic/imageGeneration.service'
import { LISTING_PROMPTS } from '@/config/listing.config'

export interface AsinAnalysisResult {
  productName: string
  category: string
  overallScore: number
  strengths: { aspect: string; detail: string }[]
  weaknesses: { aspect: string; detail: string }[]
  suggestions: string[]
  keywordsFound: string[]
  keywordsMissing: string[]
}

export interface CompetitorAnalysisResult {
  competitorHighlights: string[]
  competitorWeaknesses: string[]
  topKeywords: string[]
  pricingInsight: string
  differentiationOpportunities: string[]
}

export interface ImageAnalysisResult {
  visualFeatures: string[]
  productType: string
  colorScheme: string
  materialTexture: string
  sellingPoints: string[]
}

export interface GeneratedListing {
  title: string
  bulletPoints: string[]
  description: string
  searchTerms: string[]
  targetAudience?: string
  improvements?: string[]
}

export interface ProductInfo {
  name: string
  category: string
  features: string
  market: string
  language: string
  images: string[]
}

export interface FetchedListing {
  asin: string
  url: string
  title: string
  bulletPoints: string[]
  description: string
  price: string
  rating: string
  reviewCount: string
  imageUrls: string[]
  brand: string
  category: string
}

export interface ComplianceItem {
  rule: string
  passed: boolean
  detail: string
}

export interface ComplianceResult {
  passed: boolean
  score: number
  items: ComplianceItem[]
}

type ProgressCallback = (progress: number, message: string) => void

class ListingService {
  /**
   * 从用户输入中提取 ASIN（支持 ASIN 码或 Amazon 链接）
   */
  extractAsin(input: string): string | null {
    const trimmed = input.trim()
    const asinPattern = /^[A-Z0-9]{10}$/
    if (asinPattern.test(trimmed)) return trimmed

    const urlPattern = /\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i
    const match = trimmed.match(urlPattern)
    return match ? match[1].toUpperCase() : null
  }

  /**
   * 从后端抓取 Amazon 商品真实数据
   */
  async fetchListing(asin: string, market: string = 'us'): Promise<FetchedListing | null> {
    const API_BASE = import.meta.env.VITE_API_BASE || ''
    try {
      const res = await fetch(`${API_BASE}/api/amazon/fetch-listing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asin, market }),
      })
      const data = await res.json()
      if (data.success && data.listing) {
        return data.listing as FetchedListing
      }
      console.warn('[ListingService] Fetch listing failed:', data.message)
      return null
    } catch (err) {
      console.error('[ListingService] Fetch listing error:', err)
      return null
    }
  }

  /**
   * 分析现有 Listing（通过 ASIN -- 先真实抓取再分析）
   */
  async analyzeByAsin(
    asin: string,
    onProgress?: ProgressCallback,
    market: string = 'us'
  ): Promise<AsinAnalysisResult> {
    onProgress?.(5, '正在访问 Amazon 商品页面...')

    const listing = await this.fetchListing(asin, market)

    if (!listing || !listing.title) {
      onProgress?.(10, '抓取失败，切换到 AI 推断模式...')
      throw new Error(
        '无法获取商品真实数据。可能的原因：\n' +
        '1. ASIN 不存在或已下架\n' +
        '2. Amazon 触发了反爬机制（请稍后重试）\n' +
        '3. 后端服务未启动（请确认 server/index.js 正在运行）'
      )
    }

    this._lastFetchedListing = listing
    onProgress?.(30, `已获取商品: ${listing.title.substring(0, 50)}...`)

    const prompt = LISTING_PROMPTS.analyzeRealListing({
      asin,
      title: listing.title,
      bulletPoints: listing.bulletPoints,
      description: listing.description,
      price: listing.price,
      rating: listing.rating,
      reviewCount: listing.reviewCount,
      brand: listing.brand,
      imageCount: listing.imageUrls.length,
    })

    onProgress?.(50, '正在用 AI 深度分析真实 Listing 数据...')
    const raw = await geminiService.generateText(prompt)

    onProgress?.(85, '正在整理分析报告...')
    const result = this.parseJson<AsinAnalysisResult>(raw, {
      productName: listing.title,
      category: '',
      overallScore: 50,
      strengths: [],
      weaknesses: [],
      suggestions: [],
      keywordsFound: [],
      keywordsMissing: [],
    })

    if (!result.productName) result.productName = listing.title

    onProgress?.(100, '分析完成')
    return result
  }

  /**
   * 获取上次抓取的 Listing 原始数据
   */
  getLastFetchedListing(): FetchedListing | null {
    return this._lastFetchedListing
  }

  private _lastFetchedListing: FetchedListing | null = null

  /**
   * 竞品分析（真实抓取 + AI 分析）
   */
  async analyzeCompetitors(
    asins: string[],
    productName: string,
    onProgress?: ProgressCallback
  ): Promise<CompetitorAnalysisResult> {
    onProgress?.(5, '正在抓取竞品商品数据...')

    const fetchedCompetitors: Array<{
      asin: string; title: string; bulletPoints: string[]
      price: string; rating: string; reviewCount: string
    }> = []

    for (let i = 0; i < asins.length; i++) {
      onProgress?.(
        5 + Math.round((i / asins.length) * 30),
        `正在抓取竞品 ${i + 1}/${asins.length}: ${asins[i]}...`
      )
      const listing = await this.fetchListing(asins[i])
      if (listing && listing.title) {
        fetchedCompetitors.push({
          asin: asins[i],
          title: listing.title,
          bulletPoints: listing.bulletPoints,
          price: listing.price,
          rating: listing.rating,
          reviewCount: listing.reviewCount,
        })
      }
    }

    if (!fetchedCompetitors.length) {
      throw new Error('所有竞品 ASIN 均未能抓取到数据，请检查 ASIN 是否正确或稍后重试')
    }

    onProgress?.(40, `已抓取 ${fetchedCompetitors.length} 个竞品，正在分析...`)

    const prompt = LISTING_PROMPTS.analyzeCompetitorListings(fetchedCompetitors, productName)

    onProgress?.(60, '正在用 AI 分析竞品真实数据...')
    const raw = await geminiService.generateText(prompt)

    onProgress?.(90, '正在生成洞察报告...')
    const result = this.parseJson<CompetitorAnalysisResult>(raw, {
      competitorHighlights: [],
      competitorWeaknesses: [],
      topKeywords: [],
      pricingInsight: '',
      differentiationOpportunities: [],
    })

    onProgress?.(100, '竞品分析完成')
    return result
  }

  /**
   * 分析商品图片
   */
  async analyzeProductImages(
    imageUrls: string[],
    productName: string,
    features: string,
    onProgress?: ProgressCallback
  ): Promise<ImageAnalysisResult> {
    onProgress?.(10, '正在上传图片到 AI...')
    const prompt = LISTING_PROMPTS.analyzeProductImages(productName, features)

    onProgress?.(40, '正在识别商品特征...')
    const raw = await geminiService.generateWithImages(prompt, imageUrls)

    onProgress?.(90, '图片分析完成')
    const result = this.parseJson<ImageAnalysisResult>(raw, {
      visualFeatures: [],
      productType: '',
      colorScheme: '',
      materialTexture: '',
      sellingPoints: [],
    })

    onProgress?.(100, '完成')
    return result
  }

  /**
   * 生成完整 Listing 文案
   */
  async generateListingText(
    productInfo: ProductInfo,
    imageAnalysis?: string,
    competitorAnalysis?: string,
    onProgress?: ProgressCallback
  ): Promise<GeneratedListing> {
    onProgress?.(10, '正在构建生成策略...')

    const marketLabel = productInfo.market === 'us' ? 'Amazon.com (美国)'
      : productInfo.market === 'uk' ? 'Amazon.co.uk (英国)'
      : productInfo.market === 'jp' ? 'Amazon.co.jp (日本)'
      : 'Amazon.com (美国)'

    const prompt = LISTING_PROMPTS.generateListing({
      productName: productInfo.name,
      category: productInfo.category,
      features: productInfo.features,
      market: marketLabel,
      language: productInfo.language,
      imageAnalysis,
      competitorAnalysis,
    })

    onProgress?.(30, '正在生成标题...')
    const raw = await geminiService.generateText(prompt)

    onProgress?.(80, '正在优化文案...')
    const result = this.parseJson<GeneratedListing>(raw, {
      title: '',
      bulletPoints: [],
      description: '',
      searchTerms: [],
    })

    onProgress?.(100, '文案生成完成')
    return result
  }

  /**
   * 生成商品图片
   */
  async generateListingImage(
    productName: string,
    features: string,
    referenceImages: string[],
    style: string = 'professional',
    onProgress?: ProgressCallback
  ): Promise<GenerationResult> {
    onProgress?.(10, '正在准备图片生成...')
    const prompt = LISTING_PROMPTS.generateProductImage(productName, features, style)

    onProgress?.(30, '正在调用 AI 生图...')
    const result = await imageGenerationService.generate(
      'custom',
      prompt,
      referenceImages,
      { aspectRatio: '1:1', imageSize: '2K' }
    )

    onProgress?.(100, result.success ? '图片生成成功' : '图片生成失败')
    return result
  }

  /**
   * 优化现有 Listing
   */
  async optimizeListing(
    analysisResult: AsinAnalysisResult,
    language: string = 'en',
    onProgress?: ProgressCallback
  ): Promise<GeneratedListing> {
    onProgress?.(10, '正在制定优化方案...')

    const analysisText = JSON.stringify({
      score: analysisResult.overallScore,
      strengths: analysisResult.strengths,
      weaknesses: analysisResult.weaknesses,
      suggestions: analysisResult.suggestions,
      missingKeywords: analysisResult.keywordsMissing,
    })

    const prompt = LISTING_PROMPTS.optimizeListing({
      analysisResult: analysisText,
      language,
    })

    onProgress?.(30, '正在重写标题...')
    const raw = await geminiService.generateText(prompt)

    onProgress?.(70, '正在优化五点描述...')
    const result = this.parseJson<GeneratedListing>(raw, {
      title: '',
      bulletPoints: [],
      description: '',
      searchTerms: [],
    })

    onProgress?.(100, '优化完成')
    return result
  }

  /**
   * 生成 Amazon 合规主图（纯白背景，基于实拍图）
   */
  async generateMainImage(
    referenceImages: string[],
    productName: string,
    features: string,
    onProgress?: ProgressCallback
  ): Promise<GenerationResult> {
    onProgress?.(10, '正在准备主图生成...')
    const prompt = LISTING_PROMPTS.generateMainImage(productName, features)

    onProgress?.(30, '正在基于实拍图生成 Amazon 合规主图...')
    const result = await imageGenerationService.generate(
      'custom',
      prompt,
      referenceImages,
      { aspectRatio: '1:1', imageSize: '2K' }
    )

    onProgress?.(100, result.success ? '主图生成成功' : '主图生成失败')
    return result
  }

  /**
   * Amazon 主图合规检测（9 条规则逐项检查）
   */
  async checkMainImageCompliance(
    imageUrl: string,
    onProgress?: ProgressCallback
  ): Promise<ComplianceResult> {
    onProgress?.(10, '正在启动合规检测...')
    const prompt = LISTING_PROMPTS.checkMainImageCompliance()

    onProgress?.(40, '正在逐项检查 Amazon 主图规范...')
    const raw = await geminiService.generateWithImagesUsingFlash(prompt, [imageUrl])

    onProgress?.(90, '正在整理检测报告...')
    const result = this.parseJson<ComplianceResult>(raw, {
      passed: false,
      score: 0,
      items: [],
    })

    onProgress?.(100, result.passed ? '合规检测通过' : '存在不合规项')
    return result
  }

  /**
   * 安全解析 JSON，带 fallback
   */
  private parseJson<T>(raw: string, fallback: T): T {
    try {
      let cleaned = raw.trim()
      const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (fenceMatch) cleaned = fenceMatch[1].trim()
      return JSON.parse(cleaned) as T
    } catch {
      console.warn('[ListingService] JSON parse failed, using fallback. Raw:', raw.substring(0, 200))
      return fallback
    }
  }
}

export const listingService = new ListingService()
export default ListingService
