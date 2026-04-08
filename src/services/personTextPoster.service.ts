import { geminiService } from '@/services/gemini.service'

export interface PersonTextPosterRequest {
  personImage: string
  textImage: string
  guestName: string
  personIntroduction: string
  date?: string
  location?: string
  aspectRatio?: string
  imageSize?: string
  temperature?: number
}

export const PERSON_TEXT_POSTER_DEFAULT_ASPECT_RATIO = '3:4'

function formatOptionalField(label: string, value?: string): string {
  const normalizedValue = value?.trim()
  return normalizedValue ? `- ${label}: ${normalizedValue}` : `- ${label}: not provided`
}

export function buildPersonTextPosterPrompt({
  guestName,
  personIntroduction,
  date,
  location
}: Pick<PersonTextPosterRequest, 'guestName' | 'personIntroduction' | 'date' | 'location'>): string {
  const normalizedGuestName = guestName.trim()
  const normalizedPersonIntroduction = personIntroduction.trim()

  return `You will receive exactly two reference images in a single image-generation request.

[Structured poster inputs]
- Guest name: ${normalizedGuestName}
- Person introduction: ${normalizedPersonIntroduction}
${formatOptionalField('Date', date)}
${formatOptionalField('Location', location)}

[Image role definition]
- Image 1 = person source. Preserve the person's face, identity cues, hairstyle, age impression, pose feeling, and recognizability. Person truthfulness is a non-negotiable priority.
- Image 2 = poster information source. Preserve all of its visible text content and factual information truthfully, but do not treat its layout as a fixed template.

[Priority]
1. Highest priority: keep the person from Image 1 truthful and clearly recognizable.
2. Preserve all information from Image 2. Do not omit, rewrite into unsupported claims, shorten away key information, or invent any extra facts, titles, credentials, promises, schedules, or selling points.
3. Include the structured inputs above in the poster. Guest name and person introduction must appear clearly. Date and location must appear when provided.
4. Generate exactly one concise promotional slogan. The slogan must be distilled only from Image 2 content plus the structured inputs above. Do not introduce any unsupported message.

[Layout and design direction]
- You may redesign the composition, hierarchy, alignment, spacing, scale, typography arrangement, background, color system, and visual emphasis to create a premium commercial poster.
- Aim for a design-forward, polished, high-end result with strong visual storytelling, refined typography hierarchy, cinematic/editorial poster aesthetics, premium lighting, layered depth, bold focal composition, and commercially usable finish.
- Avoid plain white-background black-text document styling unless the source content explicitly requires that look.
- Keep the information readable and well-organized even after layout recomposition.

[Output requirements]
- Generate one finished poster image only.
- Infer the topic or category generically from Image 2 content. Do not assume this is a course poster unless the source content indicates that.
- Treat Image 2 as the source of content truth, not as a rigid layout to be copied.
- Do not output a textless version, wireframe, collage, or multiple variations.
- Keep the final result clean, usable, visually coherent, and commercially persuasive without hallucinating content.`
}

export async function generatePersonTextPoster({
  personImage,
  textImage,
  guestName,
  personIntroduction,
  date,
  location,
  aspectRatio = PERSON_TEXT_POSTER_DEFAULT_ASPECT_RATIO,
  imageSize = '2K',
  temperature = 0.2
}: PersonTextPosterRequest): Promise<string> {
  return geminiService.generateImage(
    buildPersonTextPosterPrompt({
      guestName,
      personIntroduction,
      date,
      location
    }),
    [personImage, textImage],
    {
      aspectRatio,
      imageSize,
      temperature
    }
  )
}
