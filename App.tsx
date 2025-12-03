
import React, { useState, useEffect } from 'react';
import { analyzeMXRecords } from './services/dnsService';
import { analyzeDomainWithGemini } from './services/geminiService';
import { AnalysisStatus, MXRecordInfo, SalesAnalysis, HistoryItem } from './types';
import { SearchIcon, CheckCircleIcon, ExclamationCircleIcon, SparklesIcon, EnvelopeIcon, ClipboardIcon } from './components/Icons';

// Icono para el historial (Reloj)
const ClockIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

// Icono para borrar (Basura)
const TrashIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);

// Opciones de enfoque
const FOCUS_OPTIONS = [
  { id: 'Workspace & Colaboración', label: 'Workspace & Colaboración', type: 'google' },
  { id: 'Cloud & Infraestructura', label: 'Cloud & Infraestructura', type: 'google' },
  { id: 'Google Maps & Geo', label: 'Google Maps & Geo', type: 'google' },
  { id: 'Ciberseguridad', label: 'Ciberseguridad', type: 'google' },
  { id: 'Datarutas', label: 'Datarutas', type: 'servinformacion' },
  { id: 'Sitidata', label: 'Sitidata', type: 'servinformacion' },
  { id: 'Infocomercio', label: 'Infocomercio', type: 'servinformacion' },
  { id: 'Servipunto', label: 'Servipunto', type: 'servinformacion' },
];

function App() {
  const [domain, setDomain] = useState('');
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [mxInfo, setMxInfo] = useState<MXRecordInfo | null>(null);
  const [analysis, setAnalysis] = useState<SalesAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copiedEmail, setCopiedEmail] = useState(false);
  
  // Estado para los temas seleccionados
  const [selectedFocus, setSelectedFocus] = useState<string[]>([]);

  // Cargar historial al iniciar
  useEffect(() => {
    const savedHistory = localStorage.getItem('salesHistory');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Error parsing history", e);
      }
    }
  }, []);

  const toggleFocus = (id: string) => {
    setSelectedFocus(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const addToHistory = (domain: string, mx: MXRecordInfo, ai: SalesAnalysis, focus: string[]) => {
    const newItem: HistoryItem = {
      domain,
      mxInfo: mx,
      analysis: ai,
      timestamp: Date.now(),
      focusAreas: focus
    };

    setHistory(prev => {
      // Filtrar si ya existe el dominio para moverlo al principio
      const filtered = prev.filter(item => item.domain.toLowerCase() !== domain.toLowerCase());
      // Mantener solo los ultimos 5
      const newHistory = [newItem, ...filtered].slice(0, 5);
      localStorage.setItem('salesHistory', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    localStorage.removeItem('salesHistory');
    setHistory([]);
  };

  const loadFromHistory = (item: HistoryItem) => {
    setDomain(item.domain);
    setMxInfo(item.mxInfo);
    setAnalysis(item.analysis);
    setSelectedFocus(item.focusAreas || []);
    setStatus(AnalysisStatus.COMPLETE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyEmail = () => {
    if (!analysis?.emailProposal) return;
    const textToCopy = `Asunto: ${analysis.emailProposal.subject}\n\n${analysis.emailProposal.body}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;

    setStatus(AnalysisStatus.ANALYZING_DNS);
    setMxInfo(null);
    setAnalysis(null);
    setErrorMsg('');

    try {
      // Step 1: Analyze MX Records
      const mxResult = await analyzeMXRecords(domain);
      setMxInfo(mxResult);

      // Step 2: AI Analysis with Focus Areas
      setStatus(AnalysisStatus.ANALYZING_AI);
      const aiResult = await analyzeDomainWithGemini(domain, mxResult, selectedFocus);
      setAnalysis(aiResult);
      
      setStatus(AnalysisStatus.COMPLETE);

      // Save to history upon success
      addToHistory(domain, mxResult, aiResult, selectedFocus);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ocurrió un error inesperado durante el análisis.");
      setStatus(AnalysisStatus.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img 
              src="https://servinformacion.com/wp-content/uploads/2020/12/logo-servinformacion.png" 
              alt="Servinformación" 
              className="h-16 w-auto object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== "https://servinformacion.com/wp-content/uploads/2021/04/Logo-Servinformacion.png") {
                    target.src = "https://servinformacion.com/wp-content/uploads/2021/04/Logo-Servinformacion.png";
                } else {
                    target.style.display = 'none';
                    const span = document.createElement('span');
                    span.innerText = 'Servinformación';
                    span.className = 'text-2xl font-bold text-brand-600';
                    target.parentNode?.insertBefore(span, target);
                }
              }}
            />
            <div className="hidden md:block h-10 w-px bg-slate-200"></div>
            <div className="hidden md:flex flex-col justify-center">
              <span className="text-lg font-bold text-slate-700 leading-none">Sales Intelligence</span>
              <span className="text-xs text-slate-400 font-medium tracking-wide mt-1">HERRAMIENTA DE ANÁLISIS</span>
            </div>
          </div>
          <div className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            Powered by Google Cloud & Gemini
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        
        {/* Search Hero */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
              Analiza prospectos en <span className="text-brand-600">segundos</span>
            </h2>
            <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto font-light">
              Descubre oportunidades de venta cruzada analizando el dominio y encaminando la estrategia hacia tus objetivos.
            </p>
          </div>

          <div className="max-w-3xl mx-auto bg-white p-6 rounded-3xl shadow-xl border border-slate-100">
             
             {/* Focus Selection */}
             <div className="mb-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                  ¿Quieres enfocar el análisis en algún producto? (Opcional)
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {FOCUS_OPTIONS.map(opt => {
                    const isSelected = selectedFocus.includes(opt.id);
                    const isGoogle = opt.type === 'google';
                    
                    let baseClass = "px-3 py-1.5 rounded-full text-sm font-medium border transition-all cursor-pointer select-none";
                    let activeClass = "";
                    let inactiveClass = "bg-white text-slate-500 border-slate-200 hover:border-slate-300";

                    if (isSelected) {
                      if (isGoogle) activeClass = "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105";
                      else activeClass = "bg-red-600 text-white border-red-600 shadow-md transform scale-105";
                    } else {
                      if (isGoogle) inactiveClass = "bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600";
                      else inactiveClass = "bg-slate-50 text-slate-600 border-slate-200 hover:border-red-300 hover:text-red-600";
                    }

                    return (
                      <button 
                        key={opt.id}
                        type="button"
                        onClick={() => toggleFocus(opt.id)}
                        className={`${baseClass} ${isSelected ? activeClass : inactiveClass}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
             </div>

             {/* Input Form */}
             <form onSubmit={handleAnalyze} className="relative flex items-center">
              <input
                type="text"
                placeholder="Ingresa el dominio (ej. exito.com)"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-8 py-5 rounded-full border border-slate-200 text-lg focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100 transition-all pr-16 placeholder:text-slate-400 bg-slate-50"
              />
              <button 
                type="submit"
                disabled={status === AnalysisStatus.ANALYZING_DNS || status === AnalysisStatus.ANALYZING_AI}
                className="absolute right-2 bg-brand-600 hover:bg-brand-700 text-white p-4 rounded-full transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-md"
              >
                <SearchIcon className="w-6 h-6" />
              </button>
            </form>
          </div>

        </section>

        {/* History Section */}
        {history.length > 0 && (
          <section className="max-w-4xl mx-auto mb-12">
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <ClockIcon className="w-4 h-4" /> Búsquedas Recientes
              </h3>
              <button 
                onClick={clearHistory}
                className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
              >
                <TrashIcon className="w-3 h-3" /> Borrar historial
              </button>
            </div>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              {history.map((item) => (
                <button
                  key={item.domain + item.timestamp}
                  onClick={() => loadFromHistory(item)}
                  className="bg-white border border-slate-200 hover:border-brand-300 hover:bg-brand-50 px-4 py-2 rounded-lg shadow-sm transition-all flex items-center gap-3 text-left group"
                >
                  <div className={`w-2 h-2 rounded-full ${item.mxInfo.isGoogleWorkspace ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                  <div>
                    <span className="block font-medium text-slate-700 group-hover:text-brand-700">{item.domain}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">{new Date(item.timestamp).toLocaleDateString()}</span>
                      {item.focusAreas && item.focusAreas.length > 0 && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded-full">
                          {item.focusAreas.length} temas
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Loading States */}
        {status === AnalysisStatus.ANALYZING_DNS && (
          <div className="flex flex-col items-center justify-center py-16 animate-pulse">
            <div className="w-20 h-20 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-6"></div>
            <p className="text-xl text-brand-800 font-medium">Analizando registros DNS y MX...</p>
            <p className="text-sm text-brand-500 mt-2">Identificando proveedor de correo actual</p>
          </div>
        )}

        {status === AnalysisStatus.ANALYZING_AI && (
          <div className="flex flex-col items-center justify-center py-16 animate-pulse">
            <div className="w-20 h-20 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-6"></div>
            <p className="text-xl text-purple-800 font-medium">Generando estrategia comercial con IA...</p>
            {selectedFocus.length > 0 ? (
               <p className="text-sm text-purple-600 mt-2 font-medium bg-purple-100 px-3 py-1 rounded-full">
                 Enfocando análisis en: {selectedFocus.slice(0,2).join(', ')}{selectedFocus.length > 2 ? '...' : ''}
               </p>
            ) : (
               <p className="text-sm text-purple-500 mt-2">Consultando modelo Gemini 2.5 Flash</p>
            )}
          </div>
        )}

        {/* Error Message */}
        {status === AnalysisStatus.ERROR && (
          <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-4 mb-10 shadow-sm">
            <ExclamationCircleIcon className="w-8 h-8 text-red-500 shrink-0" />
            <div>
              <h3 className="text-red-900 font-bold text-lg mb-1">Error de Análisis</h3>
              <p className="text-red-700 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Results Dashboard */}
        {status === AnalysisStatus.COMPLETE && analysis && mxInfo && (
          <div className="space-y-10 animate-fade-in-up pb-20">
            
            {/* Top Cards: Company Info & Tech Stack */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Company Summary */}
              <div className="col-span-1 md:col-span-2 bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-slate-800">{analysis.companyName || domain}</h3>
                  <span className="px-4 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full uppercase tracking-wide">
                    {analysis.industry}
                  </span>
                </div>
                <p className="text-slate-600 text-lg leading-relaxed">
                  {analysis.summary}
                </p>
              </div>

              {/* Technical Indicator (MX) */}
              <div className={`rounded-2xl p-8 shadow-sm border flex flex-col justify-center ${mxInfo.isGoogleWorkspace ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                <h4 className="text-xs font-bold uppercase tracking-widest mb-3 opacity-60">
                  Infraestructura Actual
                </h4>
                <div className="flex items-center gap-4 mb-4">
                  {mxInfo.isGoogleWorkspace ? (
                    <CheckCircleIcon className="w-10 h-10 text-green-600" />
                  ) : (
                    <ExclamationCircleIcon className="w-10 h-10 text-amber-600" />
                  )}
                  <div className="leading-tight">
                     <span className="block text-2xl font-bold text-slate-900">{mxInfo.providerName}</span>
                  </div>
                </div>
                <div className={`text-sm font-medium px-3 py-2 rounded-lg inline-block self-start ${mxInfo.isGoogleWorkspace ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'}`}>
                  {mxInfo.isGoogleWorkspace 
                    ? "✓ Oportunidad de Upsell"
                    : "⚡ Oportunidad de Migración"}
                </div>
              </div>
            </div>

            {/* Elevator Pitch */}
            <div className="bg-gradient-to-br from-brand-700 to-brand-900 rounded-2xl p-8 md:p-10 shadow-xl text-white relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-3 text-brand-100">
                    <SparklesIcon className="w-6 h-6 text-yellow-400 animate-pulse" />
                    ELEVATOR PITCH SUGERIDO
                  </h3>
                  {selectedFocus.length > 0 && (
                    <div className="flex gap-1">
                      {selectedFocus.map(f => (
                        <span key={f} className="text-[10px] bg-white/10 px-2 py-1 rounded text-white/80 border border-white/20">
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <blockquote className="text-xl md:text-2xl font-medium leading-relaxed italic opacity-95 border-l-4 border-brand-400 pl-6">
                  "{analysis.elevatorPitch}"
                </blockquote>
              </div>
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 group-hover:opacity-10 transition-opacity"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-400 opacity-10 rounded-full blur-2xl transform -translate-x-1/3 translate-y-1/3"></div>
            </div>

            {/* Product Recommendations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              
              {/* Google Products */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">G</div>
                  <h3 className="text-2xl font-bold text-slate-800">
                    Ecosistema Google
                  </h3>
                </div>
                
                <div className="grid gap-5">
                  {analysis.googleProducts.map((prod, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 border-l-4 border-l-blue-500">
                      <h4 className="font-bold text-blue-800 text-xl mb-2">{prod.name}</h4>
                      <p className="text-slate-600 mb-4 text-sm leading-relaxed">{prod.description}</p>
                      
                      <div className="space-y-3">
                        <div className="bg-blue-50/50 p-3 rounded-lg">
                          <p className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wider mb-1">Por qué el cliente lo necesita</p>
                          <p className="text-sm text-blue-900 font-medium">{prod.reason}</p>
                        </div>

                        <div className="flex items-start gap-2 text-slate-500">
                           <svg className="w-4 h-4 mt-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.066 8.066 0 01-6.917-3.957A8.066 8.066 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" /></svg>
                           <p className="text-sm italic">"{prod.howToOffer}"</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Servinformación Products */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">S</div>
                  <h3 className="text-2xl font-bold text-slate-800">
                    Soluciones Servinformación
                  </h3>
                </div>

                <div className="grid gap-5">
                  {analysis.servinformacionProducts.map((prod, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 border-l-4 border-l-red-500">
                      <h4 className="font-bold text-red-800 text-xl mb-2">{prod.name}</h4>
                      <p className="text-slate-600 mb-4 text-sm leading-relaxed">{prod.description}</p>
                      
                      <div className="space-y-3">
                        <div className="bg-red-50/50 p-3 rounded-lg">
                          <p className="text-[10px] font-extrabold text-red-900 uppercase tracking-wider mb-1">Valor agregado Servinformación</p>
                          <p className="text-sm text-red-900 font-medium">{prod.reason}</p>
                        </div>

                        <div className="flex items-start gap-2 text-slate-500">
                           <svg className="w-4 h-4 mt-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.066 8.066 0 01-6.917-3.957A8.066 8.066 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" /></svg>
                           <p className="text-sm italic">"{prod.howToOffer}"</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Email Proposal Section */}
            {analysis.emailProposal && (
              <div className="bg-slate-800 rounded-2xl p-8 text-slate-200 mt-12 shadow-2xl border border-slate-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <EnvelopeIcon className="w-6 h-6 text-brand-400" />
                    Propuesta de Correo Electrónico
                  </h3>
                  <button
                    onClick={handleCopyEmail}
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {copiedEmail ? (
                      <>
                        <CheckCircleIcon className="w-4 h-4" /> Copiado
                      </>
                    ) : (
                      <>
                        <ClipboardIcon className="w-4 h-4" /> Copiar al portapapeles
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700/50 font-mono text-sm leading-relaxed">
                  <div className="mb-4 pb-4 border-b border-slate-700/50">
                    <span className="text-slate-500 select-none block mb-1 uppercase text-xs tracking-wider">Asunto:</span>
                    <span className="text-white font-semibold">{analysis.emailProposal.subject}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 select-none block mb-2 uppercase text-xs tracking-wider">Cuerpo:</span>
                    <p className="whitespace-pre-line text-slate-300">
                      {analysis.emailProposal.body}
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}

export default App;
