"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import {
  clearSession,
  createConversation,
  getConversations,
  getMessages,
  getProducts,
  getStoredSession,
  markConversationRead,
  mergeConversationUpdate,
  normalizeConversation,
  normalizeMessage,
  saveSession,
  SOCKET_BASE_URL,
} from "@/lib/api";
import type { AuthSession, Conversation, Message, MessageStatus, Product, UserRole } from "@/types/chat";

interface ChatAppProps {
  role: UserRole;
}

export default function ChatApp({ role }: ChatAppProps) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const [socketStatus, setSocketStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const [loadingMessages, setLoadingMessages] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const joinedConversationRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const sessionRef = useRef<AuthSession | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const storedSession = getStoredSession();
    if (!storedSession || storedSession.role !== role) {
      router.replace("/login");
    } else {
      setSession(storedSession);
      router.replace(storedSession.role === "customer" ? "/customer" : "/agent");
    }
    setHydrated(true);
  }, [role, router]);

  const { data: productData = [] } = useQuery<Product[]>({
    queryKey: ["products", session?.accessToken],
    queryFn: async () => {
      const response = await getProducts();
      return response.map((product) => ({
        id: product._id,
        name: product.name,
        description: product.description,
        price: product.price,
        imageUrl: product.imageUrl,
      }));
    },
    enabled: Boolean(session?.accessToken) && role === "customer",
    staleTime: 30_000,
  });

  const loadConversations = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (!currentSession) {
      return;
    }

    const raw = await getConversations();
    const mapped = raw.map((item) =>
      normalizeConversation(item, [], currentSession.role === "customer" ? currentSession.name : ""),
    );
    setConversations(mapped);
    setSelectedConversationId((current) => {
      if (current && mapped.some((c) => c.id === current)) return current;
      return mapped.length > 0 ? mapped[0].id : current;
    });
  }, []);

  const loadMessagesForConversation = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const raw = await getMessages(conversationId);
      const messages = raw.map(normalizeMessage);
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, messages } : conversation,
        ),
      );
    } catch (error) {
      console.error("Failed to load messages", error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const joinConversation = useCallback((conversationId: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      return;
    }

    if (joinedConversationRef.current && joinedConversationRef.current !== conversationId) {
      socket.emit("conversation:leave", { conversationId: joinedConversationRef.current });
    }

    socket.emit("conversation:join", { conversationId });
    joinedConversationRef.current = conversationId;
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    loadConversations().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      if (message === "Unauthorized") {
        router.replace("/login");
      } else {
        console.error("Failed to load conversations", error);
      }
    });
  }, [session, loadConversations, router]);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    const socket = io(`${SOCKET_BASE_URL}/chat`, {
      auth: { token: session.accessToken },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketStatus("live");
      if (joinedConversationRef.current) {
        socket.emit("conversation:join", { conversationId: joinedConversationRef.current });
      }
    });

    socket.on("disconnect", () => setSocketStatus("offline"));
    socket.on("connect_error", () => setSocketStatus("offline"));

    socket.on("message:new", (raw: Record<string, unknown>) => {
      const message = normalizeMessage(raw);
      setConversations((previous) =>
        previous.map((conversation) => {
          if (conversation.id !== message.conversationId) {
            return conversation;
          }
          if (conversation.messages.some((existing) => existing.id === message.id)) {
            return conversation;
          }
          const withoutMatchingTemp = conversation.messages.filter(
            (existing) =>
              !(
                existing.id.startsWith("temp-") &&
                existing.content === message.content &&
                existing.senderId === message.senderId
              ),
          );
          return {
            ...conversation,
            messages: [...withoutMatchingTemp, message],
            lastMessageAt: message.createdAt,
            lastMessagePreview: message.content,
          };
        }),
      );
    });

    socket.on("conversation:updated", (raw: Record<string, unknown>) => {
      const currentSession = sessionRef.current;
      if (!currentSession) {
        return;
      }
      setConversations((previous) => mergeConversationUpdate(previous, raw, currentSession.name));
    });

    socket.on("typing:start", (data: { conversationId: string; role: UserRole }) => {
      const currentSession = sessionRef.current;
      if (!currentSession || data.role === currentSession.role) {
        return;
      }
      if (data.conversationId === joinedConversationRef.current) {
        setPeerTyping(true);
      }
    });

    socket.on("typing:stop", (data: { conversationId: string; role: UserRole }) => {
      const currentSession = sessionRef.current;
      if (!currentSession || data.role === currentSession.role) {
        return;
      }
      if (data.conversationId === joinedConversationRef.current) {
        setPeerTyping(false);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      joinedConversationRef.current = null;
    };
  }, [session?.accessToken]);

  useEffect(() => {
    if (!selectedConversationId || !session) {
      return;
    }

    joinConversation(selectedConversationId);

    (async () => {
      try {
        await loadMessagesForConversation(selectedConversationId);
      } catch (error) {
        console.error("Failed to load thread messages", error);
      }
    })();

    markConversationRead(selectedConversationId)
      .then((raw) => {
        setConversations((previous) => mergeConversationUpdate(previous, raw, session.name));
      })
      .catch((error) => console.error("Failed to mark conversation read", error));

    socketRef.current?.emit("message:read", { conversationId: selectedConversationId });
  }, [selectedConversationId, session, joinConversation, loadMessagesForConversation]);

  const visibleConversations = useMemo(() => {
    if (role === "customer" && session) {
      return conversations.filter((conversation) => conversation.customerId === session.userId);
    }
    return conversations;
  }, [conversations, role, session]);

  const selectedConversation = useMemo(
    () => visibleConversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [selectedConversationId, visibleConversations],
  );

  const emitTypingStop = useCallback(() => {
    const conversationId = joinedConversationRef.current;
    if (!conversationId || !isTypingRef.current) {
      return;
    }
    socketRef.current?.emit("typing:stop", { conversationId });
    isTypingRef.current = false;
  }, []);

  const handleDraftChange = (value: string) => {
    setDraft(value);
    const conversationId = joinedConversationRef.current;
    if (!conversationId || !socketRef.current?.connected) {
      return;
    }

    if (!isTypingRef.current) {
      socketRef.current.emit("typing:start", { conversationId });
      isTypingRef.current = true;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop();
    }, 1500);
  };

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  const handleSendMessage = async () => {
    if (!draft.trim() || !session || !socketRef.current?.connected) {
      return;
    }

    const targetConversation = await ensureConversation();
    if (!targetConversation) {
      return;
    }

    const content = draft.trim();
    const timestamp = new Date().toISOString();
    const tempId = `temp-${Date.now()}`;

    const optimistic: Message = {
      id: tempId,
      conversationId: targetConversation.id,
      senderId: session.userId,
      senderRole: role,
      content,
      status: "sent",
      createdAt: timestamp,
    };

    setConversations((previous) =>
      previous.map((conversation) => {
        if (conversation.id !== targetConversation.id) {
          return conversation;
        }
        return {
          ...conversation,
          lastMessageAt: timestamp,
          lastMessagePreview: content,
          messages: [...conversation.messages, optimistic],
        };
      }),
    );

    setDraft("");
    emitTypingStop();

    socketRef.current.emit(
      "message:send",
      { conversationId: targetConversation.id, content },
      (ack: Record<string, unknown> | undefined) => {
        if (!ack) {
          setConversations((previous) =>
            previous.map((conversation) => {
              if (conversation.id !== targetConversation.id) return conversation;
              return {
                ...conversation,
                messages: conversation.messages.map((message) =>
                  message.id === tempId ? { ...message, status: "failed" as MessageStatus } : message,
                ),
              };
            }),
          );
          return;
        }

        const confirmed = normalizeMessage(ack);
        setConversations((previous) =>
          previous.map((conversation) => {
            if (conversation.id !== targetConversation.id) return conversation;
            return {
              ...conversation,
              messages: conversation.messages.map((message) =>
                message.id === tempId ? confirmed : message,
              ),
            };
          }),
        );
      },
    );
  };

  const handleStartConversation = async (product: Product) => {
    if (!session) {
      return;
    }

    const existing = conversations.find(
      (conversation) => conversation.customerId === session.userId && conversation.productId === product.id,
    );

    if (existing) {
      setSelectedConversationId(existing.id);
      return;
    }

    try {
      const created = await createConversation(product.id);
      const newConversation = normalizeConversation(created, [], session.name);
      setConversations((previous) => [newConversation, ...previous]);
      setSelectedConversationId(newConversation.id);
    } catch (error) {
      console.error("Failed to create conversation", error);
    }
  };

  const ensureConversation = useCallback(async (): Promise<Conversation | null> => {
    if (selectedConversation) {
      return selectedConversation;
    }

    if (role !== "customer" || productData.length === 0 || !session) {
      return null;
    }

    const product = productData[0];
    const existing = conversations.find(
      (conversation) => conversation.customerId === session.userId && conversation.productId === product.id,
    );

    if (existing) {
      setSelectedConversationId(existing.id);
      return existing;
    }

    try {
      const created = await createConversation(product.id);
      const newConversation = normalizeConversation(created, [], session.name);
      setConversations((previous) => [newConversation, ...previous]);
      setSelectedConversationId(newConversation.id);
      return newConversation;
    } catch (error) {
      console.error("Failed to create conversation", error);
      return null;
    }
  }, [selectedConversation, role, productData, conversations, session]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== "luxury-chat-session" || !event.newValue) {
        return;
      }
      try {
        const updated = JSON.parse(event.newValue) as AuthSession;
        setSession(updated);
        saveSession(updated);
      } catch {
        // ignore malformed session updates
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!hydrated) {
    return <div className="flex min-h-screen items-center justify-center bg-ink" />;
  }

  if (!session) {
    return null;
  }

  const bubbleBase =
    "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed animate-msg-rise";

  const formatTimestamp = (iso: string) =>
    `(${new Date(iso)
      .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })
      .toLowerCase()})`;

  return (
    <div className="min-h-screen p-4 text-bone sm:p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between rounded-3xl border border-hairline bg-surface px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-brass">Luxury product support</p>
            <h1 className="mt-1 font-display text-2xl text-bone">
              {role === "customer" ? "Your concierge workspace" : "Agent inbox"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-hairline bg-ink px-3 py-2 text-sm">
              <span
                className={`h-2 w-2 rounded-full ${
                  socketStatus === "live" ? "bg-brass" : socketStatus === "connecting" ? "bg-muted" : "bg-clay"
                }`}
              />
              <span className="text-muted">
                Socket:{" "}
                <span className={socketStatus === "live" ? "text-brass" : "text-bone"}>{socketStatus}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-bone/80 transition hover:bg-surface-2 hover:text-bone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/50"
            >
              Sign out
            </button>
          </div>
        </header>

        {role === "customer" ? (
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-3xl border border-hairline bg-surface p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl text-bone">Featured pieces</h2>
                  <p className="mt-1 text-sm text-muted">Begin a private conversation for any item.</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {productData.map((product) => (
                  <div key={product.id} className="rounded-3xl border border-hairline bg-ink p-4">
                    <div className="flex items-start gap-4">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-20 w-20 rounded-2xl object-cover"
                      />
                      <div className="flex-1">
                        <p className="font-display text-lg text-bone">{product.name}</p>
                        <p className="mt-1 text-sm text-muted">{product.description}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="font-mono text-base text-bone/90">
                            ${product.price.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartConversation(product)}
                            className="rounded-full border border-brass/70 px-4 py-2 text-sm font-medium text-brass transition hover:scale-[1.02] hover:bg-brass/10 hover:text-brass-soft active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/50"
                          >
                            Chat with agent
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-hairline bg-surface p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">Current thread</p>
                  <h2 className="mt-1 font-display text-xl text-bone">
                    {selectedConversation ? selectedConversation.productName : "No conversation selected"}
                  </h2>
                </div>
                <div className="rounded-full border border-hairline bg-ink px-3 py-1 font-mono text-sm text-muted">
                  {visibleConversations.length} thread{visibleConversations.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-hairline bg-ink p-3">
                <div className="relative">
                  <img
                    src={selectedConversation?.productImageUrl}
                    alt={selectedConversation?.productName}
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                  <span className="absolute -right-1 -top-1 h-3 w-3 rotate-45 border border-brass bg-ink" />
                </div>
                <div>
                  <p className="font-medium text-bone">{selectedConversation?.productName ?? "Select a piece"}</p>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted">Dedicated concierge</p>
                </div>
              </div>

              <div className="mt-5 space-y-3 rounded-[24px] border border-hairline bg-ink p-4">
                {loadingMessages && !selectedConversation?.messages.length ? (
                  <p className="text-sm text-muted">Loading messages…</p>
                ) : null}
                {selectedConversation?.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderRole === "customer" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`${bubbleBase} ${
                        message.senderRole === "customer"
                          ? "border border-brass/25 bg-surface-2 text-bone"
                          : "border border-hairline bg-surface text-bone/90"
                      }`}
                    >
                      <p>{message.content}</p>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                        {formatTimestamp(message.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex gap-3">
                <input
                  value={draft}
                  onChange={(event) => handleDraftChange(event.target.value)}
                  placeholder="Share a detail or ask for recommendations"
                  className="flex-1 rounded-full border border-hairline bg-ink px-4 py-3 text-sm text-bone outline-none placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/50"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!draft.trim() || socketStatus !== "live" || (role === "customer" && !selectedConversation && productData.length === 0)}
                  className="rounded-full border border-brass/70 px-5 py-3 text-sm font-semibold text-brass transition hover:scale-[1.02] hover:bg-brass/10 hover:text-brass-soft active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/50"
                >
                  Send
                </button>
              </div>
            </section>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <aside className="rounded-3xl border border-hairline bg-surface p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">Inbox</p>
                  <h2 className="mt-1 font-display text-xl text-bone">Open threads</h2>
                </div>
                <div className="rounded-full border border-hairline bg-ink px-3 py-1 font-mono text-sm text-muted">
                  {visibleConversations.length}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {visibleConversations.length === 0 ? (
                  <p className="text-sm text-muted">No conversations yet.</p>
                ) : null}
                {visibleConversations.map((conversation) => {
                  const active = selectedConversation?.id === conversation.id;
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setSelectedConversationId(conversation.id)}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
                        active
                          ? "border-brass/60 bg-surface-2"
                          : "border-hairline bg-ink hover:bg-surface-2"
                      }`}
                    >
                      <img
                        src={conversation.productImageUrl}
                        alt={conversation.productName}
                        className="h-12 w-12 rounded-xl object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-display font-semibold text-bone">{conversation.customerName}</p>
                          {conversation.unreadCountForAgent > 0 ? (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full border border-brass/60 px-1.5 font-mono text-[10px] font-semibold text-brass">
                              {conversation.unreadCountForAgent}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-muted">{conversation.productName}</p>
                        <p className="mt-2 truncate text-xs text-bone/60">{conversation.lastMessagePreview}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="rounded-3xl border border-hairline bg-surface p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">Thread</p>
                  <h2 className="mt-1 font-display text-xl text-bone">
                    {selectedConversation ? selectedConversation.productName : "Open a thread"}
                  </h2>
                </div>
                <div className="rounded-full border border-hairline bg-ink px-3 py-1 font-mono text-sm text-muted">
                  {selectedConversation?.customerName ?? "No customer selected"}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-hairline bg-ink p-3">
                <div className="relative">
                  <img
                    src={selectedConversation?.productImageUrl}
                    alt={selectedConversation?.productName}
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                  <span className="absolute -right-1 -top-1 h-3 w-3 rotate-45 border border-brass bg-ink" />
                </div>
                <div>
                  <p className="font-medium text-bone">{selectedConversation?.customerName ?? "—"}</p>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted">
                    {selectedConversation?.productName ?? "No product"}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3 rounded-[24px] border border-hairline bg-ink p-4">
                {loadingMessages && !selectedConversation?.messages.length ? (
                  <p className="text-sm text-muted">Loading messages…</p>
                ) : null}
                {selectedConversation?.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderRole === "agent" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`${bubbleBase} ${
                        message.senderRole === "agent"
                          ? "border border-brass/25 bg-surface-2 text-bone"
                          : "border border-hairline bg-surface text-bone/90"
                      }`}
                    >
                      <p>{message.content}</p>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                        {formatTimestamp(message.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                {peerTyping ? (
                  <div className="flex items-center justify-end gap-2 text-muted">
                    <span className="text-sm">Customer is composing…</span>
                    <span className="inline-block h-2 w-2 rotate-45 bg-brass animate-glyph" />
                  </div>
                ) : null}
              </div>

              <div className="mt-5 flex gap-3">
                <input
                  value={draft}
                  onChange={(event) => handleDraftChange(event.target.value)}
                  placeholder="Type a reply for the customer"
                  className="flex-1 rounded-full border border-hairline bg-ink px-4 py-3 text-sm text-bone outline-none placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/50"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!selectedConversation || socketStatus !== "live"}
                  className="rounded-full border border-brass/70 px-5 py-3 text-sm font-semibold text-brass transition hover:scale-[1.02] hover:bg-brass/10 hover:text-brass-soft active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/50"
                >
                  Reply
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}