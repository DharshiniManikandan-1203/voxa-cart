import React, { useState, useEffect } from 'react';
import {
  FileCode,
  History,
  CheckCircle,
  Plus,
  Play,
  Eye,
  GitCompare,
  Sparkles,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { Agent, PromptTemplate, PromptVersion } from '../../types';
import { ApiService } from '../../services/api';

interface PromptStudioProps {
  activeAgent: Agent | null;
}

export const PromptStudio: React.FC<PromptStudioProps> = ({ activeAgent }) => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null);
  const [compareVersion, setCompareVersion] = useState<PromptVersion | null>(null);
  const [newPromptText, setNewPromptText] = useState('');
  const [changeDescription, setChangeDescription] = useState('');
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [activeAgent?._id]);

  const fetchTemplates = async () => {
    if (!activeAgent) return;
    setLoading(true);
    try {
      const res = await ApiService.listPromptTemplates(activeAgent._id);
      setTemplates(res.data);
      if (res.data.length > 0) {
        loadTemplateDetails(res.data[0]._id);
      }
    } catch (err) {
      console.error('Failed to load prompt templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateDetails = async (templateId: string) => {
    try {
      const res = await ApiService.getPromptTemplate(templateId);
      setActiveTemplate(res.data);
      setVersions(res.data.versions || []);
      const active = res.data.versions?.find((v: any) => v.status === 'ACTIVE') || res.data.versions?.[0];
      setSelectedVersion(active || null);
      setNewPromptText(active?.system_prompt_raw || '');
      if (res.data.versions?.length > 1) {
        setCompareVersion(res.data.versions[1]);
      }
    } catch (err) {
      console.error('Failed to load template details:', err);
    }
  };

  const handleCommitNewVersion = async () => {
    if (!activeTemplate || !newPromptText.trim()) return;
    setLoading(true);
    try {
      await ApiService.commitPromptVersion(activeTemplate._id, {
        system_prompt_raw: newPromptText,
        change_description: changeDescription || `Refined voice prompts and constraints`,
        make_active: true,
      });
      setChangeDescription('');
      await loadTemplateDetails(activeTemplate._id);
    } catch (err: any) {
      alert(`Commit error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateVersion = async (versionId: string) => {
    if (!activeTemplate) return;
    setLoading(true);
    try {
      await ApiService.activatePromptVersion(activeTemplate._id, versionId);
      await loadTemplateDetails(activeTemplate._id);
    } catch (err: any) {
      alert(`Activation error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCompilePreview = async () => {
    try {
      const res = await ApiService.compilePromptPreview({
        system_prompt_raw: newPromptText,
        context: {
          merchant_name: 'Apex Athletics',
          industry: 'Fashion',
          language: 'Hinglish',
          max_sentences: 2,
          business_rules: 'Free delivery above ₹999.',
          catalog_context: 'Nike Pegasus 40 (₹2999), Puma Flyer Runner (₹1899)',
          active_discounts: 'Coupon VOXA10 (10% off)',
        },
      });
      setPreviewResult(res.data.compiledPrompt);
    } catch (err: any) {
      alert(`Preview error: ${err.message}`);
    }
  };

  const insertVariableToken = (token: string) => {
    setNewPromptText((prev) => `${prev} {{${token}}}`);
  };

  const tokensList = [
    'merchant_name',
    'language',
    'max_sentences',
    'business_rules',
    'catalog_context',
    'active_discounts',
    'customer_name',
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
            <FileCode className="w-6 h-6 text-brand-400" />
            <span>Prompt Studio & Immutable Versioning</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Design parameterized voice prompts, manage immutable version history, and conduct A/B comparisons
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsDiffMode(!isDiffMode)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
              isDiffMode
                ? 'bg-purple-600 border-purple-500 text-white'
                : 'bg-surface-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>{isDiffMode ? 'Exit Version Diff' : 'Compare Versions (Diff)'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Immutable Versions Timeline */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <History className="w-4 h-4 text-brand-400" />
              <span>Version Timeline</span>
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {versions.length} versions
            </span>
          </div>

          <div className="space-y-2">
            {versions.map((v) => {
              const isSelected = selectedVersion?._id === v._id;
              const isActive = v.status === 'ACTIVE';
              return (
                <div
                  key={v._id}
                  onClick={() => {
                    setSelectedVersion(v);
                    setNewPromptText(v.system_prompt_raw);
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? 'bg-surface-850 border-brand-500/50 shadow-md'
                      : 'bg-surface-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black font-mono text-white">v{v.version_number}</span>
                      {isActive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                          <CheckCircle className="w-2.5 h-2.5" />
                          <span>LIVE TRAFFIC</span>
                        </span>
                      )}
                    </div>
                    {!isActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivateVersion(v._id);
                        }}
                        className="text-[10px] font-semibold text-brand-400 hover:text-brand-300 transition"
                      >
                        Activate for Live
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-1">{v.change_description}</p>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono">
                    {new Date(v.created_at).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 Columns: Prompt Editor & Live Preview */}
        <div className="lg:col-span-2 space-y-4">
          {!isDiffMode ? (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>Prompt Template Editor</span>
                    {selectedVersion && (
                      <span className="text-xs font-mono text-brand-400">
                        (Editing towards v{activeTemplate?.latest_version_number + 1})
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Insert dynamic parameters. Once committed, previous versions are strictly immutable.
                  </p>
                </div>

                <button
                  onClick={handleCompilePreview}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-surface-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-800 transition"
                >
                  <Eye className="w-3.5 h-3.5 text-purple-400" />
                  <span>Preview Compiled</span>
                </button>
              </div>

              {/* Variable Token Insertion Pills */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Click to Insert Dynamic Tokens:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {tokensList.map((token) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => insertVariableToken(token)}
                      className="px-2 py-1 rounded-lg bg-surface-950 hover:bg-brand-950/60 text-brand-300 hover:text-brand-200 border border-brand-500/20 text-xs font-mono font-medium transition"
                    >
                      +{`{{${token}}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Raw Prompt Textarea */}
              <textarea
                rows={12}
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                className="w-full bg-surface-950 border border-slate-800 focus:border-brand-500 rounded-xl p-4 text-xs font-mono leading-relaxed text-slate-200 focus:outline-none transition resize-y"
              />

              {/* Change Description & Commit Button */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <input
                  type="text"
                  value={changeDescription}
                  onChange={(e) => setChangeDescription(e.target.value)}
                  placeholder="Describe prompt changes (e.g. 'Optimized sentence brevity and Hinglish pricing clarity')..."
                  className="flex-1 bg-surface-950 border border-slate-800 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                />
                <button
                  onClick={handleCommitNewVersion}
                  disabled={loading || !newPromptText.trim()}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Commit as v{activeTemplate ? activeTemplate.latest_version_number + 1 : 2}</span>
                </button>
              </div>

              {/* Compiled Preview Drawer */}
              {previewResult && (
                <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                    <span className="flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>Live Compiled Prompt Preview</span>
                    </span>
                    <button onClick={() => setPreviewResult(null)} className="text-slate-400 hover:text-white">
                      ✕
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {previewResult}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            /* Side-by-Side Version Diff View */
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <GitCompare className="w-4 h-4 text-purple-400" />
                <span>Side-by-Side Version Diff Comparison</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-surface-950 border border-slate-800 space-y-2">
                  <span className="text-xs font-mono font-bold text-brand-400 block">
                    Variant A (v{selectedVersion?.version_number || 1})
                  </span>
                  <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                    {selectedVersion?.system_prompt_raw}
                  </pre>
                </div>

                <div className="p-4 rounded-xl bg-surface-950 border border-slate-800 space-y-2">
                  <span className="text-xs font-mono font-bold text-purple-400 block">
                    Variant B (v{compareVersion?.version_number || 2})
                  </span>
                  <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                    {compareVersion?.system_prompt_raw || newPromptText}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
