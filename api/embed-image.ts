import type { VercelRequest, VercelResponse } from '@vercel/node'

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

const VISUAL_FINGERPRINT_PROMPT = `You are a machine vision system that produces structured visual fingerprints for image similarity matching. Your output will be converted to a vector embedding for comparing images.

CRITICAL RULES:
- Output ONLY the structured fingerprint, no prose, no markdown
- Every tiny visual detail matters — two similar objects MUST produce DIFFERENT fingerprints
- Focus on what the CAMERA SEES, not what you know about the object
- Describe visual patterns, not concepts

OUTPUT FORMAT (use exactly these tags, one per line):

OBJECT_TYPE: [exact specific type, e.g. "coin 1-real brazil 2019" not "moeda"]
SHAPE: [outline shape, symmetry, proportions]
DOMINANT_COLORS: [list exact colors with coverage %, e.g. "silver-metallic:60% gold-rim:25% dark-patina:15%"]
COLOR_DISTRIBUTION: [where each color appears: center, border, top, bottom, left, right]
SURFACE_TEXTURE: [glossy/matte/brushed/rough/smooth/engraved/embossed/flat]
VISIBLE_TEXT: [EVERY piece of text/number visible, exact spelling, position on object]
VISIBLE_SYMBOLS: [logos, emblems, coats of arms, icons — describe each precisely]
IMAGERY_FRONT: [what is depicted: people/animals/buildings/patterns, describe pose/position/detail]
IMAGERY_BACK: [if visible]
EDGE_DETAIL: [rim, border, frame — serrated/smooth/decorated/plain]
SIZE_RATIO: [relative proportions of elements within the image]
WEAR_PATTERN: [specific locations of wear, scratches, damage — or "mint/new"]
UNIQUE_MARKS: [anything that distinguishes THIS exact item: errors, variants, stamps, serial numbers, stickers, handwriting]
BACKGROUND: [what's behind/around the object in the photo]
LIGHTING: [how light hits the object, reflections, shadows]
ORIENTATION: [how the object is positioned in frame: centered, angled, rotated degrees]
FINE_DETAILS: [smallest visible details: dot patterns, microtext, engravings, brush strokes, fiber patterns, grain]
MATERIAL_CLUES: [visual indicators of material: metallic reflection, wood grain, fabric weave, plastic sheen, ceramic glaze]
PATTERN_GEOMETRY: [repeating patterns, symmetry axes, geometric shapes within the design]
COMPARISON_KEYS: [5-10 specific visual features that would distinguish this from a very similar item]`

const DESCRIPTION_PROMPT = `Você é um catalogador especialista em objetos colecionáveis. Descreva o objeto em detalhes para um catálogo de coleção.

Inclua:
1. Tipo exato do objeto e subtipo
2. Todos os textos, números, inscrições visíveis
3. O que está retratado (figuras, retratos, cenas)
4. Cores e materiais exatos
5. Detalhes físicos e condição
6. Marcas distintivas, variantes, ano
7. Fabricante/origem se identificável

Escreva em português (Brasil). Seja detalhado e preciso.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })
  }

  try {
    const { imageUrl, imageBase64: providedBase64, mediaType: providedMediaType, mode } = req.body

    let imageBase64: string
    let mediaType = providedMediaType || 'image/jpeg'

    if (providedBase64) {
      imageBase64 = providedBase64
    } else if (imageUrl) {
      const imgRes = await fetch(imageUrl)
      if (!imgRes.ok) {
        return res.status(400).json({ error: `Failed to fetch image: ${imgRes.status}` })
      }
      const arrayBuffer = await imgRes.arrayBuffer()
      imageBase64 = arrayBufferToBase64(arrayBuffer)
      mediaType = imgRes.headers.get('content-type') ?? 'image/jpeg'
    } else {
      return res.status(400).json({ error: 'Missing imageUrl or imageBase64' })
    }

    const imageContent = {
      type: 'image_url' as const,
      image_url: {
        url: `data:${mediaType};base64,${imageBase64}`,
        detail: 'high' as const,
      },
    }

    // Run visual fingerprint (always — needed for embedding)
    const fingerprintPromise = fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: VISUAL_FINGERPRINT_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Generate the visual fingerprint for this image.' },
              imageContent,
            ],
          },
        ],
        max_tokens: 1200,
        temperature: 0.1, // Low temperature for consistent, precise output
      }),
    })

    // Run description only if mode is 'describe' or 'full' (not for search-only embedding)
    const needsDescription = mode !== 'embed-only'
    const descriptionPromise = needsDescription
      ? fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: DESCRIPTION_PROMPT },
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'Descreva este objeto com o máximo de detalhes visuais.' },
                  imageContent,
                ],
              },
            ],
            max_tokens: 800,
          }),
        })
      : null

    // Wait for both in parallel
    const [fingerprintRes, descriptionRes] = await Promise.all([
      fingerprintPromise,
      descriptionPromise ?? Promise.resolve(null),
    ])

    if (!fingerprintRes.ok) {
      const errBody = await fingerprintRes.text()
      return res.status(502).json({ error: `Vision API error: ${fingerprintRes.status}`, details: errBody })
    }

    const fingerprintData = await fingerprintRes.json()
    const fingerprint = fingerprintData.choices?.[0]?.message?.content ?? ''

    if (!fingerprint) {
      return res.status(502).json({ error: 'Failed to generate visual fingerprint' })
    }

    let description = ''
    if (descriptionRes) {
      if (!descriptionRes.ok) {
        const errBody = await descriptionRes.text()
        return res.status(502).json({ error: `Description API error: ${descriptionRes.status}`, details: errBody })
      }
      const descData = await descriptionRes.json()
      description = descData.choices?.[0]?.message?.content ?? ''
    }

    // Generate embedding from the visual fingerprint (NOT the description)
    const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: fingerprint,
        dimensions: 1024,
      }),
    })

    if (!embedRes.ok) {
      const errBody = await embedRes.text()
      return res.status(502).json({ error: `Embeddings API error: ${embedRes.status}`, details: errBody })
    }

    const embedData = await embedRes.json()
    const embedding = embedData.data?.[0]?.embedding

    if (!embedding) {
      return res.status(500).json({ error: 'Failed to generate embedding', details: embedData })
    }

    return res.status(200).json({ embedding, description, fingerprint })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
