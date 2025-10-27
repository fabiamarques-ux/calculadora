/* TABELAS E CONSTANTES TRIBUTÁRIAS E LEGAIS */
/* -------------------------------------------------------------------------- */
const TERCO_CONSTITUCIONAL = 1 / 3;
const DIAS_MES = 30;
const DIAS_ANO_MEDIO = 365.25;

// Salário Mínimo de Referência para Insalubridade/Teto de Benefícios
const SD_SALARIO_MINIMO = 1518.00; // Salário Mínimo de Referência para o benefício (Referência 2025)
const SALARIO_MINIMO_REF = SD_SALARIO_MINIMO;

const DIAS_ADICIONAIS_AP = 3; // 3 dias por ano completo de serviço (Lei 12.506/11)

const TABELA_IRRF = [ // limite inferior, limite superior, alíquota, dedução
    [0.00, 2428.80, 0.00, 0.00], // Isento (Ajustado para simplificação e compatibilidade)
    [2428.81, 2826.65, 0.075, 182.16],
    [2826.66, 3751.05, 0.15, 394.16],
    [3751.06, 4664.68, 0.225, 675.49],
    [4664.69, Infinity, 0.275, 908.73], // Acima
];
const TETO_INSS = 8157.41;
const TABELA_INSS = [ // limite, alíquota
    { limite: 1558.50, aliquota: 0.075 }, // Tabela Contribuição progressiva
    { limite: 2597.51, aliquota: 0.09 },
    { limite: 3896.25, aliquota: 0.12 },
    { limite: TETO_INSS, aliquota: 0.14 }
];

// NOVAS CONSTANTES - SEGURO DESEMPREGO (Tabela de Referência 2025)
const SD_TETO_MAXIMO = 2424.11; // Valor máximo da parcela
const SD_LIMITE_FAIXA_1 = 2138.76; // R$ 2.138,76
const SD_LIMITE_FAIXA_2 = 3564.96; // R$ 3.564,96
const SD_ADICAO_FAIXA_2 = 1711.01; // R$ 1.711,01

/* -------------------------------------------------------------------------- */
/* VARIÁVEIS GLOBAIS DE RESULTADO */
/* -------------------------------------------------------------------------- */
let calculosProprios = {
    // Totais
    proventosBrutos: 0.00,
    deducoes: 0.00,
    liquido: 0.00,

    // Verbas Principais
    saldoSalario: 0.00,
    avisoPrevio: 0.00,
    decimoTerceiro: 0.00,
    feriasVencidas: 0.00,
    feriasProporcionais: 0.00,

    // Verbas Adicionais Proporcionais 
    adicionalInsalubridade: 0.00,
    adicionalPericulosidade: 0.00,
    adicionalTransferencia: 0.00,
    adicionalNoturno: 0.00,
    gratificacoes: 0.00,

    // Verbas Indenizatórias/Multas 
    multaArt477: 0.00,
    multaArt479: 0.00,
    multaArt480: 0.00,
    estabilidadeIndenizacao: 0.00,

    // FGTS
    fgtsDeposito: 0.00,
    multaFgts: 0.00,
    fgtsSaldoTotal: 0.00,

    // SEGURO DESEMPREGO
    seguroDesempregoDireito: 'Não Elegível',
    seguroDesempregoParcelas: 0,
    seguroDesempregoValorParcela: 0.00,

    // Deduções Obrigatórias
    inss: 0.00,
    inss13: 0.00,
    irrf: 0.00,
    irrf13: 0.00,
    avisoPrevioDesconto: 0.00,
    // Deduções Informadas pelo Usuário 
    descontoAdiantamentoSalario: 0.00,
    descontoOutros: 0.00,
};

/* FUNÇÕES AUXILIARES E DE INPUT/CONFIGURAÇÃO */
/* -------------------------------------------------------------------------- */

function formatarMoeda(valor) {
    if (isNaN(valor) || valor === null) return 'R$ 0,00';
    return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseInput(id) {
    const element = document.getElementById(id);
    if (!element) { return 0.00; }
    // Converte vírgula para ponto se o navegador não fizer automaticamente
    return parseFloat(String(element.value).replace(',', '.')) || 0.00;
}

function parseInputInt(id) {
    const element = document.getElementById(id);
    if (!element) { return 0; }
    return parseInt(element.value) || 0;
}

function isChecked(id) {
    const element = document.getElementById(id);
    return element ? element.checked : false;
}

function handleInsalubridadeChange(checkedCheckbox) {
    const checkboxes = document.querySelectorAll('.insalubridade-checkbox');
    checkboxes.forEach(cb => {
        if (cb !== checkedCheckbox) {
            cb.checked = false;
        }
    });
}

function handleCheckboxAndInput(checkbox) {
    const inputId = checkbox.getAttribute('data-input-id');
    const containerId = checkbox.getAttribute('data-container-id');
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);

    if (input && container) {
        if (checkbox.checked) {
            container.style.display = 'block';
            // Garante que o input seja inicializado com valor diferente de zero ao marcar (se for estabilidade)
            if (checkbox.classList.contains('estabilidade-checkbox') && parseInputInt(inputId) === 0) {
                input.value = '1';
            } else if (!checkbox.classList.contains('estabilidade-checkbox') && parseInput(inputId) === 0) {
                input.value = '0.00';
            }
        } else {
            container.style.display = 'none';
            input.value = checkbox.classList.contains('estabilidade-checkbox') ? '0' : '0.00';
        }
    }
}

function toggleAccordion(header) {
    const content = header.nextElementSibling;
    const icon = header.querySelector('svg');

    // Fechar todos os outros
    document.querySelectorAll('.accordion-content').forEach(c => {
        if (c !== content) {
            c.style.maxHeight = null;
            c.classList.remove('p-4');
            c.previousElementSibling.querySelector('svg').classList.remove('rotate-180');
        }
    });

    if (content.style.maxHeight) {
        content.style.maxHeight = null;
        content.classList.remove('p-4');
        icon.classList.remove('rotate-180');
    } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        content.classList.add('p-4');
        icon.classList.add('rotate-180');
    }
}


function limparCampos() {
    // 1. Limpa todos os inputs de texto e selects
    document.querySelectorAll('input[type="text"], input[type="number"], input[type="date"], select').forEach(input => {
        // Redefine para o valor padrão se o campo não estiver vazio
        if (input.id === 'fgtsSaldoTotal') {
            input.value = '0.00';
        } else if (input.id === 'feriasVencidasNew' || input.id === 'faltasInjustificadas') {
            input.value = '0';
        } else if (input.id === 'comissoesMedia' || input.id === 'outrosAdicionais' || input.id === 'horasExtrasMedia' || input.id.startsWith('desconto') || input.id.startsWith('valor')) {
            input.value = '0.00';
        } else if (input.tagName === 'SELECT') {
            input.value = ''; // Reseta selects para o 'Selecione...'
        } else {
            input.value = '';
        }
    });

    // Reseta o input de Salário Bruto especificamente para vazio
    document.getElementById('salarioBruto').value = '';

    // 2. Limpa todos os checkboxes e oculta os campos relacionados
    document.querySelectorAll('[data-input-id]').forEach(checkbox => {
        checkbox.checked = false;
        handleCheckboxAndInput(checkbox); // Chama para ocultar o campo
    });

    // 3. Limpa os checkboxes de adicionais
    document.querySelectorAll('.insalubridade-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('periculosidade').checked = false;
    document.getElementById('transferencia').checked = false;
    document.getElementById('adicionalNoturno').checked = false;

    // 4. Chama a função de atualização de campos para redefinir o estado de AP e datas
    atualizarCampos();

    // 5. Oculta o resultado
    document.getElementById('resultadoCalculo').style.display = 'none';
    document.getElementById('resultadoCalculo').innerHTML = '';
}

/**
 * Funções auxiliar para simplificar a desabilitação/habilitação de campos do Aviso Prévio.
 */
function manipularCampoAvisoPrevio(elementId, disabled = true, defaultValue = '') {
    const el = document.getElementById(elementId);
    if (el) {
        el.disabled = disabled;

        if (disabled) {
            el.value = 'NAO';
        } else {
            el.value = defaultValue;
        }

        const container = el.closest('.input-group');
        if (container) {
            container.style.opacity = disabled ? 0.5 : 1;
        }
    }
}

/**
 * Função auxiliar para mostrar/esconder contêineres de campos.
 */
function toggleFieldDisplay(elementId, shouldShow) {
    const el = document.getElementById(elementId);
    if (el) {
        el.style.display = shouldShow ? 'block' : 'none';
    }
}


/**
 * Função que atualiza o estado dos campos de Aviso Prévio E CAMPOS DE DATA com base no Tipo de Rescisão.
 */
function atualizarCampos() {
    const tipoRescisao = document.getElementById('tipoRescisaoNew').value;

    // Define os grupos de rescisão
    const isSemJustaCausa = tipoRescisao === 'SJC' || tipoRescisao === 'ACORDO' || tipoRescisao === 'APOSENTADORIA' || tipoRescisao === 'RESCISAO_INDIRETA' || tipoRescisao === 'CULPA_RECIPROCA'; // CULPA_RECIPROCA tem AP indenizado
    const isPedidoDemissao = tipoRescisao === 'PEDIDO';
    const isContratoExperiencia = tipoRescisao === 'ANTEC_EMPREGADOR' || tipoRescisao === 'ANTEC_EMPREGADO';
    const isJustaCausa = tipoRescisao === 'CJC' || tipoRescisao === 'FALECIMENTO';

    const apIndenizadoCampo = 'avisoPrevioIndenizado';
    const apDescontadoCampo = 'avisoPrevioDescontado';

    // A. Lógica do Aviso Prévio
    if (isSemJustaCausa || tipoRescisao === 'ANTEC_EMPREGADOR') {
        // SJC, Acordo, Rescisão Indireta, Culpa Recíproca e Antecipação Empregador
        manipularCampoAvisoPrevio(apIndenizadoCampo, false, 'SIM');
        manipularCampoAvisoPrevio(apDescontadoCampo, true, 'NAO');
    } else if (isPedidoDemissao || tipoRescisao === 'ANTEC_EMPREGADO') {
        // Pedido de Demissão e Antecipação Empregado
        manipularCampoAvisoPrevio(apIndenizadoCampo, true, 'NAO');
        manipularCampoAvisoPrevio(apDescontadoCampo, false, 'SIM');
    } else {
        // Outros casos (Justa Causa, Contrato a Termo, etc.)
        manipularCampoAvisoPrevio(apIndenizadoCampo, true, 'NAO');
        manipularCampoAvisoPrevio(apDescontadoCampo, true, 'NAO');
    }

    // B. Lógica da Data de Término do Contrato de Experiência (para multas 479/480)
    toggleFieldDisplay('grupoDataTerminoContrato', isContratoExperiencia);
}

/* FUNÇÕES DE CÁLCULO DE TEMPO E DATAS */
/* -------------------------------------------------------------------------- */

// Calcula a diferença em dias corridos entre duas datas
function calcularDiasEntreDates(dataInicialStr, dataFinalStr) {
    const dataInicial = new Date(dataInicialStr + 'T00:00:00');
    const dataFinal = new Date(dataFinalStr + 'T00:00:00');

    if (isNaN(dataInicial.getTime()) || isNaN(dataFinal.getTime())) return null;

    // Calcula a diferença em milissegundos (diferença absoluta)
    const diffTime = Math.abs(dataFinal.getTime() - dataInicial.getTime());
    // Converte milissegundos para dias
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

/**
 * Calcula o total de dias de Aviso Prévio (30 + Proporcional).
 */
function getDiasAvisoPrevio(dataAdmissao, dataDemissao) {
    if (isNaN(dataAdmissao.getTime()) || isNaN(dataDemissao.getTime())) return 30;

    const diffTime = Math.abs(dataDemissao.getTime() - dataAdmissao.getTime());
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * DIAS_ANO_MEDIO);
    const anosCompletos = Math.floor(diffYears);

    let diasAvisoPrevio = 30;

    if (anosCompletos >= 1) {
        diasAvisoPrevio += (anosCompletos) * DIAS_ADICIONAIS_AP;
    }

    return Math.min(90, diasAvisoPrevio);
}

/**
 * Calcula o total de meses cheios de vínculo para SD (Lei 7.998/90).
 */
function getMesesTrabalhados(dataAdmissao, dataDemissao) {
    if (isNaN(dataAdmissao.getTime()) || isNaN(dataDemissao.getTime())) return 0;

    let mesesDiferenca = (dataDemissao.getFullYear() - dataAdmissao.getFullYear()) * 12 + (dataDemissao.getMonth() - dataAdmissao.getMonth());

    let mesesCompletos = 0;

    if (mesesDiferenca === 0) {
        const diffDays = Math.ceil((dataDemissao.getTime() - dataAdmissao.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 15) {
            mesesCompletos = 1;
        }
        return mesesCompletos;
    }

    mesesCompletos = Math.max(0, mesesDiferenca - 1);

    const diasRestantesMesAdm = 30 - dataAdmissao.getDate() + 1;
    if (diasRestantesMesAdm >= 15) {
        mesesCompletos++;
    }

    if (dataDemissao.getDate() >= 15) {
        mesesCompletos++;
    }

    return mesesCompletos;
}

/**
 * Calcula o número de avos de direito (férias ou 13º).
 * @param {Date} dataAdmissao 
 * @param {Date} dataDemissao - Data do Afastamento (sem a projeção do aviso prévio)
 * @param {number} faltasInjustificadas 
 * @param {boolean} isFerias - true para Férias, false para 13º
 * @returns {number} Número de avos (0 a 12)
 */
function calcularAvos(dataAdmissao, dataDemissao, faltasInjustificadas, isFerias) {
    if (isNaN(dataAdmissao.getTime()) || isNaN(dataDemissao.getTime())) return 0;
    
    let dataReferencia;

    // 13º: O período de contagem é sempre o Ano Civil (Jan a Dez)
    if (!isFerias) { 
        dataReferencia = new Date(dataDemissao.getFullYear(), 0, 1, 0, 0, 0, 0); // 1º de Janeiro
    } else {
        // Férias: O período de contagem é o Período Aquisitivo (aniversário da admissão)
        let anoAdmissao = dataAdmissao.getFullYear();
        let mesAdmissao = dataAdmissao.getMonth();
        let diaAdmissao = dataAdmissao.getDate();
        
        dataReferencia = new Date(dataDemissao.getFullYear(), mesAdmissao, diaAdmissao, 0, 0, 0, 0);

        // Se a data de demissão for anterior ao aniversário da admissão, volta um ano
        if (dataDemissao < dataReferencia) {
            dataReferencia.setFullYear(dataReferencia.getFullYear() - 1);
        }
    }

    // Calcula a diferença em meses
    let mesesCompletos = (dataDemissao.getFullYear() * 12 + dataDemissao.getMonth()) - 
                         (dataReferencia.getFullYear() * 12 + dataReferencia.getMonth());

    // Regra dos 15 dias: se o mês de afastamento tiver 15 ou mais dias trabalhados, conta-se como 1 avo.
    const diaDemissao = dataDemissao.getDate();
    if (diaDemissao >= 15) {
        mesesCompletos++;
    }

    let avosCalculados = Math.max(0, mesesCompletos);

    // Tratamento de Faltas para Férias Proporcionais/Vencidas
    if (isFerias) {
        if (faltasInjustificadas > 5 && faltasInjustificadas <= 14) avosCalculados = Math.floor(avosCalculados * 11 / 12);
        else if (faltasInjustificadas > 14 && faltasInjustificadas <= 23) avosCalculados = Math.floor(avosCalculados * 10 / 12);
        else if (faltasInjustificadas > 23 && faltasInjustificadas <= 32) avosCalculados = Math.floor(avosCalculados * 9 / 12);
        else if (faltasInjustificadas > 32) avosCalculados = 0; 
    }
    
    return Math.min(12, avosCalculados);
}

/**
 * Calcula a Remuneração Base (Salário Base + Médias de Variáveis)
 */
function getRemuneracaoBase(salarioBase, comissoesMedia, outrosAdicionais, horasExtrasMedia) {
    return salarioBase + comissoesMedia + outrosAdicionais + horasExtrasMedia;
}

/**
 * Calcula o valor do Adicional de Insalubridade.
 */
function calcularInsalubridade(grauInsalubridade, salarioMinimoRef) {
    if (grauInsalubridade > 0) {
        return salarioMinimoRef * grauInsalubridade;
    }
    return 0.00;
}

/**
 * Calcula a data projetada do aviso prévio indenizado.
 */
function calcularDataProjetada(dataDemissaoStr, diasAvisoPrevio) {
    const dataDemissao = new Date(dataDemissaoStr + 'T00:00:00');
    if (isNaN(dataDemissao.getTime())) return new Date(NaN);

    let dataProjetada = new Date(dataDemissao.getTime());
    dataProjetada.setDate(dataDemissao.getDate() + diasAvisoPrevio);
    return dataProjetada;
}


/* FUNÇÕES ESSENCIAIS DE CÁLCULO DE IMPOSTOS E SEGURO-DESEMPREGO */
/* -------------------------------------------------------------------------- */

function calcularInss(base) {
    if (base <= 0) return 0.0;
    let inss = 0.0;
    let baseCalculada = Math.min(base, TETO_INSS);

    const faixas = TABELA_INSS;
    let baseAnterior = 0.0;

    for (const faixa of faixas) {
        if (baseCalculada > baseAnterior) {
            const limiteFaixa = Math.min(baseCalculada, faixa.limite);
            const valorNaFaixa = limiteFaixa - baseAnterior;

            inss += valorNaFaixa * faixa.aliquota;
            baseAnterior = faixa.limite;
        } else {
            break;
        }
    }
    return parseFloat(inss.toFixed(2));
}

function calcularIrrf(base, numDependentes = 0) {
    if (base <= 0) return 0.0;

    const DEDUCAO_DEPENDENTE = 189.59;
    // INSS é deduzido da base do IRRF.
    const inssMes = calcularInss(base); 
    const deducaoDependentesTotal = numDependentes * DEDUCAO_DEPENDENTE;
    const baseIrrf = base - inssMes - deducaoDependentesTotal;

    if (baseIrrf <= 0) return 0.0;

    for (const [limiteInferior, limiteSuperior, aliquota, deducao] of TABELA_IRRF) {
        if (baseIrrf >= limiteInferior && (baseIrrf <= limiteSuperior || limiteSuperior === Infinity)) {
            const irrf = (baseIrrf * aliquota) - deducao;
            return parseFloat(Math.max(0, irrf).toFixed(2));
        }
    }
    return 0.0;
}

function calcularSeguroDesemprego(tipoRescisao, salarioMedio, mesesTrabalhados) {
    const resultado = { direito: 'Não Elegível', parcelas: 0, valorParcela: 0.00, };

    // Critério básico de elegibilidade para simulação
    if (!['SJC', 'RESCISAO_INDIRETA', 'ANTEC_EMPREGADOR'].includes(tipoRescisao)) {
        // CULPA_RECIPROCA não dá direito ao SD
        return resultado;
    }

    if (mesesTrabalhados < 12) {
        resultado.direito = 'Não Elegível (Mínimo de 12 meses de vínculo não atingido - Simulação 1ª solicitação)';
        return resultado;
    }

    resultado.direito = 'Elegível (Simulação - 1ª Solicitação)';

    // Determinação do número de parcelas (simplificado para 1ª solicitação)
    if (mesesTrabalhados >= 24) {
        resultado.parcelas = 5;
    } else if (mesesTrabalhados >= 12) {
        resultado.parcelas = 4;
    }

    // Cálculo do valor da parcela
    let valorParcela;
    if (salarioMedio <= SD_LIMITE_FAIXA_1) {
        valorParcela = salarioMedio * 0.8;
    } else if (salarioMedio <= SD_LIMITE_FAIXA_2) {
        const excedente = salarioMedio - SD_LIMITE_FAIXA_1;
        valorParcela = (excedente * 0.5) + SD_ADICAO_FAIXA_2;
    } else {
        valorParcela = SD_TETO_MAXIMO;
    }

    // Aplica o piso (SM) e o teto (SD_TETO_MAXIMO)
    valorParcela = Math.max(SD_SALARIO_MINIMO, Math.min(valorParcela, SD_TETO_MAXIMO));
    resultado.valorParcela = parseFloat(valorParcela.toFixed(2));
    return resultado;
}


/* FUNÇÃO PRINCIPAL: CALCULAR RESCISÃO (CORRIGIDA) */
/* -------------------------------------------------------------------------- */
function calcularRescisao() {
    // 1. Limpa o resultado anterior
    Object.keys(calculosProprios).forEach(key => {
        if (typeof calculosProprios[key] === 'number') {
            calculosProprios[key] = 0.00;
        }
    });
    calculosProprios.seguroDesempregoDireito = 'Não Elegível';

    // 2. Obter Dados de Entrada
    const tipoRescisao = document.getElementById('tipoRescisaoNew').value;
    const avisoPrevioIndenizado = document.getElementById('avisoPrevioIndenizado').value;
    const avisoPrevioDescontado = document.getElementById('avisoPrevioDescontado').value;
    const dataAdmissaoStr = document.getElementById('dataAdmissao').value;
    const dataDemissaoStr = document.getElementById('dataDemissao').value;
    const dataPagamentoStr = document.getElementById('dataPagamento').value;
    const dataTerminoContratoStr = document.getElementById('grupoDataTerminoContrato').style.display !== 'none' ? document.getElementById('dataTerminoContrato').value : null;

    if (!dataAdmissaoStr || !dataDemissaoStr || !tipoRescisao || !parseInput('salarioBruto')) {
        document.getElementById('resultadoCalculo').innerHTML = '<p class="text-red-600 font-bold p-4">Por favor, preencha as datas e o salário base para calcular.</p>';
        document.getElementById('resultadoCalculo').style.display = 'block';
        return;
    }

    const dataAdmissao = new Date(dataAdmissaoStr + 'T00:00:00');
    const dataDemissao = new Date(dataDemissaoStr + 'T00:00:00');
    const dataPagamento = dataPagamentoStr ? new Date(dataPagamentoStr + 'T00:00:00') : null; // Mantido como null se não preenchido
    const dataTerminoContrato = dataTerminoContratoStr ? new Date(dataTerminoContratoStr + 'T00:00:00') : new Date(NaN);

    const salarioBase = parseInput('salarioBruto');
    const comissoesMedia = parseInput('comissoesMedia');
    const outrosAdicionais = parseInput('outrosAdicionais');
    const horasExtrasMedia = parseInput('horasExtrasMedia');
    const faltasInjustificadas = parseInputInt('faltasInjustificadas');
    const feriasVencidasQtd = parseInputInt('feriasVencidasNew');
    const fgtsSaldoTotal = parseInput('fgtsSaldoTotal');
    const numDependentes = parseInputInt('numDependentes');

    // Deduções Informadas
    calculosProprios.descontoAdiantamentoSalario = parseInput('descontoAdiantamentoSalario');
    calculosProprios.descontoOutros = parseInput('descontoOutros');

    // Estabilidade (Dias a indenizar)
    let diasEstabilidadeIndenizar = 0;
    document.querySelectorAll('.estabilidade-checkbox').forEach(checkbox => {
        if (checkbox.checked) {
            diasEstabilidadeIndenizar += parseInputInt(checkbox.getAttribute('data-input-id')) * DIAS_MES; // Multiplica por 30 dias/mês
        }
    });

    // Adicionais Percentuais
    let grauInsalubridade = 0.0;
    document.querySelectorAll('.insalubridade-checkbox').forEach(cb => {
        if (cb.checked) {
            grauInsalubridade = parseFloat(cb.value);
        }
    });
    const temPericulosidade = isChecked('periculosidade');

    // 3. REMUNERAÇÃO BASE e VARIÁVEIS DE TEMPO
    const remuneracaoBase = getRemuneracaoBase(salarioBase, comissoesMedia, outrosAdicionais, horasExtrasMedia);
    const diasTrabalhadosMes = dataDemissao.getDate(); // Saldo de Salário é pelos dias trabalhados no mês da demissão

    const avos13 = calcularAvos(dataAdmissao, dataDemissao, 0, false); // Faltas não afetam avos 13º diretamente
    const avosFeriasProp = calcularAvos(dataAdmissao, dataDemissao, faltasInjustificadas, true);

    const diasAvisoPrevioTotal = getDiasAvisoPrevio(dataAdmissao, dataDemissao);
    // A data projetada é usada para a contagem de tempo (ex: 13º e Férias em caso de AP indenizado).
    const dataProjetada = calcularDataProjetada(dataDemissaoStr, diasAvisoPrevioTotal); 

    // 4. CÁLCULO DAS VERBAS (Proventos)

    // Saldo de Salário
    calculosProprios.saldoSalario = (remuneracaoBase / DIAS_MES) * diasTrabalhadosMes;

    // Adicionais Mensais Proporcionais (Base é o Salário Base)
    let adicionaisMensais = 0.0;
    if (grauInsalubridade > 0) {
        const valInsalubridadeMensal = calcularInsalubridade(grauInsalubridade, SALARIO_MINIMO_REF);
        calculosProprios.adicionalInsalubridade = (valInsalubridadeMensal / DIAS_MES) * diasTrabalhadosMes;
        adicionaisMensais += calculosProprios.adicionalInsalubridade;
    }
    if (temPericulosidade) {
        const valPericulosidadeMensal = salarioBase * 0.30;
        calculosProprios.adicionalPericulosidade = (valPericulosidadeMensal / DIAS_MES) * diasTrabalhadosMes;
        adicionaisMensais += calculosProprios.adicionalPericulosidade;
    }
    
    // Base para cálculo de AP/13º/Férias
    const baseParaProporcionais = remuneracaoBase 
        + (grauInsalubridade > 0 ? calcularInsalubridade(grauInsalubridade, SALARIO_MINIMO_REF) : 0.0)
        + (temPericulosidade ? salarioBase * 0.30 : 0.0); // Soma os adicionais MENSAIS


    // Aviso Prévio
    if (avisoPrevioIndenizado === 'SIM' && tipoRescisao === 'ACORDO') {
        // Aviso Prévio Indenizado por Acordo (50% dos 30 dias iniciais - Sem Proporcional da Lei 12.506/11)
        calculosProprios.avisoPrevio = (baseParaProporcionais / DIAS_MES) * 30 * 0.5;
    } else if (avisoPrevioIndenizado === 'SIM' && tipoRescisao === 'CULPA_RECIPROCA') {
        // *** ALTERAÇÃO 1: Culpa Recíproca - 50% do total de dias de AP (incluindo proporcional) ***
        calculosProprios.avisoPrevio = (baseParaProporcionais / DIAS_MES) * diasAvisoPrevioTotal * 0.5;
    } else if (avisoPrevioIndenizado === 'SIM') {
        // Aviso Prévio Indenizado Integral (SJC, Rescisão Indireta, Antecipação Empregador)
        calculosProprios.avisoPrevio = (baseParaProporcionais / DIAS_MES) * diasAvisoPrevioTotal;
    } else if (avisoPrevioDescontado === 'SIM') {
        // Desconto de Aviso Prévio (Pedido de Demissão, Antecipação Empregado)
        calculosProprios.avisoPrevioDesconto = -(baseParaProporcionais / DIAS_MES) * 30; // Desconta 30 dias de salário
    }


    // 13º Salário Proporcional
    const avos13ComProjecao = (avisoPrevioIndenizado === 'SIM') ? calcularAvos(dataAdmissao, dataProjetada, 0, false) : avos13;

    if (['CJC', 'ANTEC_EMPREGADO', 'PEDIDO', 'FALECIMENTO'].includes(tipoRescisao)) {
        // CJC, Pedido, Antecipação Empregado, Falecimento: Recebe APENAS os avos devidos até a data de demissão (sem projeção)
        calculosProprios.decimoTerceiro = (baseParaProporcionais / 12) * avos13;
    } else if (tipoRescisao === 'ACORDO') {
        // Acordo: Recebe 50% dos avos (com projeção)
        calculosProprios.decimoTerceiro = (baseParaProporcionais / 12) * avos13ComProjecao * 0.5;
    } else if (tipoRescisao === 'CULPA_RECIPROCA') {
         // *** ALTERAÇÃO 2: Culpa Recíproca - 50% dos avos (com projeção) ***
        calculosProprios.decimoTerceiro = (baseParaProporcionais / 12) * avos13ComProjecao * 0.5;
    } else {
        // SJC, Rescisão Indireta, Antecipação Empregador, etc.: Recebe integral (com projeção)
        calculosProprios.decimoTerceiro = (baseParaProporcionais / 12) * avos13ComProjecao;
    }


    // Férias Vencidas + 1/3 (Faltas afetam o valor base)
    const feriasBaseMensal = baseParaProporcionais;
    let feriasVencidasBruto = feriasBaseMensal * feriasVencidasQtd;
    // Em culpa recíproca, apenas as férias proporcionais são reduzidas. As férias vencidas devem ser integrais.
    calculosProprios.feriasVencidas = feriasVencidasBruto * (1 + TERCO_CONSTITUCIONAL);

    // Férias Proporcionais + 1/3
    // A projeção do AP só interfere se cair em um novo avo. Vamos usar a projeção na função calcularAvos.
    const avosFeriasPropComProjecao = (avisoPrevioIndenizado === 'SIM') ? calcularAvos(dataAdmissao, dataProjetada, faltasInjustificadas, true) : avosFeriasProp;
    let feriasPropBruto = (feriasBaseMensal / 12) * avosFeriasPropComProjecao;
    
    if (tipoRescisao === 'CULPA_RECIPROCA') {
        // *** ALTERAÇÃO 3: Culpa Recíproca - 50% das férias proporcionais + 1/3 ***
        calculosProprios.feriasProporcionais = feriasPropBruto * 0.5 * (1 + TERCO_CONSTITUCIONAL);
    } else {
        calculosProprios.feriasProporcionais = feriasPropBruto * (1 + TERCO_CONSTITUCIONAL);
    }


    // Multa do Contrato de Experiência (Antecipação)
    if (tipoRescisao === 'ANTEC_EMPREGADOR' && dataTerminoContrato.getTime()) {
        const diasRestantes = calcularDiasEntreDates(dataDemissaoStr, dataTerminoContratoStr);
        if (diasRestantes > 0) {
            calculosProprios.multaArt479 = (baseParaProporcionais / DIAS_MES) * diasRestantes * 0.5;
        }
    } else if (tipoRescisao === 'ANTEC_EMPREGADO' && dataTerminoContrato.getTime()) {
        const diasRestantes = calcularDiasEntreDates(dataDemissaoStr, dataTerminoContratoStr);
        if (diasRestantes > 0) {
            // Multa 480: Desconto limitado aos prejuízos comprovados, simplificando: 50% dos dias restantes.
            calculosProprios.multaArt480 = -(baseParaProporcionais / DIAS_MES) * diasRestantes * 0.5;
        }
    }


    // Indenização por Estabilidade
    if (diasEstabilidadeIndenizar > 0) {
        calculosProprios.estabilidadeIndenizacao = (baseParaProporcionais / DIAS_MES) * diasEstabilidadeIndenizar;
    }


    // Multa do Art. 477 (Atraso no Pagamento da Rescisão) - CORRIGIDO
    // Rescisões que geram verbas rescisórias: Quase todas, exceto Falecimento do Empregado.
    const isRescisaoComVerbasDevidas = !['CJC', 'FALECIMENTO'].includes(tipoRescisao); // J. Causa e Falecimento não costumam ter atraso de verbas para gerar multa 477.
    
    if (dataPagamento && isRescisaoComVerbasDevidas) {
        // Data a ser considerada para o prazo é a do fim do contrato (projetada pelo AP, se indenizado)
        // Devemos usar a data mais distante entre a Demissão e a Projeção (se indenizado)
        const dataFimContrato = avisoPrevioIndenizado === 'SIM' ? dataProjetada : dataDemissao;

        // Prazo de pagamento: 10 dias corridos após o término do contrato
        let dataLimitePagamento = new Date(dataFimContrato.getTime());
        dataLimitePagamento.setDate(dataFimContrato.getDate() + 10);

        // Zera as horas para comparação correta
        dataPagamento.setHours(0, 0, 0, 0);
        dataLimitePagamento.setHours(0, 0, 0, 0);
        
        // A multa é devida se a data de pagamento for estritamente MAIOR que a data limite de pagamento
        if (dataPagamento.getTime() > dataLimitePagamento.getTime()) {
            calculosProprios.multaArt477 = remuneracaoBase; // Multa no valor de 1 salário
        }
    }


    // 5. CÁLCULO DO FGTS
    // Base: Saldo de Salário + 13º + AP Indenizado. Férias são base, mas o recolhimento é mensal.
    const fgtsBaseMensal = calculosProprios.saldoSalario + adicionaisMensais;
    const fgtsBase13 = calculosProprios.decimoTerceiro;
    const fgtsBaseAP = avisoPrevioIndenizado === 'SIM' ? calculosProprios.avisoPrevio : 0.0;

    calculosProprios.fgtsDeposito = (fgtsBaseMensal + fgtsBase13 + fgtsBaseAP) * 0.08;

    const isFGTSMultaDevida = ['SJC', 'RESCISAO_INDIRETA', 'CULPA_RECIPROCA', 'ANTEC_EMPREGADOR'].includes(tipoRescisao);
    if (isFGTSMultaDevida && fgtsSaldoTotal > 0) {
        let percentualMulta = 0.40; // 40% (SJC, Rescisão Indireta, Antecipação Empregador)
        if (tipoRescisao === 'ACORDO' || tipoRescisao === 'CULPA_RECIPROCA') {
            percentualMulta = 0.20; // 20% (Acordo ou Culpa Recíproca)
        }

        calculosProprios.multaFgts = fgtsSaldoTotal * percentualMulta;
    }

    // 6. CÁLCULO DE DEDUÇÕES

    // INSS sobre Verbas do Mês (Saldo de Salário + Adicionais Proporcionais + Aviso Prévio Trabalhado)
    const baseInssMensal = calculosProprios.saldoSalario + adicionaisMensais + (avisoPrevioIndenizado === 'NAO' && avisoPrevioDescontado === 'NAO' ? (baseParaProporcionais / DIAS_MES) * 30 : 0.0);
    calculosProprios.inss = calcularInss(baseInssMensal);

    // INSS sobre 13º Salário
    const baseInss13 = calculosProprios.decimoTerceiro;
    if (baseInss13 > 0) {
        calculosProprios.inss13 = calcularInss(baseInss13);
    }

    // IRRF (Base: Proventos tributáveis - INSS mensal - Desconto Dependentes)
    // Férias, Indenização Estabilidade, Multa 477/FGTS não são base de IRRF.
    const proventosTributaveis = calculosProprios.saldoSalario + adicionaisMensais + calculosProprios.avisoPrevio; // AP Indenizado é tributável.
    // O cálculo do IRRF já desconta o INSS e dependentes.
    calculosProprios.irrf = calcularIrrf(proventosTributaveis, numDependentes);

    // IRRF sobre 13º Salário
    const baseIrrf13 = calculosProprios.decimoTerceiro;
    if (baseIrrf13 > 0) {
        // O cálculo do IRRF para 13º já descontará o INSS do 13º.
        calculosProprios.irrf13 = calcularIrrf(baseIrrf13, numDependentes);
    }


    // 7. CÁLCULO DO SEGURO-DESEMPREGO (Apenas simulação)
    const salarioMedioSD = remuneracaoBase; // Simplificação: usa a remuneração base
    const mesesVinculoSD = getMesesTrabalhados(dataAdmissao, dataDemissao);
    const resultadoSD = calcularSeguroDesemprego(tipoRescisao, salarioMedioSD, mesesVinculoSD);

    calculosProprios.seguroDesempregoDireito = resultadoSD.direito;
    calculosProprios.seguroDesempregoParcelas = resultadoSD.parcelas;
    calculosProprios.seguroDesempregoValorParcela = resultadoSD.valorParcela;

    // 8. TOTAIS
    const proventos = calculosProprios.saldoSalario + calculosProprios.avisoPrevio + calculosProprios.decimoTerceiro + calculosProprios.feriasVencidas + calculosProprios.feriasProporcionais + calculosProprios.adicionalInsalubridade + calculosProprios.adicionalPericulosidade + calculosProprios.multaArt477 + calculosProprios.multaFgts + calculosProprios.estabilidadeIndenizacao;

    const deducoes = calculosProprios.inss + calculosProprios.inss13 + calculosProprios.irrf + calculosProprios.irrf13 + (-calculosProprios.avisoPrevioDesconto) + (-calculosProprios.multaArt480) + calculosProprios.descontoAdiantamentoSalario + calculosProprios.descontoOutros;

    calculosProprios.proventosBrutos = proventos;
    calculosProprios.deducoes = deducoes;
    calculosProprios.liquido = proventos - deducoes;

    // 9. Geração das Rubricas para o Relatório
    const rubricas = [
        { nome: 'Saldo de Salário (' + diasTrabalhadosMes + ' dias)', valor: calculosProprios.saldoSalario, tipo: 'P' },
        { nome: 'Aviso Prévio Indenizado (' + diasAvisoPrevioTotal + ' dias)' + (tipoRescisao === 'CULPA_RECIPROCA' ? ' (50%)' : ''), valor: calculosProprios.avisoPrevio, tipo: 'P' },
        { nome: '13º Salário Proporcional (' + avos13ComProjecao + '/12 avos)' + (tipoRescisao === 'CULPA_RECIPROCA' ? ' (50%)' : ''), valor: calculosProprios.decimoTerceiro, tipo: 'P' },
        { nome: 'Férias Vencidas (' + feriasVencidasQtd + ' períodos) + 1/3', valor: calculosProprios.feriasVencidas, tipo: 'P' },
        { nome: 'Férias Proporcionais (' + avosFeriasPropComProjecao + '/12 avos) + 1/3' + (tipoRescisao === 'CULPA_RECIPROCA' ? ' (50%)' : ''), valor: calculosProprios.feriasProporcionais, tipo: 'P' },

        { nome: 'Adicional de Insalubridade Proporcional', valor: calculosProprios.adicionalInsalubridade, tipo: 'P' },
        { nome: 'Adicional de Periculosidade Proporcional', valor: calculosProprios.adicionalPericulosidade, tipo: 'P' },
        { nome: 'Indenização por Estabilidade (' + (diasEstabilidadeIndenizar / DIAS_MES) + ' meses)', valor: calculosProprios.estabilidadeIndenizacao, tipo: 'P' },

        { nome: 'Multa do Art. 477 (Atraso Pagamento)', valor: calculosProprios.multaArt477, tipo: 'P' },
        { nome: 'Multa do Art. 479 (Contrato a Termo - Empregador)', valor: calculosProprios.multaArt479, tipo: 'P' },
       
        { nome: '--- DEDUÇÕES OBRIGATÓRIAS ---', valor: 0.00, tipo: 'S' },
        { nome: 'INSS (Verbas Mensais)', valor: calculosProprios.inss, tipo: 'D' },
        { nome: 'INSS (13º Salário)', valor: calculosProprios.inss13, tipo: 'D' },
        { nome: 'IRRF (Verbas Mensais)', valor: calculosProprios.irrf, tipo: 'D' },
        { nome: 'IRRF (13º Salário)', valor: calculosProprios.irrf13, tipo: 'D' },

        { nome: '--- DESCONTOS E MULTAS DO EMPREGADO ---', valor: 0.00, tipo: 'S' },
        { nome: 'Aviso Prévio Descontado', valor: -calculosProprios.avisoPrevioDesconto, tipo: 'D' },
        { nome: 'Multa do Art. 480 (Contrato a Termo - Empregado)', valor: -calculosProprios.multaArt480, tipo: 'D' },
        { nome: 'Adiantamento Salarial', valor: calculosProprios.descontoAdiantamentoSalario, tipo: 'D' },
        { nome: 'Outros Descontos Informados', valor: calculosProprios.descontoOutros, tipo: 'D' },
        
        { nome: '--- INFORMAÇÕES ADICIONAIS ---', valor: 0.00, tipo: 'S' },
        // CORREÇÃO: Exibição do FGTS e Multa
        { nome: 'FGTS (Base Saldo Total)', valor: 0.00, info: formatarMoeda(fgtsSaldoTotal), tipo: 'INFO' },
        { nome: 'Multa do FGTS (' + (calculosProprios.multaFgts > 0 ? (tipoRescisao === 'ACORDO' || tipoRescisao === 'CULPA_RECIPROCA' ? '20%' : '40%') : 'N/A') + ')', valor: 0.00, info: formatarMoeda(calculosProprios.multaFgts), tipo: 'INFO' },
        { nome: 'Depósito FGTS sobre Verbas Rescisórias', valor: 0.00, info: formatarMoeda(calculosProprios.fgtsDeposito), tipo: 'INFO' },
        { nome: 'Seguro Desemprego (Elegibilidade)', valor: 0.00, info: calculosProprios.seguroDesempregoDireito + (calculosProprios.seguroDesempregoParcelas > 0 ? ` - ${resultadoSD.parcelas} parcelas de ${formatarMoeda(resultadoSD.valorParcela)}` : ''), tipo: 'INFO' }
    ].filter(r => r.valor > 0.0001 || r.tipo === 'S' || r.tipo === 'INFO'); 

    exibirRelatorioRescisao(rubricas);

    return { rubricas, totais: calculosProprios };
}

/**
 * Gera a tabela HTML dos resultados da rescisão.
 */
function exibirRelatorioRescisao(rubricas) {
    const resultadoDiv = document.getElementById('resultadoCalculo');
    let html = '';

    // Filtra e soma proventos e deduções
    const proventos = rubricas.filter(r => r.tipo === 'P').reduce((sum, r) => sum + r.valor, 0);
    const deducoes = rubricas.filter(r => r.tipo === 'D').reduce((sum, r) => sum + r.valor, 0);
    const liquido = proventos - deducoes;

    html += `
        <h3 class="text-2xl font-bold text-gray-800 mb-4 section-header">Resultado da Simulação</h3>
        <div class="mb-6">
            <h4 class="text-lg font-semibold text-[#007380] mb-2">Resumo Financeiro</h4>
            <div class="flex flex-col md:flex-row gap-4">
                <div class="flex-1 p-4 bg-green-50 rounded-lg total bruto shadow-sm">
                    <p class="text-sm text-gray-600">Total de Proventos Brutos:</p>
                    <p class="text-2xl font-bold text-green-700">${formatarMoeda(proventos)}</p>
                </div>
                <div class="flex-1 p-4 bg-red-50 rounded-lg total shadow-sm">
                    <p class="text-sm text-gray-600">Total de Deduções e Descontos:</p>
                    <p class="text-2xl font-bold text-red-700">${formatarMoeda(deducoes)}</p>
                </div>
                <div class="flex-1 p-4 bg-blue-50 rounded-lg total liquido shadow-md border-2 border-blue-200">
                    <p class="text-sm text-gray-600">Valor Líquido a Receber (Estimado):</p>
                    <p class="text-3xl font-extrabold text-blue-700">${formatarMoeda(liquido)}</p>
                </div>
            </div>
        </div>

        <div class="mb-6">
            <h4 class="text-lg font-semibold text-[#007380] mb-2">Detalhamento das Rubricas</h4>
            <div class="overflow-x-auto shadow-lg rounded-lg border border-gray-200">
                <table class="min-w-full bg-white text-sm">
                    <thead>
                        <tr class="bg-gray-100 border-b border-gray-300">
                            <th class="px-4 py-2 text-left font-semibold text-gray-600 w-2/3">Rubrica</th>
                            <th class="px-4 py-2 text-right font-semibold text-gray-600 w-1/3">Valor (R$)</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    rubricas.forEach(r => {
        if (r.tipo === 'S') {
            html += `<tr class="bg-gray-200"><td colspan="2" class="px-4 py-2 font-bold text-sm text-gray-700">${r.nome}</td></tr>`;
        } else if (r.tipo === 'INFO') {
            html += `<tr class="bg-yellow-50"><td class="px-4 py-2 text-gray-600">${r.nome}</td><td class="px-4 py-2 text-right text-sm text-gray-600">${r.info}</td></tr>`;
        } else {
            const isDeducao = r.tipo === 'D';
            const valorFormatado = formatarMoeda(r.valor);
            const corValor = isDeducao ? 'text-red-600' : 'text-green-600';
            const valorDisplay = isDeducao ? `(- ${valorFormatado})` : valorFormatado;

            html += `
                <tr class="hover:bg-gray-50 border-t">
                    <td class="px-4 py-2">${r.nome}</td>
                    <td class="px-4 py-2 text-right font-medium ${corValor}">${valorDisplay}</td>
                </tr>
            `;
        }
    });

    html += `
                    </tbody>
                </table>
            </div>
        </div>
        `;

    // Rodapé com botões e informações
    html += `<div class="flex justify-center gap-4 mt-8 print:hidden">`;
    html += `<button onclick="window.print()" class="bg-[#007380] text-white px-8 py-3 rounded-lg shadow-md hover:bg-[#005a62] transition duration-150 ease-in-out font-semibold">
                <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2h-2m-4-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m0 0v1a2 2 0 002 2h2a2 2 0 002-2v-1m-8 0H4"></path></svg>
                Imprimir Relatório
            </button>`;
    html += `<button onclick="limparCampos()" class="bg-red-500 text-white px-8 py-3 rounded-lg shadow-md hover:bg-red-600 transition duration-150 ease-in-out font-semibold">
                <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.871A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.129L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                Novo Cálculo
            </button>`;
    html += '</div>';

    resultadoDiv.innerHTML = html;
    resultadoDiv.style.display = 'block';
    resultadoDiv.scrollIntoView({ behavior: 'smooth' });
}


/* INICIALIZAÇÃO */
/* -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {
    // Inicializa os accordions
    document.querySelectorAll('.accordion-header').forEach(button => {
        button.addEventListener('click', () => toggleAccordion(button));
    });

    // Anexa a função de cálculo ao botão.
    const btnCalcular = document.getElementById('btnCalcular');
    if (btnCalcular) {
        btnCalcular.addEventListener('click', calcularRescisao);
    }

    // Adiciona listeners para os checkboxes de estabilidade/desconto
    document.querySelectorAll('[data-input-id]').forEach(checkbox => {
        checkbox.addEventListener('change', () => handleCheckboxAndInput(checkbox));
    });

    // Inicializa o estado dos campos (Aviso Prévio e Datas)
    atualizarCampos();
});