const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
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

export async function signupUser(payload: {
  name: string;
  email: string;
  password: string;
  role: "customer" | "agent";
}) {
  return request<{ accessToken: string; user: { id: string; name: string; email: string; role: string } }>('/auth/signup', {
    method: "POST",
    body: payload,
  });
}

export async function loginUser(payload: { email: string; password: string }) {
  return request<{ accessToken: string; user: { id: string; name: string; email: string; role: string } }>('/auth/login', {
    method: "POST",
    body: payload,
  });
}

export async function getProducts(token: string) {
  return request<Array<{ _id: string; name: string; description: string; price: number; imageUrl: string }>>('/products', {
    token,
  });
}

export async function getConversations(token: string) {
  return request<Array<Record<string, unknown>>>('/chat/conversations', {
    token,
  });
}

export async function getConversationThread(token: string, conversationId: string) {
  return request<{ conversation: Record<string, unknown>; messages: Array<Record<string, unknown>> }>(`/chat/conversations/${conversationId}`, {
    token,
  });
}

export async function createConversation(token: string, customerId: string, productId: string) {
  return request<Record<string, unknown>>('/chat/conversations', {
    method: "POST",
    token,
    body: { customerId, productId },
  });
}

export async function sendChatMessage(token: string, payload: { conversationId: string; senderId: string; senderRole: "customer" | "agent"; content: string; status?: "sent" | "delivered" | "read" }) {
  return request<Record<string, unknown>>('/chat/messages', {
    method: "POST",
    token,
    body: payload,
  });
}
