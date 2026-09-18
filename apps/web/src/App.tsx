import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, TabType } from './components/layout/Sidebar';
import { VoicePlayground } from './components/playground/VoicePlayground';
import { AnalyticsDashboard } from './components/dashboard/AnalyticsDashboard';
import { PromptStudio } from './components/prompts/PromptStudio';
import { AgentStudio } from './components/agents/AgentStudio';
import { ExperimentStudio } from './components/experiments/ExperimentStudio';
import { ProductHub } from './components/commerce/ProductHub';
import { DiscountHub } from './components/commerce/DiscountHub';
import { OrderHub } from './components/commerce/OrderHub';
import { EvaluationHub } from './components/evaluations/EvaluationHub';
import { ShopifyHub } from './components/integrations/ShopifyHub';
import { AuditHub } from './components/audit/AuditHub';
import { UsersHub } from './components/users/UsersHub';
import { MerchantHub } from './components/merchants/MerchantHub';
import { Merchant, Agent } from './types';
import { ApiService } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('playground');
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [activeMerchant, setActiveMerchant] = useState<Merchant | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [userRole, setUserRole] = useState<string>('MERCHANT_ADMIN');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bootstrapApp();
  }, []);

  const bootstrapApp = async () => {
    setLoading(true);
    try {
      // Auto-authenticate as Apex Fashion merchant admin for demo purposes if not logged in
      const authRes = await ApiService.login('admin@apexfashion.com', 'Password@123').catch(() => null);
      if (authRes?.user) {
        setUserRole(authRes.user.role);
      }

      const mRes = await ApiService.listMerchants();
      setMerchants(mRes.data || []);
      if (mRes.data && mRes.data.length > 0) {
        const initialMerchant = mRes.data[0];
        setActiveMerchant(initialMerchant);
        ApiService.setActiveTenantId(initialMerchant._id);
        await loadAgentsForMerchant(initialMerchant._id);
      }
    } catch (err) {
      console.error('Bootstrap error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAgentsForMerchant = async (merchantId: string) => {
    try {
      ApiService.setActiveTenantId(merchantId);
      const aRes = await ApiService.listAgents();
      setAgents(aRes.data || []);
      if (aRes.data && aRes.data.length > 0) {
        setActiveAgent(aRes.data[0]);
      } else {
        setActiveAgent(null);
      }
    } catch (err) {
      console.error('Failed to load agents:', err);
    }
  };

  const handleSelectMerchant = (m: Merchant) => {
    setActiveMerchant(m);
    ApiService.setActiveTenantId(m._id);
    loadAgentsForMerchant(m._id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center space-y-3 font-sans">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-sm font-semibold text-slate-300">Initializing VoxaFlow Multi-Tenant Platform...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* Top Navigation Header */}
      <Navbar
        merchants={merchants}
        activeMerchant={activeMerchant}
        onSelectMerchant={handleSelectMerchant}
        agents={agents}
        activeAgent={activeAgent}
        onSelectAgent={setActiveAgent}
        userRole={userRole}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Navigation */}
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Dynamic Content View Container */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#090d16] via-surface-950 to-[#070a12]">
          {activeTab === 'playground' && (
            <VoicePlayground activeMerchant={activeMerchant} activeAgent={activeAgent} />
          )}
          {activeTab === 'dashboard' && <AnalyticsDashboard />}
          {activeTab === 'agents' && (
            <AgentStudio
              agents={agents}
              activeAgent={activeAgent}
              activeMerchant={activeMerchant}
              onRefresh={() => activeMerchant && loadAgentsForMerchant(activeMerchant._id)}
            />
          )}
          {activeTab === 'prompts' && <PromptStudio activeAgent={activeAgent} />}
          {activeTab === 'experiments' && <ExperimentStudio activeAgent={activeAgent} />}
          {activeTab === 'products' && <ProductHub activeMerchant={activeMerchant} />}
          {activeTab === 'discounts' && <DiscountHub activeMerchant={activeMerchant} />}
          {activeTab === 'orders' && <OrderHub activeMerchant={activeMerchant} />}
          {activeTab === 'evaluations' && <EvaluationHub activeMerchant={activeMerchant} />}
          {activeTab === 'integrations' && <ShopifyHub activeMerchant={activeMerchant} />}
          {activeTab === 'audit' && <AuditHub activeMerchant={activeMerchant} />}
          {activeTab === 'users' && <UsersHub />}
          {activeTab === 'merchants' && (
            <MerchantHub
              merchants={merchants}
              activeMerchant={activeMerchant}
              onSelectMerchant={handleSelectMerchant}
              onRefresh={bootstrapApp}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
