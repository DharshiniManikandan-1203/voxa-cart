/**
 * VoxaFlow API Client
 * Manages API calls, tenant header injection, and response parsing.
 */

const API_BASE = '/api/v1';

export class ApiService {
  private static token: string | null = localStorage.getItem('voxa_auth_token');
  private static currentTenantId: string | null = localStorage.getItem('voxa_active_tenant_id');

  public static setAuthToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem('voxa_auth_token', token);
    else localStorage.removeItem('voxa_auth_token');
  }

  public static setActiveTenantId(tenantId: string | null) {
    this.currentTenantId = tenantId;
    if (tenantId) localStorage.setItem('voxa_active_tenant_id', tenantId);
    else localStorage.removeItem('voxa_active_tenant_id');
  }

  public static getActiveTenantId(): string | null {
    return this.currentTenantId;
  }

  private static async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (this.currentTenantId) {
      headers['x-merchant-id'] = this.currentTenantId;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || `Request failed with status ${res.status}`);
    }

    return data;
  }

  // AUTH
  public static async login(email: string, password: string) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.data?.token) {
      this.setAuthToken(res.data.token);
      if (res.data.merchant?._id) {
        this.setActiveTenantId(res.data.merchant._id);
      }
    }
    return res.data;
  }

  public static async getProfile() {
    return this.request('/auth/me');
  }

  // MERCHANTS
  public static async listMerchants() {
    return this.request('/merchants');
  }

  public static async getMerchantById(id: string) {
    return this.request(`/merchants/${id}`);
  }

  public static async getMerchantStats(id: string) {
    return this.request(`/merchants/${id}/stats`);
  }

  public static async createMerchant(payload: any) {
    return this.request('/merchants', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // AGENTS
  public static async listAgents() {
    return this.request('/agents');
  }

  public static async getAgentById(id: string) {
    return this.request(`/agents/${id}`);
  }

  public static async createAgent(payload: any) {
    return this.request('/agents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async updateAgent(id: string, payload: any) {
    return this.request(`/agents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  // PROMPTS & VERSIONS
  public static async listPromptTemplates(agentId?: string) {
    const query = agentId ? `?agent_id=${agentId}` : '';
    return this.request(`/prompts${query}`);
  }

  public static async getPromptTemplate(id: string) {
    return this.request(`/prompts/${id}`);
  }

  public static async commitPromptVersion(templateId: string, payload: any) {
    return this.request(`/prompts/${templateId}/versions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async activatePromptVersion(templateId: string, versionId: string) {
    return this.request(`/prompts/${templateId}/versions/${versionId}/activate`, {
      method: 'POST',
    });
  }

  public static async compilePromptPreview(payload: any) {
    return this.request('/prompts/preview/compile', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // COMMERCE (PRODUCTS, DISCOUNTS, PRICING, ORDERS)
  public static async listProducts(query: string = '', category: string = '', maxPrice?: number) {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (category) params.append('category', category);
    if (maxPrice) params.append('max_price', String(maxPrice));
    return this.request(`/commerce/products?${params.toString()}`);
  }

  public static async createProduct(payload: any) {
    return this.request('/commerce/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async listDiscounts() {
    return this.request('/commerce/discounts');
  }

  public static async createDiscount(payload: any) {
    return this.request('/commerce/discounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async calculatePricing(items: any[], couponCode?: string) {
    return this.request('/commerce/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify({ items, coupon_code: couponCode }),
    });
  }

  public static async listOrders() {
    return this.request('/commerce/orders');
  }

  // CONVERSATIONS & VOICE PLAYGROUND
  public static async startConversation(agentId: string, customerName?: string, channel: string = 'VOICE_WEB') {
    return this.request('/conversations/start', {
      method: 'POST',
      body: JSON.stringify({ agent_id: agentId, customer_name: customerName, channel }),
    });
  }

  public static async sendTurnMessage(conversationId: string, content: string, sttLatencyMs: number = 0, language: string = 'hinglish') {
    return this.request(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, stt_latency_ms: sttLatencyMs, language }),
    });
  }

  public static async getConversationTrace(conversationId: string) {
    return this.request(`/conversations/${conversationId}/trace`);
  }

  public static async listConversations() {
    return this.request('/conversations');
  }

  public static async executeTool(toolName: string, args: any, conversationId?: string) {
    return this.request('/conversations/tools/execute', {
      method: 'POST',
      body: JSON.stringify({ tool_name: toolName, arguments: args, conversation_id: conversationId }),
    });
  }

  // EXPERIMENTS (A/B TESTING)
  public static async listExperiments() {
    return this.request('/experiments');
  }

  public static async createExperiment(payload: any) {
    return this.request('/experiments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async completeExperiment(id: string, winner: string) {
    return this.request(`/experiments/${id}/complete`, {
      method: 'PATCH',
      body: JSON.stringify({ winner_variant: winner }),
    });
  }

  // ANALYTICS & EVALUATIONS
  public static async getAnalyticsDashboard() {
    return this.request('/analytics/dashboard');
  }

  public static async listEvaluations() {
    return this.request('/evaluations');
  }

  public static async runEvaluation(conversationId: string) {
    return this.request('/evaluations/run', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId }),
    });
  }

  // INTEGRATIONS & AUDIT
  public static async listIntegrations() {
    return this.request('/integrations');
  }

  public static async saveIntegration(payload: any) {
    return this.request('/integrations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async triggerShopifySync() {
    return this.request('/integrations/sync', {
      method: 'POST',
    });
  }

  public static async listAuditLogs() {
    return this.request('/audit');
  }

  public static async listUsers() {
    return this.request('/users');
  }

  public static async listRoles() {
    return this.request('/users/roles');
  }
}
