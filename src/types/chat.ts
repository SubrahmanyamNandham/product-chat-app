export type UserRole = "customer" | "agent";

export type MessageStatus = "sent" | "delivered" | "read";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: UserRole;
  content: string;
  status: MessageStatus;
  createdAt: string;
}

export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  productImageUrl: string;
  agentId?: string;
  agentName?: string;
  status: "open" | "closed";
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCountForAgent: number;
  unreadCountForCustomer: number;
  messages: Message[];
}

export interface AuthSession {
  name: string;
  email: string;
  role: UserRole;
}
