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
    const { imageUrl, imageBase64: providedBase64, mediaType: providedMediaType } = req.body

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

    // Step 1: Describe the image with GPT-4o-mini
    const visionRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe this object in detail for a collection catalog. Include: type of object, material, color, size estimation, condition, distinctive features, brand/maker if visible, era/period if identifiable. Be concise but thorough. Respond in both English and Portuguese.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mediaType};base64,${imageBase64}`,
                  detail: 'low',
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      }),
    })

    if (!visionRes.ok) {
      const errBody = await visionRes.text()
      return res.status(502).json({ error: `OpenAI Vision API error: ${visionRes.status}`, details: errBody })
    }

    const visionData = await visionRes.json()
    const description = visionData.choices?.[0]?.message?.content ?? ''

    if (!description) {
      return res.status(502).json({ error: 'Vision API returned empty description' })
    }

    // Step 2: Generate text embedding from the description
    const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: description,
        dimensions: 512,
      }),
    })

    if (!embedRes.ok) {
      const errBody = await embedRes.text()
      return res.status(502).json({ error: `OpenAI Embeddings API error: ${embedRes.status}`, details: errBody })
    }

    const embedData = await embedRes.json()
    const embedding = embedData.data?.[0]?.embedding

    if (!embedding) {
      return res.status(500).json({ error: 'Failed to generate embedding', details: embedData })
    }

    return res.status(200).json({ embedding, description })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
