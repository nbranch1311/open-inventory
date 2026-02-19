type GeminiCandidatePayload = Record<string, unknown> & {
  candidates?: Array<{
    finishReason?: string
    content?: { parts?: Array<Record<string, unknown>> }
  }>
}

export type GeminiToolLoopFailure = {
  failure: true
  message: string
}

export type GeminiToolLoopSuccess<TCitation, TSuggestion> = {
  answer: string
  confidence: 'high' | 'low'
  citations: TCitation[]
  suggestions: TSuggestion[]
  clarifyingQuestion: string | null
}

export type GeminiToolHandlerResult<TCitation> = {
  toolResponse: Record<string, unknown>
  citations: TCitation[]
  lastQueryText?: string | null
}

export type GeminiToolHandler<TCitation> = (
  args: Record<string, unknown>,
) => Promise<GeminiToolHandlerResult<TCitation>>

export type GeminiToolLoopOptions<TCitation, TSuggestion> = {
  endpoint: string
  apiKey: string
  systemInstruction: string
  tools: Array<Record<string, unknown>>
  question: string
  maxSteps?: number
  generationConfig?: Record<string, unknown>
  fetchFn: typeof fetch
  toolHandlers: Record<string, GeminiToolHandler<TCitation>>
  buildNoMatch: (queryText: string) => GeminiToolLoopSuccess<TCitation, TSuggestion>
  buildSuggestions: (citations: TCitation[]) => TSuggestion[]
}

export async function callGeminiWithToolsLoop<TCitation, TSuggestion>(
  options: GeminiToolLoopOptions<TCitation, TSuggestion>,
): Promise<
  | GeminiToolLoopSuccess<TCitation, TSuggestion>
  | GeminiToolLoopFailure
  | null
> {
  const contents: Array<Record<string, unknown>> = [
    { role: 'user', parts: [{ text: options.question }] },
  ]

  const maxSteps = Number.isFinite(options.maxSteps) ? Number(options.maxSteps) : 4
  const generationConfig = options.generationConfig ?? {}

  let lastCitations: TCitation[] = []
  let lastQueryText: string | null = null

  for (let step = 0; step < maxSteps; step += 1) {
    const requestBody = {
      systemInstruction: { parts: [{ text: options.systemInstruction }] },
      contents,
      tools: options.tools,
      generationConfig,
    }

    let response: Response
    try {
      response = await options.fetchFn(options.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': options.apiKey,
        },
        body: JSON.stringify(requestBody),
      })
    } catch (error) {
      return {
        failure: true,
        message: error instanceof Error ? error.message : 'fetch_failed',
      }
    }

    if (!response.ok) {
      const errorSnippet = await response.text().catch(() => '')
      return {
        failure: true,
        message: `http_${response.status}:${errorSnippet.slice(0, 200)}`,
      }
    }

    const payload = (await response.json()) as GeminiCandidatePayload
    const candidate = payload?.candidates?.[0]
    const finishReason = candidate?.finishReason
    if (
      typeof finishReason === 'string' &&
      ['SAFETY', 'RECITATION', 'BLOCKED'].includes(finishReason)
    ) {
      return {
        failure: true,
        message: `finish_reason_${finishReason.toLowerCase()}`,
      }
    }

    const candidateParts = candidate?.content?.parts ?? []

    const functionCallContainerPart = candidateParts.find((part) =>
      Boolean(part?.functionCall)
    ) as Record<string, unknown> | undefined
    const functionCallPart = functionCallContainerPart?.functionCall as
      | Record<string, unknown>
      | undefined

    if (!functionCallPart || typeof functionCallPart.name !== 'string') {
      const directText = candidateParts.find(
        (part) => typeof part?.text === 'string',
      )?.text

      if (lastCitations.length === 0) {
        return options.buildNoMatch(lastQueryText ?? 'your question')
      }

      if (typeof directText !== 'string') {
        return null
      }

      return {
        answer: directText,
        confidence: 'high',
        citations: lastCitations,
        suggestions: options.buildSuggestions(lastCitations),
        clarifyingQuestion: null,
      }
    }

    const toolName = functionCallPart.name
    const toolArgs = (functionCallPart.args ?? {}) as Record<string, unknown>
    const handler = options.toolHandlers[toolName]
    if (!handler) return null

    const handlerResult = await handler(toolArgs)
    if (handlerResult.lastQueryText) {
      lastQueryText = handlerResult.lastQueryText
    }

    if (handlerResult.citations.length > 0) {
      lastCitations = handlerResult.citations
    }

    // Preserve the full functionCall part (including any thought_signature fields).
    contents.push({
      role: 'model',
      parts: [functionCallContainerPart ?? { functionCall: functionCallPart }],
    })
    contents.push({
      role: 'user',
      parts: [
        { functionResponse: { name: toolName, response: handlerResult.toolResponse } },
      ],
    })
  }

  return null
}

