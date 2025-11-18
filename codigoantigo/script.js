
        // Importar Firebase
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { 
            getAuth, 
            signInAnonymously,
            signInWithCustomToken,
            onAuthStateChanged
        } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { 
            getFirestore, 
            doc, 
            getDoc, 
            addDoc, 
            setDoc, 
            updateDoc, 
            deleteDoc, 
            onSnapshot, 
            collection, 
            query, 
            where, 
            getDocs,
            Timestamp,
            setLogLevel // Movido para cá
        } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        // --- Configuração Firebase ---
        
        // VARIÁVEIS GLOBAIS FORNECIDAS PELO AMBIENTE
        const appId = (typeof __app_id !== 'undefined' ? __app_id : 'default-app-id').replace(/[\/.]/g, '_');
        
        const fallbackConfigString = JSON.stringify({
            apiKey: "AIzaSyDbW0dkt22E1n5qVF_OZ2T2Gz1NhfrbRpU",
            authDomain: "sebrae-senai.firebaseapp.com",
            projectId: "sebrae-senai",
            storageBucket: "sebrae-senai.firebasestorage.app",
            messagingSenderId: "1036889332274",
            appId: "1:1036889332274:web:b9fba58ed2804d0e8b3a2b",
            measurementId: "G-N1YLFJ3J80"
        });

        const firebaseConfigString = typeof __firebase_config !== 'undefined' && __firebase_config !== '{}' 
            ? __firebase_config 
            : fallbackConfigString;
            
        const firebaseConfig = JSON.parse(firebaseConfigString);
        
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        
        let app, db, auth;
        let userId = null;
        let isAuthReady = false;

        // Coleções do Firestore
        let docentesCol, cursosCol, recursosCol, demandasCol;

        // Estado da Aplicação
        let todosDocentes = [];
        let todosCursos = [];
        let todosRecursos = [];
        let todasDemandas = [];
        let filtroStatusAtual = 'Solicitada';
        let calendar;
        let usuarioAtual = 'Coordenador'; // 'Coordenador' ou 'Solicitante'

        // --- Inicialização ---

        async function inicializarApp() {
            try {
                if (!firebaseConfig.projectId) {
                    console.error("Configuração do Firebase está incompleta! Falta 'projectId'.", firebaseConfig);
                    throw new Error("'projectId' não encontrado na configuração do Firebase.");
                }

                app = initializeApp(firebaseConfig);
                db = getFirestore(app);
                auth = getAuth(app);
                setLogLevel('Debug'); 

                console.log("Firebase App inicializado com projectId:", firebaseConfig.projectId, ". Aguardando autenticação...");
                console.log("Usando App ID sanitizado:", appId); 

                onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        console.log("Usuário autenticado:", user.uid);
                        userId = user.uid;
                        isAuthReady = true;
                        
                        // Caminhos das coleções (usando dados privados do usuário)
                        const userPath = `artifacts/${appId}/users/${userId}`;
                        docentesCol = collection(db, `${userPath}/docentes`);
                        cursosCol = collection(db, `${userPath}/cursos`);
                        recursosCol = collection(db, `${userPath}/recursos`);
                        demandasCol = collection(db, `${userPath}/demandas`);

                        iniciarOuvintes();
                        inicializarCalendario();
                        carregarFiltrosAgenda();
                        atualizarVisaoPorUsuario(); 
                    } else {
                        console.log("Nenhum usuário logado, tentando login...");
                        isAuthReady = false;
                        await autenticar();
                    }
                });

                if (!auth.currentUser) {
                    await autenticar();
                }

            } catch (error) {
                console.error("Erro ao inicializar Firebase:", error);
                document.body.innerHTML = `<div class='p-10 text-center text-red-600'>Erro crítico ao conectar com o banco de dados. Verifique a configuração do Firebase. Detalhe: ${error.message}</div>`;
            }
        }

        async function autenticar() {
            try {
                if (initialAuthToken) {
                    console.log("Autenticando com token customizado...");
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    console.log("Autenticando anonimamente...");
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Erro na autenticação:", error);
            }
        }

        // --- Ouvintes do Firestore (Listeners) ---

        function iniciarOuvintes() {
            if (!isAuthReady) {
                console.warn("Ouvintes do Firestore bloqueados. Autenticação pendente.");
                return;
            }

            console.log("Iniciando ouvintes do Firestore...");

            onSnapshot(query(demandasCol), (snapshot) => {
                console.log("Novos dados de demandas recebidos.");
                todasDemandas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderPainelDemandas();
                atualizarEventosCalendario();
                atualizarContagensAbas();
            }, (error) => console.error("Erro ao ouvir demandas:", error));

            onSnapshot(query(docentesCol), (snapshot) => {
                console.log("Novos dados de docentes recebidos.");
                todosDocentes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                carregarFiltrosAgenda();
                renderListaCadastros('docentes', todosDocentes, 'lista-docentes', doc => `${doc.nome} (${doc.contrato})`);
            }, (error) => console.error("Erro ao ouvir docentes:", error));

            onSnapshot(query(cursosCol), (snapshot) => {
                console.log("Novos dados de cursos recebidos.");
                todosCursos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                popularSelectCursos();
                renderListaCadastros('cursos', todosCursos, 'lista-cursos', curso => `${curso.titulo} (${curso.area})`);
            }, (error) => console.error("Erro ao ouvir cursos:", error));

            onSnapshot(query(recursosCol), (snapshot) => {
                console.log("Novos dados de recursos recebidos.");
                todosRecursos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                carregarFiltrosAgenda();
                popularSelectRecursos();
                renderListaCadastros('recursos', todosRecursos, 'lista-recursos', rec => `${rec.nome} (${rec.tipo})`);
            }, (error) => console.error("Erro ao ouvir recursos:", error));
        }

        // --- Renderização de Telas ---

        function navegarPara(telaId) {
            console.log("Navegando para:", telaId);
            document.querySelectorAll('.tela').forEach(tela => tela.classList.remove('ativa'));
            document.getElementById(telaId).classList.add('ativa');

            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('bg-blue-600', 'text-white');
                link.classList.add('text-gray-500', 'hover:bg-gray-100', 'hover:text-gray-700');
            });
            
            const linkAtivo = document.getElementById(`nav-${telaId.split('-')[1]}`);
            if (linkAtivo) {
                linkAtivo.classList.add('bg-blue-600', 'text-white');
                linkAtivo.classList.remove('text-gray-500', 'hover:bg-gray-100', 'hover:text-gray-700');
            }
            
            if(telaId === 'tela-agenda') {
                setTimeout(() => {
                    if (calendar) calendar.render();
                }, 10);
            }
        }

        function atualizarVisaoPorUsuario() {
            console.log(`Atualizando visão para: ${usuarioAtual}`);
            const navCadastros = document.getElementById('nav-cadastros');
            const seedButton = document.getElementById('btn-seed-db');
            const tabAguardando = document.querySelector('.tab-link-aprovacao');
            const tipoDemandaCoord = document.getElementById('tipoDemandaCoordenacao');
            const tipoDemandaSoli = document.getElementById('tipoDemandaSolicitante');
            
            if (usuarioAtual === 'Coordenador') {
                navCadastros.style.display = 'block';
                seedButton.style.display = 'block';
                tabAguardando.style.display = 'block';
                if (tipoDemandaCoord) tipoDemandaCoord.disabled = false;
                if (tipoDemandaSoli) tipoDemandaSoli.disabled = false;

                const contagemAguardando = parseInt(document.getElementById('count-aguardando').textContent || '0');
                if (contagemAguardando > 0) {
                    mudarAbaStatus(null, 'Aguardando Aprovação');
                } else {
                    mudarAbaStatus(null, 'Solicitada');
                }
                
            } else { // Solicitante
                navCadastros.style.display = 'none';
                seedButton.style.display = 'none';
                tabAguardando.style.display = 'none';
                
                if (tipoDemandaCoord) tipoDemandaCoord.disabled = true;
                if (tipoDemandaSoli) {
                    tipoSoli.disabled = true;
                    tipoSoli.checked = true;
                }

                if (filtroStatusAtual === 'Aguardando Aprovação' || filtroStatusAtual === 'Solicitada') {
                    mudarAbaStatus(null, 'Programada');
                }
                
                if (document.getElementById('tela-cadastros').classList.contains('ativa')) {
                    navegarPara('tela-painel');
                }
            }
            
            renderPainelDemandas();
        }

        // --- TELA 1: Painel de Demandas ---

        function renderPainelDemandas() {
            if (!isAuthReady) {
                console.warn("Renderização do painel bloqueada. Autenticação pendente.");
                return;
            }
            console.log("Renderizando painel para status:", filtroStatusAtual);
            
            const corpoTabela = document.getElementById('tabela-demandas-corpo');
            const loadingEl = document.getElementById('loading-demandas');
            
            const demandasFiltradas = todasDemandas.filter(d => d.status === filtroStatusAtual);
            
            if (demandasFiltradas.length === 0) {
                corpoTabela.innerHTML = '';
                loadingEl.innerHTML = `Nenhuma demanda com status "${filtroStatusAtual}".`;
                loadingEl.style.display = 'block';
                return;
            }

            loadingEl.style.display = 'none';
            corpoTabela.innerHTML = ''; 

            demandasFiltradas.forEach(demanda => {
                const curso = todosCursos.find(c => c.id === demanda.idCurso);
                const docente = todosDocentes.find(d => d.id === demanda.idDocenteAlocado);
                
                const dataInicio = formatarData(demanda.dataInicio);
                const dataFim = formatarData(demanda.dataFim);
                
                let docenteHtml = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">(A Alocar)</span>`;
                let acaoHtml = `<button data-id="${demanda.id}" class="btn-alocar bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md text-xs">Alocar Agora</button>`;
                
                if (demanda.status === 'Aguardando Aprovação') {
                    docenteHtml = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">(Aguardando)</span>`;
                    acaoHtml = `<button data-id="${demanda.id}" class="btn-aprovar bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-md text-xs">Aprovar</button>`;
                }
                
                if (demanda.status !== 'Solicitada' && demanda.status !== 'Aguardando Aprovação') {
                    if (docente) {
                        docenteHtml = `<span class="font-medium text-gray-800">${docente.nome}</span>`;
                    } else {
                        docenteHtml = `<span class="text-gray-500">(N/A)</span>`;
                    }
                    acaoHtml = `<button data-id="${demanda.id}" class="btn-detalhes text-blue-600 hover:text-blue-800 text-xs font-medium">Ver Detalhes</button>`;
                }

                if (usuarioAtual !== 'Coordenador') {
                    if (demanda.status === 'Solicitada' || demanda.status === 'Aguardando Aprovação') {
                        acaoHtml = `<span class="text-xs text-gray-500 italic">Pendente</span>`;
                    }
                }
                
                const linha = `
                    <tr>
                        <td class="px-5 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-gray-900">${curso?.titulo || 'Curso não encontrado'}</div>
                            <div class="text-sm text-gray-500">${curso?.area || 'N/A'}</div>
                        </td>
                        <td class="px-5 py-4 whitespace-nowrap text-sm text-gray-600">${demanda.municipio}</td>
                        <td class="px-5 py-4 whitespace-nowrap text-sm text-gray-600">${dataInicio} - ${dataFim}</td>
                        <td class="px-5 py-4 whitespace-nowrap text-sm text-gray-600">${demanda.horarioInicio} - ${demanda.horarioFim}</td>
                        <td class="px-5 py-4 whitespace-nowrap text-sm text-gray-600">${demanda.solicitante}</td>
                        <td class="px-5 py-4 whitespace-nowrap text-sm">${docenteHtml}</td>
                        <td class="px-5 py-4 whitespace-nowrap text-sm font-medium">
                            ${acaoHtml}
                        </td>
                    </tr>
                `;
                corpoTabela.innerHTML += linha;
            });
        }
        
        function atualizarContagensAbas() {
            const contagens = todasDemandas.reduce((acc, d) => {
                if (d.status === 'Solicitada') acc.solicitada++;
                else if (d.status === 'Programada') acc.programada++;
                else if (d.status === 'Em Andamento') acc.emandamento++;
                else if (d.status === 'Aguardando Aprovação') acc.aguardando++;
                return acc;
            }, { solicitada: 0, programada: 0, emandamento: 0, aguardando: 0 });
            
            document.getElementById('count-solicitada').textContent = contagens.solicitada;
            document.getElementById('count-programada').textContent = contagens.programada;
            document.getElementById('count-emandamento').textContent = contagens.emandamento;
            document.getElementById('count-aguardando').textContent = contagens.aguardando;
        }

        // --- TELA 2: Agenda ---

        function inicializarCalendario() {
            if (calendar) {
                calendar.render();
                return;
            }
            const calendarEl = document.getElementById('calendar');
            calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                locale: 'pt-br',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,listWeek'
                },
                events: [],
                height: 'auto',
                eventDidMount: function(info) {
                    info.el.setAttribute('title', info.event.extendedProps.description);
                }
            });
            if(document.getElementById('tela-agenda').classList.contains('ativa')) {
                calendar.render();
            }
        }
        
        function atualizarEventosCalendario() {
            if (!calendar) return;

            const filtroTipo = document.getElementById('filtro-agenda-tipo').value;
            const filtroId = document.getElementById('filtro-agenda-selecao').value;
            
            const loadingEl = document.getElementById('loading-agenda');
            loadingEl.style.display = 'block';

            const eventos = [];
            const demandasParaAgenda = todasDemandas.filter(d => 
                (d.status === 'Programada' || d.status === 'Em Andamento')
            );
            
            demandasParaAgenda.forEach(demanda => {
                const curso = todosCursos.find(c => c.id === demanda.idCurso);
                const docente = todosDocentes.find(d => d.id === demanda.idDocenteAlocado);
                const recurso = todosRecursos.find(r => r.id === demanda.idRecursoAlocado);
                
                if (filtroTipo === 'docentes' && demanda.idDocenteAlocado !== filtroId) return;
                if (filtroTipo === 'recursos' && demanda.idRecursoAlocado !== filtroId) return;

                const titulo = `${curso?.titulo || 'Curso'} (${demanda.municipio})`;
                const descricao = `Docente: ${docente?.nome || 'N/A'}\nRecurso: ${recurso?.nome || 'N/A'}\nHorário: ${demanda.horarioInicio}-${demanda.horarioFim}`;

                eventos.push({
                    title: titulo,
                    start: timestampParaDataStr(demanda.dataInicio),
                    end: somarUmDia(timestampParaDataStr(demanda.dataFim)), 
                    description: descricao,
                    color: '#2563eb', // Azul
                    allDay: true 
                });
                
                if (demanda.dataGestao1) {
                    eventos.push({
                        title: `Gestão: ${curso?.titulo}`,
                        start: timestampParaDataStr(demanda.dataGestao1),
                        description: `Gestão para ${curso?.titulo}`,
                        color: '#f59e0b', // Amarelo
                        allDay: true
                    });
                }
                if (demanda.dataGestao2) {
                     eventos.push({
                        title: `Gestão: ${curso?.titulo}`,
                        start: timestampParaDataStr(demanda.dataGestao2),
                        description: `Gestão para ${curso?.titulo}`,
                        color: '#f59e0b', // Amarelo
                        allDay: true
                    });
                }
            });

            calendar.removeAllEvents();
            calendar.addEventSource(eventos);
            loadingEl.style.display = 'none';
        }
        
        function carregarFiltrosAgenda() {
            const filtroTipo = document.getElementById('filtro-agenda-tipo').value;
            const selectSelecao = document.getElementById('filtro-agenda-selecao');
            
            selectSelecao.innerHTML = ''; 
            
            if (filtroTipo === 'docentes') {
                todosDocentes.forEach(doc => {
                    selectSelecao.innerHTML += `<option value="${doc.id}">${doc.nome}</option>`;
                });
            } else {
                todosRecursos.forEach(rec => {
                    selectSelecao.innerHTML += `<option value="${rec.id}">${rec.nome}</option>`;
                });
            }
            atualizarEventosCalendario();
        }

        // --- TELA 3: Cadastros ---
        
        function renderListaCadastros(tipo, lista, elementoId, formatador) {
            const ul = document.getElementById(elementoId);
            ul.innerHTML = '';
            if (lista.length === 0) {
                ul.innerHTML = `<li class="text-gray-500 text-sm italic">Nenhum item cadastrado.</li>`;
                return;
            }
            lista.forEach(item => {
                ul.innerHTML += `<li class="text-sm text-gray-700 p-2 border-b border-gray-100">${formatador(item)}</li>`;
            });
        }
        
        async function handleCadastro(event, formularioId, colecao, campos) {
            event.preventDefault();
            const form = document.getElementById(formularioId);
            const dados = {};
            
            try {
                for (const campo of campos) {
                    let valor;
                    
                    if (campo.valor !== undefined) {
                        valor = campo.valor;
                    } else {
                        const el = form.querySelector(`#${campo.id}`);
                        if (!el) {
                            console.error(`Elemento #${campo.id} não encontrado no formulário ${formularioId}`);
                            continue;
                        }
                        valor = el.value;
                    }
                    
                    if (campo.tipo === 'array') valor = valor.split(',').map(s => s.trim()).filter(Boolean);
                    if (campo.tipo === 'number') valor = Number(valor);
                    if (campo.id === 'curso-recursos' && valor === "") valor = null;
                    
                    dados[campo.chave] = valor;
                }
                
                await addDoc(colecao, dados);
                mostrarNotificacao(`${formularioId.split('-')[2]} adicionado com sucesso!`, 'sucesso');
                form.reset();
                
            } catch (error) {
                console.error("Erro ao adicionar documento:", error);
                mostrarNotificacao(`Erro ao adicionar: ${error.message}`, 'erro');
            }
        }
        
        function popularSelectCursos() {
            const selectArea = document.getElementById('demanda-area');
            const areas = [...new Set(todosCursos.map(c => c.area))];
            
            selectArea.innerHTML = '<option value="">Selecione a Área</option>';
            areas.sort().forEach(area => {
                selectArea.innerHTML += `<option value="${area}">${area}</option>`;
            });
        }
        
        function popularCursosPorArea(area) {
            const selectCurso = document.getElementById('demanda-curso');
            
            if (!area) {
                selectCurso.innerHTML = '<option value="">Selecione primeiro a Área</option>';
                selectCurso.disabled = true;
                return;
            }
            
            const cursosDaArea = todosCursos.filter(c => c.area === area);
            
            selectCurso.innerHTML = '<option value="">Selecione o Curso</option>';
            cursosDaArea.sort((a,b) => a.titulo.localeCompare(b.titulo)).forEach(curso => {
                selectCurso.innerHTML += `<option value="${curso.id}">${curso.titulo}</option>`;
            });
            selectCurso.disabled = false;
        }
        
        function popularSelectRecursos() {
            const select = document.getElementById('curso-recursos');
            select.innerHTML = '<option value="">Recurso Crítico (Opcional)</option>';
            todosRecursos.forEach(rec => {
                select.innerHTML += `<option value="${rec.id}">${rec.nome}</option>`;
            });
        }
        
        async function carregarDadosIniciais() {
            const btn = document.getElementById('btn-seed-db');
            const status = document.getElementById('seed-status');
            btn.disabled = true;
            status.textContent = "Carregando... Verifique o console para detalhes.";
            
            try {
                const docentesSnap = await getDocs(docentesCol);
                if (!docentesSnap.empty) {
                    status.textContent = "Dados de demonstração já parecem estar carregados.";
                    btn.disabled = false;
                    return;
                }
                
                console.log("Iniciando carga de dados iniciais...");
                
                const docentesData = [
                    { nome: "Hildo", area: "Alimentos", subareas: ["Panificação", "Confeitaria", "Salgados", "Bolos"], contrato: "Horista", cargaMaxima: 200 },
                    { nome: "Flávio", area: "Alimentos", subareas: ["Panificação", "Salgados", "Doces Natalinos"], contrato: "Mensalista", cargaMaxima: 40 },
                    { nome: "Patricia", area: "Alimentos", subareas: ["Doces Natalinos", "Confeitaria"], contrato: "Horista", cargaMaxima: 200 },
                    { nome: "Marcela", area: "Alimentos", subareas: ["Geléias", "Compotas"], contrato: "Horista", cargaMaxima: 200 },
                    { nome: "Jeremias", area: "Construção Civil", subareas: ["Hidráulica", "Pintura"], contrato: "Horista", cargaMaxima: 200 },
                    { nome: "Junior", area: "Construção Civil", subareas: ["Medições", "Alvenaria"], contrato: "Mensalista", cargaMaxima: 40 },
                    { nome: "Carlos Metalurgia", area: "Metalurgia", subareas: ["Serralheria", "Solda"], contrato: "Mensalista", cargaMaxima: 40 },
                    { nome: "Ana Eletrica", area: "Construção Civil", subareas: ["Elétrica Residencial"], contrato: "Horista", cargaMaxima: 200 }
                ];
                
                const recursosData = [
                    { nome: "Escola Móvel 1075 - Serralheria", tipo: "Móvel" },
                    { nome: "Escola Móvel 1060 - Elétrica", tipo: "Móvel" },
                    { nome: "Escola Móvel 1059 - Elétrica", tipo: "Móvel" },
                    { nome: "Kit Cozinha Industrial 01", tipo: "Kit" }
                ];
                
                const recursosIds = {};
                for (const rec of recursosData) {
                    const docRef = await addDoc(recursosCol, rec);
                    recursosIds[rec.nome] = docRef.id;
                }
                console.log("Recursos adicionados.");
                
                const cursosData = [
                    { titulo: "FABRICAÇÃO DE OVOS DE PÁSCOA", area: "Alimentos", subareaReq: "Confeitaria", chTecnica: 24, chGestao: 0, idRecursoNecessario: null },
                    { titulo: "SOBREMESAS E BOLO NO POTE", area: "Alimentos", subareaReq: "Confeitaria", chTecnica: 20, chGestao: 8, idRecursoNecessario: null },
                    { titulo: "Fabricação de Pães Doces e Semi Doces", area: "Alimentos", subareaReq: "Panificação", chTecnica: 40, chGestao: 8, idRecursoNecessario: null },
                    { titulo: "Panetones e doces Natalinos", area: "Alimentos", subareaReq: "Doces Natalinos", chTecnica: 20, chGestao: 8, idRecursoNecessario: null },
                    { titulo: "Pequenos Reparos em Edificações - Hidráulica", area: "Construção Civil", subareaReq: "Hidráulica", chTecnica: 80, chGestao: 8, idRecursoNecessario: null },
                    { titulo: "Pequenos Reparos em Edificações - Pintura", area: "Construção Civil", subareaReq: "Pintura", chTecnica: 40, chGestao: 8, idRecursoNecessario: null },
                    { titulo: "Fundamentos de Instalações Elétricas Residenciais", area: "Construção Civil", subareaReq: "Elétrica Residencial", chTecnica: 40, chGestao: 8, idRecursoNecessario: recursosIds["Escola Móvel 1060 - Elétrica"] },
                    { titulo: "Técnicas Básicas em Serralheria", area: "Metalurgia", subareaReq: "Serralheria", chTecnica: 80, chGestao: 8, idRecursoNecessario: recursosIds["Escola Móvel 1075 - Serralheria"] }
                ];
                
                const docentesAdicionados = [];
                for (const doc of docentesData) {
                    const docRef = await addDoc(docentesCol, doc);
                    docentesAdicionados.push({ id: docRef.id, ...doc });
                }
                console.log("Docentes adicionados.");
                
                const cursosRefs = {};
                for (const curso of cursosData) {
                    const docRef = await addDoc(cursosCol, curso);
                    cursosRefs[curso.titulo] = docRef.id;
                }
                console.log("Cursos adicionados.");
                
                const camposResultadoPadrao = {
                    propostaSgset: null, demandaNumero: null, raeNumero: null, videoLink: null,
                    matrPrevistas: null, matrRealizadas: null, evasao: null, receitaFinal: null
                };
                
                await addDoc(demandasCol, {
                    idCurso: cursosRefs["FABRICAÇÃO DE OVOS DE PÁSCOA"],
                    solicitante: "Herith", municipio: "Maracaí",
                    dataInicio: Timestamp.fromDate(new Date("2025-03-17T12:00:00Z")),
                    dataFim: Timestamp.fromDate(new Date("2025-03-24T12:00:00Z")),
                    horarioInicio: "13:00", horarioFim: "17:00",
                    diasSemana: ["1", "2", "3", "4", "5"], status: "Solicitada",
                    idDocenteAlocado: null, idRecursoAlocado: null, ...camposResultadoPadrao
                });
                console.log("Demanda 'Ovos de Páscoa' (Solicitada) adicionada.");

                const docenteMetalurgia = docentesAdicionados.find(d => d.area === "Metalurgia")?.id;
                await addDoc(demandasCol, {
                    idCurso: cursosRefs["Técnicas Básicas em Serralheria"],
                    solicitante: "Patricia", municipio: "Rinopolis",
                    dataInicio: Timestamp.fromDate(new Date("2025-07-07T12:00:00Z")),
                    dataFim: Timestamp.fromDate(new Date("2025-08-01T12:00:00Z")),
                    dataGestao1: Timestamp.fromDate(new Date("2025-08-04T12:00:00Z")),
                    dataGestao2: Timestamp.fromDate(new Date("2025-08-05T12:00:00Z")),
                    horarioInicio: "18:00", horarioFim: "22:00",
                    diasSemana: ["1", "2", "3", "4", "5"], status: "Programada",
                    idDocenteAlocado: docenteMetalurgia, 
                    idRecursoAlocado: cursosData.find(c => c.titulo === "Técnicas Básicas em Serralheria").idRecursoNecessario,
                    ...camposResultadoPadrao
                });
                console.log("Demanda 'Serralheria' (Programada) adicionada.");

                const docenteFlavio = docentesAdicionados.find(d => d.nome === "Flávio")?.id;
                await addDoc(demandasCol, {
                    idCurso: cursosRefs["Fabricação de Pães Doces e Semi Doces"],
                    solicitante: "Mariana", municipio: "Garça",
                    dataInicio: Timestamp.fromDate(new Date("2025-12-03T12:00:00Z")),
                    dataFim: Timestamp.fromDate(new Date("2025-12-17T12:00:00Z")),
                    dataGestao1: Timestamp.fromDate(new Date("2025-12-01T12:00:00Z")),
                    dataGestao2: Timestamp.fromDate(new Date("2025-12-02T12:00:00Z")),
                    horarioInicio: "18:00", horarioFim: "22:00",
                    diasSemana: ["1", "2", "3", "4", "5"], status: "Programada",
                    idDocenteAlocado: docenteFlavio, idRecursoAlocado: null, ...camposResultadoPadrao
                });
                console.log("Demanda 'Pães Doces' (Programada) adicionada.");
                
                await addDoc(demandasCol, {
                    idCurso: cursosRefs["Fundamentos de Instalações Elétricas Residenciais"],
                    solicitante: "Patricia", municipio: "Pompéia",
                    dataInicio: Timestamp.fromDate(new Date("2025-07-21T12:00:00Z")), 
                    dataFim: Timestamp.fromDate(new Date("2025-08-01T12:00:00Z")),
                    dataGestao1: Timestamp.fromDate(new Date("2025-08-04T12:00:00Z")),
                    dataGestao2: Timestamp.fromDate(new Date("2025-08-05T12:00:00Z")),
                    horarioInicio: "18:00", horarioFim: "22:00",
                    diasSemana: ["1", "2", "3", "4", "5"], status: "Solicitada",
                    idDocenteAlocado: null, idRecursoAlocado: null, ...camposResultadoPadrao
                });
                console.log("Demanda 'Elétrica Pompéia' (Solicitada) adicionada.");

                const docenteHildo = docentesAdicionados.find(d => d.nome === "Hildo")?.id;
                await addDoc(demandasCol, { 
                    idCurso: cursosRefs["SOBREMESAS E BOLO NO POTE"],
                    solicitante: "Patricia", municipio: "Tupã",
                    dataInicio: Timestamp.fromDate(new Date("2025-06-09T12:00:00Z")),
                    dataFim: Timestamp.fromDate(new Date("2025-06-13T12:00:00Z")),
                    dataGestao1: Timestamp.fromDate(new Date("2025-06-05T12:00:00Z")),
                    dataGestao2: Timestamp.fromDate(new Date("2025-06-06T12:00:00Z")),
                    horarioInicio: "18:30", horarioFim: "22:30",
                    diasSemana: ["1", "2", "3", "4", "5"], status: "Concluída", 
                    idDocenteAlocado: docenteHildo, idRecursoAlocado: null, ...camposResultadoPadrao
                });
                await addDoc(demandasCol, { 
                    idCurso: cursosRefs["Panetones e doces Natalinos"],
                    solicitante: "Mariana", municipio: "Gália",
                    dataInicio: Timestamp.fromDate(new Date("2025-11-11T12:00:00Z")),
                    dataFim: Timestamp.fromDate(new Date("2025-11-17T12:00:00Z")),
                    dataGestao1: Timestamp.fromDate(new Date("2025-11-05T12:00:00Z")),
                    dataGestao2: Timestamp.fromDate(new Date("2025-11-06T12:00:00Z")),
                    horarioInicio: "18:30", horarioFim: "22:30",
                    diasSemana: ["1", "2", "3", "4", "5"], status: "Programada",
                    idDocenteAlocado: docenteHildo, idRecursoAlocado: null, ...camposResultadoPadrao
                });
                 await addDoc(demandasCol, { 
                    idCurso: cursosRefs["Panetones e doces Natalinos"],
                    solicitante: "Priscila", municipio: "Ocauçu",
                    dataInicio: Timestamp.fromDate(new Date("2025-11-11T12:00:00Z")),
                    dataFim: Timestamp.fromDate(new Date("2025-11-17T12:00:00Z")),
                    dataGestao1: Timestamp.fromDate(new Date("2025-11-06T12:00:00Z")),
                    dataGestao2: Timestamp.fromDate(new Date("2025-11-07T12:00:00Z")),
                    horarioInicio: "13:00", horarioFim: "17:00",
                    diasSemana: ["1", "2", "3", "4", "5"], status: "Solicitada",
                    idDocenteAlocado: null, idRecursoAlocado: null, ...camposResultadoPadrao
                });
                console.log("Demandas de Hildo (Programada e Solicitada) adicionadas para teste de conflito.");

                status.textContent = "Dados de demonstração (baseados na planilha) carregados com sucesso!";
                
            } catch (error) {
                console.error("Erro ao carregar dados iniciais:", error);
                status.textContent = `Erro: ${error.message}`;
            } finally {
                btn.disabled = false;
            }
        }
        
        // --- MODAL: Nova Demanda ---
        
        function abrirModalDemanda() {
            document.getElementById('form-nova-demanda').reset();
            popularSelectCursos(); 
            
            const selectCurso = document.getElementById('demanda-curso');
            selectCurso.innerHTML = '<option value="">Selecione primeiro a Área</option>';
            selectCurso.disabled = true;

            const tipoCoord = document.getElementById('tipoDemandaCoordenacao');
            const tipoSoli = document.getElementById('tipoDemandaSolicitante');
            const camposGestao = document.getElementById('campos-gestao');

            if (usuarioAtual === 'Coordenador') {
                tipoCoord.checked = true;
                tipoSoli.disabled = false;
                tipoCoord.disabled = false;
                camposGestao.style.display = 'grid';
            } else {
                tipoSoli.checked = true;
                tipoSoli.disabled = true;
                tipoCoord.disabled = true;
                camposGestao.style.display = 'none';
            }

            document.getElementById('modal-nova-demanda').classList.remove('hidden');
        }
        
        function fecharModalDemanda() {
            document.getElementById('modal-nova-demanda').classList.add('hidden');
        }
        
        async function salvarNovaDemanda(event) {
            event.preventDefault();
            const form = event.target;
            
            const diasSemana = Array.from(form.querySelectorAll('input[name="diasSemana"]:checked')).map(cb => cb.value);
            const tipoRegistro = form.querySelector('input[name="tipoDemanda"]:checked').value;
            
            const novoStatus = (tipoRegistro === 'Coordenador') ? 'Solicitada' : 'Aguardando Aprovação';
            
            const dataGestao1 = (tipoRegistro === 'Coordenador' && form.querySelector('#demanda-data-gestao1').value) 
                ? Timestamp.fromDate(new Date(form.querySelector('#demanda-data-gestao1').value + "T12:00:00Z")) 
                : null;
            
            const dataGestao2 = (tipoRegistro === 'Coordenador' && form.querySelector('#demanda-data-gestao2').value)
                ? Timestamp.fromDate(new Date(form.querySelector('#demanda-data-gestao2').value + "T12:00:00Z"))
                : null;

            const demanda = {
                solicitante: form.querySelector('#demanda-solicitante').value,
                municipio: form.querySelector('#demanda-municipio').value,
                idCurso: form.querySelector('#demanda-curso').value,
                dataInicio: Timestamp.fromDate(new Date(form.querySelector('#demanda-data-inicio').value + "T12:00:00Z")),
                dataFim: Timestamp.fromDate(new Date(form.querySelector('#demanda-data-fim').value + "T12:00:00Z")),
                dataGestao1: dataGestao1,
                dataGestao2: dataGestao2,
                horarioInicio: form.querySelector('#demanda-horario-inicio').value,
                horarioFim: form.querySelector('#demanda-horario-fim').value,
                diasSemana: diasSemana,
                status: novoStatus,
                idDocenteAlocado: null,
                idRecursoAlocado: null,
                propostaSgset: null,
                demandaNumero: null,
                raeNumero: null,
                videoLink: null,
                matrPrevistas: null,
                matrRealizadas: null,
                evasao: null,
                receitaFinal: null
            };
            
            try {
                await addDoc(demandasCol, demanda);
                mostrarNotificacao(`Demanda ${novoStatus.toLowerCase()} com sucesso!`, 'sucesso');
                fecharModalDemanda();
                
                if(novoStatus === 'Solicitada') {
                    mudarAbaStatus(null, 'Solicitada');
                }
                
            } catch (error) {
                console.error("Erro ao salvar demanda:", error);
                mostrarNotificacao(`Erro ao salvar: ${error.message}`, 'erro');
            }
        }

        // --- MODAL: Alocação (O "Cérebro") ---
        
        async function abrirModalAlocacao(demandaId) {
            console.log(`Abrindo alocação para demanda ID: ${demandaId}`);
            const modal = document.getElementById('modal-alocacao');
            modal.classList.remove('hidden');
            
            document.getElementById('alocacao-sugestoes').innerHTML = '';
            document.getElementById('alocacao-recursos').innerHTML = '';
            document.getElementById('alocacao-loading-docentes').style.display = 'block';
            
            const demanda = todasDemandas.find(d => d.id === demandaId);
            if (!demanda) {
                console.error("Demanda não encontrada para alocação");
                fecharModalAlocacao();
                return;
            }
            
            const curso = todosCursos.find(c => c.id === demanda.idCurso);
            if (!curso) {
                console.error("Curso não encontrado para alocação");
                fecharModalAlocacao();
                return;
            }

            modal.dataset.demandaId = demandaId;

            document.getElementById('alocacao-titulo').textContent = `Alocar Demanda: ${curso.titulo} em ${demanda.municipio}`;
            document.getElementById('alocacao-resumo').innerHTML = `
                <div><span class="font-medium text-gray-500 block">Curso:</span> ${curso.titulo}</div>
                <div><span class="font-medium text-gray-500 block">Período:</span> ${formatarData(demanda.dataInicio)} - ${formatarData(demanda.dataFim)}</div>
                <div><span class="font-medium text-gray-500 block">Horário:</span> ${demanda.horarioInicio} - ${demanda.horarioFim}</div>
                <div><span class="font-medium text-gray-500 block">Carga Horária:</span> ${curso.chTecnica}h (Téc) + ${curso.chGestao}h (Gest)</div>
                <div><span class="font-medium text-gray-500 block">Local:</span> ${demanda.municipio}</div>
                <div><span class="font-medium text-gray-500 block">Dias:</span> ${demanda.diasSemana.map(d => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d]).join(', ')}</div>
            `;
            
            let recursoDisponivel = true;
            let idRecursoParaAlocar = curso.idRecursoNecessario || null;
            
            if (idRecursoParaAlocar) {
                const recurso = todosRecursos.find(r => r.id === idRecursoParaAlocar);
                const conflitoRecurso = verificarConflito(demanda, todasDemandas, 'recurso', idRecursoParaAlocar);
                
                if (conflitoRecurso) {
                    recursoDisponivel = false;
                    document.getElementById('alocacao-recursos').innerHTML = `
                        <div class="flex items-center text-red-600">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" /></svg>
                            <span><span class="font-bold">${recurso.nome}</span>: ❌ RECURSO INDISPONÍVEL</span>
                        </div>
                        <p class="text-sm text-gray-600 ml-7">Conflito com demanda: ${conflitoRecurso.id} (${conflitoRecurso.municipio})</p>
                    `;
                } else {
                    document.getElementById('alocacao-recursos').innerHTML = `
                        <div class="flex items-center text-green-600">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" /></svg>
                            <span><span class="font-bold">${recurso.nome}</span>: ✅ RECURSO DISPONÍVEL</span>
                        </div>
                    `;
                }
            } else {
                document.getElementById('alocacao-recursos').innerHTML = `
                    <div class="flex items-center text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clip-rule="evenodd" /></svg>
                        <span>Nenhum recurso crítico (ex: Escola Móvel) é necessário para este curso.</span>
                    </div>
                `;
            }

            const sugestoesHtml = [];
            const subareaRequerida = curso.subareaReq || curso.area;
            
            for (const docente of todosDocentes) {
                let status = 'Disponível';
                let motivos = [];
                let corIcone = 'text-green-500'; 
                let icone = 'check';
                let botaoHtml = `<button data-docente-id="${docente.id}" data-recurso-id="${idRecursoParaAlocar || ''}" class="btn-confirmar-alocacao w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">🟩 Alocar ${docente.nome}</button>`;

                const subareasDocente = docente.subareas || [];
                const temCompetencia = subareasDocente.includes(subareaRequerida) || docente.area === curso.area;
                
                if (!temCompetencia) {
                    continue; 
                }

                if (!recursoDisponivel) {
                    status = 'Indisponível';
                    motivos.push(`Recurso (${todosRecursos.find(r => r.id === idRecursoParaAlocar)?.nome}) indisponível.`);
                    corIcone = 'text-red-500'; 
                    icone = 'x';
                    botaoHtml = `<button class="w-full sm:w-auto bg-gray-400 text-gray-700 font-bold py-2 px-4 rounded-lg cursor-not-allowed" disabled>(Indisponível)</button>`;
                }
                
                const conflitoAgenda = verificarConflito(demanda, todasDemandas, 'docente', docente.id);
                if (conflitoAgenda) {
                    status = 'Indisponível';
                    const conflitoCurso = todosCursos.find(c => c.id === conflitoAgenda.idCurso);
                    motivos.push(`Conflito de agenda (Curso: ${conflitoCurso?.titulo || '...'} em ${conflitoAgenda.municipio})`);
                    corIcone = 'text-red-500';
                    icone = 'x';
                    botaoHtml = `<button class="w-full sm:w-auto bg-gray-400 text-gray-700 font-bold py-2 px-4 rounded-lg cursor-not-allowed" disabled>(Indisponível)</button>`;
                }

                const projecao = calcularCargaHoraria(docente, demanda, todasDemandas, curso);
                
                let contratoHtml = '';
                if (docente.contrato === 'Mensalista') {
                    contratoHtml = `
                        <p class="text-sm">Contrato: Mensalista (40h/sem)</p>
                        <p class="text-sm">Projeção na semana: <span class="font-medium">${projecao.horasSemana}h / 40h</span></p>
                    `;
                } else { // Horista
                    contratoHtml = `
                        <p class="text-sm">Contrato: Horista (200h/mês)</p>
                        <p class="text-sm">Carga Atual (Mês): <span class="font-medium">${projecao.horasMesAtuais}h / 200h</span></p>
                        <p class="text-sm">Projeção Pós-Alocação: <span class="font-medium text-${projecao.violaContrato ? 'red-600' : 'gray-700'}">${projecao.horasMesProjetadas}h / 200h</span></p>
                    `;
                }
                
                if (projecao.violaContrato && status === 'Disponível') {
                    status = 'Viola Contrato';
                    motivos.push(`Alocação excede o limite de ${docente.cargaMaxima}h do contrato.`);
                    corIcone = 'text-yellow-500'; 
                    icone = 'warning';
                    botaoHtml = `<button data-docente-id="${docente.id}" data-recurso-id="${idRecursoParaAlocar || ''}" class="btn-confirmar-alocacao w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg">🟨 Alocar ${docente.nome} (Viola Contrato ⚠️)</button>`;
                }

                sugestoesHtml.push(`
                    <div class="border rounded-lg shadow-sm overflow-hidden ${status === 'Indisponível' ? 'bg-gray-50 opacity-70' : 'bg-white'}">
                        <div class="p-4 sm:p-5">
                            <div class="flex items-start justify-between">
                                <div>
                                    <h5 class="text-lg font-semibold text-gray-900">${docente.nome}</h5>
                                    <p class="text-sm text-gray-500 mb-3">${docente.area} (${(docente.subareas || []).join(', ')})</p>
                                </div>
                                <div class="flex items-center space-x-2 px-3 py-1 rounded-full ${corIcone.replace('text-', 'bg-').replace('500', '100')} ${corIcone}">
                                    ${getIcone(icone)}
                                    <span class="text-sm font-medium">${status}</span>
                                </div>
                            </div>
                            
                            <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div class="border-t sm:border-t-0 sm:border-l border-gray-200 pl-0 sm:pl-4 pt-3 sm:pt-0">
                                    <h6 class="text-xs font-semibold text-gray-500 uppercase mb-2">Análise de Contrato</h6>
                                    ${contratoHtml}
                                </div>
                                <div class="border-t border-gray-200 pt-3 ${status === 'Disponível' ? 'hidden' : ''}">
                                    <h6 class="text-xs font-semibold text-gray-500 uppercase mb-2">Motivos</h6>
                                    <ul class="list-disc list-inside space-y-1">
                                        ${motivos.map(m => `<li class="text-sm text-red-600">${m}</li>`).join('')}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end">
                            ${botaoHtml}
                        </div>
                    </div>
                `);
            }
            
            document.getElementById('alocacao-loading-docentes').style.display = 'none';
            document.getElementById('alocacao-sugestoes').innerHTML = sugestoesHtml.join('');
        }
        
        function fecharModalAlocacao() {
            document.getElementById('modal-alocacao').classList.add('hidden');
        }
        
        // --- MODAL: Detalhes (Programada) ---
        
        function abrirModalDetalhes(demandaId) {
            console.log(`Abrindo detalhes para demanda ID: ${demandaId}`);
            const modal = document.getElementById('modal-detalhes-programada');
            const form = document.getElementById('form-detalhes-curso');
            const infoEstaticaCorpo = document.getElementById('modal-detalhes-info-estatica');
            const btnIniciar = document.getElementById('btn-iniciar-curso');
            const btnSalvar = document.getElementById('btn-salvar-detalhes');
            const btnCancelar = document.getElementById('btn-cancelar-demanda-modal');
            const btnConcluir = document.getElementById('btn-concluir-curso');
            
            form.reset(); 
            infoEstaticaCorpo.innerHTML = '<p class="text-gray-500 text-center col-span-full">Carregando...</p>';
            btnIniciar.classList.add('hidden'); 
            btnSalvar.classList.add('hidden');
            btnCancelar.classList.add('hidden');
            btnConcluir.classList.add('hidden');
            form.dataset.demandaId = ''; 

            const demanda = todasDemandas.find(d => d.id === demandaId);
            if (!demanda) {
                console.error("Demanda não encontrada para detalhes");
                infoEstaticaCorpo.innerHTML = '<p class="text-red-500 text-center col-span-full">Erro: Demanda não encontrada.</p>';
                modal.classList.remove('hidden');
                return;
            }
            
            const curso = todosCursos.find(c => c.id === demanda.idCurso);
            const docente = todosDocentes.find(d => d.id === demanda.idDocenteAlocado);
            const recurso = todosRecursos.find(r => r.id === demanda.idRecursoAlocado);

            document.getElementById('detalhes-titulo').textContent = `Detalhes: ${curso?.titulo || 'Curso'}`;
            
            infoEstaticaCorpo.innerHTML = `
                <div>
                    <span class="font-medium text-gray-500 block">Status:</span> 
                    <span class="font-semibold text-gray-900">${demanda.status}</span>
                </div>
                <div>
                    <span class="font-medium text-gray-500 block">Município:</span> 
                    <span class="text-gray-800">${demanda.municipio}</span>
                </div>
                <div>
                    <span class="font-medium text-gray-500 block">Período Técnico:</span> 
                    <span class="text-gray-800">${formatarData(demanda.dataInicio)} - ${formatarData(demanda.dataFim)}</span>
                </div>
                <div>
                    <span class="font-medium text-gray-500 block">Docente Alocado:</span> 
                    <span class="font-semibold text-blue-700">${docente?.nome || 'N/A'}</span>
                </div>
                <div>
                    <span class="font-medium text-gray-500 block">Recurso Alocado:</span> 
                    <span class="text-gray-800">${recurso?.nome || 'Nenhum'}</span>
                </div>
                <div>
                    <span class="font-medium text-gray-500 block">Solicitante:</span> 
                    <span class="text-gray-800">${demanda.solicitante}</span>
                </div>
            `;
            
            form.querySelector('#detalhes-proposta-sgset').value = demanda.propostaSgset || '';
            form.querySelector('#detalhes-demanda-num').value = demanda.demandaNumero || '';
            form.querySelector('#detalhes-rae').value = demanda.raeNumero || '';
            form.querySelector('#detalhes-video').value = demanda.videoLink || '';
            form.querySelector('#detalhes-matr-previstas').value = demanda.matrPrevistas || '';
            form.querySelector('#detalhes-matr-realizadas').value = demanda.matrRealizadas || '';
            form.querySelector('#detalhes-evasao').value = demanda.evasao || '';
            form.querySelector('#detalhes-receita').value = demanda.receitaFinal || '';
            
            form.dataset.demandaId = demandaId;

            // Controlar visibilidade dos botões
            if (usuarioAtual === 'Coordenador') {
                if (demanda.status === 'Programada') {
                    btnSalvar.classList.remove('hidden');
                    btnIniciar.classList.remove('hidden');
                    btnCancelar.classList.remove('hidden');
                } else if (demanda.status === 'Em Andamento') {
                    btnSalvar.classList.remove('hidden');
                    btnConcluir.classList.remove('hidden'); // <-- Show Concluir
                    btnCancelar.classList.remove('hidden');
                } else if (demanda.status === 'Concluída' || demanda.status === 'Cancelada') {
                    // Apenas "Fechar" é visível
                    // (btnSalvar, btnIniciar, btnConcluir, btnCancelar permanecem hidden)
                } else {
                    // Outros status (como Solicitada) - Coordenador pode editar
                    btnSalvar.classList.remove('hidden');
                    if (demanda.status !== 'Cancelada' && demanda.status !== 'Concluída') {
                        btnCancelar.classList.remove('hidden');
                    }
                }
            }

            modal.classList.remove('hidden');
        }

        function fecharModalDetalhes() {
            document.getElementById('modal-detalhes-programada').classList.add('hidden');
        }
        
        async function salvarDadosModalDetalhes(demandaId) {
            const form = document.getElementById('form-detalhes-curso');
            if (form.dataset.demandaId !== demandaId) {
                console.error("Inconsistência de ID no modal!");
                return false;
            }

            const dadosParaSalvar = {
                propostaSgset: form.querySelector('#detalhes-proposta-sgset').value || null,
                demandaNumero: form.querySelector('#detalhes-demanda-num').value || null,
                raeNumero: form.querySelector('#detalhes-rae').value || null,
                videoLink: form.querySelector('#detalhes-video').value || null,
                matrPrevistas: Number(form.querySelector('#detalhes-matr-previstas').value) || null,
                matrRealizadas: Number(form.querySelector('#detalhes-matr-realizadas').value) || null,
                evasao: Number(form.querySelector('#detalhes-evasao').value) || null,
                receitaFinal: Number(form.querySelector('#detalhes-receita').value) || null,
            };

            try {
                const demandaRef = doc(db, demandasCol.path, demandaId);
                await updateDoc(demandaRef, dadosParaSalvar);
                return true; // Sucesso
            } catch (error) {
                console.error("Erro ao salvar detalhes:", error);
                mostrarNotificacao(`Erro ao salvar: ${error.message}`, 'erro');
                return false; // Falha
            }
        }
        
        async function handleSalvarDetalhes(event) {
            event.preventDefault();
            const demandaId = document.getElementById('form-detalhes-curso').dataset.demandaId;
            if (!demandaId) return;

            const sucesso = await salvarDadosModalDetalhes(demandaId);
            if (sucesso) {
                mostrarNotificacao('Alterações salvas com sucesso!', 'sucesso');
                fecharModalDetalhes();
            }
        }

        async function handleIniciarCurso(event) {
            event.preventDefault();
            const demandaId = document.getElementById('form-detalhes-curso').dataset.demandaId;
            if (!demandaId) return;
            
            const sucessoSalvar = await salvarDadosModalDetalhes(demandaId);
            
            if (!sucessoSalvar) {
                return;
            }
            
            try {
                const demandaRef = doc(db, demandasCol.path, demandaId);
                await updateDoc(demandaRef, {
                    status: 'Em Andamento'
                });
                
                mostrarNotificacao('Dados salvos e curso iniciado! Movido para "Em Andamento".', 'sucesso');
                fecharModalDetalhes();
                mudarAbaStatus(null, 'Em Andamento');
                
            } catch (error) {
                console.error("Erro ao iniciar curso (após salvar):", error);
                mostrarNotificacao(`Erro ao iniciar curso: ${error.message}`, 'erro');
            }
        }
        
        // --- LÓGICA DE CONCLUSÃO (ATUALIZADA) ---

        /**
         * Botão "Salvar e Concluir Curso" - Valida a data e abre a confirmação.
         */
        async function handleConcluirCurso(event) {
            event.preventDefault();
            const demandaId = document.getElementById('form-detalhes-curso').dataset.demandaId;
            if (!demandaId) return;

            // 1. Encontrar a demanda para validar a data
            const demanda = todasDemandas.find(d => d.id === demandaId);
            if (!demanda) {
                mostrarAlerta("Erro", "Demanda não encontrada.");
                return;
            }

            const dataFim = timestampParaData(demanda.dataFim);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0); // Zera a hora de 'hoje' para comparar apenas o dia

            // 2. *** VALIDAÇÃO DA DATA ***
            if (dataFim > hoje) {
                // Se a data de término for no futuro
                const dataFimFormatada = formatarData(demanda.dataFim);
                mostrarAlerta(
                    "Não é possível Concluir",
                    `Esta demanda só termina em ${dataFimFormatada}.\nVocê não pode concluir uma demanda futura.\n\nSe a demanda não vai mais ocorrer, por favor, use a opção "Cancelar Demanda".`
                );
                return; // Para a execução
            }

            // 3. Salva os dados (matrículas, etc.) ANTES de pedir a confirmação
            const sucessoSalvar = await salvarDadosModalDetalhes(demandaId);
            
            if (!sucessoSalvar) {
                // A notificação de erro já foi mostrada por salvarDadosModalDetalhes
                return;
            }
            
            // 4. Se a data é válida e os dados foram salvos, MOSTRA O MODAL DE CONFIRMAÇÃO
            const modalConfirmar = document.getElementById('modal-confirmar-conclusao');
            modalConfirmar.classList.remove('hidden');
            // Passa o ID da demanda para o botão de confirmação
            document.getElementById('btn-sim-concluir').dataset.demandaId = demandaId;
        }

        /**
         * Executa a conclusão DEPOIS que o usuário clica em "Sim" no modal de confirmação.
         */
        async function executarConclusao(event) {
            const demandaId = event.target.dataset.demandaId;
            if (!demandaId) {
                mostrarNotificacao("Erro: ID da demanda não encontrado.", 'erro');
                return;
            }

            try {
                const demandaRef = doc(db, demandasCol.path, demandaId);
                await updateDoc(demandaRef, {
                    status: 'Concluída'
                });
                
                mostrarNotificacao('Dados salvos e curso concluído! Movido para "Concluídas".', 'sucesso');
                fecharModalConclusao();
                fecharModalDetalhes(); // Fecha o modal de detalhes também
                
                // Mudar para a aba "Concluída"
                mudarAbaStatus(null, 'Concluída');
                
            } catch (error) {
                console.error("Erro ao concluir curso (após salvar):", error);
                mostrarNotificacao(`Erro ao concluir curso: ${error.message}`, 'erro');
            }
        }

        // Fecha o modal de confirmação de conclusão
        function fecharModalConclusao() {
            document.getElementById('modal-confirmar-conclusao').classList.add('hidden');
        }

        // --- FIM LÓGICA DE CONCLUSÃO ---


        // --- LÓGICA DE CANCELAMENTO ---

        // Abre o modal de confirmação
        function iniciarFluxoCancelamento() {
            const demandaId = document.getElementById('form-detalhes-curso').dataset.demandaId;
            if (!demandaId) return;

            const modalConfirmar = document.getElementById('modal-confirmar-cancelamento');
            modalConfirmar.classList.remove('hidden');

            // Passa o demandaId para o botão de confirmação
            document.getElementById('btn-sim-cancelar').dataset.demandaId = demandaId;
        }

        // Fecha o modal de confirmação
        function fecharModalCancelamento() {
            document.getElementById('modal-confirmar-cancelamento').classList.add('hidden');
        }

        // Executa o cancelamento
        async function executarCancelamento(event) {
            const demandaId = event.target.dataset.demandaId;
            if (!demandaId) {
                mostrarNotificacao("Erro: ID da demanda não encontrado.", 'erro');
                return;
            }

            try {
                const demandaRef = doc(db, demandasCol.path, demandaId);
                await updateDoc(demandaRef, {
                    status: 'Cancelada'
                });

                mostrarNotificacao('Demanda cancelada com sucesso.', 'sucesso');
                fecharModalCancelamento();
                fecharModalDetalhes(); // Fecha o modal de detalhes também
                
                // Mudar para a aba "Canceladas"
                mudarAbaStatus(null, 'Cancelada');

            } catch (error) {
                console.error("Erro ao cancelar:", error);
                mostrarNotificacao(`Erro ao cancelar: ${error.message}`, 'erro');
            }
        }
        
        // --- FIM LÓGICA DE CANCELAMENTO ---

        // --- MODAL DE ALERTA (NOVO) ---
        function mostrarAlerta(titulo, texto) {
            document.getElementById('modal-alerta-titulo').textContent = titulo;
            document.getElementById('modal-alerta-texto').textContent = texto;
            document.getElementById('modal-alerta').classList.remove('hidden');
        }

        function fecharAlerta() {
            document.getElementById('modal-alerta').classList.add('hidden');
        }
        // --- FIM MODAL DE ALERTA ---

        async function confirmarAlocacao(event) {
            const btn = event.target;
            const docenteId = btn.dataset.docenteId;
            const recursoId = btn.dataset.recursoId;
            const demandaId = document.getElementById('modal-alocacao').dataset.demandaId;
            
            if (!demandaId || !docenteId) {
                mostrarNotificacao("Erro: ID da demanda ou do docente não encontrado.", 'erro');
                return;
            }
            
            try {
                const demandaRef = doc(db, demandasCol.path, demandaId);
                await updateDoc(demandaRef, {
                    idDocenteAlocado: docenteId,
                    idRecursoAlocado: recursoId || null,
                    status: 'Programada'
                });
                
                mostrarNotificacao('Docente alocado com sucesso! Demanda movida para "Programadas".', 'sucesso');
                fecharModalAlocacao();
                mudarAbaStatus(null, 'Programada');
                
            } catch (error) {
                console.error("Erro ao alocar:", error);
                mostrarNotificacao(`Erro ao alocar: ${error.message}`, 'erro');
            }
        }
        
        async function handleAprovarDemanda(demandaId) {
            if (usuarioAtual !== 'Coordenador') {
                mostrarNotificacao("Apenas Coordenadores podem aprovar demandas.", 'erro');
                return;
            }
            
            try {
                const demandaRef = doc(db, demandasCol.path, demandaId);
                await updateDoc(demandaRef, {
                    status: 'Solicitada'
                });
                
                mostrarNotificacao('Demanda Aprovada! Pronta para alocação.', 'sucesso');
                mudarAbaStatus(null, 'Solicitada');
                
            } catch (error) {
                console.error("Erro ao aprovar demanda:", error);
                mostrarNotificacao(`Erro ao aprovar: ${error.message}`, 'erro');
            }
        }
        
        // --- Lógica de Negócio (O "Cérebro") ---
        
        const {
            isWithinInterval,
            parseISO,
            eachDayOfInterval,
            getDay,
            startOfMonth,
            endOfMonth,
            startOfWeek,
            endOfWeek,
            differenceInHours,
            parse,
            isEqual,
            isBefore,
            isAfter,
            isToday // ### Importar isToday ###
        } = window.dateFns;

        function verificarConflito(novaDemanda, demandasExistentes, tipo, id) {
            const novaDataInicio = timestampParaData(novaDemanda.dataInicio);
            const novaDataFim = timestampParaData(novaDemanda.dataFim);
            const novoHorarioInicio = parse(novaDemanda.horarioInicio, 'HH:mm', new Date());
            const novoHorarioFim = parse(novaDemanda.horarioFim, 'HH:mm', new Date());

            const demandasParaChecar = demandasExistentes.filter(d => 
                d.id !== novaDemanda.id &&
                (d.status === 'Programada' || d.status === 'Em Andamento') &&
                (tipo === 'docente' ? d.idDocenteAlocado === id : d.idRecursoAlocado === id)
            );

            for (const existente of demandasParaChecar) {
                const existenteDataInicio = timestampParaData(existente.dataInicio);
                const existenteDataFim = timestampParaData(existente.dataFim);
                
                const sobrepoeDatas = (
                    (isWithinInterval(novaDataInicio, { start: existenteDataInicio, end: existenteDataFim })) ||
                    (isWithinInterval(novaDataFim, { start: existenteDataInicio, end: existenteDataFim })) ||
                    (isWithinInterval(existenteDataInicio, { start: novaDataInicio, end: novaDataFim })) ||
                    (isWithinInterval(existenteDataFim, { start: novaDataInicio, end: novaDataFim }))
                );

                if (!sobrepoeDatas) continue;
                
                const diasComuns = novaDemanda.diasSemana.some(dia => existente.diasSemana.includes(dia));
                
                if (!diasComuns) continue;

                const existenteHorarioInicio = parse(existente.horarioInicio, 'HH:mm', new Date());
                const existenteHorarioFim = parse(existente.horarioFim, 'HH:mm', new Date());
                
                const sobrepoeHorarios = (novoHorarioInicio < existenteHorarioFim) && (novoHorarioFim > existenteHorarioInicio);

                if (sobrepoeHorarios) {
                    return existente;
                }
                
                const diasGestaoExistentes = [existente.dataGestao1, existente.dataGestao2].filter(Boolean).map(timestampParaData);
                
                for (const diaGestao of diasGestaoExistentes) {
                    if (isWithinInterval(diaGestao, { start: novaDataInicio, end: novaDataFim })) {
                         return existente;
                    }
                }
                const diasGestaoNovos = [novaDemanda.dataGestao1, novaDemanda.dataGestao2].filter(Boolean).map(timestampParaData);
                for (const diaGestaoNovo of diasGestaoNovos) {
                     if (isWithinInterval(diaGestaoNovo, { start: existenteDataInicio, end: existenteDataFim })) {
                         return existente; 
                     }
                }
            }
            return null;
        }

        function calcularCargaHoraria(docente, novaDemanda, todasDemandas, curso) {
            const chTecnica = Number(curso.chTecnica) || 0;
            const chGestao = Number(curso.chGestao) || 0;
            const horasTotaisNovaDemanda = chTecnica + chGestao;
            
            const dataReferencia = timestampParaData(novaDemanda.dataInicio);
            
            const demandasRelevantes = todasDemandas.filter(d => 
                d.idDocenteAlocado === docente.id &&
                (d.status === 'Programada' || d.status === 'Em Andamento')
            );
            
            let projecao = { horasMesAtuais: 0, horasMesProjetadas: 0, horasSemana: 0, violaContrato: false };

            if (docente.contrato === 'Mensalista') {
                const semanaInicio = startOfWeek(dataReferencia, { weekStartsOn: 1 }); 
                const semanaFim = endOfWeek(dataReferencia, { weekStartsOn: 1 }); 
                
                let horasNaSemana = 0;
                
                demandasRelevantes.forEach(d => {
                    const cursoDemanda = todosCursos.find(c => c.id === d.idCurso);
                    if (cursoDemanda) {
                         horasNaSemana += (Number(cursoDemanda.chTecnica) || 0) + (Number(cursoDemanda.chGestao) || 0); 
                    }
                });
                
                projecao.horasSemana = horasNaSemana + horasTotaisNovaDemanda; 
                projecao.violaContrato = projecao.horasSemana > docente.cargaMaxima; 
                
            } else { // Horista
                const mesInicio = startOfMonth(dataReferencia);
                const mesFim = endOfMonth(dataReferencia);
                
                let horasNoMes = 0;
                demandasRelevantes.forEach(d => {
                    const dataInicioDemanda = timestampParaData(d.dataInicio);
                    const cursoDemanda = todosCursos.find(c => c.id === d.idCurso);
                    if (cursoDemanda && isWithinInterval(dataInicioDemanda, { start: mesInicio, end: mesFim })) {
                        horasNoMes += (Number(cursoDemanda.chTecnica) || 0) + (Number(cursoDemanda.chGestao) || 0);
                    }
                });
                
                projecao.horasMesAtuais = horasNoMes;
                projecao.horasMesProjetadas = horasNoMes + horasTotaisNovaDemanda;
                projecao.violaContrato = projecao.horasMesProjetadas > docente.cargaMaxima; 
            }
            
            return projecao;
        }

        // --- Utilitários ---
        
        function mostrarNotificacao(mensagem, tipo = 'sucesso') {
            const toast = document.getElementById('toast-notificacao');
            const msgEl = document.getElementById('toast-mensagem');
            
            msgEl.textContent = mensagem;
            
            if (tipo === 'erro') {
                toast.classList.remove('bg-green-600');
                toast.classList.add('bg-red-600');
            } else {
                toast.classList.remove('bg-red-600');
                toast.classList.add('bg-green-600');
            }
            
            toast.classList.remove('hidden', 'translate-y-20');
            toast.classList.add('translate-y-0');
            
            setTimeout(() => {
                toast.classList.remove('translate-y-0');
                toast.classList.add('translate-y-20');
                setTimeout(() => toast.classList.add('hidden'), 300);
            }, 4000);
        }

        function formatarData(timestamp) {
            if (!timestamp) return 'N/A';
            try {
                const data = timestamp.toDate();
                return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
            } catch(e) {
                console.warn("Erro ao formatar data, pode ser string:", timestamp, e);
                try {
                    return new Date(timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                } catch (e2) {
                    return 'Data Inválida';
                }
            }
        }
        
        function timestampParaData(timestamp) {
             if (!timestamp) return null;
             return timestamp.toDate();
        }
        
        function timestampParaDataStr(timestamp) {
            if (!timestamp) return null;
            return timestamp.toDate().toISOString().split('T')[0];
        }

        function somarUmDia(dataStr) {
            if (!dataStr) return null;
            const data = new Date(dataStr + "T12:00:00Z"); 
            data.setDate(data.getDate() + 1);
            return data.toISOString().split('T')[0];
        }

        function getIcone(nome) {
            switch (nome) {
                case 'check':
                    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.844-8.791a.75.75 0 0 0-1.188-.918l-3.026 3.998-1.406-1.405a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.15-.076l3.5-4.625Z" clip-rule="evenodd" /></svg>`;
                case 'x':
                    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm-1.03-9.53a.75.75 0 0 0-1.06 1.06L6.94 8l-1.03 1.03a.75.75 0 0 0 1.06 1.06L8 9.06l1.03 1.03a.75.75 0 1 0 1.06-1.06L9.06 8l1.03-1.03a.75.75 0 1 0-1.06-1.06L8 6.94 6.97 5.47Z" clip-rule="evenodd" /></svg>`;
                case 'warning':
                    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" /></svg>`;
                default:
                    return '';
            }
        }
        
        function mudarAbaStatus(event, statusForcado = null) {
            const status = statusForcado || event.currentTarget.dataset.status;
            if (filtroStatusAtual === status && !statusForcado) return;
            
            filtroStatusAtual = status;
            
            document.querySelectorAll('.tab-link').forEach(tab => {
                if (tab.dataset.status === status) {
                    tab.classList.add('border-blue-500', 'text-blue-600');
                    tab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
                } else {
                    tab.classList.remove('border-blue-500', 'text-blue-600');
                    tab.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
                }
            });
            
            renderPainelDemandas();
        }

        // --- Configuração de Eventos ---

        function setupEventListeners() {
            // Navegação principal
            document.getElementById('nav-painel').addEventListener('click', () => navegarPara('tela-painel'));
            document.getElementById('nav-agenda').addEventListener('click', () => navegarPara('tela-agenda'));
            document.getElementById('nav-cadastros').addEventListener('click', () => navegarPara('tela-cadastros'));
            
            // Abas do Painel
            document.querySelectorAll('.tab-link').forEach(tab => tab.addEventListener('click', mudarAbaStatus));

            // Modal: Nova Demanda
            document.getElementById('btn-nova-demanda').addEventListener('click', abrirModalDemanda);
            document.getElementById('btn-fechar-modal-demanda').addEventListener('click', fecharModalDemanda);
            document.getElementById('modal-backdrop').addEventListener('click', fecharModalDemanda);
            document.getElementById('form-nova-demanda').addEventListener('submit', salvarNovaDemanda);
            
            document.getElementById('demanda-area').addEventListener('change', (e) => {
                popularCursosPorArea(e.target.value);
            });
            
            document.querySelectorAll('input[name="tipoDemanda"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const camposGestao = document.getElementById('campos-gestao');
                    if (e.target.value === 'Coordenador') {
                        camposGestao.style.display = 'grid';
                    } else {
                        camposGestao.style.display = 'none';
                    }
                });
            });

            // Modal: Alocação, Aprovação e Detalhes
            document.getElementById('tabela-demandas-corpo').addEventListener('click', (e) => {
                if (e.target && e.target.classList.contains('btn-alocar')) {
                    abrirModalAlocacao(e.target.dataset.id);
                }
                if (e.target && e.target.classList.contains('btn-aprovar')) {
                    handleAprovarDemanda(e.target.dataset.id);
                }
                if (e.target && e.target.classList.contains('btn-detalhes')) {
                    abrirModalDetalhes(e.target.dataset.id);
                }
            });
            document.getElementById('btn-fechar-modal-alocacao').addEventListener('click', fecharModalAlocacao);
            document.getElementById('modal-backdrop-alocacao').addEventListener('click', fecharModalAlocacao);
            document.getElementById('alocacao-sugestoes').addEventListener('click', (e) => {
                 if (e.target && e.target.classList.contains('btn-confirmar-alocacao')) {
                    confirmarAlocacao(e);
                }
            });
            
            // Listeners para Modal Detalhes
            document.getElementById('btn-fechar-modal-detalhes').addEventListener('click', fecharModalDetalhes);
            document.getElementById('btn-fechar-modal-detalhes-footer').addEventListener('click', fecharModalDetalhes);
            document.getElementById('modal-backdrop-detalhes').addEventListener('click', fecharModalDetalhes);
            document.getElementById('btn-salvar-detalhes').addEventListener('click', handleSalvarDetalhes); 
            document.getElementById('btn-iniciar-curso').addEventListener('click', handleIniciarCurso); 
            document.getElementById('btn-concluir-curso').addEventListener('click', handleConcluirCurso);

            // Listeners para Cancelamento
            document.getElementById('btn-cancelar-demanda-modal').addEventListener('click', iniciarFluxoCancelamento);
            document.getElementById('btn-nao-cancelar').addEventListener('click', fecharModalCancelamento);
            document.getElementById('btn-sim-cancelar').addEventListener('click', executarCancelamento);

            // ### LISTENERS PARA CONCLUSÃO (NOVOS) ###
            document.getElementById('btn-nao-concluir').addEventListener('click', fecharModalConclusao);
            document.getElementById('btn-sim-concluir').addEventListener('click', executarConclusao);

            // ### LISTENER PARA ALERTA (NOVO) ###
            document.getElementById('btn-fechar-alerta').addEventListener('click', fecharAlerta);
            
            // Filtros da Agenda
            document.getElementById('filtro-agenda-tipo').addEventListener('change', carregarFiltrosAgenda);
            document.getElementById('filtro-agenda-selecao').addEventListener('change', atualizarEventosCalendario);
            
            // Simulador de Perfil
            document.getElementById('simular-usuario-select').addEventListener('change', (e) => {
                usuarioAtual = e.target.value;
                atualizarVisaoPorUsuario();
            });
            
            // Cadastros
            document.getElementById('form-add-docente').addEventListener('submit', (e) => {
                if (usuarioAtual !== 'Coordenador') return; 
                const form = e.target;
                handleCadastro(e, 'form-add-docente', docentesCol, [
                    { id: 'docente-nome', chave: 'nome', tipo: 'string' },
                    { id: 'docente-area', chave: 'area', tipo: 'string' },
                    { id: 'docente-subareas', chave: 'subareas', tipo: 'array' },
                    { id: 'docente-contrato', chave: 'contrato', tipo: 'string' },
                    { id: 'docente-contrato', chave: 'cargaMaxima', tipo: 'number', valor: (form.querySelector('#docente-contrato').value === 'Mensalista' ? 40 : 200) }
                ]);
            });
            
             document.getElementById('form-add-curso').addEventListener('submit', (e) => {
                if (usuarioAtual !== 'Coordenador') return;
                handleCadastro(e, 'form-add-curso', cursosCol, [
                   { id: 'curso-titulo', chave: 'titulo', tipo: 'string' },
                   { id: 'curso-area', chave: 'area', tipo: 'string' },
                   { id: 'curso-area', chave: 'subareaReq', tipo: 'string' }, 
                   { id: 'curso-ch-tecnica', chave: 'chTecnica', tipo: 'number' },
                   { id: 'curso-ch-gestao', chave: 'chGestao', tipo: 'number' },
                   { id: 'curso-recursos', chave: 'idRecursoNecessario', tipo: 'string' }
                ])
            });
            
             document.getElementById('form-add-recurso').addEventListener('submit', (e) => {
                if (usuarioAtual !== 'Coordenador') return;
                handleCadastro(e, 'form-add-recurso', recursosCol, [
                   { id: 'recurso-nome', chave: 'nome', tipo: 'string' },
                   { id: 'recurso-tipo', chave: 'tipo', tipo: 'string' }
                ])
            });
            
            document.getElementById('btn-seed-db').addEventListener('click', carregarDadosIniciais);
        }

        // --- Ponto de Entrada ---
        document.addEventListener('DOMContentLoaded', () => {
            setupEventListeners();
            inicializarApp();
        });
