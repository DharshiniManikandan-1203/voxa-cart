import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Merchant } from '../src/models/Merchant.js';
import { Product } from '../src/models/Product.js';
import { ToolExecutionGateway } from '../src/modules/tools/tool.gateway.js';

let mongoServer: MongoMemoryServer;

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

test.after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('Multi-Tenant Isolation - Merchant A cannot discover or retrieve Merchant B products', async () => {
  // 1. Create Merchant A and Merchant B
  const merchantA = await Merchant.create({
    name: 'Apex Fashion',
    code: 'apex-test',
    industry: 'FASHION',
    contact_info: { email: 'a@test.com' },
  });

  const merchantB = await Merchant.create({
    name: 'Byte Electronics',
    code: 'byte-test',
    industry: 'ELECTRONICS',
    contact_info: { email: 'b@test.com' },
  });

  // 2. Insert exclusive product for Merchant B
  const productB = await Product.create({
    merchant_id: merchantB._id,
    title: 'Secret Byte Drone 4K',
    handle: 'secret-byte-drone',
    category: 'Electronics',
    price: 9999,
    variants: [{ variant_id: 'dr-1', title: 'Standard', sku: 'DR-1', price: 9999, stock_quantity: 5 }],
    status: 'ACTIVE',
  });

  // 3. Search via ToolExecutionGateway from Merchant A scope
  const searchResultForA = await ToolExecutionGateway.execute({
    merchantId: merchantA._id.toString(),
    toolName: 'search_products',
    arguments: { query: 'Drone' },
  });

  // Must find 0 items for Merchant A
  assert.equal(searchResultForA.success, true);
  assert.equal(searchResultForA.result.total_found, 0);

  // 4. Attempt direct product detail lookup by ID across tenant boundary
  const detailLookupForA = await ToolExecutionGateway.execute({
    merchantId: merchantA._id.toString(),
    toolName: 'get_product_details',
    arguments: { product_id: productB._id.toString() },
  });

  assert.equal(detailLookupForA.result.found, false);
});
