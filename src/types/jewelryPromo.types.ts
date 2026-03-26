export type JewelryType = 'earring' | 'necklace'

export type JewelryStyleTemplate = 'magazine' | 'ins-natural' | 'luxury-ecommerce'

export type JewelryVisibility = 'high' | 'medium' | 'low'

export interface JewelryPromoInput {
  modelImage: string
  productImage: string
  jewelryType?: JewelryType | null
  styleTemplate: JewelryStyleTemplate
}

export interface JewelryAnalysis {
  faceUsable: boolean
  detectedJewelryType: JewelryType | 'unknown'
  resolvedJewelryType: JewelryType
  jewelryPosition: string
  jewelryVisibility: JewelryVisibility
  materialSummary: string
  quantitySummary: string
  styleSummary: string
  identitySummary: string
  warnings: string[]
  raw: string
}

export interface JewelryShotTemplate {
  id: string
  index: number
  title: string
  subtitle: string
  durationSeconds: number
  framing: string
  focusPoint: string
  motionHint: string
  promptHint: string
}

export interface JewelryShotCandidate {
  id: string
  shotId: string
  shotIndex: number
  imageUrl: string
  sourceUrl?: string
  prompt: string
  model: string
  createdAt: string
}

export interface JewelryShotSelection {
  shotId: string
  candidateId: string
  imageUrl: string
  sourceUrl?: string
  prompt: string
}

export interface VideoGenerationTask {
  id: string
  status: 'submitted' | 'processing' | 'succeed' | 'failed' | 'unknown'
  videoUrl?: string
  duration?: number
  raw?: unknown
}

export interface JewelryPromoResult {
  taskId: string
  billedPoints: number
  analysis: JewelryAnalysis
  shots: JewelryShotTemplate[]
  candidates: Record<string, JewelryShotCandidate[]>
  selections: JewelryShotSelection[]
  coverImageUrl?: string
  video?: VideoGenerationTask
}
