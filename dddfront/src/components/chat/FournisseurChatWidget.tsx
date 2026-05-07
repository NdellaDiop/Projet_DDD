import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import type { AxiosInstance } from "axios";
import { Bot, Send, Trash2 } from "lucide-react";

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

function clampHistory(history: ChatMessage[], maxMessages: number) {
  return history.slice(Math.max(0, history.length - maxMessages));
}

export default function FournisseurChatWidget({ api }: { api: AxiosInstance }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Bonjour, je suis l’assistant du portail. Je peux vous aider sur vos candidatures, vos documents (Mes documents), statuts et prochaines étapes.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending]);

  const reset = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Conversation réinitialisée. Posez-moi une question sur vos candidatures, vos pièces à fournir, statuts et étapes.",
      },
    ]);
    setInput("");
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages = [...messages, { role: "user", content: text } as ChatMessage];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const history = clampHistory(
        nextMessages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role, content: m.content })),
        12
      );

      const res = await api.post("/api/fournisseur/chat", { message: text, history });
      const answer = (res.data?.answer ?? "").toString();

      setMessages((prev) => [...prev, { role: "assistant", content: answer || "Je n’ai pas pu répondre. Réessayez." }]);
    } catch (err: unknown) {
      const responseData =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { status?: number; data?: { message?: string } } }).response
          : undefined;

      const status = responseData?.status;
      const description =
        typeof responseData?.data?.message === "string"
          ? responseData.data.message
          : status === 429
            ? "Trop de demandes. Réessayez dans une minute."
            : "Impossible de contacter l’assistant pour le moment.";

      toast({ title: "Erreur", description, variant: "destructive" });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Je rencontre un souci technique. Réessayez dans un instant." },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        className="fixed bottom-6 right-6 z-40 shadow-lg"
        onClick={() => setOpen(true)}
        size="lg"
        type="button"
      >
        <Bot className="h-5 w-5 mr-2" />
        Assistant IA
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Assistant fournisseur</DialogTitle>
            <DialogDescription>
              Je réponds à partir de vos candidatures et de l’état de vos pièces déposées. Ne partagez pas de mot de passe.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto rounded-lg border bg-white p-3 space-y-3">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-slate-100 text-slate-800 border border-slate-200"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-slate-100 text-slate-800 border border-slate-200">
                  Génération de la réponse…
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-2 pt-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex: Quels documents légaux me manquent ? Comment déposer ma soumission au siège ?"
              rows={3}
              className="resize-none"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") send();
              }}
            />
            <div className="flex items-center justify-between">
              <Button type="button" variant="outline" onClick={reset} disabled={sending}>
                <Trash2 className="h-4 w-4 mr-2" />
                Réinitialiser
              </Button>
              <Button type="button" onClick={send} disabled={!canSend}>
                <Send className="h-4 w-4 mr-2" />
                Envoyer
              </Button>
            </div>
          </div>

          <DialogFooter className="sm:justify-start">
            <p className="text-xs text-muted-foreground">
              Astuce: <strong>Ctrl/⌘ + Entrée</strong> pour envoyer.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

