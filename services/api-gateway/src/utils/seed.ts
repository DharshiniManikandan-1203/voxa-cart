import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/database.js';
import {
  Merchant,
  Role,
  User,
  Agent,
  PromptTemplate,
  PromptVersion,
  Product,
  Discount,
  Order,
  Conversation,
  ConversationMessage,
  ToolExecution,
  Experiment,
  Evaluation,
  APIIntegration,
  AuditLog,
} from '../models/index.js';

export async function seedDatabase(): Promise<void> {
  console.log('[Seed] Starting database seeding for VoxaFlow...');

  // Clear existing collections
  await Promise.all([
    Merchant.deleteMany({}),
    Role.deleteMany({}),
    User.deleteMany({}),
    Agent.deleteMany({}),
    PromptTemplate.deleteMany({}),
    PromptVersion.deleteMany({}),
    Product.deleteMany({}),
    Discount.deleteMany({}),
    Order.deleteMany({}),
    Conversation.deleteMany({}),
    ConversationMessage.deleteMany({}),
    ToolExecution.deleteMany({}),
    Experiment.deleteMany({}),
    Evaluation.deleteMany({}),
    APIIntegration.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  console.log('[Seed] Cleared existing collections');

  // 1. CREATE SYSTEM ROLES
  const roles = await Role.create([
    {
      name: 'PLATFORM_ADMIN',
      description: 'Global system super administrator',
      permissions: [
        'tenant:read',
        'tenant:update',
        'tenant:manage',
        'user:read',
        'user:create',
        'user:update',
        'user:delete',
        'user:manage',
        'role:manage',
        'agent:read',
        'agent:create',
        'agent:update',
        'agent:delete',
        'agent:publish',
        'agent:manage',
        'prompt:read',
        'prompt:create',
        'prompt:update',
        'prompt:activate',
        'prompt:eval',
        'prompt:manage',
        'experiment:manage',
        'product:read',
        'product:create',
        'product:update',
        'product:delete',
        'product:manage',
        'discount:read',
        'discount:manage',
        'order:read',
        'order:create',
        'order:update',
        'order:cancel',
        'order:manage',
        'conversation:read',
        'conversation:manage',
        'conversation:export',
        'voice:execute',
        'voice:stream',
        'integration:manage',
        'audit:read',
        'analytics:read',
      ],
      is_system: true,
    },
    {
      name: 'MERCHANT_ADMIN',
      description: 'Full administrative control over a single merchant tenant',
      permissions: [
        'tenant:manage',
        'user:manage',
        'agent:manage',
        'prompt:manage',
        'prompt:eval',
        'experiment:manage',
        'product:manage',
        'discount:manage',
        'order:manage',
        'conversation:read',
        'voice:execute',
        'integration:manage',
        'analytics:read',
        'audit:read',
      ],
      is_system: true,
    },
    {
      name: 'MERCHANT_MANAGER',
      description: 'Operations manager for products, discounts, and orders',
      permissions: ['product:manage', 'discount:manage', 'order:manage', 'conversation:read', 'analytics:read'],
      is_system: true,
    },
    {
      name: 'AGENT_MANAGER',
      description: 'Prompt engineer and voice AI agent designer',
      permissions: ['agent:manage', 'prompt:manage', 'prompt:eval', 'experiment:manage', 'conversation:read', 'voice:execute', 'analytics:read'],
      is_system: true,
    },
    {
      name: 'SUPPORT_AGENT',
      description: 'Customer service agent reviewing transcripts and orders',
      permissions: ['order:read', 'order:cancel', 'conversation:read', 'conversation:manage'],
      is_system: true,
    },
    {
      name: 'CUSTOMER',
      description: 'End customer interacting with voice commerce store',
      permissions: ['product:read', 'discount:read', 'order:create', 'voice:execute'],
      is_system: true,
    },
  ]);

  const platformAdminRole = roles.find((r) => r.name === 'PLATFORM_ADMIN')!;
  const merchantAdminRole = roles.find((r) => r.name === 'MERCHANT_ADMIN')!;

  const passwordHash = await bcrypt.hash('Password@123', 10);

  // 2. CREATE PLATFORM ADMIN USER
  await User.create({
    name: 'Dharshini (Super Admin)',
    email: 'admin@voxaflow.com',
    password_hash: passwordHash,
    merchant_id: null,
    role_id: platformAdminRole._id,
    status: 'ACTIVE',
  });

  // 3. CREATE MERCHANT A (Fashion & Footwear)
  const merchantA = await Merchant.create({
    name: 'Apex Athletics',
    code: 'apex-fashion',
    description: 'Premium performance sportswear, running shoes and athleisure footwear.',
    industry: 'FASHION',
    currency: 'INR',
    supported_languages: ['en-IN', 'hinglish'],
    business_hours: { timezone: 'Asia/Kolkata', open: '09:00', close: '22:00' },
    contact_info: { email: 'support@apexathletics.in', phone: '+91 98765 43210' },
    status: 'ACTIVE',
    settings: { max_concurrent_calls: 20, default_fallback_phone: '+91 98765 00000' },
  });

  await User.create({
    name: 'Apex Admin',
    email: 'admin@apexfashion.com',
    password_hash: passwordHash,
    merchant_id: merchantA._id,
    role_id: merchantAdminRole._id,
    status: 'ACTIVE',
  });

  // 4. CREATE MERCHANT B (Consumer Electronics)
  const merchantB = await Merchant.create({
    name: 'BytePulse Tech',
    code: 'bytepulse',
    description: 'High-tech audio gear, smart accessories, keyboards and PC peripherals.',
    industry: 'ELECTRONICS',
    currency: 'INR',
    supported_languages: ['en-IN'],
    business_hours: { timezone: 'Asia/Kolkata', open: '10:00', close: '20:00' },
    contact_info: { email: 'hello@bytepulse.in', phone: '+91 91234 56789' },
    status: 'ACTIVE',
  });

  await User.create({
    name: 'BytePulse Admin',
    email: 'admin@bytepulse.com',
    password_hash: passwordHash,
    merchant_id: merchantB._id,
    role_id: merchantAdminRole._id,
    status: 'ACTIVE',
  });

  // 5. CREATE MERCHANT C (Organic Grocery)
  const merchantC = await Merchant.create({
    name: 'FreshRoot Organics',
    code: 'freshroot',
    description: 'Pure farm-to-table organic staples, cold-pressed oils, and spices.',
    industry: 'GROCERY',
    currency: 'INR',
    supported_languages: ['hi-IN', 'hinglish', 'en-IN'],
    business_hours: { timezone: 'Asia/Kolkata', open: '08:00', close: '21:00' },
    contact_info: { email: 'care@freshroot.farm' },
    status: 'ACTIVE',
  });

  await User.create({
    name: 'FreshRoot Admin',
    email: 'admin@freshroot.com',
    password_hash: passwordHash,
    merchant_id: merchantC._id,
    role_id: merchantAdminRole._id,
    status: 'ACTIVE',
  });

  console.log('[Seed] Created Merchants: Apex Athletics, BytePulse Tech, FreshRoot Organics');

  // 6. PROVISION PRODUCTS & VARIANTS FOR APEX ATHLETICS
  const apexProducts = await Product.create([
    {
      merchant_id: merchantA._id,
      title: 'Nike Air Zoom Pegasus 40',
      handle: 'nike-air-zoom-pegasus-40',
      description: 'A springy ride for every run, familiar feel return to help you accomplish your goals.',
      category: 'Footwear',
      brand: 'Nike',
      tags: ['running', 'shoes', 'cushioned', 'breathable', 'footwear', 'black'],
      price: 2999,
      compare_at_price: 3999,
      cost_price: 1800,
      variants: [
        { variant_id: 'peg40-blk-8', title: 'Black / Size UK 8', sku: 'PEG40-BLK-8', price: 2999, stock_quantity: 15, attributes: { size: 'UK 8', color: 'Black' } },
        { variant_id: 'peg40-blk-9', title: 'Black / Size UK 9', sku: 'PEG40-BLK-9', price: 2999, stock_quantity: 22, attributes: { size: 'UK 9', color: 'Black' } },
        { variant_id: 'peg40-blu-9', title: 'Royal Blue / Size UK 9', sku: 'PEG40-BLU-9', price: 2999, stock_quantity: 10, attributes: { size: 'UK 9', color: 'Blue' } },
      ],
      images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80'],
      status: 'ACTIVE',
    },
    {
      merchant_id: merchantA._id,
      title: 'Puma Flyer Runner Engineered Knit',
      handle: 'puma-flyer-runner',
      description: 'Lightweight cushioned daily running shoe with soft foam sockliner.',
      category: 'Footwear',
      brand: 'Puma',
      tags: ['running', 'shoes', 'budget', 'lightweight', 'black'],
      price: 1899,
      compare_at_price: 2499,
      cost_price: 950,
      variants: [
        { variant_id: 'puma-fly-8', title: 'All Black / UK 8', sku: 'PUMA-FLY-8', price: 1899, stock_quantity: 30, attributes: { size: 'UK 8', color: 'Black' } },
        { variant_id: 'puma-fly-9', title: 'All Black / UK 9', sku: 'PUMA-FLY-9', price: 1899, stock_quantity: 18, attributes: { size: 'UK 9', color: 'Black' } },
      ],
      images: ['https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&q=80'],
      status: 'ACTIVE',
    },
    {
      merchant_id: merchantA._id,
      title: 'Adidas Ultraboost Light Performance',
      handle: 'adidas-ultraboost-light',
      description: 'Experience epic energy with the lightest Ultraboost ever made.',
      category: 'Footwear',
      brand: 'Adidas',
      tags: ['marathon', 'running', 'boost', 'premium', 'shoes'],
      price: 4499,
      compare_at_price: 5999,
      cost_price: 2600,
      variants: [
        { variant_id: 'ub-wht-9', title: 'Cloud White / UK 9', sku: 'UB-WHT-9', price: 4499, stock_quantity: 12, attributes: { size: 'UK 9', color: 'White' } },
      ],
      images: ['https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&q=80'],
      status: 'ACTIVE',
    },
    {
      merchant_id: merchantA._id,
      title: 'Apex AeroDry Performance Tee',
      handle: 'apex-aerodry-tee',
      description: 'Moisture wicking anti-odor training t-shirt for intense running sessions.',
      category: 'Apparel',
      brand: 'Apex',
      tags: ['t-shirt', 'gym', 'dryfit', 'running', 'apparel'],
      price: 799,
      compare_at_price: 999,
      cost_price: 320,
      variants: [
        { variant_id: 'tee-blk-m', title: 'Stealth Black / Medium', sku: 'TEE-BLK-M', price: 799, stock_quantity: 40, attributes: { size: 'M', color: 'Black' } },
        { variant_id: 'tee-blk-l', title: 'Stealth Black / Large', sku: 'TEE-BLK-L', price: 799, stock_quantity: 35, attributes: { size: 'L', color: 'Black' } },
      ],
      images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80'],
      status: 'ACTIVE',
    },
  ]);

  // 7. PROVISION PRODUCTS FOR BYTEPULSE ELECTRONICS
  await Product.create([
    {
      merchant_id: merchantB._id,
      title: 'BytePulse Wave ANC Pro Wireless Headphones',
      handle: 'bytepulse-wave-anc-pro',
      description: '40mm titanium drivers with 42dB active noise cancellation and 50hr battery.',
      category: 'Electronics',
      brand: 'BytePulse',
      tags: ['audio', 'headphones', 'anc', 'wireless', 'bluetooth'],
      price: 3499,
      compare_at_price: 4999,
      cost_price: 1900,
      variants: [
        { variant_id: 'bp-anc-blk', title: 'Matte Obsidian', sku: 'BP-ANC-BLK', price: 3499, stock_quantity: 25, attributes: { color: 'Black' } },
      ],
      images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80'],
      status: 'ACTIVE',
    },
    {
      merchant_id: merchantB._id,
      title: 'PulseMech RGB Mechanical Gaming Keyboard',
      handle: 'pulsemech-rgb-keyboard',
      description: 'Hot-swappable linear red switches with per-key RGB backlighting.',
      category: 'Electronics',
      brand: 'BytePulse',
      tags: ['keyboard', 'gaming', 'mechanical', 'rgb'],
      price: 2299,
      compare_at_price: 2999,
      cost_price: 1200,
      variants: [
        { variant_id: 'mech-red-sw', title: 'Red Switch / Tenkeyless', sku: 'MECH-RED-TKL', price: 2299, stock_quantity: 18, attributes: { switch: 'Red' } },
      ],
      images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80'],
      status: 'ACTIVE',
    },
  ]);

  // 8. PROVISION PRODUCTS FOR FRESHROOT ORGANICS
  await Product.create([
    {
      merchant_id: merchantC._id,
      title: 'FreshRoot Cold-Pressed Yellow Mustard Oil (1 Litre)',
      handle: 'cold-pressed-mustard-oil-1l',
      description: 'Traditional wood-pressed kachi ghani unrefined pure organic mustard oil.',
      category: 'Grocery',
      brand: 'FreshRoot',
      tags: ['oil', 'organic', 'kachi ghani', 'cooking', 'healthy'],
      price: 299,
      compare_at_price: 350,
      cost_price: 160,
      variants: [
        { variant_id: 'oil-must-1l', title: 'Glass Bottle / 1L', sku: 'OIL-MUST-1L', price: 299, stock_quantity: 60, attributes: { volume: '1L' } },
      ],
      images: ['https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80'],
      status: 'ACTIVE',
    },
  ]);

  // 9. PROVISION DISCOUNTS & COUPONS
  await Discount.create([
    {
      merchant_id: merchantA._id,
      code: 'VOXA10',
      title: '10% Welcome Discount',
      type: 'PERCENTAGE',
      value: 10,
      min_order_value: 999,
      max_discount_cap: 500,
      status: 'ACTIVE',
    },
    {
      merchant_id: merchantA._id,
      code: 'RUNNER200',
      title: 'Flat ₹200 Off for Runners',
      type: 'FIXED_AMOUNT',
      value: 200,
      min_order_value: 1500,
      applicable_categories: ['Footwear'],
      status: 'ACTIVE',
    },
    {
      merchant_id: merchantB._id,
      code: 'TECH5',
      title: '5% Tech Upgrade Coupon',
      type: 'PERCENTAGE',
      value: 5,
      min_order_value: 2000,
      status: 'ACTIVE',
    },
    {
      merchant_id: merchantC._id,
      code: 'FRESH50',
      title: 'Flat ₹50 Off Organic Basket',
      type: 'FIXED_AMOUNT',
      value: 50,
      min_order_value: 500,
      status: 'ACTIVE',
    },
  ]);

  // 10. PROVISION AGENT, PROMPT TEMPLATES & VERSIONS FOR APEX ATHLETICS
  const agentA = await Agent.create({
    merchant_id: merchantA._id,
    name: 'Sneaker Stylist & Sales Concierge',
    purpose: 'SALES',
    personality: {
      tone: 'friendly',
      style: 'Energetic, helpful Indian retail voice assistant specializing in footwear',
      default_language: 'hinglish',
    },
    voice_config: {
      provider: 'BROWSER_TTS',
      voice_id: 'en-IN-Standard-A',
      speed: 1.05,
      pitch: 1.0,
    },
    stt_config: {
      provider: 'BROWSER_STT',
      language_code: 'en-IN',
    },
    allowed_tools: ['search_products', 'get_product_details', 'calculate_discount', 'calculate_final_price', 'get_order_status', 'create_order'],
    business_rules: [
      'Orders above ₹999 qualify for 100% Free Shipping.',
      'Recommend coupon VOXA10 if the customer inquires about special offers.',
      'Always confirm shoe size (UK 8, 9, 10) before completing order.',
    ],
    max_response_sentences: 2,
    status: 'ACTIVE',
  });

  const promptTemplateA = await PromptTemplate.create({
    merchant_id: merchantA._id,
    agent_id: agentA._id,
    name: 'Apex Voice Stylist System Prompt',
    description: 'Dynamic parameterized prompt with Hinglish retail dialect instructions',
    latest_version_number: 2,
  });

  const promptV1 = await PromptVersion.create({
    template_id: promptTemplateA._id,
    merchant_id: merchantA._id,
    version_number: 1,
    system_prompt_raw: `You are a voice shopping assistant for {{merchant_name}}.
Speak concise {{language}}.
Maximum response length: {{max_sentences}} short sentences.
Business Rules: {{business_rules}}
Available Catalog: {{catalog_context}}
Available Discounts: {{active_discounts}}

VOICE GUIDELINES:
- No markdown asterisks or bullet points.
- Never do arithmetic yourself. Always call calculate_discount or calculate_final_price.
- Keep language natural and helpful.`,
    variables: [
      { name: 'merchant_name', description: 'Store name', required: true, default_value: 'Apex Athletics' },
      { name: 'language', description: 'Target dialogue language', required: false, default_value: 'Hinglish' },
      { name: 'max_sentences', description: 'Sentence limit', required: false, default_value: '2' },
      { name: 'business_rules', description: 'Store rules', required: false },
      { name: 'catalog_context', description: 'Catalog items', required: false },
      { name: 'active_discounts', description: 'Coupons', required: false },
    ],
    status: 'ACTIVE',
    change_description: 'Initial production voice prompt',
  });

  const promptV2 = await PromptVersion.create({
    template_id: promptTemplateA._id,
    merchant_id: merchantA._id,
    version_number: 2,
    system_prompt_raw: `You are the lead Sneaker Stylist & Sales Concierge for {{merchant_name}}.
Dialogue Style: Warm, ultra-crisp {{language}} with natural conversational phrasing.
Max length: {{max_sentences}} sentences per turn.
Business Rules: {{business_rules}}
Context: {{catalog_context}} | Discounts: {{active_discounts}}

CRITICAL VOICE CONSTRAINTS:
1. Speak in clean plain text only (NO formatting, NO bullet points).
2. For budget queries, prioritize matching in-stock running shoes and mention prices clearly in Rupees.
3. Call tools deterministically to calculate prices.`,
    variables: [
      { name: 'merchant_name', description: 'Store name', required: true, default_value: 'Apex Athletics' },
      { name: 'language', description: 'Target dialogue language', required: false, default_value: 'Hinglish' },
      { name: 'max_sentences', description: 'Sentence limit', required: false, default_value: '2' },
      { name: 'business_rules', description: 'Store rules', required: false },
      { name: 'catalog_context', description: 'Catalog items', required: false },
      { name: 'active_discounts', description: 'Coupons', required: false },
    ],
    status: 'ACTIVE',
    change_description: 'Version 2 with enhanced voice phrasing and pricing clarity',
  });

  promptTemplateA.active_version_id = promptV2._id;
  await promptTemplateA.save();

  agentA.active_prompt_version_id = promptV2._id;
  await agentA.save();

  // 11. PROVISION A/B EXPERIMENT (Comparing Prompt v1 vs v2)
  await Experiment.create({
    merchant_id: merchantA._id,
    agent_id: agentA._id,
    name: 'Voice Pitch Optimization: V1 vs V2',
    hypothesis: 'Version 2 with punchier Hinglish retail phrasing will improve task resolution and reduce turn latency.',
    traffic_split: 50,
    status: 'RUNNING',
    starts_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    variant_a: {
      prompt_version_id: promptV1._id,
      version_number: 1,
      sample_count: 624,
      conversions: 137,
      avg_latency_ms: 680,
      task_completion_rate: 82,
      fallback_rate: 6.2,
    },
    variant_b: {
      prompt_version_id: promptV2._id,
      version_number: 2,
      sample_count: 624,
      conversions: 168,
      avg_latency_ms: 520,
      task_completion_rate: 91,
      fallback_rate: 2.8,
    },
    winner_variant: 'B',
  });

  // 12. PROVISION SAMPLE REALISTIC CONVERSATIONS & ORDERS
  const sampleConv = await Conversation.create({
    merchant_id: merchantA._id,
    agent_id: agentA._id,
    prompt_version_id: promptV2._id,
    variant_tag: 'B',
    customer_name: 'Rahul Sharma',
    customer_phone: '9876543210',
    channel: 'VOICE_WEB',
    current_state: 'ORDER_PLACED',
    extracted_slots: { category: 'Footwear', budget_max: 3000, selected_product: 'Nike Air Zoom Pegasus 40' },
    language_detected: 'hinglish',
    status: 'COMPLETED',
    duration_seconds: 94,
    total_turns: 4,
  });

  await ConversationMessage.create([
    {
      conversation_id: sampleConv._id,
      merchant_id: merchantA._id,
      turn_index: 1,
      sender: 'AGENT',
      content: 'Namaste! Main Apex Athletics ka Sneaker Stylist hoon. Aaj aap kaun se shoes ya sportswear dekhna chahenge?',
      detected_intent: 'GREETING',
      intent_confidence: 1.0,
      latency_ms: { total_turn_ms: 110 },
    },
    {
      conversation_id: sampleConv._id,
      merchant_id: merchantA._id,
      turn_index: 2,
      sender: 'CUSTOMER',
      content: 'Mujhe 3000 ke under running shoes chahiye black color mein.',
      latency_ms: { stt_ms: 190 },
    },
    {
      conversation_id: sampleConv._id,
      merchant_id: merchantA._id,
      turn_index: 3,
      sender: 'AGENT',
      content:
        'Humare paas Nike Pegasus 40 (₹2999) aur Puma Flyer Runner (₹1899) dono black color mein available hain. Kya aap Nike Pegasus UK 9 size mein order karna chahenge?',
      detected_intent: 'PRODUCT_SEARCH',
      intent_confidence: 0.98,
      latency_ms: { stt_ms: 190, llm_first_chunk_ms: 380, tool_exec_ms: 85, tts_ms: 140, total_turn_ms: 795 },
      tokens_used: { prompt_tokens: 155, completion_tokens: 42, total_tokens: 197 },
    },
  ]);

  await ToolExecution.create({
    conversation_id: sampleConv._id,
    merchant_id: merchantA._id,
    turn_index: 3,
    tool_name: 'search_products',
    input_arguments: { query: 'running shoes black', category: 'Footwear', max_price: 3000 },
    output_result: { total_found: 2, products: [{ title: 'Nike Air Zoom Pegasus 40', price: 2999 }, { title: 'Puma Flyer Runner', price: 1899 }] },
    execution_status: 'SUCCESS',
    execution_duration_ms: 85,
  });

  // Sample Order
  await Order.create({
    merchant_id: merchantA._id,
    order_number: 'VF-89214',
    conversation_id: sampleConv._id,
    customer: {
      name: 'Rahul Sharma',
      phone: '9876543210',
      email: 'rahul.sharma@example.com',
      shipping_address: { street: '402 Sunrise Heights, Bandra West', city: 'Mumbai', state: 'Maharashtra', pincode: '400050' },
    },
    items: [
      {
        product_id: apexProducts[0]._id,
        variant_id: 'peg40-blk-9',
        sku: 'PEG40-BLK-9',
        title: 'Nike Air Zoom Pegasus 40 - Black / Size UK 9',
        quantity: 1,
        unit_price: 2999,
        total_price: 2999,
      },
    ],
    pricing: {
      subtotal: 2999,
      discount_total: 299.9,
      coupon_applied: 'VOXA10',
      tax_amount: 134.95,
      shipping_fee: 0,
      grand_total: 2834.05,
    },
    payment_status: 'COD',
    fulfillment_status: 'SHIPPED',
  });

  // Sample Evaluation Scorecard
  await Evaluation.create({
    conversation_id: sampleConv._id,
    merchant_id: merchantA._id,
    agent_id: agentA._id,
    prompt_version_id: promptV2._id,
    scores: {
      task_completion: 98,
      tool_call_accuracy: 100,
      response_length_compliance: 100,
      hallucination_penalty: 0,
      customer_sentiment_score: 0.85,
    },
    overall_score: 96,
    eval_breakdown: [
      'Task Completion: 98% (Successfully recommended shoes within customer budget ceiling)',
      'Tool Execution Accuracy: 100% (search_products called with valid category and budget constraint)',
      'Voice Conciseness: 100% compliant with 2 sentence limit',
      'Hallucination Risk: 0% (Exact catalog prices matched backend records)',
      'Customer Sentiment Index: +0.85 (High positive engagement)',
    ],
    evaluated_by: 'VOXAFLOW_EVAL_BENCHMARK_V1',
  });

  // Sample Shopify Integration
  await APIIntegration.create({
    merchant_id: merchantA._id,
    provider: 'SHOPIFY',
    auth_type: 'API_KEY_SECRET',
    encrypted_credentials: {
      shop_domain: 'apex-athletics-demo.myshopify.com',
      api_key: 'shpat_demo_secret_key_apex',
    },
    sync_settings: {
      sync_products: true,
      sync_inventory: true,
      sync_orders: true,
      auto_sync_interval_mins: 60,
    },
    status: 'CONNECTED',
    last_synced_at: new Date(),
  });

  console.log('[Seed] Database seeding completed successfully!');
}

if (process.argv[1]?.endsWith('seed.ts')) {
  (async () => {
    await connectDB();
    await seedDatabase();
    await disconnectDB();
    process.exit(0);
  })();
}
