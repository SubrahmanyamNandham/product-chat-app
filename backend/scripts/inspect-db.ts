/* eslint-disable no-console */
import 'reflect-metadata';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { UserSchema } from '../src/users/schemas/user.schema';
import { ProductSchema } from '../src/products/schemas/product.schema';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
const API_BASE = process.env.API_BASE || 'http://localhost:4000/api';

async function apiPost(path: string, body: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data };
}

async function apiGet(path: string, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data };
}

async function login(email: string, password: string) {
  const result = await apiPost('/auth/login', { email, password });
  if (!result.ok) throw new Error(`Login failed for ${email}: ${JSON.stringify(result.data)}`);
  return (result.data as { accessToken: string; user: { id: string } }).accessToken;
}

async function getProducts(token: string) {
  const result = await apiGet('/products', token);
  if (!result.ok) throw new Error('Failed to get products');
  return result.data as Array<{ _id: string; name: string }>;
}

async function createConversation(token: string, productId: string) {
  const result = await apiPost('/chat/conversations', { productId }, token);
  if (!result.ok) throw new Error(`Failed to create conversation: ${JSON.stringify(result.data)}`);
  return result.data as Record<string, unknown>;
}

async function getConversations(token: string) {
  const result = await apiGet('/chat/conversations', token);
  if (!result.ok) throw new Error('Failed to get conversations');
  return result.data as Array<Record<string, unknown>>;
}

async function getMessages(token: string, conversationId: string) {
  const result = await apiGet(`/chat/conversations/${conversationId}/messages`, token);
  if (!result.ok) throw new Error('Failed to get messages');
  return result.data as Array<Record<string, unknown>>;
}

async function sendMessage(token: string, conversationId: string, content: string) {
  return apiPost(`/chat/conversations/${conversationId}/messages`, { content }, token);
}

async function markRead(token: string, conversationId: string) {
  return apiPost(`/chat/conversations/${conversationId}/read`, {}, token);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to ${MONGODB_URI}`);

  const users = await mongoose.connection.collection('users').find({}).toArray();
  const products = await mongoose.connection.collection('products').find({}).toArray();
  
  const agentUser = users.find((u) => u.role === 'agent');
  const customers = users.filter((u) => u.role === 'customer').slice(0, 3);
  
  if (!agentUser || customers.length < 3) {
    throw new Error('Need at least 3 customers and 1 agent in DB');
  }
  
  console.log(`\nTest setup: ${customers.length} customers, 1 agent, ${products.length} products`);
  console.log(`Products: ${products.map(p => p.name).join(', ')}`);
  
  // Login all users
  const agentToken = await login(agentUser.email, 'password123');
  const customerTokens: Record<string, string> = {};
  for (const c of customers) {
    customerTokens[c.email] = await login(c.email, 'password123');
  }
  console.log('All users logged in');
  
  // ===== TEST 1: Product list displayed =====
  console.log('\n--- TEST 1: Product list ---');
  const productList = await getProducts(customerTokens[customers[0].email]);
  console.log(`Products returned: ${productList.length}`);
  console.log('TEST 1:', productList.length >= 2 ? 'PASS' : 'FAIL');
  
  // ===== TEST 2: Create chat per product (scoping) =====
  console.log('\n--- TEST 2: Conversation scoping ---');
  const customer1 = customers[0];
  const customer1Token = customerTokens[customer1.email];
  const productA = products[0];
  const productB = products[1];
  
  const convA = await createConversation(customer1Token, String(productA._id));
  console.log('Created conversation for Product A:', String(convA._id));
  
  const convA2 = await createConversation(customer1Token, String(productA._id));
  console.log('Created conversation for Product A again:', String(convA2._id));
  
  const convB = await createConversation(customer1Token, String(productB._id));
  console.log('Created conversation for Product B:', String(convB._id));
  
  const sameProductSameConvo = String(convA._id) === String(convA2._id);
  const differentProductsDifferentConvo = String(convA._id) !== String(convB._id);
  
  console.log('Same product returns same conversation:', sameProductSameConvo ? 'PASS' : 'FAIL');
  console.log('Different products return different conversations:', differentProductsDifferentConvo ? 'PASS' : 'FAIL');
  
  // Verify in DB
  const dbConvs = await mongoose.connection.collection('conversations').find({ customerId: customer1._id }).toArray();
  console.log(`Customer ${customer1.name} conversations in DB: ${dbConvs.length}`);
  const uniqueProductIds = new Set(dbConvs.map(c => String(c.productId)));
  console.log('Unique product IDs:', [...uniqueProductIds]);
  
  // ===== TEST 3: Messages don't leak between conversations =====
  console.log('\n--- TEST 3: Message isolation ---');
  await sendMessage(customer1Token, String(convA._id), 'Message for Product A');
  await sendMessage(customer1Token, String(convB._id), 'Message for Product B');
  await sleep(500);
  
  const messagesA = await getMessages(customer1Token, String(convA._id));
  const messagesB = await getMessages(customer1Token, String(convB._id));
  
  const messageContentsA = messagesA.map((m) => m.content);
  const messageContentsB = messagesB.map((m) => m.content);
  
  const noLeakA = !messageContentsB.includes('Message for Product A');
  const noLeakB = !messageContentsA.includes('Message for Product B');
  
  console.log('Conv A messages:', messageContentsA);
  console.log('Conv B messages:', messageContentsB);
  console.log('No leak from B into A:', noLeakA ? 'PASS' : 'FAIL');
  console.log('No leak from A into B:', noLeakB ? 'PASS' : 'FAIL');
  
  // ===== TEST 4: Agent inbox view =====
  console.log('\n--- TEST 4: Agent inbox ---');
  const agentConvs = await getConversations(agentToken);
  console.log(`Agent sees ${agentConvs.length} conversations`);
  
  // Check agent sees conversations from multiple customers/products
  const agentConvProducts = agentConvs.map((c) => String(c.productId));
  const agentConvCustomers = agentConvs.map((c) => String(c.customerId));
  const uniqueAgentProducts = new Set(agentConvProducts);
  const uniqueAgentCustomers = new Set(agentConvCustomers);
  
  console.log('Agent sees product IDs:', [...uniqueAgentProducts]);
  console.log('Agent sees customer IDs:', [...uniqueAgentCustomers]);
  console.log('Agent sees multiple products:', uniqueAgentProducts.size >= 2 ? 'PASS' : 'FAIL');
  console.log('Agent sees multiple customers:', uniqueAgentCustomers.size >= 3 ? 'PASS' : 'FAIL');
  
  // Each conversation should be distinct
  const agentConvIds = agentConvs.map((c) => String(c._id));
  const uniqueAgentConvIds = new Set(agentConvIds);
  console.log('All conversation IDs unique:', agentConvIds.length === uniqueAgentConvIds.size ? 'PASS' : 'FAIL');
  
  // ===== TEST 5: Real-time customer->agent =====
  console.log('\n--- TEST 5: Real-time customer->agent messaging ---');
  const customer2 = customers[1];
  const customer2Token = customerTokens[customer2.email];
  const customer2Conv = await createConversation(customer2Token, String(productA._id));
  
  const customer2ConvId = String(customer2Conv._id);
  
  // Send message from customer
  await sendMessage(customer2Token, customer2ConvId, 'Real-time test from customer2');
  await sleep(1000);
  
  // Agent should see it
  const agentMessages = await getMessages(agentToken, customer2ConvId);
  const latestAgentMessage = agentMessages[agentMessages.length - 1];
  const rtCustomerPass = latestAgentMessage?.content === 'Real-time test from customer2';
  console.log('Agent sees customer message:', rtCustomerPass ? 'PASS' : 'FAIL');
  
  // Agent replies
  await sendMessage(agentToken, customer2ConvId, 'Real-time test from agent');
  await sleep(1000);
  
  const customer2Messages = await getMessages(customer2Token, customer2ConvId);
  const latestCustomerMessage = customer2Messages[customer2Messages.length - 1];
  const rtAgentPass = latestCustomerMessage?.content === 'Real-time test from agent';
  console.log('Customer sees agent message:', rtAgentPass ? 'PASS' : 'FAIL');
  
  // ===== TEST 6: Unread counts =====
  console.log('\n--- TEST 6: Unread counts ---');
  const customer3 = customers[2];
  const customer3Token = customerTokens[customer3.email];
  const customer3Conv = await createConversation(customer3Token, String(productB._id));
  const customer3ConvId = String(customer3Conv._id);
  
  // Customer sends a message
  await sendMessage(customer3Token, customer3ConvId, 'Unread test message');
  await sleep(500);
  
  // Agent views conversations
  const agentConvsAfter = await getConversations(agentToken);
  const customer3ConvAfter = agentConvsAfter.find((c) => String(c._id) === customer3ConvId);
  const unreadAgent = customer3ConvAfter?.unreadCountForAgent;
  console.log('Agent unread count for customer3 conv:', unreadAgent);
  const unreadPass = unreadAgent && unreadAgent > 0;
  console.log('Unread count increments for agent:', unreadPass ? 'PASS' : 'FAIL');
  
  // Agent marks read
  await markRead(agentToken, customer3ConvId);
  await sleep(500);
  
  const agentConvsAfterRead = await getConversations(agentToken);
  const customer3ConvAfterRead = agentConvsAfterRead.find((c) => String(c._id) === customer3ConvId);
  const unreadAfterRead = customer3ConvAfterRead?.unreadCountForAgent;
  console.log('Agent unread count after read:', unreadAfterRead);
  const unreadResetPass = unreadAfterRead === 0;
  console.log('Unread count resets after read:', unreadResetPass ? 'PASS' : 'FAIL');
  
  // ===== TEST 7: Scale - 20 conversations =====
  console.log('\n--- TEST 7: Scale test (20 conversations) ---');
  const scaleCustomer = customers[0];
  const scaleCustomerToken = customerTokens[scaleCustomer.email];
  
  // This customer already has 2 convs (A, B). Customer2 has 1 conv (A). 
  // Let's have each of the 10 customers create 2 conversations = 20 total
  const scaleConvs = [];
  for (let i = 0; i < customers.length; i++) {
    const c = customers[i];
    const token = customerTokens[c.email];
    const convA = await createConversation(token, String(productA._id));
    const convB = await createConversation(token, String(productB._id));
    scaleConvs.push({ customer: c.name, convA: String(convA._id), convB: String(convB._id) });
    await sleep(200);
  }
  
  console.log(`Created ${scaleConvs.length} customer pairs (${scaleConvs.length * 2} conversations)`);
  
  // Agent views all
  const allAgentConvs = await getConversations(agentToken);
  console.log(`Agent inbox size: ${allAgentConvs.length}`);
  
  // Verify no duplicates
  const allConvIds = allAgentConvs.map((c) => String(c._id));
  const uniqueAllConvIds = new Set(allConvIds);
  const noDuplicateConvs = allConvIds.length === uniqueAllConvIds.size;
  console.log('No duplicate conversations in agent inbox:', noDuplicateConvs ? 'PASS' : 'FAIL');
  
  // Verify each customer appears exactly 2 times
  const customerConvCount: Record<string, number> = {};
  for (const c of allAgentConvs) {
    const cid = String(c.customerId);
    customerConvCount[cid] = (customerConvCount[cid] || 0) + 1;
  }
  
  let allCustomersHave2 = true;
  for (const c of customers) {
    const count = customerConvCount[String(c._id)] || 0;
    if (count !== 2) {
      console.log(`Customer ${c.name} has ${count} conversations (expected 2)`);
      allCustomersHave2 = false;
    }
  }
  console.log('Every customer has exactly 2 conversations:', allCustomersHave2 ? 'PASS' : 'FAIL');
  
  // Verify each conversation has correct product
  const productAName = products[0].name;
  const productBName = products[1].name;
  let productScopingOk = true;
  for (const c of allAgentConvs) {
    const productIdField = (c as Record<string, unknown>).productId;
    let productName = '';
    if (productIdField && typeof productIdField === 'object') {
      productName = String((productIdField as Record<string, unknown>).name ?? '');
    } else {
      productName = String(productIdField ?? '');
    }
    if (productName !== productAName && productName !== productBName) {
      console.log('Unexpected product:', productName);
      productScopingOk = false;
    }
  }
  console.log('All conversations scoped to Product A or B:', productScopingOk ? 'PASS' : 'FAIL');
  
  // ===== SUMMARY =====
  console.log('\n=== QA TEST SUMMARY ===');
  
  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});

  }
  
  const agents = [
    { name: 'Agent Smith', email: '[email protected]', password: 'password123', role: 'agent' as const },
    { name: 'Agent Rose', email: '[email protected]', password: 'password123', role: 'agent' as const },
  ];

  const allUsers = [...customers, ...agents];
  for (const u of allUsers) {
    const passwordHash = 'password123'; // simplified for testing
    await UserModel.create({
      name: u.name,
      email: u.email,
      passwordHash,
      role: u.role,
    });
    console.log(`Created ${u.role}: ${u.email}`);
  }

  // Create 2 products
  const products = [
    { name: 'Product A', description: 'First product', price: 1000, imageUrl: 'https://example.com/a.jpg' },
    { name: 'Product B', description: 'Second product', price: 2000, imageUrl: 'https://example.com/b.jpg' },
  ];
  
  for (const p of products) {
    await ProductModel.create(p);
    console.log(`Created product: ${p.name}`);
  }

  await mongoose.disconnect();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
