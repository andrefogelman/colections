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

const VISUAL_FINGERPRINT_PROMPT = `You are a deterministic visual fingerprint system. Given an image, output a FIXED structured description that will ALWAYS be identical for the same image.

RULES:
- Be EXTREMELY consistent. The same image must ALWAYS produce the EXACT same output.
- Use ONLY objective visual facts. Never interpret or speculate.
- Use fixed vocabulary: pick ONE word for each attribute, never synonyms.
- Order elements top-to-bottom, left-to-right.
- No articles, no filler words, no sentences. Only tags and values.

FORMAT (one per line, exact tags):

TYPE: [single word category: figurine/coin/card/stamp/toy/badge/bottle/plate/other]
SUBTYPE: [specific type, e.g. "rubber-duck" "trading-card" "silver-coin"]
SHAPE: [circle/square/rectangle/irregular/humanoid/animal]
COLORS: [list max 5 colors, most dominant first: yellow,orange,black,white,brown]
MATERIAL: [plastic/metal/paper/ceramic/wood/fabric/glass/rubber]
CHARACTERS: [what figures appear: duck,hat,cowboy,horse,mustache,indian]
TEXT_VISIBLE: [exact text/numbers readable, verbatim]
SYMBOLS: [logos/emblems/icons visible]
TEXTURE: [glossy/matte/rough/smooth/embossed]
CONDITION: [new/good/worn/damaged]
DISTINCTIVE: [3-5 unique visual features as comma-separated keywords]`

const DESCRIPTION_PROMPT = `Descreva este objeto de coleção de forma breve e objetiva em português.

FORMATO OBRIGATÓRIO:
Linha 1: Uma frase curta descrevendo o objeto (máximo 15 palavras)
Linha 2 em diante: Lista de características visuais marcantes, uma por linha com "- " no início

EXEMPLO:
Patinho de borracha amarelo vestido de cowboy
- pato amarelo
- chapéu de cowboy marrom
- colete marrom
- bico laranja
- base azul

Seja objetivo e visual. Sem explicações, só o que se vê.`

const TAG_PROMPT = `You are a tagging system for collectible items. Given an image, suggest relevant tags for categorization.

RULES:
- Return ONLY a JSON array of lowercase tag strings
- Suggest 2-6 tags per item
- Tags should be in Portuguese (pt-BR)
- Use short, descriptive words (1-3 words max per tag)
- Focus on: material, type, color, theme, era/style, brand (if visible)
- If existing tags are provided, prefer matching them over creating new ones
- Only create new tags when no existing tag fits

EXISTING_TAGS_PLACEHOLDER

EXAMPLE OUTPUT:
["borracha", "amarelo", "brinquedo", "cowboy", "vintage"]`

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
    const { imageUrl, imageBase64: providedBase64, mediaType: providedMediaType, mode, existingTags } = req.body

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
              { type: 'text', text: 'Output the visual fingerprint tags for this image. Be deterministic.' },
              imageContent,
            ],
          },
        ],
        max_tokens: 400,
        temperature: 0,
        seed: 42,
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
                  { type: 'text', text: 'Descreva este objeto seguindo o formato obrigatório.' },
                  imageContent,
                ],
              },
            ],
            max_tokens: 300,
            temperature: 0,
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

    // Generate tags if mode is 'classify'
    let tags: string[] = []
    if (mode === 'classify') {
      const tagPrompt = TAG_PROMPT.replace(
        'EXISTING_TAGS_PLACEHOLDER',
        existingTags?.length
          ? `EXISTING TAGS IN SYSTEM (prefer these):\n${(existingTags as string[]).join(', ')}`
          : 'No existing tags provided — create new ones freely.'
      )

      const tagRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: tagPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Suggest tags for this collectible item.' },
                imageContent,
              ],
            },
          ],
          max_tokens: 200,
          temperature: 0,
        }),
      })

      if (tagRes.ok) {
        const tagData = await tagRes.json()
        const tagContent = tagData.choices?.[0]?.message?.content ?? '[]'
        try {
          const match = tagContent.match(/\[[\s\S]*\]/)
          tags = match ? JSON.parse(match[0]) : []
        } catch {
          tags = []
        }
      }
    }

    return res.status(200).json({ embedding, description, fingerprint, tags })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
