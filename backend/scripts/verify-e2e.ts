/* eslint-disable no-console */
/**
 * End-to-end verification script using an in-memory MongoDB instance.
 * Used when local MongoDB is not running; does not modify .env.
 */
import 'reflect-metadata';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import { io, Socket } from 'socket.io-client';
import { UserSchema } from '../src/users/schemas/user.schema';
import { ProductSchema } from '../src/products/schemas/product.schema';
import { ConversationSchema } from '../src/chat/schemas/conversation.schema';
import { MessageSchema } from '../src/chat/schemas/message.schema';

const API = 'http://localhost:4000/api';
const SOCKET = 'http://localhost:4000';

async function request(path: string, options: { method?: string; body?: unknown; token?: string } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  const res = await fetch(`${API}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${options.method ?? 'GET'} ${path} -> ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function seed(uri: string) {
  await mongoose.connect(uri);
  const User = mongoose.model('User', UserSchema);
  const Product = mongoose.model('Product', ProductSchema);
  const Conversation = mongoose.model('Conversation', ConversationSchema);
  const Message = mongoose.model('Message', MessageSchema);
  await Promise.all([User.deleteMany({}), Product.deleteMany({}), Conversation.deleteMany({}), Message.deleteMany({})]);

  const customerHash = await bcrypt.hash('password123', 10);
  const agentHash = await bcrypt.hash('password123', 10);
  const customer = await User.create({
    name: 'Ava Customer',
    email: 'ava@luxury.example',
    passwordHash: customerHash,
    role: 'customer',
  });
  await User.create({
    name: 'Agent Smith',
    email: 'agent@luxury.example',
    passwordHash: agentHash,
    role: 'agent',
  });
  const products = await Product.insertMany([
    {
      name: 'Test Watch',
      description: 'A test product',
      price: 1000,
      imageUrl: 'https://example.com/watch.jpg',
    },
    {
      name: 'Test Bag',
      description: 'Another test product',
      price: 2000,
      imageUrl: 'https://example.com/bag.jpg',
    },
  ]);
  await mongoose.disconnect();
  return { customerId: customer._id.toString(), products };
}

function waitForEvent<T>(socket: Socket, event: string, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

async function main() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri('luxury_chat');
  console.log('Started in-memory MongoDB');

  process.env.MONGODB_URI = uri;
  process.env.PORT = '4000';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
  delete process.env.NODE_ENV; // prevent .env from overriding in-memory URI via ConfigModule reload

  const { customerId, products } = await seed(uri);
  console.log('Seeded test data');

  // Boot NestJS
  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import('../src/app.module');
  const app = await NestFactory.create(AppModule);
  const { ValidationPipe } = await import('@nestjs/common');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableCors({ origin: 'http://localhost:3000', credentials: true });
  app.setGlobalPrefix('api');
  await app.listen(4000);
  console.log('Backend started on port 4000');

  // 1. Customer login
  const customerAuth = await request('/auth/login', {
    method: 'POST',
    body: { email: 'ava@luxury.example', password: 'password123' },
  });
  console.log('✓ Customer login');

  // 2. Agent login
  const agentAuth = await request('/auth/login', {
    method: 'POST',
    body: { email: 'agent@luxury.example', password: 'password123' },
  });
  console.log('✓ Agent login');

  // 3. Get products
  const productList = await request('/products', { token: customerAuth.accessToken });
  if (productList.length < 2) throw new Error('Expected at least 2 products');
  console.log('✓ GET /products');

  // 4. Create two conversations
  const conv1 = await request('/chat/conversations', {
    method: 'POST',
    token: customerAuth.accessToken,
    body: { productId: products[0]._id.toString() },
  });
  const conv2 = await request('/chat/conversations', {
    method: 'POST',
    token: customerAuth.accessToken,
    body: { productId: products[1]._id.toString() },
  });
  if (conv1._id === conv2._id) throw new Error('Conversations should be independent');
  console.log('✓ Created two independent conversations');

  // 5. Agent inbox
  const inbox = await request('/chat/conversations', { token: agentAuth.accessToken });
  if (inbox.length < 2) throw new Error('Agent inbox should have 2 threads');
  console.log('✓ Agent inbox lists both threads');

  // 6. Socket: customer sends, agent receives
  const customerSocket = io(`${SOCKET}/chat`, {
    auth: { token: customerAuth.accessToken },
    transports: ['websocket'],
  });
  const agentSocket = io(`${SOCKET}/chat`, {
    auth: { token: agentAuth.accessToken },
    transports: ['websocket'],
  });

  await Promise.all([
    new Promise<void>((res, rej) => customerSocket.on('connect', () => res()).on('connect_error', rej)),
    new Promise<void>((res, rej) => agentSocket.on('connect', () => res()).on('connect_error', rej)),
  ]);
  console.log('✓ Both sockets connected');

  customerSocket.emit('conversation:join', { conversationId: conv1._id });
  agentSocket.emit('conversation:join', { conversationId: conv1._id });

  const agentMessagePromise = waitForEvent<{ content: string }>(agentSocket, 'message:new');
  customerSocket.emit('message:send', { conversationId: conv1._id, content: 'Hello from customer' });
  const received = await agentMessagePromise;
  if (received.content !== 'Hello from customer') throw new Error('Agent did not receive message');
  console.log('✓ Real-time message delivery works');

  // 7. Agent replies, customer receives
  const customerMessagePromise = waitForEvent<{ content: string }>(customerSocket, 'message:new');
  agentSocket.emit('message:send', { conversationId: conv1._id, content: 'Hello from agent' });
  const reply = await customerMessagePromise;
  if (reply.content !== 'Hello from agent') throw new Error('Customer did not receive reply');
  console.log('✓ Agent reply delivered in real time');

  await new Promise((resolve) => setTimeout(resolve, 300));

  // 8. Message history
  const convId = String(conv1._id);
  const history = await request(`/chat/conversations/${convId}/messages`, {
    token: customerAuth.accessToken,
  });
  if (history.length < 2) throw new Error(`Message history incomplete (${history.length} messages)`);
  console.log('✓ Message history loaded');

  // 9. Token refresh
  const refreshed = await request('/auth/refresh', {
    method: 'POST',
    body: { refreshToken: customerAuth.refreshToken },
  });
  if (!refreshed.accessToken) throw new Error('Refresh failed');
  console.log('✓ Token refresh works');

  customerSocket.disconnect();
  agentSocket.disconnect();
  await app.close();
  await mongod.stop();
  console.log('\nAll E2E checks passed.');
}

main().catch((err) => {
  console.error('E2E verification failed:', err);
  process.exit(1);
});
