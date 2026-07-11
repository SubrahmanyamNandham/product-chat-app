import type { AuthSession, Conversation, Message, MessageStatus, UserRole } from "@/types/chat";

const rawApiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const API_BASE_URL = rawApiBase.replace(/\/+$/, "") + "/api";
export const SOCKET_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

const SESSION_KEY = "luxury-chat-session";

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
  skipRefresh?: boolean;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; role: string };
}

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function extractId(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record._id ?? record.id ?? "");
  }
  return "";
}

function extractName(value: unknown): string {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record.name ?? "");
  }
  return "";
}

function extractProductFields(value: unknown): { name: string; imageUrl: string } {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return {
      name: String(record.name ?? ""),
      imageUrl: String(record.imageUrl ?? ""),
    };
  }
  return { name: "", imageUrl: "" };
}

export function normalizeMessage(raw: Record<string, unknown>): Message {
  return {
    id: extractId(raw._id ?? raw.id),
    conversationId: extractId(raw.conversationId),
    senderId: extractId(raw.senderId),
    senderRole: raw.senderRole as UserRole,
    content: String(raw.content ?? ""),
    status: (raw.status as MessageStatus) ?? "sent",
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
  };
}

export function normalizeConversation(
  raw: Record<string, unknown>,
  messages: Message[] = [],
  fallbackCustomerName = "",
): Conversation {
  const product = extractProductFields(raw.productId);
  const customerId = extractId(raw.customerId);
  const customerName = extractName(raw.customerId) || fallbackCustomerName;

  return {
    id: extractId(raw._id ?? raw.id),
    customerId,
    customerName,
    productId: extractId(raw.productId),
    productName: product.name,
    productImageUrl: product.imageUrl,
    agentId: raw.agentId ? extractId(raw.agentId) : undefined,
    status: (raw.status as "open" | "closed") ?? "open",
    lastMessageAt: String(raw.lastMessageAt ?? new Date().toISOString()),
    lastMessagePreview: String(raw.lastMessagePreview ?? ""),
    unreadCountForAgent: Number(raw.unreadCountForAgent ?? 0),
    unreadCountForCustomer: Number(raw.unreadCountForCustomer ?? 0),
    messages,
  };
}

async function refreshAccessToken(refreshToken: string): Promise<AuthSession | null> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as AuthResponse;
  const existing = getStoredSession();
  if (!existing) {
    return null;
  }

  const updated: AuthSession = {
    userId: data.user.id,
    name: data.user.name,
    email: data.user.email,
    role: data.user.role as UserRole,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
  saveSession(updated);
  return updated;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401 && !options.skipRefresh) {
    const session = getStoredSession();
    if (session?.refreshToken) {
      const refreshed = await refreshAccessToken(session.refreshToken);
      if (refreshed) {
        return request<T>(path, { ...options, token: refreshed.accessToken, skipRefresh: true });
      }
      clearSession();
    }
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Request failed");
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return undefined as T;
}

function authRequest<T>(path: string, options: Omit<RequestOptions, "token"> = {}): Promise<T> {
  const session = getStoredSession();
  if (!session?.accessToken) {
    throw new Error("Not authenticated");
  }
  return request<T>(path, { ...options, token: session.accessToken });
}

export async function signupUser(payload: {
  name: string;
  email: string;
  password: string;
  role: "customer" | "agent";
}): Promise<AuthSession> {
  const data = await request<AuthResponse>("/auth/signup", { method: "POST", body: payload, skipRefresh: true });
  return {
    userId: data.user.id,
    name: data.user.name,
    email: data.user.email,
    role: data.user.role as UserRole,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
}

export async function loginUser(payload: { email: string; password: string }): Promise<AuthSession> {
  const data = await request<AuthResponse>("/auth/login", { method: "POST", body: payload, skipRefresh: true });
  return {
    userId: data.user.id,
    name: data.user.name,
    email: data.user.email,
    role: data.user.role as UserRole,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
}

export async function getProducts() {
  return authRequest<Array<{ _id: string; name: string; description: string; price: number; imageUrl: string }>>(
    "/products",
  );
}

export async function getConversations() {
  return authRequest<Array<Record<string, unknown>>>("/chat/conversations");
}

export async function getMessages(conversationId: string, before?: string) {
  const query = before ? `?before=${encodeURIComponent(before)}` : "";
  return authRequest<Array<Record<string, unknown>>>(`/chat/conversations/${conversationId}/messages${query}`);
}

export async function createConversation(productId: string) {
  return authRequest<Record<string, unknown>>("/chat/conversations", {
    method: "POST",
    body: { productId },
  });
}

export async function markConversationRead(conversationId: string) {
  return authRequest<Record<string, unknown>>(`/chat/conversations/${conversationId}/read`, {
    method: "POST",
  });
}

export function mergeConversationUpdate(
  conversations: Conversation[],
  raw: Record<string, unknown>,
  sessionName: string,
): Conversation[] {
  const updated = normalizeConversation(raw, undefined, sessionName);
  const existing = conversations.find((c) => c.id === updated.id);
  const merged: Conversation = existing
    ? { ...existing, ...updated, messages: existing.messages }
    : { ...updated, messages: [] };

  const without = conversations.filter((c) => c.id !== merged.id);
  return [merged, ...without].sort(
    (left, right) => new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime(),
  );
}
