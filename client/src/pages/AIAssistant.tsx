import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Sparkles, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageShell";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What is my current occupancy rate?",
  "Which tenants have outstanding balances?",
  "Summarize my portfolio performance this month.",
  "How much rent did I collect recently?",
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm your **WAA PropFlow AI assistant**. Ask me anything about your portfolio — occupancy, finances, delinquencies, or operations." },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = trpc.ai.assistant.useMutation({
    onSuccess: (res: any) => setMessages((m) => [...m, { role: "assistant", content: res.answer }]),
    onError: (e) => { toast.error(e.message); setMessages((m) => [...m, { role: "assistant", content: "Sorry, I ran into an error answering that." }]); },
  });

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, ask.isPending]);

  const send = (q: string) => {
    if (!q.trim() || ask.isPending) return;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");
    ask.mutate({ question: q });
  };

  return (
    <div className="max-w-[900px] mx-auto animate-fade-in h-[calc(100vh-7rem)] flex flex-col">
      <PageHeader title="AI Assistant" subtitle="Portfolio insights powered by AI" icon={<Sparkles className="w-6 h-6" />} />

      <Card className="flex-1 flex flex-col border border-border shadow-sm overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-muted" : "bg-brand text-white"}`}>
                {m.role === "user" ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>
              <div className={`rounded-2xl px-4 py-2.5 max-w-[80%] text-sm ${m.role === "user" ? "bg-brand text-white" : "bg-muted/60"}`}>
                {m.role === "assistant" ? <div className="prose prose-sm max-w-none"><Streamdown>{m.content}</Streamdown></div> : m.content}
              </div>
            </div>
          ))}
          {ask.isPending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center shrink-0"><Sparkles className="w-4 h-4" /></div>
              <div className="rounded-2xl px-4 py-3 bg-muted/60 flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="px-5 pb-2 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted transition-colors">{s}</button>
            ))}
          </div>
        )}

        <div className="border-t border-border p-3 flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input)} placeholder="Ask about your portfolio…" disabled={ask.isPending} />
          <Button onClick={() => send(input)} disabled={ask.isPending || !input.trim()} className="bg-brand hover:bg-brand-dark text-white gap-1.5"><Send className="w-4 h-4" /></Button>
        </div>
      </Card>
    </div>
  );
}
