import { describe, expect, it, vi } from 'vitest'
import { callGeminiWithToolsLoop } from '../../../../../supabase/functions/ai_assistant/GeminiToolLoop'

describe('GeminiToolLoop (edge shared)', () => {
  it('preserves thought_signature across tool call turns', async () => {
    const fetchFn = vi.fn()

    fetchFn
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      functionCall: { name: 'search_inventory', args: { query: 'battery' } },
                      thought_signature: 'sig-1',
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: 'You have Batteries.' }],
                },
              },
            ],
          }),
          { status: 200 },
        ),
      )

    const result = await callGeminiWithToolsLoop<
      { itemId: string; quantity: number },
      { type: 'restock'; itemId: string; reason: string }
    >({
      endpoint: 'https://example.com/models/gemini:generateContent',
      apiKey: 'fake-key',
      systemInstruction: 'system',
      tools: [{ functionDeclarations: [] }],
      question: 'Do I have batteries?',
      fetchFn: fetchFn as unknown as typeof fetch,
      generationConfig: { temperature: 0.1 },
      buildNoMatch: (queryText) => ({
        answer: `no match for ${queryText}`,
        confidence: 'low',
        citations: [],
        suggestions: [],
        clarifyingQuestion: 'clarify',
      }),
      buildSuggestions: () => [],
      toolHandlers: {
        search_inventory: async (args) => ({
          lastQueryText: String(args.query ?? ''),
          citations: [{ itemId: 'item-1', quantity: 2 }],
          toolResponse: { ok: true },
        }),
      },
    })

    expect(result).toMatchObject({
      answer: 'You have Batteries.',
      confidence: 'high',
    })

    const secondRequestInit = fetchFn.mock.calls[1]?.[1] as RequestInit | undefined
    expect(secondRequestInit?.body).toBeTruthy()

    const secondBody = JSON.parse(String(secondRequestInit?.body ?? '{}')) as {
      contents?: Array<{ role: string; parts: Array<Record<string, unknown>> }>
    }
    const modelTurn = (secondBody.contents ?? []).find((entry) => entry.role === 'model')
    expect(modelTurn?.parts?.[0]?.thought_signature).toBe('sig-1')
  })

  it('returns no-match when model answers without tool evidence', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: 'You have batteries.' }],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    )

    const buildNoMatch = vi.fn((queryText: string) => ({
      answer: `no match for ${queryText}`,
      confidence: 'low' as const,
      citations: [],
      suggestions: [],
      clarifyingQuestion: 'clarify',
    }))

    const result = await callGeminiWithToolsLoop<unknown, unknown>({
      endpoint: 'https://example.com/models/gemini:generateContent',
      apiKey: 'fake-key',
      systemInstruction: 'system',
      tools: [{ functionDeclarations: [] }],
      question: 'Do I have batteries?',
      fetchFn: fetchFn as unknown as typeof fetch,
      buildNoMatch,
      buildSuggestions: () => [],
      toolHandlers: {},
    })

    expect(result).toMatchObject({ confidence: 'low' })
    expect(buildNoMatch).toHaveBeenCalledWith('your question')
  })
})

