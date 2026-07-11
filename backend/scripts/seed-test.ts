/* eslint-disable no-console */
import 'reflect-metadata';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { UserSchema } from '../src/users/schemas/user.schema';
import { ProductSchema } from '../src/products/schemas/product.schema';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to ${MONGODB_URI}`);

  const UserModel = mongoose.model('User', UserSchema);
  const ProductModel = mongoose.model('Product', ProductSchema);

  // Clear existing
  await UserModel.deleteMany({});
  await ProductModel.deleteMany({});
  await mongoose.connection.collection('conversations').deleteMany({});
  await mongoose.connection.collection('messages').deleteMany({});
  console.log('Cleared all data.');

  // Create 10 customers and 2 agents
  const customers = [];
  for (let i = 1; i <= 10; i++) {
    customers.push({
      name: `Customer ${i}`,
      email: `customer${i}@test.com`,
      password: 'password123',
      role: 'customer' as const,
    });
  }
  
  const agents = [
    { name: 'Agent Smith', email: 'agent@test.com', password: 'password123', role: 'agent' as const },
    { name: 'Agent Rose', email: 'agent2@test.com', password: 'password123', role: 'agent' as const },
  ];

  const allUsers = [...customers, ...agents];
  for (const u of allUsers) {
    const passwordHash = await bcrypt.hash(u.password, 10);
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
