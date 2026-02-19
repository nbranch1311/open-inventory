'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Loader2, X } from 'lucide-react'
import type { AskInventoryAssistantResult, AssistantCitation } from '@/lib/ai/contracts'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Textarea } from '@/components/ui/Textarea'

type Props = {
  householdId: string
}

function CitationLink({ citation, householdId }: { citation: AssistantCitation; householdId: string }) {
  const href =
    citation.entityType === 'item'
      ? `/dashboard/${citation.itemId}?household=${householdId}`
      : `/dashboard/business/products/${citation.itemId}?space=${householdId}`

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-md border border-(--border) bg-(--muted) px-2 py-1 text-sm hover:bg-(--muted)/80"
      aria-label={`View ${citation.entityType}: ${citation.itemName}`}
      data-entity-type={citation.entityType}
      data-item-id={citation.itemId}
    >
      <span>{citation.itemName}</span>
      <span className="text-(--muted-foreground)">
        ({citation.quantity} {citation.unit ?? 'units'})
      </span>
    </Link>
  )
}

export function AIAssistantPanel({ householdId }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [pending, setPending] = useState(false)
  const [messages, setMessages] = useState<
    Array<
      | { id: string; role: 'user'; text: string }
      | {
          id: string
          role: 'assistant'
          text: string
          confidence: 'high' | 'medium' | 'low' | 'refuse'
          citations: AssistantCitation[]
        }
    >
  >([])
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => question.trim().length > 0 && !pending, [pending, question])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || pending) return

    setPending(true)
    setError(null)
    const userMessageId = globalThis.crypto?.randomUUID?.() ?? `user-${Date.now()}`
    setMessages((prev) => [...prev, { id: userMessageId, role: 'user', text: trimmed }])

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId, question: trimmed }),
      })

      const data = (await res.json()) as AskInventoryAssistantResult & { error?: string }

      if (!res.ok) {
        const message =
          (data && 'error' in data && typeof data.error === 'string'
            ? data.error
            : data?.error ?? 'Something went wrong. Please try again.') as string
        setError(message)
        return
      }

      if (data && 'success' in data && data.success) {
        const assistantMessageId = globalThis.crypto?.randomUUID?.() ?? `assistant-${Date.now()}`
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: 'assistant',
            text: data.answer,
            confidence: data.confidence,
            citations: data.citations ?? [],
          },
        ])
      } else {
        setError('Something went wrong. Please try again.')
      }
      setError(null)
      setQuestion('')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="relative" data-testid="ai-assistant-panel">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
        aria-expanded={isOpen}
        aria-controls="ai-assistant-content"
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        Ask AI
      </Button>

      {isOpen ? (
        <div
          id="ai-assistant-content"
          role="region"
          aria-label="AI assistant"
          className="absolute right-0 top-full z-50 mt-2 w-full min-w-[320px] max-w-md rounded-lg border border-(--border) bg-(--card) p-4 shadow-lg"
          aria-live="polite"
          aria-busy={pending}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Ask about your inventory</h3>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIsOpen(false)}
              aria-label="Close AI assistant"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {messages.length > 0 ? (
            <div
              className="mb-3 max-h-64 space-y-2 overflow-auto rounded-md border border-(--border) bg-background p-2"
              aria-label="Assistant response"
              data-testid="ai-response"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={message.role === 'user' ? 'text-right' : 'text-left'}
                >
                  <div
                    className={
                      message.role === 'user'
                        ? 'inline-block max-w-[90%] rounded-md bg-(--muted) px-3 py-2 text-sm text-foreground'
                        : 'inline-block max-w-[90%] rounded-md border border-(--border) bg-(--card) px-3 py-2 text-sm text-foreground'
                    }
                  >
                    {message.text}
                  </div>
                  {'confidence' in message ? (
                    <div className="mt-1 text-xs text-(--muted-foreground)">
                      Confidence: {message.confidence}
                    </div>
                  ) : null}
                  {'citations' in message && message.citations.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2" aria-label="Citations" data-testid="ai-citations">
                      {message.citations.map((c) => (
                        <CitationLink key={`${c.entityType}:${c.itemId}`} citation={c} householdId={householdId} />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Do I have batteries? / What is low stock? / How many units on hand for SKU-001?"
              disabled={pending}
              aria-label="Ask a question about your inventory"
              data-testid="ai-question-input"
              rows={3}
            />
            <Button
              type="submit"
              disabled={!canSubmit}
              aria-label="Submit question"
              data-testid="ai-submit-button"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Thinking...
                </>
              ) : (
                'Ask'
              )}
            </Button>
          </form>

          {error ? (
            <div role="alert" aria-label="Assistant error" className="mt-3" data-testid="ai-error">
              <Alert variant="destructive">{error}</Alert>
            </div>
          ) : null}

          {/* Response renders in the message history above */}
        </div>
      ) : null}
    </div>
  )
}
