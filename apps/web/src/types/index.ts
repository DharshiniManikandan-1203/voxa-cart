export interface Merchant {
  _id: string;
  name: string;
  code: string;
  description?: string;
  industry: 'FASHION' | 'ELECTRONICS' | 'GROCERY' | 'BEAUTY' | 'GENERAL';
  currency: string;
  supported_languages: string[];
  business_hours: {
    timezone: string;
    open: string;
    close: string;
  };
  contact_info: {
    email: string;
    phone?: string;
  };
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
  created_at: string;
}

export interface Agent {
  _id: string;
  merchant_id: string;
  name: string;
  purpose: 'SALES' | 'SUPPORT' | 'ORDER_TRACKING' | 'RETURNS' | 'GENERAL';
  personality: {
    tone: 'friendly' | 'professional' | 'enthusiastic' | 'direct';
    style: string;
    default_language: string;
  };
  active_prompt_version_id?: any;
  voice_config: {
    provider: string;
    voice_id: string;
    speed: number;
    pitch: number;
  };
  stt_config: {
    provider: string;
    language_code: string;
  };
  allowed_tools: string[];
  business_rules: string[];
  max_response_sentences: number;
  fallback_behavior: {
    max_retries: number;
    fallback_message: string;
    escalation_action: string;
  };
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED';
  created_at: string;
}

export interface PromptTemplate {
  _id: string;
  merchant_id: string;
  agent_id: any;
  name: string;
  description?: string;
  latest_version_number: number;
  active_version_id?: any;
  created_at: string;
}

export interface PromptVariable {
  name: string;
  description: string;
  required: boolean;
  default_value?: string;
}

export interface PromptVersion {
  _id: string;
  template_id: string;
  merchant_id: string;
  version_number: number;
  system_prompt_raw: string;
  variables: PromptVariable[];
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'EXPERIMENT';
  change_description: string;
  created_at: string;
  metrics?: {
    total_calls: number;
    avg_latency_ms: number;
    task_completion_rate: number;
    fallback_rate: number;
  };
}

export interface ProductVariant {
  variant_id: string;
  title: string;
  sku: string;
  price: number;
  stock_quantity: number;
  attributes: Record<string, string>;
}

export interface Product {
  _id: string;
  merchant_id: string;
  title: string;
  handle: string;
  description: string;
  category: string;
  brand: string;
  tags: string[];
  price: number;
  compare_at_price?: number;
  variants: ProductVariant[];
  images: string[];
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  external_source?: {
    provider: string;
    external_id?: string;
  };
}

export interface Discount {
  _id: string;
  merchant_id: string;
  code: string;
  title: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  value: number;
  min_order_value: number;
  max_discount_cap?: number;
  applicable_categories: string[];
  status: 'ACTIVE' | 'EXPIRED' | 'DISABLED';
}

export interface OrderItem {
  product_id: string;
  variant_id: string;
  sku: string;
  title: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Order {
  _id: string;
  merchant_id: string;
  order_number: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    shipping_address: {
      street: string;
      city: string;
      state: string;
      pincode: string;
    };
  };
  items: OrderItem[];
  pricing: {
    subtotal: number;
    discount_total: number;
    coupon_applied?: string;
    tax_amount: number;
    shipping_fee: number;
    grand_total: number;
  };
  payment_status: 'PENDING' | 'PAID' | 'COD' | 'FAILED';
  fulfillment_status: 'UNFULFILLED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  created_at: string;
}

export interface TurnTrace {
  turn_index: number;
  prompt_version_id?: string;
  stt_latency_ms: number;
  llm_first_chunk_ms: number;
  tool_exec_duration_ms: number;
  tts_latency_ms: number;
  total_turn_ms: number;
  tokens?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ConversationTurnMessage {
  _id?: string;
  turn_index: number;
  sender: 'CUSTOMER' | 'AGENT' | 'SYSTEM' | 'TOOL';
  content: string;
  detected_intent?: string;
  intent_confidence?: number;
  latency_ms?: {
    stt_ms?: number;
    llm_first_chunk_ms?: number;
    tool_exec_ms?: number;
    tts_ms?: number;
    total_turn_ms?: number;
  };
  tokens_used?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface Experiment {
  _id: string;
  merchant_id: string;
  agent_id: any;
  name: string;
  hypothesis: string;
  status: 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'TERMINATED';
  traffic_split: number;
  variant_a: {
    prompt_version_id: any;
    version_number?: number;
    sample_count: number;
    conversions: number;
    avg_latency_ms: number;
    task_completion_rate: number;
    fallback_rate: number;
  };
  variant_b: {
    prompt_version_id: any;
    version_number?: number;
    sample_count: number;
    conversions: number;
    avg_latency_ms: number;
    task_completion_rate: number;
    fallback_rate: number;
  };
  winner_variant?: 'A' | 'B' | 'INCONCLUSIVE';
}

export interface Evaluation {
  _id: string;
  conversation_id: any;
  merchant_id: string;
  agent_id: any;
  prompt_version_id?: any;
  scores: {
    task_completion: number;
    tool_call_accuracy: number;
    response_length_compliance: number;
    hallucination_penalty: number;
    customer_sentiment_score: number;
  };
  overall_score: number;
  eval_breakdown: string[];
  evaluated_by: string;
  created_at: string;
}

export interface AuditLog {
  _id: string;
  actor_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}
