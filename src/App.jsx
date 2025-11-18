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
// --- MOCK DATA (Baseado nos CSVs fornecidos: Ficha Técnica & Acompanhamento) ---

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
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  );
};

const Card = ({ title, value, icon: Icon, subtext, colorClass }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
      </div>
      <div className={`p-2 rounded-lg ${colorClass}`}>
        <Icon size={20} />
      </div>
    </div>
    {subtext && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
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
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
        activeTab === id 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon size={18} />
      {sidebarOpen && <span>{label}</span>}
    </button>
  );

  // Render Logic
  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 flex-shrink-0 transition-all duration-300 flex flex-col`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          {sidebarOpen ? (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold">S</div>
              <span className="font-bold text-lg tracking-tight text-slate-800">SGD-A <span className="text-xs font-normal text-slate-400">v1.0</span></span>
            </div>
          ) : (
             <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold mx-auto">S</div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-blue-600">
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />
          <NavItem id="demandas" label="Gestão de Demandas" icon={BookOpen} />
          <NavItem id="docentes" label="Docentes e Recursos" icon={Users} />
          <NavItem id="calendario" label="Calendário Geral" icon={Calendar} />
        </nav>

        <div className="p-4 border-t border-slate-100">
          {sidebarOpen && <div className="text-xs text-slate-400 text-center">© 2025 SEBRAE/SENAI</div>}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-slate-800">
            {activeTab === 'dashboard' && 'Visão Geral'}
            {activeTab === 'demandas' && 'Fila de Solicitações'}
            {activeTab === 'docentes' && 'Banco de Talentos'}
            {activeTab === 'calendario' && 'Agenda Unificada'}
          </h2>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar demanda, curso..." 
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-blue-500 w-64 outline-none transition-all"
              />
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs border border-blue-200 cursor-pointer">
              TL
            </div>
          </div>
        </header>

        <div className="p-8">
          
          {/* VIEW: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card 
                  title="Total Demandas" 
                  value={stats.total} 
                  icon={Briefcase} 
                  colorClass="bg-slate-100 text-slate-600" 
                  subtext="Ciclo 2025"
                />
                <Card 
                  title="Aguardando Alocação" 
                  value={stats.solicitados + stats.analise} 
                  icon={AlertCircle} 
                  colorClass="bg-yellow-100 text-yellow-600" 
                  subtext="Ação Necessária"
                />
                <Card 
                  title="Programados" 
                  value={stats.programados} 
                  icon={CheckCircle} 
                  colorClass="bg-green-100 text-green-600" 
                  subtext="Confirmados com Docente"
                />
                <Card 
                  title="Taxa de Ocupação" 
                  value="68%" 
                  icon={Users} 
                  colorClass="bg-blue-100 text-blue-600" 
                  subtext="Capacidade Docente"
                />
              </div>

              {/* Quick Actions / Recent */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-700">Demandas Prioritárias</h3>
                    <button onClick={() => setActiveTab('demandas')} className="text-sm text-blue-600 hover:underline">Ver todas</button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {demandas.slice(0, 3).map(demanda => {
                      const curso = MOCK_CURSOS.find(c => c.id === demanda.curso_id);
                      return (
                        <div key={demanda.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center space-x-4">
                            <div className="p-2 bg-slate-100 rounded text-slate-500">
                              <BookOpen size={16} />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{curso?.titulo}</p>
                              <p className="text-xs text-slate-500">{demanda.municipio} • {demanda.solicitante}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <StatusBadge status={demanda.status} />
                            <ChevronRight size={16} className="text-slate-300" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-700 mb-4">Alertas do Sistema</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start space-x-3 text-sm">
                      <AlertCircle size={16} className="text-red-500 mt-0.5" />
                      <span className="text-slate-600">Conflito de horário detectado: <strong>Hildo</strong> em Marília (03/04).</span>
                    </li>
                    <li className="flex items-start space-x-3 text-sm">
                      <AlertCircle size={16} className="text-yellow-500 mt-0.5" />
                      <span className="text-slate-600">3 demandas de "Logística" sem docente na região de Assis.</span>
                    </li>
                    <li className="flex items-start space-x-3 text-sm">
                      <CheckCircle size={16} className="text-green-500 mt-0.5" />
                      <span className="text-slate-600">Cota do contrato "Empreenda Rápido" atualizada.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: DEMANDAS */}
          {activeTab === 'demandas' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex space-x-2">
                  <button className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 shadow-sm">Todos</button>
                  <button className="px-3 py-1.5 bg-transparent border border-transparent rounded-md text-sm font-medium text-slate-500 hover:text-blue-600">Não Alocados</button>
                </div>
                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-all">
                  <span>+ Nova Demanda</span>
                </button>
              </div>
              
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Curso / Área</th>
                    <th className="px-6 py-3">Localidade</th>
                    <th className="px-6 py-3">Datas</th>
                    <th className="px-6 py-3">Docente</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {demandas.map(demanda => {
                    const curso = MOCK_CURSOS.find(c => c.id === demanda.curso_id);
                    const docente = MOCK_DOCENTES.find(d => d.id === demanda.docente_alocado);
                    
                    return (
                      <tr key={demanda.id} className="hover:bg-slate-50 group transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{demanda.id}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-800">{curso?.titulo}</div>
                          <div className="text-xs text-slate-500 bg-slate-100 inline-block px-1.5 rounded mt-1">{curso?.area}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-slate-600">
                            <MapPin size={14} className="mr-1" />
                            {demanda.municipio}
                          </div>
                          <div className="text-xs text-slate-400 pl-4">{demanda.local}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-slate-600">
                            <Clock size={14} className="mr-1" />
                            {demanda.data_inicio}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {docente ? (
                            <div className="flex items-center space-x-2 text-slate-700">
                              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                                {docente.nome.charAt(0)}
                              </div>
                              <span>{docente.nome}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Pendente</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={demanda.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          {demanda.status !== 'Programado' && (
                            <button 
                              onClick={() => handleAllocateClick(demanda)}
                              className="text-blue-600 hover:text-blue-800 font-medium text-xs px-3 py-1 border border-blue-200 rounded hover:bg-blue-50"
                            >
                              Alocar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW: DOCENTES */}
          {activeTab === 'docentes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {MOCK_DOCENTES.map(docente => (
                <div key={docente.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-blue-300 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                        {docente.nome.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{docente.nome}</h3>
                        <p className="text-xs text-slate-500">{docente.contrato}</p>
                      </div>
                    </div>
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium">
                      {docente.cidade_base}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-slate-600">
                      <span className="block text-xs text-slate-400 uppercase font-bold mb-1">Área de Atuação</span>
                      <div className="flex flex-wrap gap-1">
                         <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs border border-blue-100">{docente.area}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs text-green-600 font-medium flex items-center">
                        <CheckCircle size={12} className="mr-1" /> Disponível
                      </span>
                      <button className="text-slate-400 hover:text-blue-600">
                        <Calendar size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
           
           {/* VIEW: CALENDAR PLACEHOLDER */}
           {activeTab === 'calendario' && (
             <div className="bg-white h-96 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400">
               <Calendar size={48} className="mb-4 opacity-20" />
               <p>Visualização de Calendário em desenvolvimento (Fase 2).</p>
               <p className="text-sm">Será integrado com a API .NET para carregar bloqueios reais.</p>
             </div>
           )}

        </div>
      </main>

      {/* MODAL DE ALOCAÇÃO (CORE FEATURE) */}
      {isAllocationModalOpen && selectedDemand && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Alocação de Recurso</h3>
                <p className="text-sm text-slate-500">Selecione um docente compatível para esta demanda.</p>
              </div>
              <button onClick={() => setIsAllocationModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 bg-slate-50 border-b border-slate-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-xs text-slate-400 uppercase font-bold">Curso</span>
                  <span className="font-medium text-slate-800">{MOCK_CURSOS.find(c => c.id === selectedDemand.curso_id)?.titulo}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-400 uppercase font-bold">Local / Data</span>
                  <span className="font-medium text-slate-800">{selectedDemand.municipio} • {selectedDemand.data_inicio}</span>
                </div>
              </div>
            </div>

            <div className="p-6 max-h-80 overflow-y-auto">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Sugestões do Sistema (IA)</h4>
              <div className="space-y-3">
                {MOCK_DOCENTES.filter(d => d.area === MOCK_CURSOS.find(c => c.id === selectedDemand.curso_id)?.area).map(docente => {
                  const isLocal = docente.cidade_base === selectedDemand.municipio;
                  return (
                    <div 
                      key={docente.id} 
                      className={`flex justify-between items-center p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                        isLocal ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'
                      }`}
                      onClick={() => confirmAllocation(docente.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 font-bold shadow-sm">
                          {docente.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{docente.nome}</p>
                          <p className="text-xs text-slate-500">{docente.contrato} • {docente.cidade_base}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {isLocal && <span className="block text-xs font-bold text-green-600 mb-1">Local (Sem diária)</span>}
                        <button className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 shadow-sm">
                          Selecionar
                        </button>
                      </div>
                    </div>
                  );
                })}
                {MOCK_DOCENTES.filter(d => d.area === MOCK_CURSOS.find(c => c.id === selectedDemand.curso_id)?.area).length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Nenhum docente com a competência exata encontrada.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 text-right">
              <button onClick={() => setIsAllocationModalOpen(false)} className="text-slate-500 hover:text-slate-800 text-sm font-medium px-4">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}