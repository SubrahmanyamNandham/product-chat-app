"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { createConversation, getConversationThread, getProducts, sendChatMessage } from "@/lib/api";
import type { AuthSession, Conversation, Message, Product, UserRole } from "@/types/chat";

const mockProducts: Product[] = [
  {
    id: "product-1",
    name: "The Aurelia Watch",
    description: "Rose gold case with hand-finished leather strap.",
    price: 9800,
    imageUrl:
      "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "product-2",
    name: "Velvet Atelier Bag",
    description: "Structured silhouette with soft calfskin lining.",
    price: 6400,
    imageUrl:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "product-3",
    name: "Nocturne Silk Scarf",
    description: "A hand-rolled silk edition in midnight tones.",
    price: 320,
    imageUrl:
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
  },
];

const initialConversations: Conversation[] = [
  {
    id: "conversation-1",
    customerId: "customer-1",
    customerName: "Ava Laurent",
    productId: "product-1",
    productName: "The Aurelia Watch",
    productImageUrl:
      "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=900&q=80",
    agentId: "agent-1",
    agentName: "Mina Chen",
    status: "open",
    lastMessageAt: "2026-07-09T12:00:00.000Z",
    lastMessagePreview: "The watch will be delivered Thursday.",
    unreadCountForAgent: 0,
    unreadCountForCustomer: 1,
    messages: [
      {
        id: "message-1",
        conversationId: "conversation-1",
        senderId: "agent-1",
        senderRole: "agent",
        content: "I can help with engraving options for the watch.",
        status: "read",
        createdAt: "2026-07-09T11:55:00.000Z",
      },
      {
        id: "message-2",
        conversationId: "conversation-1",
        senderId: "customer-1",
        senderRole: "customer",
        content: "The watch will be delivered Thursday.",
        status: "read",
        createdAt: "2026-07-09T12:00:00.000Z",
      },
    ],
  },
  {
    id: "conversation-2",
    customerId: "customer-1",
    customerName: "Ava Laurent",
    productId: "product-2",
    productName: "Velvet Atelier Bag",
    productImageUrl:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80",
    agentId: "agent-1",
    agentName: "Mina Chen",
    status: "open",
    lastMessageAt: "2026-07-09T09:40:00.000Z",
    lastMessagePreview: "We can prepare a monogram request.",
    unreadCountForAgent: 2,
    unreadCountForCustomer: 0,
    messages: [
      {
        id: "message-3",
        conversationId: "conversation-2",
        senderId: "customer-1",
        senderRole: "customer",
        content: "I would love a monogram for the bag.",
        status: "delivered",
        createdAt: "2026-07-09T09:36:00.000Z",
      },
      {
        id: "message-4",
        conversationId: "conversation-2",
        senderId: "agent-1",
        senderRole: "agent",
        content: "We can prepare a monogram request.",
        status: "read",
        createdAt: "2026-07-09T09:40:00.000Z",
      },
    ],
  },
];

interface ChatAppProps {
  role: UserRole;
}

export default function ChatApp({ role }: ChatAppProps) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [socketStatus, setSocketStatus] = useState<"mock" | "live">("mock");
  const [socketClient, setSocketClient] = useState<Socket | null>(null);

  const { data: productData = mockProducts } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      if (!session?.accessToken) {
        return mockProducts;
      }

      const response = await getProducts(session.accessToken);
      return response.map((product) => ({
        id: product._id,
        name: product.name,
        description: product.description,
        price: product.price,
        imageUrl: product.imageUrl,
      }));
    },
    staleTime: 30_000,
    enabled: Boolean(session?.accessToken),
  });

  useEffect(() => {
    const storedSession = localStorage.getItem("luxury-chat-session");
    if (storedSession) {
      setSession(JSON.parse(storedSession) as AuthSession);
    } else {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    const client = io("http://localhost:3001/chat", {
      autoConnect: false,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 3,
    });

    client.on("connect", () => setSocketStatus("live"));
    client.on("connect_error", () => setSocketStatus("mock"));

    setSocketClient(client);

    return () => {
      client.disconnect();
    };
  }, []);

  useEffect(() => {
    if (conversations.length === 0) {
      return;
    }

    if (!selectedConversationId || !conversations.some((conversation) => conversation.id === selectedConversationId)) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const visibleConversations = useMemo(() => {
    if (role === "customer") {
      return conversations.filter((conversation) => conversation.customerId === "customer-1");
    }

    return [...conversations].sort((left, right) => new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime());
  }, [conversations, role]);

  const selectedConversation = useMemo(
    () => visibleConversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [selectedConversationId, visibleConversations],
  );

  const handleLogout = () => {
    localStorage.removeItem("luxury-chat-session");
    router.push("/login");
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !draft.trim() || !session?.accessToken) {
      return;
    }

    const content = draft.trim();
    const timestamp = new Date().toISOString();
    const outgoingMessage: Message = {
      id: `message-${Date.now()}`,
      conversationId: selectedConversation.id,
      senderId: session.email,
      senderRole: role,
      content,
      status: "sent",
      createdAt: timestamp,
    };

    setConversations((previous) =>
      previous.map((conversation) => {
        if (conversation.id !== selectedConversation.id) {
          return conversation;
        }

        return {
          ...conversation,
          lastMessageAt: timestamp,
          lastMessagePreview: content,
          messages: [...conversation.messages, outgoingMessage],
        };
      }),
    );

    setDraft("");
    setTyping(true);

    try {
      await sendChatMessage(session.accessToken, {
        conversationId: selectedConversation.id,
        senderId: session.email,
        senderRole: role,
        content,
      });
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setTyping(false);
    }
  };

  const handleStartConversation = async (product: Product) => {
    if (!session?.accessToken) {
      return;
    }

    const existing = conversations.find((conversation) => conversation.customerId === session.email && conversation.productId === product.id);

    if (existing) {
      setSelectedConversationId(existing.id);
      return;
    }

    try {
      const created = await createConversation(session.accessToken, session.email, product.id);
      const newConversation: Conversation = {
        id: String(created._id ?? created.id ?? Date.now()),
        customerId: session.email,
        customerName: session.name,
        productId: product.id,
        productName: product.name,
        productImageUrl: product.imageUrl,
        agentId: undefined,
        agentName: undefined,
        status: "open",
        lastMessageAt: new Date().toISOString(),
        lastMessagePreview: `New request for ${product.name}`,
        unreadCountForAgent: 1,
        unreadCountForCustomer: 0,
        messages: [],
      };

      setConversations((previous) => [newConversation, ...previous]);
      setSelectedConversationId(newConversation.id);
    } catch (error) {
      console.error("Failed to create conversation", error);
    }
  };

  if (!session) {
    return <div className="flex min-h-screen items-center justify-center bg-stone-50" />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f9f6f0,_#f3ece5_55%,_#eee0ce)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between rounded-[28px] border border-stone-200 bg-white/90 px-5 py-4 shadow-sm backdrop-blur">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Luxury product support</p>
            <h1 className="text-2xl font-semibold text-stone-900">
              {role === "customer" ? "Your concierge workspace" : "Agent inbox"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
              Socket: <span className={socketStatus === "live" ? "text-emerald-600" : "text-amber-600"}>{socketStatus}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
            >
              Sign out
            </button>
          </div>
        </header>

        {role === "customer" ? (
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-stone-900">Featured products</h2>
                  <p className="mt-1 text-sm text-stone-500">Start a dedicated conversation for each item.</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {productData.map((product) => (
                  <div key={product.id} className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
                    <div className="flex items-start gap-4">
                      <img src={product.imageUrl} alt={product.name} className="h-20 w-20 rounded-2xl object-cover" />
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-stone-900">{product.name}</p>
                        <p className="mt-1 text-sm text-stone-500">{product.description}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-base font-semibold text-stone-800">${product.price.toLocaleString()}</span>
                          <button
                            type="button"
                            onClick={() => handleStartConversation(product)}
                            className="rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800"
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

            <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Current thread</p>
                  <h2 className="text-xl font-semibold text-stone-900">
                    {selectedConversation ? selectedConversation.productName : "No conversation selected"}
                  </h2>
                </div>
                <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm text-stone-600">
                  {visibleConversations.length} thread{visibleConversations.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3">
                <div className="h-10 w-10 rounded-full bg-stone-950" />
                <div>
                  <p className="font-medium text-stone-900">{session.name}</p>
                  <p className="text-sm text-stone-500">Dedicated support for this product</p>
                </div>
              </div>

              <div className="mt-5 space-y-3 rounded-[24px] border border-stone-200 bg-stone-50 p-4">
                {selectedConversation?.messages.map((message) => (
                  <div key={message.id} className={`flex ${message.senderRole === "customer" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${message.senderRole === "customer" ? "bg-stone-950 text-white" : "bg-white text-stone-700"}`}>
                      <p>{message.content}</p>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.2em] opacity-70">{message.status}</p>
                    </div>
                  </div>
                ))}
                {typing ? (
                  <div className="flex justify-start">
                    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500">
                      Agent is typing…
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 flex gap-3">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Share a detail or ask for recommendations"
                  className="flex-1 rounded-full border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none"
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
                  className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
                >
                  Send
                </button>
              </div>

              <p className="mt-3 text-sm text-stone-500">
                {/* TODO: connect to live Socket.IO events once the NestJS backend is available. */}
                This view is wired to a mocked in-memory socket layer for the Phase 1 demo.
              </p>
            </section>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <aside className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Inbox</p>
                  <h2 className="text-xl font-semibold text-stone-900">Open threads</h2>
                </div>
                <div className="rounded-full bg-stone-950 px-3 py-1 text-sm font-medium text-white">
                  {visibleConversations.length}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {visibleConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
                      selectedConversation?.id === conversation.id ? "border-stone-900 bg-stone-950 text-white" : "border-stone-200 bg-stone-50 text-stone-700"
                    }`}
                  >
                    <img src={conversation.productImageUrl} alt={conversation.productName} className="h-12 w-12 rounded-xl object-cover" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{conversation.customerName}</p>
                        {conversation.unreadCountForAgent > 0 ? (
                          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-stone-950">
                            {conversation.unreadCountForAgent}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm opacity-80">{conversation.productName}</p>
                      <p className="mt-2 text-xs opacity-70">{conversation.lastMessagePreview}</p>
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Thread</p>
                  <h2 className="text-xl font-semibold text-stone-900">
                    {selectedConversation ? selectedConversation.productName : "Open a thread"}
                  </h2>
                </div>
                <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm text-stone-600">
                  {selectedConversation?.customerName ?? "No customer selected"}
                </div>
              </div>

              <div className="mt-5 space-y-3 rounded-[24px] border border-stone-200 bg-stone-50 p-4">
                {selectedConversation?.messages.map((message) => (
                  <div key={message.id} className={`flex ${message.senderRole === "agent" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${message.senderRole === "agent" ? "bg-stone-950 text-white" : "bg-white text-stone-700"}`}>
                      <p>{message.content}</p>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.2em] opacity-70">{message.status}</p>
                    </div>
                  </div>
                ))}
                {typing ? (
                  <div className="flex justify-end">
                    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500">
                      Customer is waiting…
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 flex gap-3">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Type a reply for the customer"
                  className="flex-1 rounded-full border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none"
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
                  className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
                >
                  Reply
                </button>
              </div>

              <p className="mt-3 text-sm text-stone-500">
                {/* TODO: replace this mocked inbox state with real conversation API calls. */}
                Replies are optimized for the Phase 1 experience and will be powered by real backend events later.
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
