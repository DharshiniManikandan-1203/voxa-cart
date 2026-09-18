import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Sparkles,
  Terminal,
  RotateCcw,
  CheckCircle2,
  Bot,
  User,
  ShoppingBag,
  Zap,
} from 'lucide-react';
import { Merchant, Agent, ConversationTurnMessage, TurnTrace } from '../../types';
import { ApiService } from '../../services/api';
import { DeveloperTraceModal } from '../debug/DeveloperTraceModal';

interface VoicePlaygroundProps {
  activeMerchant: Merchant | null;
  activeAgent: Agent | null;
}

export const VoicePlayground: React.FC<VoicePlaygroundProps> = ({ activeMerchant, activeAgent }) => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationTurnMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTtsMuted, setIsTtsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentState, setCurrentState] = useState('INIT');
  const [extractedSlots, setExtractedSlots] = useState<Record<string, any>>({});
  const [activeTrace, setActiveTrace] = useState<TurnTrace | null>(null);
  const [lastToolExecution, setLastToolExecution] = useState<any>(null);
  const [isTraceModalOpen, setIsTraceModalOpen] = useState(false);
  const [speechConfidence, setSpeechConfidence] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition on Mount if available
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setSpeechConfidence(Math.round(event.results[i][0].confidence * 100));
          }
        }
        setInputText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('[STT SpeechRecognition Error]', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Auto start conversation session when agent or merchant changes
  useEffect(() => {
    startNewSession();
  }, [activeMerchant?._id, activeAgent?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startNewSession = async () => {
    if (!activeAgent || !activeMerchant) return;
    setIsLoading(true);
    try {
      const res = await ApiService.startConversation(activeAgent._id, 'Shopper (Playground)');
      setConversationId(res.data.conversation_id);
      if (res.data.initial_message) {
        setMessages([res.data.initial_message]);
        speakText(res.data.initial_message.content);
      }
      setCurrentState('INIT');
      setExtractedSlots({});
      setActiveTrace(null);
      setLastToolExecution(null);
    } catch (err: any) {
      console.error('Failed to initialize session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported by your browser. Please type your message below.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setInputText('');
      recognitionRef.current.start();
    }
  };

  const speakText = (text: string) => {
    if (isTtsMuted || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // cancel pending speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = activeAgent?.voice_config?.speed || 1.05;
    utterance.pitch = activeAgent?.voice_config?.pitch || 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !conversationId || isLoading) return;

    setInputText('');
    setIsLoading(true);

    const sttLatency = isListening ? 190 : 0;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Optimistically append customer message
    const tempCustomerMsg: ConversationTurnMessage = {
      turn_index: messages.length + 1,
      sender: 'CUSTOMER',
      content: text,
      latency_ms: { stt_ms: sttLatency },
    };
    setMessages((prev) => [...prev, tempCustomerMsg]);

    try {
      const res = await ApiService.sendTurnMessage(
        conversationId,
        text,
        sttLatency,
        activeAgent?.personality.default_language || 'hinglish'
      );

      const agentMsg: ConversationTurnMessage = res.data.message;
      setMessages((prev) => [...prev, agentMsg]);
      setCurrentState(res.data.current_state);
      setExtractedSlots(res.data.extracted_slots || {});
      setActiveTrace(res.data.trace);
      setLastToolExecution(res.data.tool_execution);

      // Play Voice Output TTS
      speakText(agentMsg.content);
    } catch (err: any) {
      console.error('Turn error:', err);
      const errorMsg: ConversationTurnMessage = {
        turn_index: messages.length + 2,
        sender: 'AGENT',
        content: `Error: ${err.message}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    { label: 'Shoes Under ₹3000', query: 'Mujhe 3000 ke under running shoes chahiye black color mein.' },
    { label: 'Check Discount Coupon', query: 'Isme discount milega kya koi offer code hai?' },
    { label: 'Track Order #VF-89214', query: 'Mera order #VF-89214 track karo kahan pahuncha?' },
    { label: 'Compare Electronics', query: 'Noise cancelling headphones aur gaming keyboard dikhao.' },
  ];

  return (
    <div className="h-full flex flex-col space-y-4 max-w-6xl mx-auto p-4 md:p-6">
      {/* Playground Header Card */}
      <div className="glass-panel rounded-2xl p-4 md:p-5 flex flex-wrap items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center space-x-3.5">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 via-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/25">
              <Bot className="w-6 h-6 text-white" />
            </div>
            {isListening && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-extrabold text-white">
                {activeAgent?.name || 'Voice Commerce Agent'}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400 font-semibold border border-brand-500/20">
                {activeAgent?.personality.tone || 'Friendly'} Tone
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Merchant: <strong className="text-slate-200">{activeMerchant?.name}</strong> | Language: <strong className="text-slate-200">{activeAgent?.personality.default_language?.toUpperCase() || 'HINGLISH'}</strong>
            </p>
          </div>
        </div>

        {/* State Node & Trace Actions */}
        <div className="flex items-center space-x-2.5">
          {/* Active Conversation State Node */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-surface-950 border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">State Node:</span>
            <span className="font-mono font-bold text-brand-400">{currentState}</span>
          </div>

          {/* TTS Audio Mute Toggle */}
          <button
            onClick={() => setIsTtsMuted(!isTtsMuted)}
            className={`p-2 rounded-xl border transition ${
              isTtsMuted
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-surface-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title={isTtsMuted ? 'Unmute voice output' : 'Mute voice output'}
          >
            {isTtsMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Reset Session */}
          <button
            onClick={startNewSession}
            className="p-2 rounded-xl bg-surface-900 border border-slate-800 text-slate-300 hover:text-white transition"
            title="Start new conversation session"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Developer Trace Drawer Trigger */}
          <button
            onClick={() => setIsTraceModalOpen(true)}
            disabled={!activeTrace}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTrace
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                : 'bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Inspect Trace</span>
          </button>
        </div>
      </div>

      {/* Main Dialogue & Waveform Workspace */}
      <div className="flex-1 glass-panel rounded-2xl border border-slate-800 flex flex-col overflow-hidden min-h-[420px]">
        {/* Messages Transcript Scroll Area */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
          {messages.map((m, idx) => {
            const isAgent = m.sender === 'AGENT';
            return (
              <div
                key={idx}
                className={`flex items-start space-x-3 ${isAgent ? '' : 'flex-row-reverse space-x-reverse'}`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isAgent
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  }`}
                >
                  {isAgent ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div className="max-w-[78%] space-y-1">
                  <div
                    className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                      isAgent
                        ? 'bg-surface-900 border border-slate-800 text-slate-100 rounded-tl-sm'
                        : 'bg-brand-600 text-white rounded-tr-sm shadow-md shadow-brand-600/20'
                    }`}
                  >
                    <p>{m.content}</p>
                  </div>

                  {/* Metadata Tags below turn */}
                  <div className={`flex items-center space-x-2 text-[10px] text-slate-400 ${isAgent ? '' : 'justify-end'}`}>
                    {isAgent && m.detected_intent && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                        {m.detected_intent} ({Math.round((m.intent_confidence || 0.95) * 100)}%)
                      </span>
                    )}
                    {isAgent && m.latency_ms?.total_turn_ms && (
                      <span className="flex items-center space-x-1 font-mono text-emerald-400">
                        <Zap className="w-3 h-3" />
                        <span>{m.latency_ms.total_turn_ms}ms</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex items-center space-x-3 text-slate-400 text-xs py-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-purple-400 animate-spin" />
              </div>
              <div className="flex items-center space-x-1.5 font-mono">
                <span>Reasoning & executing tools...</span>
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Live Animated Audio Waveform & Speech Recognition Bar */}
        {isListening && (
          <div className="px-6 py-3 bg-brand-950/40 border-t border-brand-500/20 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-3">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-xs font-semibold text-brand-300">
                Listening to customer speech in real-time...
              </span>
            </div>
            {/* Waveform Bars */}
            <div className="flex items-center space-x-1 h-8">
              {[12, 24, 32, 18, 28, 14, 26, 30, 16, 22].map((height, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-brand-500 to-purple-400 rounded-full audio-bar"
                  style={{ animationDelay: `${i * 0.1}s`, height: `${height}px` }}
                ></div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Hinglish Prompt Chips */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-surface-950/60 flex items-center space-x-2 overflow-x-auto">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider shrink-0">
            Quick Tests:
          </span>
          {quickPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(p.query)}
              className="px-2.5 py-1 rounded-lg bg-surface-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-800 shrink-0 transition"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Voice & Text Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-surface-950">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-3"
          >
            {/* Live Microphone Button */}
            <button
              type="button"
              onClick={toggleMic}
              className={`p-3.5 rounded-xl flex items-center justify-center transition shadow-lg ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30 animate-pulse'
                  : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-600/30'
              }`}
              title={isListening ? 'Stop listening' : 'Start speaking (Continuous STT)'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Input Text Box */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Speak via microphone or type message in English / Hinglish (e.g. '3000 ke under running shoes dikhao')..."
              className="flex-1 bg-surface-900 border border-slate-800 focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-3.5 rounded-xl bg-surface-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 hover:text-white transition"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Developer Trace Modal */}
      <DeveloperTraceModal
        isOpen={isTraceModalOpen}
        onClose={() => setIsTraceModalOpen(false)}
        trace={activeTrace}
        lastToolExecution={lastToolExecution}
        detectedIntent={messages[messages.length - 1]?.detected_intent}
        intentConfidence={messages[messages.length - 1]?.intent_confidence}
        extractedSlots={extractedSlots}
        promptVersionNumber={2}
      />
    </div>
  );
};
