/* eslint-disable no-console */
import 'reflect-metadata';
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { UserSchema } from '../src/users/schemas/user.schema';
import { ProductSchema } from '../src/products/schemas/product.schema';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/luxury_chat';

const DEMO_USERS = [
  { name: 'Ava Customer', email: '[email protected]', password: 'password123', role: 'customer' as const },
  { name: 'Noah Customer', email: '[email protected]', password: 'password123', role: 'customer' as const },
  { name: 'Agent Smith', email: '[email protected]', password: 'password123', role: 'agent' as const },
  { name: 'Agent Rose', email: '[email protected]', password: 'password123', role: 'agent' as const },
];

const DEMO_PRODUCTS = [
  {
    name: 'Aurora Diamond Tennis Bracelet',
    description: 'Hand-set brilliant-cut diamonds in 18k white gold, 5 carats total weight.',
    price: 24500,
    imageUrl: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
  },
  {
    name: 'Meridian Automatic Chronograph',
    description: 'Swiss-made automatic movement with sapphire crystal and calfskin strap.',
    price: 8900,
    imageUrl: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800',
  },
  {
    name: 'Belmont Full-Grain Leather Weekender',
    description: 'Hand-stitched Italian full-grain leather duffel with solid brass hardware.',
    price: 1650,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
  },
  {
    name: 'Cascade Cashmere Overcoat',
    description: 'Double-faced pure cashmere overcoat, tailored fit, made in Italy.',
    price: 3200,
    imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800',
  },
  {
    name: 'Solstice Pearl Strand Necklace',
    description: 'South Sea pearls, hand-knotted on silk with an 18k gold clasp.',
    price: 6400,
    imageUrl: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800',
  },
  {
    name: 'Vantage Carbon Fiber Sunglasses',
    description: 'Aerospace-grade carbon fiber frame with polarized titanium lenses.',
    price: 890,
    imageUrl: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800',
  },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to ${MONGODB_URI}`);

  const UserModel = mongoose.model('User', UserSchema);
  const ProductModel = mongoose.model('Product', ProductSchema);

  console.log('Clearing existing users and products...');
  await UserModel.deleteMany({});
  await ProductModel.deleteMany({});

  console.log('Creating demo users...');
  for (const u of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await UserModel.create({
      name: u.name,
      email: u.email,
      passwordHash,
      role: u.role,
    });
    console.log(`  - ${u.role.padEnd(8)} ${u.email} / ${u.password}`);
  }

  console.log('Creating demo products...');
  await ProductModel.insertMany(DEMO_PRODUCTS);
  console.log(`  - inserted ${DEMO_PRODUCTS.length} products`);

  await mongoose.disconnect();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
