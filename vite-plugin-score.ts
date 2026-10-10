import type { Plugin } from 'vite'
import type { IncomingMessage } from 'node:http'

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c))
  return Buffer.concat(chunks).toString('utf8')
}

function env(name: string, fallback = ''): string {
  return (process.env[name] || process.env[`VITE_${name}`] || fallback).trim()
}

/**
 * POST /api/score — 開発サーバ上で Ollama / OpenAI 互換 Llama に投げる。
 * 失敗時は { error } を返し、クライアントがオフライン採点に落ちる。
 */
export function scoreApiPlugin(): Plugin {
  return {
    name: 'shinjicase-score-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/score') || req.method !== 'POST') {
          next()
          return
        }
        try {
          const raw = await readBody(req)
          const packet = JSON.parse(raw) as { prompt?: unknown }
          const prompt = typeof packet.prompt === 'string' ? packet.prompt : `あなたはケース面接の採点官です。次のJSONケースを採点し、必ず次のJSONだけを返してください:
{"total":0-100の整数,"grade":"S|A|B|C|D","breakdown":{"structure":0-25,"bottleneck":0-25,"measures":0-25,"evaluation":0-25},"comment":"日本語で2〜4文"}
JSONに rubric（模範解答の許容条件）があれば、requiredElements・acceptedFirstDecompositions・hotSpots・rejected を基準に採点し、講評で系統への一致・不足を指摘すること。
ケース:
${JSON.stringify(packet)}`

          const ollama = env('OLLAMA_HOST', 'http://127.0.0.1:11434').replace(/\/$/, '')
          const ollamaModel = env('OLLAMA_MODEL', env('LLAMA_MODEL', 'llama3.2'))
          let content = ''
          let model = ollamaModel

          // 1) Ollama
          try {
            const r = await fetch(`${ollama}/api/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: ollamaModel,
                stream: false,
                format: 'json',
                messages: [
                  { role: 'system', content: 'JSONのみ返すケース面接採点官' },
                  { role: 'user', content: prompt },
                ],
              }),
            })
            if (r.ok) {
              const data = (await r.json()) as { message?: { content?: string } }
              content = data.message?.content ?? ''
              model = ollamaModel
            }
          } catch {
            // try OpenAI-compatible next
          }

          // 2) OpenAI-compatible (Groq / Together / OpenRouter / local)
          if (!content) {
            const base = env('LLAMA_BASE_URL', env('VITE_LLAMA_BASE_URL')).replace(/\/$/, '')
            const key = env('LLAMA_API_KEY', env('VITE_LLAMA_API_KEY'))
            model = env('LLAMA_MODEL', env('VITE_LLAMA_MODEL', 'llama3.2'))
            if (base) {
              const r = await fetch(`${base}/chat/completions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(key ? { Authorization: `Bearer ${key}` } : {}),
                },
                body: JSON.stringify({
                  model,
                  temperature: 0.2,
                  messages: [
                    { role: 'system', content: 'JSONのみ返すケース面接採点官' },
                    { role: 'user', content: prompt },
                  ],
                }),
              })
              if (r.ok) {
                const data = (await r.json()) as {
                  choices?: { message?: { content?: string } }[]
                }
                content = data.choices?.[0]?.message?.content ?? ''
              }
            }
          }

          if (!content) {
            res.statusCode = 503
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'llama_unavailable' }))
            return
          }

          const start = content.indexOf('{')
          const end = content.lastIndexOf('}')
          const parsed = JSON.parse(content.slice(start, end + 1)) as Record<string, unknown>
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ...parsed, source: 'llama', model }))
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: String(e) }))
        }
      })
    },
  }
}
