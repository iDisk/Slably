import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMessages,
  useSendMessage,
  getMessagesQueryKey,
} from "@workspace/api-client-react";

interface Props {
  projectId:     number;
  withUserId:    number;
  withUserName:  string;
  currentUserId: number;
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function fmtTime(iso: string) {
  try { return format(new Date(iso), "HH:mm"); } catch { return ""; }
}

export function ChatBox({ projectId, withUserId, withUserName, currentUserId }: Props) {
  const [text, setText] = useState("");
  const bottomRef       = useRef<HTMLDivElement>(null);
  const queryClient     = useQueryClient();

  const { data: messages = [], isLoading } = useGetMessages(projectId, withUserId);
  const sendMutation = useSendMessage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const body = text.trim();
    if (!body) return;
    setText("");
    sendMutation.mutate(
      { projectId, body: { recipient_id: withUserId, body } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getMessagesQueryKey(projectId, withUserId) }) }
    );
  }

  return (
    <div className="flex flex-col border border-border rounded-xl overflow-hidden" style={{ maxHeight: 500 }}>
      {/* Header navy */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: "#1B3A5C" }}>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ backgroundColor: "#F97316" }}
        >
          {initials(withUserName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{withUserName}</p>
          <p className="text-xs text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Online
          </p>
        </div>
      </div>

      {/* Área de mensajes */}
      <div
        className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-3"
        style={{ minHeight: 320, maxHeight: 370 }}
      >
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 gap-3 text-muted-foreground">
            <MessageSquare className="w-10 h-10 opacity-25" />
            <p className="text-sm text-center">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map(msg => {
            const isOwn = msg.senderId === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[70%] space-y-0.5">
                  <div
                    className={`px-3.5 py-2 text-sm break-words leading-snug ${
                      isOwn
                        ? "text-white rounded-t-2xl rounded-bl-2xl rounded-br-sm"
                        : "bg-white border border-slate-200 text-foreground rounded-t-2xl rounded-br-2xl rounded-bl-sm"
                    }`}
                    style={isOwn ? { backgroundColor: "#F97316" } : {}}
                  >
                    {msg.body}
                  </div>
                  <div
                    className={`flex items-center gap-1 text-[10px] text-muted-foreground px-1 ${
                      isOwn ? "justify-end" : "justify-start"
                    }`}
                  >
                    <span>{fmtTime(msg.createdAt)}</span>
                    {isOwn && (
                      <span className="tracking-tight">{msg.readAt ? "✓✓" : "✓"}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-white border-t border-border">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          placeholder="Write a message..."
          className="flex-1 text-sm border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 bg-white"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-white shrink-0 disabled:opacity-50 transition-opacity"
          style={{ backgroundColor: "#F97316" }}
        >
          {sendMutation.isPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
