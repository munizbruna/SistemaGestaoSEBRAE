import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  MapPin, 
  Filter, 
  Clock,
  ChevronRight,
  Briefcase,
  UserCheck,
  Menu,
  X
} from 'lucide-react';

// --- GLOBAL STYLES (CSS IN JS) ---
// Ajustes finos para garantir a experiência "Nativa" e "Enterprise"
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    * {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Scrollbar Personalizada (Estilo Clean) */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #f1f5f9; 
    }
    ::-webkit-scrollbar-thumb {
      background: #cbd5e1; 
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #94a3b8; 
    }

    /* Animações Suaves */
    .fade-in {
      animation: fadeIn 0.3s ease-in-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Foco Acessível mas Bonito */
    *:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
    }
  `}</style>
);

// --- MOCK DATA (Baseado nos CSVs fornecidos) ---

const MOCK_CURSOS = [
  { id: 1, area: 'Alimentos e Bebidas', titulo: 'Fabricação De Ovos De Páscoa E Bombons', ch_senai: 20, ch_gestao: 0 },
  { id: 2, area: 'Alimentos e Bebidas', titulo: 'Fabricação De Panetones E Doces Natalinos', ch_senai: 20, ch_gestao: 0 },
  { id: 3, area: 'Gestão', titulo: 'Excel - Básico', ch_senai: 20, ch_gestao: 0 },
  { id: 4, area: 'Automotiva', titulo: 'Mecânica de Motores Ciclo Otto', ch_senai: 60, ch_gestao: 0 },
  { id: 5, area: 'Metalurgia', titulo: 'Técnicas Básicas em Serralheria', ch_senai: 80, ch_gestao: 8 },
  { id: 6, area: 'Construção Civil', titulo: 'Instalações Elétricas Residenciais', ch_senai: 40, ch_gestao: 8 },
];

const MOCK_DOCENTES = [
  { id: 101, nome: 'Hildo', area: 'Alimentos e Bebidas', contrato: 'Horista', cidade_base: 'Marília' },
  { id: 102, nome: 'Patricia', area: 'Gestão', contrato: 'Mensalista', cidade_base: 'Pompeia' },
  { id: 103, nome: 'Mariana', area: 'Metalurgia', contrato: 'Horista', cidade_base: 'Marília' },
  { id: 104, nome: 'Carlos', area: 'Automotiva', contrato: 'Determinado', cidade_base: 'Assis' },
  { id: 105, nome: 'Roberto', area: 'Construção Civil', contrato: 'Horista', cidade_base: 'Rinopolis' },
];

const MOCK_DEMANDAS_INICIAIS = [
  { 
    id: 'D-2025-001', 
    curso_id: 1, 
    solicitante: 'Herith', 
    municipio: 'Maracaí', 
    local: 'Escola Estadual', 
    status: 'Solicitado', 
    data_inicio: '2025-03-17', 
    docente_alocado: null 
  },
  { 
    id: 'D-2025-002', 
    curso_id: 1, 
    solicitante: 'Herith', 
    municipio: 'Maracaí', 
    local: 'Escola Estadual (Noite)', 
    status: 'Solicitado', 
    data_inicio: '2025-03-17', 
    docente_alocado: null 
  },
  { 
    id: 'D-2025-003', 
    curso_id: 5, 
    solicitante: 'Patricia', 
    municipio: 'Rinopolis', 
    local: 'Escola Móvel 1075', 
    status: 'Em Análise', 
    data_inicio: '2025-07-07', 
    docente_alocado: null 
  },
  { 
    id: 'D-2025-004', 
    curso_id: 6, 
    solicitante: 'Patricia', 
    municipio: 'Rinopolis', 
    local: 'A definir', 
    status: 'Programado', 
    data_inicio: '2025-04-22', 
    docente_alocado: 105 // Roberto
  },
];

// --- COMPONENTS ---

const StatusBadge = ({ status }) => {
  const colors = {
    'Solicitado': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Em Análise': 'bg-blue-100 text-blue-800 border-blue-200',
    'Programado': 'bg-green-100 text-green-800 border-green-200',
    'Cancelado': 'bg-red-100 text-red-800 border-red-200',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colors[status] || 'bg-gray-100'}`}>
      {status.toUpperCase()}
    </span>
  );
};

const Card = ({ title, value, icon: Icon, subtext, colorClass }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow fade-in">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800 mt-2">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${colorClass} bg-opacity-20`}>
        <Icon size={24} />
      </div>
    </div>
    {subtext && <div className="mt-4 text-xs font-medium text-slate-400 border-t border-slate-50 pt-2">{subtext}</div>}
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [demandas, setDemandas] = useState(MOCK_DEMANDAS_INICIAIS);
  const [selectedDemand, setSelectedDemand] = useState(null);
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Computed Data
  const stats = useMemo(() => {
    return {
      total: demandas.length,
      solicitados: demandas.filter(d => d.status === 'Solicitado').length,
      programados: demandas.filter(d => d.status === 'Programado').length,
      analise: demandas.filter(d => d.status === 'Em Análise').length,
    };
  }, [demandas]);

  const handleAllocateClick = (demanda) => {
    setSelectedDemand(demanda);
    setIsAllocationModalOpen(true);
  };

  const confirmAllocation = (docenteId) => {
    const newDemandas = demandas.map(d => 
      d.id === selectedDemand.id 
        ? { ...d, status: 'Programado', docente_alocado: docenteId } 
        : d
    );
    setDemandas(newDemandas);
    setIsAllocationModalOpen(false);
    setSelectedDemand(null);
  };

  // Navigation Item
  const NavItem = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
        activeTab === id 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
          : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
      }`}
    >
      <Icon size={20} strokeWidth={activeTab === id ? 2.5 : 2} />
      {sidebarOpen && <span>{label}</span>}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden selection:bg-blue-100 selection:text-blue-900">
      <GlobalStyles />
      
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-white border-r border-slate-200 flex-shrink-0 transition-all duration-300 ease-in-out flex flex-col z-20 shadow-sm`}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100">
          {sidebarOpen ? (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold shadow-blue-200 shadow-md">
                S
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight text-slate-800 leading-tight">SGD-A</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Enterprise</span>
              </div>
            </div>
          ) : (
             <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold mx-auto shadow-blue-200 shadow-md">S</div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-blue-600 hover:bg-slate-50 p-1.5 rounded-md transition-colors">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <div className="px-4 py-2 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:block">
            {sidebarOpen ? 'Principal' : '---'}
          </div>
          <NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />
          <NavItem id="demandas" label="Gestão de Demandas" icon={BookOpen} />
          <NavItem id="docentes" label="Docentes e Recursos" icon={Users} />
          <NavItem id="calendario" label="Calendário Geral" icon={Calendar} />
        </nav>

        <div className="p-6 border-t border-slate-100">
          {sidebarOpen ? (
             <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
               <p className="text-xs font-semibold text-slate-600 mb-1">Suporte Técnico</p>
               <p className="text-[10px] text-slate-400">v1.0.2 (MVP)</p>
             </div>
          ) : (
            <div className="w-2 h-2 bg-green-500 rounded-full mx-auto"></div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
              {activeTab === 'dashboard' && 'Visão Geral'}
              {activeTab === 'demandas' && 'Fila de Solicitações'}
              {activeTab === 'docentes' && 'Banco de Talentos'}
              {activeTab === 'calendario' && 'Agenda Unificada'}
            </h2>
            <p className="text-sm text-slate-500 hidden md:block">Bem-vindo ao sistema de gestão de alocação.</p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="relative hidden md:block">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar demanda, curso, ID..." 
                className="pl-12 pr-4 py-2.5 bg-slate-100 border-transparent focus:bg-white border focus:border-blue-300 rounded-full text-sm focus:ring-4 focus:ring-blue-50 w-72 outline-none transition-all duration-300"
              />
            </div>
            <div className="flex items-center space-x-3 pl-6 border-l border-slate-200">
              <div className="text-right hidden lg:block">
                <p className="text-sm font-bold text-slate-700">Tech Lead</p>
                <p className="text-xs text-slate-500">Administrador</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold border-2 border-white shadow-sm cursor-pointer hover:bg-blue-200 transition-colors">
                TL
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
          
          {/* VIEW: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 fade-in">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card 
                  title="Total Demandas" 
                  value={stats.total} 
                  icon={Briefcase} 
                  colorClass="bg-slate-100 text-slate-600" 
                  subtext="Ciclo 2025 - Atualizado hoje"
                />
                <Card 
                  title="Aguardando" 
                  value={stats.solicitados + stats.analise} 
                  icon={AlertCircle} 
                  colorClass="bg-amber-100 text-amber-600" 
                  subtext="Requer atenção imediata"
                />
                <Card 
                  title="Programados" 
                  value={stats.programados} 
                  icon={CheckCircle} 
                  colorClass="bg-emerald-100 text-emerald-600" 
                  subtext="Agenda confirmada"
                />
                <Card 
                  title="Ocupação" 
                  value="68%" 
                  icon={Users} 
                  colorClass="bg-blue-100 text-blue-600" 
                  subtext="Capacidade docente"
                />
              </div>

              {/* Quick Actions / Recent */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                    <h3 className="font-bold text-slate-800">Demandas Recentes</h3>
                    <button onClick={() => setActiveTab('demandas')} className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">Ver todas as demandas &rarr;</button>
                  </div>
                  <div className="divide-y divide-slate-100 flex-1">
                    {demandas.slice(0, 3).map(demanda => {
                      const curso = MOCK_CURSOS.find(c => c.id === demanda.curso_id);
                      return (
                        <div key={demanda.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group cursor-pointer">
                          <div className="flex items-center space-x-5">
                            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                              <BookOpen size={20} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{curso?.titulo}</p>
                              <div className="flex items-center mt-1 space-x-2">
                                <span className="text-xs text-slate-500 flex items-center"><MapPin size={12} className="mr-1"/> {demanda.municipio}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-xs text-slate-500">{demanda.solicitante}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <StatusBadge status={demanda.status} />
                            <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
                  <h3 className="font-bold text-slate-800 mb-5">Alertas & Insights</h3>
                  <ul className="space-y-4 flex-1">
                    <li className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-100">
                      <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-red-800">Conflito: <strong>Hildo</strong> (Marília) x Demanda #002.</span>
                    </li>
                    <li className="flex items-start space-x-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-amber-800">Baixa oferta para cursos de "Logística" em Assis.</span>
                    </li>
                    <li className="flex items-start space-x-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                      <CheckCircle size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-emerald-800">Cota "Empreenda Rápido" atualizada.</span>
                    </li>
                  </ul>
                  <button className="w-full mt-4 py-2 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    Ver relatório completo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: DEMANDAS */}
          {activeTab === 'demandas' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden fade-in">
              <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center bg-white">
                <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
                  <button className="px-4 py-1.5 bg-white shadow-sm rounded-md text-sm font-semibold text-slate-800">Todos</button>
                  <button className="px-4 py-1.5 text-slate-500 hover:text-slate-800 rounded-md text-sm font-medium transition-colors">Pendentes</button>
                  <button className="px-4 py-1.5 text-slate-500 hover:text-slate-800 rounded-md text-sm font-medium transition-colors">Concluídos</button>
                </div>
                <div className="flex items-center space-x-3">
                  <button className="p-2 text-slate-400 hover:text-blue-600 border border-slate-200 rounded-lg hover:bg-slate-50"><Filter size={18}/></button>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5">
                    <Briefcase size={16} className="mr-1"/>
                    <span>Nova Demanda</span>
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-xs tracking-wider">
                    <tr>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Curso / Área</th>
                      <th className="px-6 py-4">Localidade</th>
                      <th className="px-6 py-4">Datas</th>
                      <th className="px-6 py-4">Docente</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {demandas.map(demanda => {
                      const curso = MOCK_CURSOS.find(c => c.id === demanda.curso_id);
                      const docente = MOCK_DOCENTES.find(d => d.id === demanda.docente_alocado);
                      
                      return (
                        <tr key={demanda.id} className="hover:bg-slate-50 group transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-slate-400">{demanda.id}</td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-800">{curso?.titulo}</div>
                            <div className="text-xs text-blue-600 bg-blue-50 border border-blue-100 inline-block px-2 py-0.5 rounded-full mt-1.5 font-medium">{curso?.area}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center text-slate-700 font-medium">
                              <MapPin size={14} className="mr-1.5 text-slate-400" />
                              {demanda.municipio}
                            </div>
                            <div className="text-xs text-slate-400 pl-5 mt-0.5">{demanda.local}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center text-slate-600">
                              <Clock size={14} className="mr-1.5 text-slate-400" />
                              {demanda.data_inicio}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {docente ? (
                              <div className="flex items-center space-x-2 text-slate-700 bg-slate-100 py-1 px-2 rounded-full w-max">
                                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-200">
                                  {docente.nome.charAt(0)}
                                </div>
                                <span className="text-xs font-medium pr-1">{docente.nome}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-xs flex items-center">
                                <div className="w-2 h-2 bg-slate-300 rounded-full mr-2"></div>
                                Pendente
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={demanda.status} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            {demanda.status !== 'Programado' ? (
                              <button 
                                onClick={() => handleAllocateClick(demanda)}
                                className="text-blue-600 hover:text-white hover:bg-blue-600 font-semibold text-xs px-4 py-2 border border-blue-200 rounded-lg transition-all duration-200"
                              >
                                Alocar Recurso
                              </button>
                            ) : (
                              <button className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100">
                                <ChevronRight size={18} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW: DOCENTES */}
          {activeTab === 'docentes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 fade-in">
              {MOCK_DOCENTES.map(docente => (
                <div key={docente.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-blue-300 transition-all group cursor-pointer">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg border-2 border-white shadow-sm group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                        {docente.nome.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">{docente.nome}</h3>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{docente.contrato}</p>
                      </div>
                    </div>
                    <span className="bg-slate-50 text-slate-600 px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-100">
                      {docente.cidade_base}
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="text-sm text-slate-600">
                      <span className="block text-[10px] text-slate-400 uppercase font-bold mb-2 tracking-wider">Área de Atuação</span>
                      <div className="flex flex-wrap gap-2">
                         <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-100">{docente.area}</span>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs text-emerald-600 font-bold flex items-center bg-emerald-50 px-2 py-1 rounded-full">
                        <CheckCircle size={12} className="mr-1" /> DISPONÍVEL
                      </span>
                      <button className="text-slate-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-md transition-colors">
                        <Calendar size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
           
           {/* VIEW: CALENDAR PLACEHOLDER */}
           {activeTab === 'calendario' && (
             <div className="bg-white h-96 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 fade-in">
               <div className="bg-slate-50 p-6 rounded-full mb-4">
                 <Calendar size={48} className="text-slate-300" />
               </div>
               <h3 className="text-lg font-bold text-slate-700 mb-1">Módulo de Calendário</h3>
               <p className="text-sm text-slate-500">Funcionalidade prevista para a Fase 2.</p>
               <button className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-md">Ver Roadmap</button>
             </div>
           )}

        </div>
      </main>

      {/* MODAL DE ALOCAÇÃO (CORE FEATURE) */}
      {isAllocationModalOpen && selectedDemand && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 transform transition-all scale-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Alocação de Recurso</h3>
                <p className="text-sm text-slate-500 mt-0.5">Selecione um docente compatível para esta demanda.</p>
              </div>
              <button onClick={() => setIsAllocationModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 bg-slate-50 border-b border-slate-200">
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Curso Solicitado</span>
                  <span className="font-semibold text-slate-800 text-base">{MOCK_CURSOS.find(c => c.id === selectedDemand.curso_id)?.titulo}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Local & Data</span>
                  <div className="flex items-center text-slate-700">
                     <MapPin size={14} className="mr-1 text-slate-400"/> {selectedDemand.municipio}
                  </div>
                  <div className="flex items-center text-slate-700 mt-1">
                     <Clock size={14} className="mr-1 text-slate-400"/> {selectedDemand.data_inicio}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 max-h-[400px] overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Sugestões de Alocação (IA Match)</h4>
              <div className="space-y-3">
                {MOCK_DOCENTES.filter(d => d.area === MOCK_CURSOS.find(c => c.id === selectedDemand.curso_id)?.area).map(docente => {
                  const isLocal = docente.cidade_base === selectedDemand.municipio;
                  return (
                    <div 
                      key={docente.id} 
                      className={`flex justify-between items-center p-4 rounded-xl border cursor-pointer transition-all duration-200 group ${
                        isLocal 
                          ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300 hover:shadow-md' 
                          : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                      }`}
                      onClick={() => confirmAllocation(docente.id)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm ${isLocal ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-600'}`}>
                          {docente.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{docente.nome}</p>
                          <p className="text-xs text-slate-500">{docente.contrato} • {docente.cidade_base}</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        {isLocal && (
                          <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-white px-2 py-0.5 rounded-full border border-emerald-100 mb-2 shadow-sm">
                             <CheckCircle size={10} className="mr-1"/> Local (Sem diária)
                          </span>
                        )}
                        <button className={`text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-all ${isLocal ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-white border border-slate-200 text-slate-600 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600'}`}>
                          Selecionar
                        </button>
                      </div>
                    </div>
                  );
                })}
                {MOCK_DOCENTES.filter(d => d.area === MOCK_CURSOS.find(c => c.id === selectedDemand.curso_id)?.area).length === 0 && (
                  <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <AlertCircle size={32} className="mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Nenhum docente compatível encontrado.</p>
                    <p className="text-xs mt-1">Tente expandir a busca para cidades vizinhas.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 text-right border-t border-slate-200">
              <button onClick={() => setIsAllocationModalOpen(false)} className="text-slate-500 hover:text-slate-800 text-sm font-medium px-6 py-2 rounded-lg hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}