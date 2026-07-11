const { io } = require('socket.io-client');

const API_BASE = 'http://localhost:4000/api';
const SOCKET_BASE = 'http://localhost:4000';

let passCount = 0;
let failCount = 0;
const results = [];

function pass(msg) {
  console.log(`  ✅ ${msg}`);
  passCount++;
  results.push({ test: msg, status: 'PASS' });
}
function fail(msg) {
  console.log(`  ❌ ${msg}`);
  failCount++;
  results.push({ test: msg, status: 'FAIL' });
}

async function api(method, path, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json();
    throw err;
  }
  return res.json();
}

async function main() {
  console.log('=== COMPREHENSIVE FUNCTIONALITY TEST ===\n');

  const timestamp = Date.now();

  // Get actual product IDs from database
  const agentLogin = await api('POST', '/auth/login', null, {
    email: 'agent@luxury.example',
    password: 'password123',
  });
  const products = await api('GET', '/products', agentLogin.accessToken);
  const productA = products[0]._id;
  const productB = products[1]._id;
  console.log(`Using products: ${productA} (${products[0].name}), ${productB} (${products[1].name})\n`);

  // ============================================
  // AUTH TESTS
  // ============================================
  console.log('--- AUTH TESTS ---');

  // Test 1: Signup
  try {
    const signup = await api('POST', '/auth/signup', null, {
      name: `Test User ${timestamp}`,
      email: `test_${timestamp}@test.com`,
      password: 'TestPass123',
      role: 'customer',
    });
    if (signup.user && signup.accessToken && signup.refreshToken) {
      pass('Customer signup works');
    } else {
      fail('Customer signup missing fields');
    }
  } catch (e) {
    fail(`Customer signup: ${e.message || e}`);
  }

  // Test 2: Login
  try {
    const login = await api('POST', '/auth/login', null, {
      email: `test_${timestamp}@test.com`,
      password: 'TestPass123',
    });
    if (login.user && login.accessToken) {
      pass('Customer login works');
    } else {
      fail('Customer login missing fields');
    }
  } catch (e) {
    fail(`Customer login: ${e.message || e}`);
  }

  // Test 3: Get current user
  try {
    const login = await api('POST', '/auth/login', null, {
      email: `test_${timestamp}@test.com`,
      password: 'TestPass123',
    });
    const me = await api('GET', '/auth/me', login.accessToken);
    if (me.email === `test_${timestamp}@test.com`) {
      pass('Get current user works');
    } else {
      fail('Get current user returned wrong data');
    }
  } catch (e) {
    fail(`Get current user: ${e.message || e}`);
  }

  // Test 4: Agent login
  try {
    const agentLogin = await api('POST', '/auth/login', null, {
      email: 'agent@luxury.example',
      password: 'password123',
    });
    if (agentLogin.user && agentLogin.user.role === 'agent') {
      pass('Agent login works');
    } else {
      fail('Agent login missing fields or wrong role');
    }
  } catch (e) {
    fail(`Agent login: ${e.message || e}`);
  }

  // ============================================
  // PRODUCT TESTS
  // ============================================
  console.log('\n--- PRODUCT TESTS ---');

  // Test 5: Get all products
  try {
    const login = await api('POST', '/auth/login', null, {
      email: `test_${timestamp}@test.com`,
      password: 'TestPass123',
    });
    const products = await api('GET', '/products', login.accessToken);
    if (Array.isArray(products) && products.length > 0) {
      pass(`Get all products works (${products.length} products)`);
    } else {
      fail('Get all products returned empty or invalid');
    }
  } catch (e) {
    fail(`Get all products: ${e.message || e}`);
  }

  // Test 6: Get single product
  try {
    const login = await api('POST', '/auth/login', null, {
      email: `test_${timestamp}@test.com`,
      password: 'TestPass123',
    });
    const product = await api('GET', `/products/${productA}`, login.accessToken);
    if (product._id === productA) {
      pass('Get single product works');
    } else {
      fail('Get single product returned wrong data');
    }
  } catch (e) {
    fail(`Get single product: ${e.message || e}`);
  }

  // ============================================
  // CONVERSATION TESTS
  // ============================================
  console.log('\n--- CONVERSATION TESTS ---');

  let customerToken;
  let agentToken;
  let convA, convB;

  // Get tokens
  try {
    const login = await api('POST', '/auth/login', null, {
      email: `test_${timestamp}@test.com`,
      password: 'TestPass123',
    });
    customerToken = login.accessToken;
  } catch (e) {
    fail(`Failed to get customer token: ${e.message}`);
  }

  try {
    const agentLogin = await api('POST', '/auth/login', null, {
      email: 'agent@luxury.example',
      password: 'password123',
    });
    agentToken = agentLogin.accessToken;
  } catch (e) {
    fail(`Failed to get agent token: ${e.message}`);
  }

  // Test 7: Create conversation for product A
  try {
    convA = await api('POST', '/chat/conversations', customerToken, { productId: productA });
    if (convA._id && convA.productId._id === productA) {
      pass('Create conversation for product A works');
    } else {
      fail('Create conversation for product A returned invalid data');
    }
  } catch (e) {
    fail(`Create conversation for product A: ${e.message || e}`);
  }

  // Test 8: Create conversation for product B
  try {
    convB = await api('POST', '/chat/conversations', customerToken, { productId: productB });
    if (convB._id && convB.productId._id === productB && convB._id !== convA._id) {
      pass('Create conversation for product B works (different from A)');
    } else {
      fail('Create conversation for product B returned same ID as A or invalid');
    }
  } catch (e) {
    fail(`Create conversation for product B: ${e.message || e}`);
  }

  // Test 9: Reopening same product returns same conversation
  try {
    const convA2 = await api('POST', '/chat/conversations', customerToken, { productId: productA });
    if (convA2._id === convA._id) {
      pass('Reopening same product resumes same conversation');
    } else {
      fail('Reopening same product created duplicate');
    }
  } catch (e) {
    fail(`Reopening same product: ${e.message || e}`);
  }

  // Test 10: Customer can see their conversations
  try {
    const me = await api('GET', '/auth/me', customerToken);
    const convs = await api('GET', '/chat/conversations', customerToken);
    const customerConvs = convs.filter(c => c.customerId === me.userId);
    if (customerConvs.length >= 2) {
      pass(`Customer sees their conversations (${customerConvs.length} found)`);
    } else {
      fail(`Customer sees too few conversations (${customerConvs.length})`);
    }
  } catch (e) {
    fail(`Customer sees conversations: ${e.message || e}`);
  }

  // Test 11: Agent can see all conversations
  try {
    const agentConvs = await api('GET', '/chat/conversations', agentToken);
    if (agentConvs.length > 0) {
      pass(`Agent inbox shows all conversations (${agentConvs.length} total)`);
    } else {
      fail('Agent inbox is empty');
    }
  } catch (e) {
    fail(`Agent inbox: ${e.message || e}`);
  }

  // Test 12: Agent inbox shows correct attribution
  try {
    const me = await api('GET', '/auth/me', customerToken);
    const agentConvs = await api('GET', '/chat/conversations', agentToken);
    const testConvs = agentConvs.filter(c => c.customerId && c.customerId._id === me.userId);
    const hasCorrectAttribution = testConvs.every(c => 
      c.customerId && c.productId && c._id
    );
    if (hasCorrectAttribution && testConvs.length >= 2) {
      pass('Agent inbox shows correct customer/product attribution');
    } else {
      fail('Agent inbox missing customer/product attribution');
    }
  } catch (e) {
    fail(`Agent inbox attribution: ${e.message || e}`);
  }

  // ============================================
  // MESSAGE TESTS
  // ============================================
  console.log('\n--- MESSAGE TESTS ---');

  // Test 13: Get messages for conversation
  try {
    const msgs = await api('GET', `/chat/conversations/${convA._id}/messages`, customerToken);
    if (Array.isArray(msgs)) {
      pass(`Get messages works (${msgs.length} messages)`);
    } else {
      fail('Get messages returned non-array');
    }
  } catch (e) {
    fail(`Get messages: ${e.message || e}`);
  }

  // Test 14: Messages are isolated between conversations
  try {
    // Send message to conv A
    const msgA = await api('POST', `/chat/conversations/${convA._id}/messages`, customerToken, {
      content: 'Test message for A',
      senderRole: 'customer',
    });
    
    // Send message to conv B
    const msgB = await api('POST', `/chat/conversations/${convB._id}/messages`, customerToken, {
      content: 'Test message for B',
      senderRole: 'customer',
    });

    // Get messages for each conversation
    const msgsA = await api('GET', `/chat/conversations/${convA._id}/messages`, customerToken);
    const msgsB = await api('GET', `/chat/conversations/${convB._id}/messages`, customerToken);

    const msgAInA = msgsA.some(m => m.content === 'Test message for A');
    const msgBInB = msgsB.some(m => m.content === 'Test message for B');
    const msgAInB = msgsB.some(m => m.content === 'Test message for A');
    const msgBInA = msgsA.some(m => m.content === 'Test message for B');

    if (msgAInA && msgBInB && !msgAInB && !msgBInA) {
      pass('Messages are isolated between conversations');
    } else {
      fail('Messages leaked between conversations');
    }
  } catch (e) {
    fail(`Message isolation: ${e.message || e}`);
  }

  // ============================================
  // WEBSOCKET TESTS
  // ============================================
  console.log('\n--- WEBSOCKET TESTS ---');

  // Test 15: Real-time messaging customer -> agent
  try {
    let agentReceived = false;
    let customerReceived = false;
    let agentConnected = false;
    let customerConnected = false;

    const customerSocket = io(SOCKET_BASE + '/chat', {
      auth: { token: customerToken },
      transports: ['websocket'],
    });

    const agentSocket = io(SOCKET_BASE + '/chat', {
      auth: { token: agentToken },
      transports: ['websocket'],
    });

    customerSocket.on('connect', () => {
      customerConnected = true;
      customerSocket.emit('conversation:join', { conversationId: convA._id });
    });
    
    agentSocket.on('connect', () => {
      agentConnected = true;
      agentSocket.emit('conversation:join', { conversationId: convA._id });
    });

    agentSocket.on('message:new', (msg) => {
      if (msg.senderRole === 'customer') agentReceived = true;
    });
    
    customerSocket.on('message:new', (msg) => {
      if (msg.senderRole === 'agent') customerReceived = true;
    });

    // Wait for connections
    await new Promise(r => setTimeout(r, 2000));
    
    if (!agentConnected || !customerConnected) {
      fail(`Real-time failed: agent connected=${agentConnected}, customer connected=${customerConnected}`);
    } else {
      customerSocket.emit('message:send', {
        conversationId: convA._id,
        content: 'Real-time test customer->agent',
      });
      
      await new Promise(r => setTimeout(r, 2000));
      
      agentSocket.emit('message:send', {
        conversationId: convA._id,
        content: 'Real-time test agent->customer',
      });
      
      await new Promise(r => setTimeout(r, 2000));

      if (agentReceived && customerReceived) {
        pass('Real-time messaging works bidirectionally');
      } else {
        fail(`Real-time failed: agent=${agentReceived}, customer=${customerReceived}`);
      }
    }

    agentSocket.disconnect();
    customerSocket.disconnect();
  } catch (e) {
    fail(`Real-time messaging: ${e.message || e}`);
  }

  // Test 16: Typing indicators
  try {
    let typingReceived = false;
    let agentConnected = false;
    let customerConnected = false;

    const customerSocket = io(SOCKET_BASE + '/chat', {
      auth: { token: customerToken },
      transports: ['websocket'],
    });

    const agentSocket = io(SOCKET_BASE + '/chat', {
      auth: { token: agentToken },
      transports: ['websocket'],
    });

    agentSocket.on('connect', () => {
      agentConnected = true;
      agentSocket.emit('conversation:join', { conversationId: convA._id });
    });
    
    customerSocket.on('connect', () => {
      customerConnected = true;
      customerSocket.emit('conversation:join', { conversationId: convA._id });
    });

    agentSocket.on('typing:start', (data) => {
      if (data.conversationId === convA._id) typingReceived = true;
    });

    // Wait for connections
    await new Promise(r => setTimeout(r, 2000));
    
    if (agentConnected && customerConnected) {
      customerSocket.emit('typing:start', { conversationId: convA._id });
      
      await new Promise(r => setTimeout(r, 2000));

      if (typingReceived) {
        pass('Typing indicators work');
      } else {
        fail('Typing indicators not received');
      }
    } else {
      fail(`Typing indicators failed: agent connected=${agentConnected}, customer connected=${customerConnected}`);
    }

    agentSocket.disconnect();
    customerSocket.disconnect();
  } catch (e) {
    fail(`Typing indicators: ${e.message || e}`);
  }

  // ============================================
  // READ RECEIPT TESTS
  // ============================================
  console.log('\n--- READ RECEIPT TESTS ---');

  // Test 17: Mark conversation as read
  try {
    // First send a message from customer
    await api('POST', `/chat/conversations/${convA._id}/messages`, customerToken, {
      content: 'Message for read receipt test',
      senderRole: 'customer',
    });

    // Agent marks as read
    const readResult = await api('POST', `/chat/conversations/${convA._id}/read`, agentToken);
    
    if (readResult && readResult.unreadCountForAgent === 0) {
      pass('Mark conversation as read works');
    } else {
      fail('Mark conversation as read did not reset unread count');
    }
  } catch (e) {
    fail(`Mark as read: ${e.message || e}`);
  }

  // ============================================
  // RACE CONDITION TEST
  // ============================================
  console.log('\n--- RACE CONDITION TEST ---');

  // Test 18: Rapid double-click doesn't create duplicates
  try {
    const [conv1, conv2] = await Promise.all([
      api('POST', '/chat/conversations', customerToken, { productId: productA }),
      api('POST', '/chat/conversations', customerToken, { productId: productA }),
    ]);

    if (conv1._id === conv2._id) {
      pass('Race condition handled: same conversation returned');
    } else {
      fail('Race condition: different conversations created');
    }

    const convs = await api('GET', '/chat/conversations', customerToken);
    const uniqueIds = new Set(convs.map(c => c._id));
    if (uniqueIds.size === convs.length) {
      pass('No duplicate conversations in customer list');
    } else {
      fail('Duplicate conversations found in customer list');
    }
  } catch (e) {
    fail(`Race condition test: ${e.message || e}`);
  }

  // ============================================
  // SCALE TEST
  // ============================================
  console.log('\n--- SCALE TEST ---');

  // Test 19: Multiple customers with multiple products
  try {
    const customers = [];
    for (let i = 0; i < 5; i++) {
      const email = `scale_${timestamp}_${i}@test.com`;
      const signup = await api('POST', '/auth/signup', null, {
        name: `Scale Test ${i}`,
        email,
        password: 'TestPass123',
        role: 'customer',
      });
      customers.push({ token: signup.accessToken, id: signup.user.id });
    }

    // Each customer creates 2 conversations
    for (const customer of customers) {
      await api('POST', '/chat/conversations', customer.token, { productId: productA });
      await api('POST', '/chat/conversations', customer.token, { productId: productB });
    }

    // Agent sees all conversations
    const agentConvs = await api('GET', '/chat/conversations', agentToken);
    const testCustomerIds = customers.map(c => c.id);
    const testConvs = agentConvs.filter(c => {
      const cid = c.customerId?._id || c.customerId;
      return cid && testCustomerIds.includes(cid);
    });

    if (testConvs.length === customers.length * 2) {
      pass(`Scale test: ${customers.length} customers × 2 products = ${testConvs.length} conversations`);
    } else {
      fail(`Scale test: expected ${customers.length * 2}, got ${testConvs.length}`);
    }
  } catch (e) {
    fail(`Scale test: ${e.message || e}`);
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n=== FINAL RESULTS ===');
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  
  if (failCount === 0) {
    console.log('\n🎉 ALL TESTS PASSED');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED');
    console.log('\nFailed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.test}`);
    });
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Test runner error:', e);
  process.exit(1);
});
