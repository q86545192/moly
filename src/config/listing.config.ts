/**
 * Listing 生成/分析/优化 提示词模板与配置
 */

export const AMAZON_CATEGORIES = [
  { value: 'electronics', label: '消费电子 Electronics' },
  { value: 'clothing', label: '服装鞋靴 Clothing & Shoes' },
  { value: 'home', label: '家居厨房 Home & Kitchen' },
  { value: 'beauty', label: '美妆个护 Beauty & Personal Care' },
  { value: 'sports', label: '运动户外 Sports & Outdoors' },
  { value: 'toys', label: '玩具游戏 Toys & Games' },
  { value: 'pet', label: '宠物用品 Pet Supplies' },
  { value: 'tools', label: '工具改装 Tools & Home Improvement' },
  { value: 'office', label: '办公用品 Office Products' },
  { value: 'garden', label: '庭院花园 Patio & Garden' },
  { value: 'baby', label: '母婴用品 Baby' },
  { value: 'automotive', label: '汽车配件 Automotive' },
  { value: 'other', label: '其他 Other' },
]

export const TARGET_MARKETS = [
  { value: 'us', label: '美国 (Amazon.com)', lang: 'en' },
  { value: 'uk', label: '英国 (Amazon.co.uk)', lang: 'en' },
  { value: 'de', label: '德国 (Amazon.de)', lang: 'de' },
  { value: 'jp', label: '日本 (Amazon.co.jp)', lang: 'ja' },
  { value: 'ca', label: '加拿大 (Amazon.ca)', lang: 'en' },
]

export const LISTING_POINTS_COST = {
  titleAndBullets: 20,
  description: 15,
  keywords: 10,
  mainImage: 30,
  fullGeneration: 75,
  competitorAnalysis: 20,
  promoImage: 30,
  promoVideo: 50,
}

export const LISTING_PROMPTS = {
  analyzeRealListing: (listing: {
    asin: string
    title: string
    bulletPoints: string[]
    description: string
    price: string
    rating: string
    reviewCount: string
    brand: string
    imageCount: number
  }) => `
你是一个 Amazon Listing 分析专家。以下是从 Amazon 真实抓取的商品 Listing 数据，请基于这些真实数据进行专业分析。

【商品真实数据】
- ASIN: ${listing.asin}
- 标题: ${listing.title || '(未抓取到)'}
- 品牌: ${listing.brand || '(未知)'}
- 价格: ${listing.price || '(未知)'}
- 评分: ${listing.rating || '(未知)'} (${listing.reviewCount || '0'} 条评价)
- 图片数量: ${listing.imageCount} 张
- 五点描述 (${listing.bulletPoints.length} 条):
${listing.bulletPoints.map((bp, i) => `  ${i + 1}. ${bp}`).join('\n') || '  (未抓取到)'}
- 产品描述: ${listing.description || '(未抓取到)'}

请基于以上真实数据，从 SEO、转化率、竞争力等角度进行深入分析。

请按以下 JSON 格式输出（不要包含 markdown 代码块标记）：
{
  "productName": "${listing.title ? listing.title.substring(0, 80) : ''}",
  "category": "根据标题和描述推断的商品类目",
  "overallScore": 0到100的综合评分,
  "strengths": [
    {"aspect": "具体方面", "detail": "基于真实数据的具体亮点描述"}
  ],
  "weaknesses": [
    {"aspect": "具体方面", "detail": "基于真实数据的具体不足描述"}
  ],
  "suggestions": [
    "基于实际问题的具体优化建议"
  ],
  "keywordsFound": ["从标题和五点中提取的实际关键词"],
  "keywordsMissing": ["该类目应包含但标题/五点中缺失的关键词"]
}

分析要点：
1. 标题分析：长度是否合适（建议150-200字符）、是否包含核心关键词、品牌占位是否合理
2. 五点描述：数量是否为5条、每条是否以核心卖点开头、是否有emoji、长度是否充分
3. 关键词：标题和五点中实际使用了哪些关键词、哪些高价值关键词被遗漏
4. 图片：数量是否足够（建议7张以上）
5. 评价：评分和评价数量反映的市场表现
6. 描述：是否有产品描述、描述是否充分详细
  `.trim(),

  analyzeCompetitorListings: (competitors: Array<{
    asin: string
    title: string
    bulletPoints: string[]
    price: string
    rating: string
    reviewCount: string
  }>, productName: string) => `
你是一个 Amazon 竞品分析专家。以下是从 Amazon 真实抓取的竞品 Listing 数据，请基于真实数据为商品 "${productName}" 提供竞品洞察。

【竞品真实数据】
${competitors.map((c, i) => `
--- 竞品 ${i + 1} (${c.asin}) ---
标题: ${c.title || '(未抓取到)'}
价格: ${c.price || '(未知)'}
评分: ${c.rating || '(未知)'} (${c.reviewCount || '0'} 条评价)
五点描述:
${c.bulletPoints.map((bp, j) => `  ${j + 1}. ${bp}`).join('\n') || '  (未抓取到)'}
`).join('\n')}

请基于以上真实竞品数据进行分析。

请按以下 JSON 格式输出（不要包含 markdown 代码块标记）：
{
  "competitorHighlights": [
    "竞品们共同使用的优势卖点或策略（基于真实数据总结）"
  ],
  "competitorWeaknesses": [
    "竞品们共同存在的不足（基于真实数据总结）"
  ],
  "topKeywords": ["从竞品标题和五点中提取的高频关键词"],
  "pricingInsight": "基于真实价格数据的定价分析",
  "differentiationOpportunities": [
    "基于竞品分析发现的差异化机会"
  ]
}
  `.trim(),

  analyzeProductImages: (productName: string, features: string) => `
请分析上传的商品图片，结合以下商品信息提取关键视觉特征：

商品名称：${productName}
商品特点：${features}

请按以下 JSON 格式输出（不要包含 markdown 代码块标记）：
{
  "visualFeatures": ["视觉特征1", "视觉特征2", "视觉特征3"],
  "productType": "识别出的产品类型",
  "colorScheme": "主色调描述",
  "materialTexture": "材质纹理描述",
  "sellingPoints": ["从图片中识别的卖点1", "从图片中识别的卖点2"]
}
  `.trim(),

  generateListing: (params: {
    productName: string
    category: string
    features: string
    market: string
    language: string
    imageAnalysis?: string
    competitorAnalysis?: string
  }) => `
你是一个资深的 Amazon Listing 撰写专家，精通 SEO 优化和消费者心理学。

请为以下商品生成完整的 Amazon Listing：

【商品信息】
- 商品名称：${params.productName}
- 商品类目：${params.category}
- 商品特点：${params.features}
- 目标市场：${params.market}
- 输出语言：${params.language === 'en' ? 'English' : '中文'}

${params.imageAnalysis ? `【图片分析结果】\n${params.imageAnalysis}\n` : ''}
${params.competitorAnalysis ? `【竞品分析参考】\n${params.competitorAnalysis}\n` : ''}

请按以下 JSON 格式输出（不要包含 markdown 代码块标记）：
{
  "title": "SEO优化的商品标题（不超过200字符，包含核心关键词）",
  "bulletPoints": [
    "卖点1（以核心功能或优势开头，带emoji）",
    "卖点2（以核心功能或优势开头，带emoji）",
    "卖点3（以核心功能或优势开头，带emoji）",
    "卖点4（以核心功能或优势开头，带emoji）",
    "卖点5（以核心功能或优势开头，带emoji）"
  ],
  "description": "详细的产品描述（2-3段，突出产品价值和使用场景）",
  "searchTerms": ["搜索关键词1", "搜索关键词2", "搜索关键词3", "搜索关键词4", "搜索关键词5", "搜索关键词6", "搜索关键词7", "搜索关键词8"],
  "targetAudience": "目标受众描述"
}

要求：
1. 标题要包含品牌占位、核心关键词、产品属性、使用场景
2. 五点描述要层次分明，每条突出一个核心卖点
3. 描述要有感染力，能触发购买欲望
4. 搜索关键词要覆盖长尾词和同义词
  `.trim(),

  optimizeListing: (params: {
    originalTitle?: string
    originalBullets?: string[]
    analysisResult: string
    language: string
  }) => `
你是一个 Amazon Listing 优化专家。请基于以下分析结果，优化现有的 Listing。

【现有 Listing】
标题：${params.originalTitle || '(未提供)'}
五点描述：${params.originalBullets?.join('\n') || '(未提供)'}

【分析结果】
${params.analysisResult}

请按以下 JSON 格式输出优化后的完整 Listing（不要包含 markdown 代码块标记），语言为 ${params.language === 'en' ? 'English' : '中文'}：
{
  "title": "优化后的标题",
  "bulletPoints": [
    "优化后的卖点1",
    "优化后的卖点2",
    "优化后的卖点3",
    "优化后的卖点4",
    "优化后的卖点5"
  ],
  "description": "优化后的产品描述",
  "searchTerms": ["优化后的关键词1", "优化后的关键词2", "优化后的关键词3", "优化后的关键词4", "优化后的关键词5"],
  "improvements": [
    "优化改动说明1",
    "优化改动说明2",
    "优化改动说明3"
  ]
}
  `.trim(),

  generateProductImage: (productName: string, features: string, style: string = 'professional') => `
请为以下 Amazon 商品生成一张专业的电商主图：

商品名称：${productName}
商品特点：${features}
图片风格：${style === 'lifestyle' ? '生活场景图（产品在真实使用场景中）' : '纯白背景专业产品图'}

要求：
1. 图片清晰、高质量
2. 产品主体突出、构图专业
3. 光线自然、色彩准确
4. 适合作为 Amazon 商品主图使用
5. ${style === 'lifestyle' ? '场景自然、有生活氛围' : '纯白背景（#FFFFFF），无其他杂物'}
  `.trim(),

  generateMainImage: (productName: string, features: string) => `
请基于提供的商品实拍图，生成一张严格符合 Amazon 主图规范的产品图：

商品名称：${productName}
商品特点：${features}

【Amazon 主图强制规范】
1. 背景必须是纯白色（RGB 255,255,255）
2. 产品必须占据图片面积的 85% 以上
3. 不允许出现任何文字、Logo、水印、边框、图标
4. 不允许出现额外配件、道具、赠品（仅展示售卖商品本身）
5. 产品必须完整展示，不能裁切掉任何部分
6. 必须是真实产品照片风格，不能是插画或手绘
7. 光线均匀自然，无明显阴影干扰
8. 产品居中放置，周围留白均匀

请严格按照以上规范生成图片，这关系到商品能否通过 Amazon 审核上架。
  `.trim(),

  checkMainImageCompliance: () => `
你是 Amazon 主图合规审核专家。请严格按照以下 9 条 Amazon 主图规则，逐项检查这张商品图片。

【Amazon 主图合规规则】
1. 纯白背景：背景必须是纯白色（RGB 255,255,255），不能有渐变、纹理或任何颜色
2. 产品占比：产品必须占据图片面积的 85% 以上
3. 无文字水印：图片中不能有任何文字、Logo、水印、边框、图标
4. 无额外道具：不能有非售卖商品的配件、道具、赠品出现
5. 图片尺寸：图片质量应足够高清（建议最长边 1600px 以上）
6. 真实照片：必须是真实产品照片或高质量渲染图，不能是插画/手绘
7. 无人物模特：除服装类目外，不应出现人物模特
8. 产品完整：产品必须完整展示，不能被裁切
9. 内容合规：无色情、暴力或其他违规内容

请按以下 JSON 格式输出检测结果（不要包含 markdown 代码块标记）：
{
  "passed": true,
  "score": 95,
  "items": [
    {"rule": "纯白背景", "passed": true, "detail": "背景为纯白色，符合要求"},
    {"rule": "产品占比", "passed": true, "detail": "产品占比约 90%，符合 85% 要求"},
    {"rule": "无文字水印", "passed": true, "detail": "未检测到文字或水印"},
    {"rule": "无额外道具", "passed": true, "detail": "仅展示商品本身"},
    {"rule": "图片尺寸", "passed": true, "detail": "图片质量清晰"},
    {"rule": "真实照片", "passed": true, "detail": "为真实产品照片风格"},
    {"rule": "无人物模特", "passed": true, "detail": "无人物出现"},
    {"rule": "产品完整", "passed": true, "detail": "产品完整展示，无裁切"},
    {"rule": "内容合规", "passed": true, "detail": "内容合规，无违规元素"}
  ]
}

注意：
- passed 总字段：只有当所有 9 项都通过时才为 true
- score：0-100 的综合评分
- 每项的 detail 需要给出具体观察到的情况
  `.trim(),
}
