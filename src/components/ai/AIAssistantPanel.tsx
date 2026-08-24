'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Sparkles, Send, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// ── Types ───────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIAssistantPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId?: string | null;
  patientName?: string;
}

const quickActions = [
  'Why is this patient\'s risk elevated?',
  'What should I monitor?',
  'Explain the risk contributors.',
  'What preventive actions are recommended?',
];

// ── Typing indicator ─────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4">
      <div className="bg-slate-100 text-slate-700 rounded-lg rounded-bl-sm px-4 py-3 max-w-[85%]">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Analyzing patient data</span>
          <span className="flex gap-0.5 ml-1">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500 animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500 animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500 animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────
export function AIAssistantPanel({
  open,
  onOpenChange,
  patientId,
  patientName,
}: AIAssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'system-welcome',
      role: 'system',
      content:
        'Hello! I can help you understand patient data and preventive care guidance. What would you like to know?',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const sendMessage = useCallback(
    async (question: string) => {
      if (!question.trim() || isLoading) return;

      if (!patientId) {
        toast.error('Please select a patient first to get personalized assistance.');
        return;
      }

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: question.trim(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputValue('');
      setIsLoading(true);

      try {
        const res = await fetch('/api/ai-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientId, question: question.trim() }),
        });

        if (!res.ok) {
          throw new Error('Failed to get response');
        }

        const data = await res.json();
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.response ?? 'No response received.',
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch {
        const errMsg: Message = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content:
            'Sorry, I encountered an error processing your request. Please try again.',
        };
        setMessages((prev) => [...prev, errMsg]);
        toast.error('Failed to get AI response.');
      } finally {
        setIsLoading(false);
      }
    },
    [patientId, isLoading]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(inputValue);
  }

  const hasConversation = messages.length > 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[400px] p-0 flex flex-col gap-0"
      >
        {/* ── Header ──────────────────────────────────────── */}
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Sparkles className="h-4.5 w-4.5 text-teal-600" />
            AeroGuard AI Assistant
          </SheetTitle>
          {patientName && (
            <Badge
              variant="secondary"
              className="mt-2 w-fit text-xs font-normal"
            >
              Discussing: {patientName}
            </Badge>
          )}
        </SheetHeader>

        {/* ── Messages area ────────────────────────────────── */}
        <ScrollArea ref={scrollRef} className="flex-1 px-5 py-4">
          {/* System / AI messages (left-aligned) */}
          {messages.map((msg) => {
            if (msg.role === 'system') {
              return (
                <div key={msg.id} className="mb-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            }

            if (msg.role === 'assistant') {
              return (
                <div
                  key={msg.id}
                  className="flex items-end gap-2 mb-4"
                >
                  <div className="bg-slate-100 text-slate-700 rounded-lg rounded-bl-sm px-4 py-3 max-w-[85%]">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            }

            // User messages (right-aligned)
            return (
              <div
                key={msg.id}
                className="flex items-end justify-end gap-2 mb-4"
              >
                <div className="bg-teal-600 text-white rounded-lg rounded-br-sm px-4 py-3 max-w-[85%]">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {isLoading && <TypingIndicator />}

          {/* Quick actions (shown before conversation starts) */}
          {!hasConversation && !isLoading && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Quick Questions
              </p>
              {quickActions.map((action) => (
                <button
                  key={action}
                  onClick={() => sendMessage(action)}
                  className="w-full text-left text-sm text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3.5 py-2.5 transition-colors cursor-pointer"
                >
                  {action}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* ── Disclaimer ───────────────────────────────────── */}
        <div className="px-5 py-2 shrink-0">
          <div className="flex items-start gap-1.5 text-[10px] text-slate-400 leading-relaxed">
            <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
            <span>
              AI-generated preventive guidance is for informational support and
              should not replace professional clinical judgment.
            </span>
          </div>
        </div>

        {/* ── Input area ───────────────────────────────────── */}
        <div className="border-t border-slate-100 px-5 py-3 shrink-0">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2"
          >
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                patientId
                  ? 'Ask about this patient...'
                  : 'Select a patient first...'
              }
              disabled={isLoading || !patientId}
              className="flex-1 text-sm"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !inputValue.trim() || !patientId}
              className="shrink-0 bg-teal-600 hover:bg-teal-700"
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
