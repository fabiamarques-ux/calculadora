//==============================================================================
// A. TABELAS E CONSTANTES LEGAIS
//==============================================================================
const TERCO_CONSTITUCIONAL = 1 / 3;
const DIAS_MES = 30;
const DIAS_ANO_MEDIO = 365.25;

// Salário Mínimo de Referência para Insalubridade/Teto de Benefícios (Referência 2025)
const SD_SALARIO_MINIMO = 1518.00;
const SALARIO_MINIMO_REF = SD_SALARIO_MINIMO;

const DIAS_ADICIONAIS_AP = 3; // 3 dias por ano completo de serviço (Lei 12.506/11)

// Tabela IRRF (limite inferior, limite superior, alíquota, dedução)
const TABELA_IRRF = [
    [0.00, 2428.80, 0.00, 0.00], // Isento
    [2428.81, 2826.65, 0.075, 182.16],
    [2826.66, 3751.05, 0.15, 394.16],
    [3751.06, 4664.68, 0.225, 675.49],
    [4664.69, Infinity, 0.275, 908.73],
];

// Tabela INSS Contribuição progressiva
const TETO_INSS = 8157.41;
const TABELA_INSS = [
    { limite: 1558.50, aliquota: 0.075 },
    { limite: 2597.51, aliquota: 0.09 },
    { limite: 3896.25, aliquota: 0.12 },
    { limite: TETO_INSS, aliquota: 0.14 }
];

// Constantes Seguro Desemprego (Tabela de Referência 2025)
const SD_TETO_MAXIMO = 2424.11;
const SD_LIMITE_FAIXA_1 = 2138.76;
const SD_ADICAO_FAIXA_2_CALC = 1711.01;

//==============================================================================
// B. VARIÁVEIS GLOBAIS DE RESULTADO
//==============================================================================
let calculosProprios = {
    // Totais Financeiros
    proventosBrutos: 0.00,
    deducoes: 0.00,
    liquido: 0.00,

    // Verbas Principais
    saldoSalario: 0.00,
    avisoPrevio: 0.00, // Provento (Indenizado)
    avisoPrevioDesconto: 0.00, // Desconto (Não Cumprido)
    decimoTerceiro: 0.00,
    feriasVencidas: 0.00,
    feriasProporcionais: 0.00,

    // Adicionais e Multas
    adicionalInsalubridade: 0.00,
    adicionalPericulosidade: 0.00,
    adicionalTransferencia: 0.00,
    adicionalNoturno: 0.00,
    multaArt477: 0.00,
    multaArt479: 0.00,
    multaArt480: 0.00,
    estabilidadeIndenizacao: 0.00,

    // GRATIFICAÇÕES ADICIONADAS 
    gratificacaoFuncao: 0.00,
    gratificacaoTempoServico: 0.00,
    gratificacaoProdutividade: 0.00,
    gratificacaoAssiduidade: 0.00,
    gratificacaoQuebraCaixa: 0.00,
    gorjetasMedia: 0.00,

    // FGTS e Saque
    fgtsDeposito: 0.00,
    multaFgts: 0.00,
    fgtsTotalEstimado: 0.00,
    fgtsTotalReceber: 0.00,
    saqueFgtsElegivel: false,

    // Seguro Desemprego
    seguroDesempregoParcelas: 0,
    seguroDesempregoValorParcela: 0.00,
    seguroDesempregoElegivel: false,

    // Deduções Tributárias e Informadas
    inss: 0.00,
    inss13: 0.00,
    irrf: 0.00,
    irrf13: 0.00,
    descontoAdiantamentoSalario: 0.00,
    descontoOutros: 0.00,

    // Data Limite Legal
    dataLimiteAcaoTrabalhista: null,
};


//==============================================================================
// C. FUNÇÕES AUXILIARES DE FORMATAÇÃO E INPUT
//==============================================================================

/** Formata um valor numérico para moeda brasileira (R$). */
function formatarMoeda(valor, incluirSimbolo = true) {
    if (isNaN(valor) || valor === null) return '0,00'; // Retorna apenas o valor formatado como decimal
    if (incluirSimbolo) {
        return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } else {
        return parseFloat(valor).toLocaleString('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}

/** Formata um objeto Date para exibição em português. */
function formatarData(data) {
    if (!data) return 'N/A';
    const d = new Date(data);
    if (isNaN(d.getTime())) return 'N/A';
    // Adiciona 1 dia para evitar problemas de fuso horário no dia da prescrição
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Formata o input do usuário para o padrão de moeda brasileira (ex: 1.234,56) */
function formatarInputComoMoeda(input) {
    let valor = input.value.replace(/\D/g, ''); // Remove tudo que não for dígito
    if (valor === '') {
        input.value = '';
        return;
    }
    // Converte para número, divide por 100 e formata
    valor = (parseFloat(valor) / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    if (valor === 'NaN') {
        input.value = '';
    } else {
        input.value = valor;
    }
}

/** Converte o valor de um input monetário (string formatada) para float. */
function parseInput(id) {
    const element = document.getElementById(id);
    if (!element || element.value.trim() === '') return 0.00;
    // Remove separadores de milhar e substitui a vírgula decimal por ponto
    const valorLimpo = element.value.replace(/\./g, '').replace(',', '.');
    return parseFloat(valorLimpo) || 0.00;
}


/** Converte o valor de um input (string) para inteiro. */
function parseInputInt(id) {
    const element = document.getElementById(id);
    if (!element) return 0;
    return parseInt(element.value) || 0;
}

/** Verifica se um checkbox está marcado. */
function isChecked(id) {
    const element = document.getElementById(id);
    return element ? element.checked : false;
}


//==============================================================================
// D. FUNÇÕES DE MANIPULAÇÃO DO FORMULÁRIO
//==============================================================================

function toggleAccordion(header) {
    const content = header.nextElementSibling;
    const icon = header.querySelector('svg');

    // Fechar todos os outros accordions
    document.querySelectorAll('.accordion-content').forEach(c => {
        if (c !== content) {
            c.style.maxHeight = null;
            c.classList.remove('p-4');
            if (c.previousElementSibling.querySelector('svg')) {
                c.previousElementSibling.querySelector('svg').classList.remove('rotate-180');
            }
        }
    });

    // Abrir ou fechar o accordion atual
    if (content.style.maxHeight) {
        content.style.maxHeight = null;
        content.classList.remove('p-4');
        icon.classList.remove('rotate-180');
    } else {
        content.classList.add('p-4');
        icon.classList.add('rotate-180');
        // Força o navegador a recalcular o layout antes de obter o scrollHeight
        // para garantir que a altura do padding seja incluída.
        requestAnimationFrame(() => {
            content.style.maxHeight = content.scrollHeight + 'px';
        });
    }
}

/** Atualiza a altura do accordion que estiver aberto para acomodar novo conteúdo. */
function atualizarAlturaAccordionAberto() {
    const openAccordionContent = document.querySelector('.accordion-content[style*="max-height"]');
    if (openAccordionContent && openAccordionContent.style.maxHeight) {
        // Usamos requestAnimationFrame para garantir que o DOM foi atualizado (display: block)
        // antes de recalcularmos o scrollHeight.
        requestAnimationFrame(() => {
            openAccordionContent.style.maxHeight = openAccordionContent.scrollHeight + 'px';
        });
    }
}

function handleCheckboxAndInput(checkbox) {
    const inputId = checkbox.getAttribute('data-input-id');
    const containerId = checkbox.getAttribute('data-container-id');
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);

    if (input && container) {
        if (checkbox.checked) {
            container.style.display = 'block';
        }
        else {
            container.style.display = 'none';
            // Zera o valor ao desmarcar, garantindo que não entre no cálculo
            input.value = checkbox.classList.contains('estabilidade-checkbox') ? '0' : '';
        }
        atualizarAlturaAccordionAberto(); // Adicionado para corrigir altura
    }
}

function handleInsalubridadeChange(checkedCheckbox) {
    const checkboxes = document.querySelectorAll('.insalubridade-checkbox');
    checkboxes.forEach(cb => {
        if (cb !== checkedCheckbox) {
            cb.checked = false;
        }
    });
}

/** Atualiza o estado dos campos de Aviso Prévio e Data de Término do Contrato. */
function atualizarCampos() {
    const tipoRescisao = document.getElementById('tipoRescisaoNew').value;
    const apTipoCampo = 'avisoPrevioTipo';
    const isRescisaoSelected = !!tipoRescisao;

    let permittedOptions = [];
    let defaultValue = '';

    switch (tipoRescisao) {
        case 'SJC':
        case 'DISP_COLETIVA':
            permittedOptions = ['INDENIZADO', 'TRABALHADO'];
            defaultValue = 'INDENIZADO';
            break;
        case 'RESCISAO_INDIRETA':
            permittedOptions = ['INDENIZADO'];
            defaultValue = 'INDENIZADO';
            break;
        case 'PEDIDO':
            permittedOptions = ['DESCONTO', 'TRABALHADO'];
            defaultValue = 'DESCONTO';
            break;
        case 'ACORDO':
            permittedOptions = ['INDENIZADO', 'TRABALHADO'];
            defaultValue = 'TRABALHADO';
            break;
        case 'CULPA_RECIPROCA':
            permittedOptions = ['INDENIZADO'];
            defaultValue = 'INDENIZADO';
            break;
        case 'APOSENTADORIA':
            permittedOptions = ['TRABALHADO'];
            defaultValue = 'TRABALHADO';
            break;
        case 'CJC':
        case 'FALECIMENTO':
        case 'PDV_PDI':
        case 'ANTEC_EMPREGADOR':
        case 'ANTEC_EMPREGADO':
        case 'TERMINO_CONTRATO':
            permittedOptions = ['NA'];
            defaultValue = 'NA';
            break;
        default:
            permittedOptions = [];
            break;
    }

    // Configura o campo de Aviso Prévio
    manipularCampoAvisoPrevio(apTipoCampo, permittedOptions, defaultValue, isRescisaoSelected);

    // Lógica da Data de Término do Contrato de Experiência
    const isContratoExperiencia = ['ANTEC_EMPREGADOR', 'ANTEC_EMPREGADO', 'TERMINO_CONTRATO'].includes(tipoRescisao);
    const elDataTermino = document.getElementById('grupoDataTerminoContrato');
    if (elDataTermino) {
        elDataTermino.style.display = isContratoExperiencia ? 'block' : 'none';
        atualizarAlturaAccordionAberto(); // Adicionado para corrigir altura
    }
}

function manipularCampoAvisoPrevio(elementId, permittedOptions, defaultValue = 'NA', isRescisaoSelected = false) {
    const selectEl = document.getElementById(elementId);
    if (!selectEl) return;

    selectEl.closest('.input-group').style.display = 'block';
    selectEl.innerHTML = ''; // Limpa todas as opções existentes

    const allOptions = [
        { value: 'NA', label: 'Não Aplicável' },
        { value: 'INDENIZADO', label: 'Aviso Prévio Indenizado' },
        { value: 'TRABALHADO', label: 'Aviso Prévio Trabalhado' },
        { value: 'DESCONTO', label: 'Desconto do Aviso Prévio (Não Cumprido)' }
    ];

    let validOptions = allOptions.filter(option => permittedOptions.includes(option.value));

    if (!isRescisaoSelected || validOptions.length === 0) {
        selectEl.disabled = true;
        const opt = document.createElement('option');
        opt.value = "";
        opt.textContent = 'Selecione um tipo de rescisão...';
        opt.selected = true;
        opt.disabled = true;
        selectEl.appendChild(opt);
        return;
    }

    if (validOptions.length === 1) {
        // Se houver apenas uma opção válida, exibi-la e selecioná-la automaticamente
        selectEl.disabled = false;
        const opt = document.createElement('option');
        opt.value = validOptions[0].value;
        opt.textContent = validOptions[0].label;
        opt.selected = true;
        selectEl.appendChild(opt);
    } else {
        // Se houver mais de uma opção válida, adicionar "Selecione..." e as opções
        selectEl.disabled = false;
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = 'Selecione...';
        defaultOption.selected = true;
        defaultOption.disabled = true;
        selectEl.appendChild(defaultOption);

        validOptions.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.label;
            selectEl.appendChild(opt);
        });
    }
}

function limparCampos() {
    // 1. Limpa todos os inputs de texto, número, e selects
    document.querySelectorAll('input[type="text"], input[type="number"], input[type="date"], select').forEach(input => {
        if (input.id === 'avisoPrevioTipo') {
            input.value = 'NA';
        } else if (input.tagName === 'SELECT') {
            input.value = '';
        } else if (input.type === 'date') {
            input.value = '';
        } else if (input.oninput && input.oninput.toString().includes('formatarInputComoMoeda')) {
            input.value = ''; // Limpa campos monetários
        } else {
            input.value = '0'; // Para campos numéricos como 'feriasVencidasNew'
        }
    });

    // 2. Limpa todos os checkboxes e oculta campos relacionados
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
        if (checkbox.hasAttribute('data-input-id')) {
            handleCheckboxAndInput(checkbox);
        }
    });

    // 3. Reseta o estado dos campos dependentes
    atualizarCampos();

    // 4. Oculta e limpa o resultado
    document.getElementById('resultadoCalculo').style.display = 'none';
    document.getElementById('resultadoCalculo').innerHTML = '';

    // Oculta o aviso global novamente
    const aviso = document.getElementById('aviso-global');
    if (aviso) {
        aviso.style.display = 'none';
    }
}


//==============================================================================
// E. FUNÇÕES DE CÁLCULO DE TEMPO E AVOS
//==============================================================================

/** Calcula a diferença em dias corridos entre duas datas. */
function calcularDiasEntreDates(dataInicialStr, dataFinalStr) {
    const dataInicial = new Date(dataInicialStr + 'T00:00:00');
    const dataFinal = new Date(dataFinalStr + 'T00:00:00');

    if (isNaN(dataInicial.getTime()) || isNaN(dataFinal.getTime())) return null;

    const diffTime = Math.abs(dataFinal.getTime() - dataInicial.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

/** Calcula o total de dias de Aviso Prévio (30 + Proporcional). */
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

/** Calcula o total de meses cheios de vínculo (ou fração >= 15 dias). */
function getMesesTrabalhados(dataAdmissao, dataDemissao) {
    if (isNaN(dataAdmissao.getTime()) || isNaN(dataDemissao.getTime())) return 0;

    let mesesDiferenca = (dataDemissao.getFullYear() - dataAdmissao.getFullYear()) * 12 + (dataDemissao.getMonth() - dataAdmissao.getMonth());
    let mesesCompletos = 0;

    if (mesesDiferenca === 0) {
        const diffDays = Math.ceil((dataDemissao.getTime() - dataAdmissao.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 15 ? 1 : 0;
    }

    // Contagem de avos baseada no dia 15 do mês
    let dataAtual = new Date(dataAdmissao.getTime());
    while (dataAtual.getTime() <= dataDemissao.getTime()) {
        const diffDays = Math.ceil((dataDemissao.getTime() - dataAtual.getTime()) / (1000 * 60 * 60 * 24));
        if (dataAtual.getDate() <= 15 && diffDays >= 15) {
            mesesCompletos++;
        }
        dataAtual.setMonth(dataAtual.getMonth() + 1);
    }
    return mesesCompletos;
}

/** Calcula o número de avos de direito (férias ou 13º). */
function calcularAvos(dataAdmissao, dataDemissao, faltasInjustificadas, isFerias) {
    if (isNaN(dataAdmissao.getTime()) || isNaN(dataDemissao.getTime())) return 0;

    let dataReferencia;

    // 13º: O período de contagem é sempre o Ano Civil (Jan a Dez)
    if (!isFerias) {
        dataReferencia = new Date(dataDemissao.getFullYear(), 0, 1);
    } else {
        // Férias: O período de contagem é o Período Aquisitivo (aniversário da admissão)
        const mesAdmissao = dataAdmissao.getMonth();
        const diaAdmissao = dataAdmissao.getDate();
        let anoReferencia = dataDemissao.getFullYear();
        dataReferencia = new Date(anoReferencia, mesAdmissao, diaAdmissao);

        if (dataReferencia.getTime() >= dataDemissao.getTime()) {
            dataReferencia.setFullYear(anoReferencia - 1);
        }
    }

    let anosDiferenca = dataDemissao.getFullYear() - dataReferencia.getFullYear();
    let mesesDiferenca = (dataDemissao.getMonth() - dataReferencia.getMonth()) + (anosDiferenca * 12);

    let avosProporcionais = 0;
    if (mesesDiferenca >= 0) {
        const diaDemissao = dataDemissao.getDate();
        avosProporcionais = mesesDiferenca;
        if (diaDemissao >= 15) {
            avosProporcionais++;
        }
    }

    if (isFerias) {
        // Regra de perda de férias por faltas (Simplificado para o último PA)
        if (faltasInjustificadas > 32) avosProporcionais = 0;
        else if (faltasInjustificadas > 24) avosProporcionais = 6;
        else if (faltasInjustificadas > 15) avosProporcionais = 9;
    }

    return Math.min(12, Math.max(0, avosProporcionais));
}

//==============================================================================
// F. FUNÇÕES DE CÁLCULO TRIBUTÁRIO E BENEFÍCIOS
//==============================================================================

/** Calcula o valor do INSS, respeitando o teto e as alíquotas progressivas. */
function calcularInss(base) {
    if (base <= 0) return 0.0;
    let inss = 0.0;
    let baseCalculada = Math.min(base, TETO_INSS);
    let baseAnterior = 0.0;

    for (const faixa of TABELA_INSS) {
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

/** Calcula o valor do IRRF, deduzindo INSS e dependentes. */
function calcularIrrf(base, inssDesconto, numDependentes = 0) {
    if (base <= 0) return 0.0;
    const DEDUCAO_DEPENDENTE = 189.59;

    const deducaoDependentesTotal = numDependentes * DEDUCAO_DEPENDENTE;

    const baseIrrf = Math.max(0, base - inssDesconto - deducaoDependentesTotal);

    let irrf = 0.0;
    for (const faixa of TABELA_IRRF) {
        const [limiteInferior, limiteSuperior, aliquota, deducao] = faixa;
        if (baseIrrf > limiteInferior) {
            if (baseIrrf <= limiteSuperior) {
                irrf = (baseIrrf * aliquota) - deducao;
                break;
            } else if (limiteSuperior === Infinity) {
                irrf = (baseIrrf * aliquota) - deducao;
                break;
            }
        }
    }

    return parseFloat(Math.max(0, irrf).toFixed(2));
}

/** Simula a elegibilidade e os valores do Seguro Desemprego. */
function calcularSeguroDesemprego(tipoRescisao, salarioMedio, mesesVinculo) {
    let resultado = { direito: 'Não Elegível', parcelas: 0, valorParcela: 0.00 };

    // Elegibilidade por Modalidade
    const elegiveis = ['SJC', 'RESCISAO_INDIRETA', 'DISP_COLETIVA', 'CULPA_RECIPROCA', 'ANTEC_EMPREGADOR'];
    if (!elegiveis.includes(tipoRescisao)) return resultado;

    // Elegibilidade por Tempo (Simplificado: Primeira Solicitação)
    let numParcelas = 0;
    if (mesesVinculo >= 24) numParcelas = 5;
    else if (mesesVinculo >= 12) numParcelas = 4;
    else if (mesesVinculo >= 6) numParcelas = 3;
    else return resultado;

    // Cálculo do Valor da Parcela
    let valorParcela = 0.00;
    if (salarioMedio <= SD_LIMITE_FAIXA_1) {
        valorParcela = salarioMedio * 0.8;
    } else {
        const excedente = salarioMedio - SD_LIMITE_FAIXA_1;
        valorParcela = (excedente * 0.5) + SD_ADICAO_FAIXA_2_CALC;
    }

    valorParcela = Math.max(SD_SALARIO_MINIMO, Math.min(valorParcela, SD_TETO_MAXIMO));

    // Tratamento de Culpa Recíproca (50%)
    if (tipoRescisao === 'CULPA_RECIPROCA') {
        numParcelas = Math.ceil(numParcelas / 2);
        valorParcela = valorParcela * 0.5;
    }

    if (numParcelas > 0) {
        resultado.direito = 'Elegível';
        resultado.parcelas = numParcelas;
        resultado.valorParcela = parseFloat(valorParcela.toFixed(2));
        resultado.seguroDesempregoElegivel = true;
    }

    return resultado;
}


//==============================================================================
// G. FUNÇÃO PRINCIPAL DE PROCESSAMENTO
//==============================================================================

/** Obtém todos os dados do formulário e retorna em um objeto estruturado. */
function obterDadosDeEntrada() {
    const dataAdmissaoStr = document.getElementById('dataAdmissao').value;
    const dataDemissaoStr = document.getElementById('dataDemissao').value;
    const dataTerminoContratoStr = document.getElementById('grupoDataTerminoContrato').style.display !== 'none' ? document.getElementById('dataTerminoContrato').value : null;

    return {
        tipoRescisao: document.getElementById('tipoRescisaoNew').value,
        avisoPrevioTipo: document.getElementById('avisoPrevioTipo').value,
        dataAdmissao: new Date(dataAdmissaoStr + 'T00:00:00'),
        dataDemissao: new Date(dataDemissaoStr + 'T00:00:00'),
        dataPagamento: document.getElementById('dataPagamento').value ? new Date(document.getElementById('dataPagamento').value + 'T00:00:00') : null,
        dataTerminoContrato: dataTerminoContratoStr ? new Date(dataTerminoContratoStr + 'T00:00:00') : null,
        dataAdmissaoStr: dataAdmissaoStr,
        dataDemissaoStr: dataDemissaoStr,
        dataTerminoContratoStr: dataTerminoContratoStr,

        salarioBase: parseInput('salarioBruto'),
        comissoesMedia: parseInput('comissoesMedia'),
        horasExtrasMedia: parseInput('horasExtrasMedia'),
        outrosAdicionais: parseInput('outrosAdicionais'),
        auxilioAlimentacao: parseInput('auxilioAlimentacao'),
        gorjetasMedia: parseInput('gorjetasMedia'),
        gueltasMedia: parseInput('gueltasMedia'),
        salarioFamilia: parseInput('salarioFamilia'),
        fgtsSaldoTotal: parseInput('fgtsSaldoTotal'),
        numDependentes: parseInputInt('dependentesIRRF'),
        feriasVencidasQtd: parseInputInt('feriasVencidasNew'),
        faltasInjustificadas: parseInputInt('faltasInjustificadas'),
        grauInsalubridade: document.querySelector('input[name="insalubridade_nivel"]:checked') ? parseFloat(document.querySelector('input[name="insalubridade_nivel"]:checked').value) : 0.0,
        grauInsalubridadePercentual: document.querySelector('input[name="insalubridade_nivel"]:checked') ? document.querySelector('input[name="insalubridade_nivel"]:checked').value * 100 : 0,
        temPericulosidade: isChecked('periculosidade'),
        temTransferencia: isChecked('transferencia'),
        temNoturno: isChecked('adicionalNoturno'),
        estabilidadeGestante: isChecked('estabilidadeGestante'),
        mesesGestante: parseInputInt('mesesGestante'),
        estabilidadeCipa: isChecked('estabilidadeCipa'),
        mesesCipa: parseInputInt('mesesCipa'),
        estabilidadeAcidente: isChecked('estabilidadeAcidente'),
        mesesAcidente: parseInputInt('mesesAcidente'),
        descontoAdiantamentoSalario: parseInput('descontoAdiantamentoSalario'),
        descontoAdiantamentoFerias: parseInput('descontoAdiantamentoFerias'),
        descontoAdiantamento13: parseInput('descontoAdiantamento13'),
        descontoValeTransporte: parseInput('descontoValeTransporte'),
        descontoPensaoAlimenticia: parseInput('descontoPensaoAlimenticia'),
        descontoOutros: parseInput('descontoOutros'),
        gratificacaoFuncao: parseInput('gratificacaoFuncao'),
        gratificacaoTempoServico: parseInput('gratificacaoTempoServico'),
        gratificacaoProdutividade: parseInput('gratificacaoProdutividade'),
        gratificacaoAssiduidade: parseInput('gratificacaoAssiduidade'),
        gratificacaoQuebraCaixa: parseInput('gratificacaoQuebraCaixa'),

    };
}

function calcularRescisao() {
    // 1. Limpa o resultado anterior
    Object.keys(calculosProprios).forEach(key => {
        if (typeof calculosProprios[key] === 'number') calculosProprios[key] = 0.00;
        else if (key === 'dataLimiteAcaoTrabalhista') calculosProprios[key] = null;
        else if (typeof calculosProprios[key] === 'boolean') calculosProprios[key] = false;
        else calculosProprios[key] = '';
    });

    // 2. Obter Dados de Entrada e Validação
    const dados = obterDadosDeEntrada();

    if (!dados.dataAdmissaoStr || !dados.dataDemissaoStr || !dados.tipoRescisao || !dados.salarioBase) {
        const resultadoDiv = document.getElementById('resultadoCalculo');
        resultadoDiv.innerHTML = '<p class="text-red-600 font-bold p-4">Por favor, preencha as datas, o salário base e o tipo de rescisão.</p>';
        resultadoDiv.style.display = 'block';
        resultadoDiv.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    // Variáveis de Controle
    const isAPIndenizado = dados.avisoPrevioTipo === 'INDENIZADO';
    const isAPDesconto = dados.avisoPrevioTipo === 'DESCONTO';
    const isAPTrabalhado = dados.avisoPrevioTipo === 'TRABALHADO';
    const diasAvisoPrevioTotal = getDiasAvisoPrevio(dados.dataAdmissao, dados.dataDemissao);
    const dataProjetada = isAPIndenizado ? calcularDataProjetada(dados.dataDemissaoStr, diasAvisoPrevioTotal) : dados.dataDemissao;

    // Cálculo da Remuneração Base
    const remuneracaoBase = dados.salarioBase + dados.comissoesMedia + dados.horasExtrasMedia + dados.outrosAdicionais + dados.auxilioAlimentacao + dados.gueltasMedia + dados.salarioFamilia + dados.gorjetasMedia;
    const valInsalubridadeMensal = dados.grauInsalubridade > 0 ? calcularInsalubridade(dados.grauInsalubridade, SALARIO_MINIMO_REF) : 0.0;
    const valPericulosidadeMensal = dados.temPericulosidade ? dados.salarioBase * 0.30 : 0.0;
    const valTransferenciaMensal = dados.temTransferencia ? dados.salarioBase * 0.25 : 0.0;
    const valNoturnoMensal = dados.temNoturno ? dados.salarioBase * 0.20 : 0.0;

    // Base para cálculo de AP/13º/Férias (inclui adicionais integrais habituais)
    const baseParaProporcionais = remuneracaoBase + valInsalubridadeMensal + valPericulosidadeMensal + valTransferenciaMensal + valNoturnoMensal + dados.gorjetasMedia;


    // 3. CÁLCULO DE PROVENTOS (VERBAS RESCISÓRIAS)

    // Saldo de Salário e Adicionais Proporcionais
    const diasTrabalhadosMes = dados.dataDemissao.getDate();
    calculosProprios.saldoSalario = (remuneracaoBase / DIAS_MES) * diasTrabalhadosMes;
    calculosProprios.adicionalInsalubridade = (valInsalubridadeMensal / DIAS_MES) * diasTrabalhadosMes;
    calculosProprios.adicionalPericulosidade = (valPericulosidadeMensal / DIAS_MES) * diasTrabalhadosMes;
    calculosProprios.adicionalTransferencia = (valTransferenciaMensal / DIAS_MES) * diasTrabalhadosMes;
    calculosProprios.adicionalNoturno = (valNoturnoMensal / DIAS_MES) * diasTrabalhadosMes;
    calculosProprios.gratificacaoFuncao = (dados.gratificacaoFuncao / DIAS_MES) * diasTrabalhadosMes;
    calculosProprios.gratificacaoTempoServico = (dados.gratificacaoTempoServico / DIAS_MES) * diasTrabalhadosMes;
    calculosProprios.gratificacaoProdutividade = (dados.gratificacaoProdutividade / DIAS_MES) * diasTrabalhadosMes;
    calculosProprios.gratificacaoAssiduidade = (dados.gratificacaoAssiduidade / DIAS_MES) * diasTrabalhadosMes;
    calculosProprios.gratificacaoQuebraCaixa = (dados.gratificacaoQuebraCaixa / DIAS_MES) * diasTrabalhadosMes;
    const adicionaisMensaisProporcionais = calculosProprios.adicionalInsalubridade + calculosProprios.adicionalPericulosidade + calculosProprios.adicionalTransferencia + calculosProprios.adicionalNoturno + calculosProprios.gratificacaoFuncao + calculosProprios.gratificacaoTempoServico + calculosProprios.gratificacaoProdutividade + calculosProprios.gratificacaoAssiduidade + calculosProprios.gratificacaoQuebraCaixa;

    // Aviso Prévio Indenizado
    if (isAPIndenizado) {
        const is50Percent = ['ACORDO', 'CULPA_RECIPROCA'].includes(dados.tipoRescisao);
        calculosProprios.avisoPrevio = (baseParaProporcionais / DIAS_MES) * diasAvisoPrevioTotal * (is50Percent ? 0.5 : 1.0);
    }

    // Férias Proporcionais e Vencidas (+ 1/3)
    let avosFeriasProp = calcularAvos(dados.dataAdmissao, dataProjetada, dados.faltasInjustificadas, true);
    calculosProprios.feriasProporcionais = (baseParaProporcionais / 12) * avosFeriasProp * (1 + TERCO_CONSTITUCIONAL);
    calculosProprios.feriasVencidas = baseParaProporcionais * dados.feriasVencidasQtd * (1 + TERCO_CONSTITUCIONAL);

    // 13º Salário Proporcional
    let avos13Prop = calcularAvos(dados.dataAdmissao, dataProjetada, dados.faltasInjustificadas, false);
    calculosProprios.decimoTerceiro = (baseParaProporcionais / 12) * avos13Prop;

    // TRATAMENTO EXCLUSIVO PARA RESCISÃO POR JUSTA CAUSA
    if (dados.tipoRescisao === 'CJC') {
        // 1. Zera Férias Proporcionais
        calculosProprios.feriasProporcionais = 0.00;
        avosFeriasProp = 0; // Zera os avos para o relatório exibir 0/12

        // 2. Zera 13º Salário Proporcional
        calculosProprios.decimoTerceiro = 0.00;
        avos13Prop = 0; // Zera os avos para o relatório exibir 0/12
    }

    // Multas e Indenizações
    let estabilidadeTipo = '';
    let mesesEstabilidade = 0;

    if (dados.estabilidadeGestante) {
        estabilidadeTipo = 'Gestante';
        mesesEstabilidade = dados.mesesGestante;
    } else if (dados.estabilidadeCipa) {
        estabilidadeTipo = 'CIPA';
        mesesEstabilidade = dados.mesesCipa;
    } else if (dados.estabilidadeAcidente) {
        estabilidadeTipo = 'Acidente de Trabalho';
        mesesEstabilidade = dados.mesesAcidente;
    }

    if (mesesEstabilidade > 0) {
        calculosProprios.estabilidadeIndenizacao = baseParaProporcionais * mesesEstabilidade;
    }

    // Multas 477, 479 e 480
    if (dados.dataPagamento) {
        const dataFimContrato = isAPIndenizado ? dataProjetada : dados.dataDemissao;
        let dataLimitePagamento = new Date(dataFimContrato.getTime());
        dataLimitePagamento.setDate(dataFimContrato.getDate() + 10);
        dataLimitePagamento.setHours(0, 0, 0, 0);

        if (dados.dataPagamento.getTime() > dataLimitePagamento.getTime()) {
            calculosProprios.multaArt477 = remuneracaoBase;
        }
    }
    if (dados.tipoRescisao === 'ANTEC_EMPREGADOR' && dados.dataTerminoContratoStr) {
        const diasRestantes = calcularDiasEntreDates(dados.dataDemissaoStr, dados.dataTerminoContratoStr);
        if (diasRestantes > 0) calculosProprios.multaArt479 = (baseParaProporcionais / DIAS_MES) * diasRestantes * 0.5;
    } else if (dados.tipoRescisao === 'ANTEC_EMPREGADO' && dados.dataTerminoContratoStr) {
        const diasRestantes = calcularDiasEntreDates(dados.dataDemissaoStr, dados.dataTerminoContratoStr);
        if (diasRestantes > 0) calculosProprios.multaArt480 = (baseParaProporcionais / DIAS_MES) * diasRestantes * 0.5;
    }

    // --- Multa Art. 477, § 8º (Atraso no Pagamento) ---
    const tipoRescisao = dados.tipoRescisao;
    // A multa é elegível se NÃO for Falecimento (FALECIMENTO)
    const isElegivelMulta477 = !['FALECIMENTO'].includes(tipoRescisao);

    if (isElegivelMulta477 && dados.dataDemissao && dados.dataPagamento) {
        // 1. Calcula a data limite para pagamento (10 dias corridos após a demissão, Art. 477, § 6º da CLT)
        let dataLimitePagamento = new Date(dados.dataDemissao.getTime());
        dataLimitePagamento.setDate(dados.dataDemissao.getDate() + 10);

        // 2. Verifica se o pagamento ocorreu após a data limite
        if (dados.dataPagamento.getTime() > dataLimitePagamento.getTime()) {
            calculosProprios.multaArt477 = dados.salarioBase; // Valor = Salário Base
        } else {
            calculosProprios.multaArt477 = 0.00;
        }
    } else {
        calculosProprios.multaArt477 = 0.00;
    }

    // 4. CÁLCULO DE DEDUÇÕES

    // Desconto Aviso Prévio
    if (isAPDesconto) {
        calculosProprios.avisoPrevioDesconto = (baseParaProporcionais / DIAS_MES) * 30;
    }

    // INSS
    const baseInssMensal = calculosProprios.saldoSalario + adicionaisMensaisProporcionais + (isAPTrabalhado ? calculosProprios.avisoPrevio : 0.0) + dados.gorjetasMedia;
    calculosProprios.inss = calcularInss(baseInssMensal);
    calculosProprios.inss13 = calcularInss(calculosProprios.decimoTerceiro);

    // IRRF
    // Base IRRF (exceto 13º e Férias/AP indenizados)
    const baseIRRFTributavel = calculosProprios.saldoSalario + (isAPTrabalhado ? calculosProprios.avisoPrevio : 0.0) + adicionaisMensaisProporcionais + calculosProprios.multaArt477 + calculosProprios.estabilidadeIndenizacao + dados.gorjetasMedia;
    calculosProprios.irrf = calcularIrrf(baseIRRFTributavel, calculosProprios.inss, dados.numDependentes);

    // IRRF 13º (Tributação Exclusiva)
    calculosProprios.irrf13 = calcularIrrf(calculosProprios.decimoTerceiro, calculosProprios.inss13, dados.numDependentes);

    // Descontos informados
    calculosProprios.descontoAdiantamentoSalario = dados.descontoAdiantamentoSalario;
    calculosProprios.descontoOutros = dados.descontoOutros;


    // 5. CÁLCULO FGTS, SD E PRAZO LEGAL

    // FGTS Depósito (8% sobre Saldo Salário, 13º, AP Indenizado)
    const baseAP = isAPIndenizado ? calculosProprios.avisoPrevio : 0.0;
    const fgtsBaseDepositada = calculosProprios.saldoSalario + adicionaisMensaisProporcionais + calculosProprios.decimoTerceiro + baseAP + dados.gorjetasMedia;
    calculosProprios.fgtsDeposito = fgtsBaseDepositada * 0.08;

    // FGTS Multa Rescisória (40% ou 20%)
    const isFGTSMulta40 = ['SJC', 'RESCISAO_INDIRETA', 'ANTEC_EMPREGADOR', 'DISP_COLETIVA'].includes(dados.tipoRescisao);
    const isFGTSMulta20 = ['ACORDO', 'CULPA_RECIPROCA'].includes(dados.tipoRescisao);

    if (dados.fgtsSaldoTotal > 0) {
        if (isFGTSMulta40) calculosProprios.multaFgts = (dados.fgtsSaldoTotal + calculosProprios.fgtsDeposito) * 0.40;
        else if (isFGTSMulta20) calculosProprios.multaFgts = (dados.fgtsSaldoTotal + calculosProprios.fgtsDeposito) * 0.20;
    }

    // Detalhamento FGTS
    const totalMesesTrabalhados = getMesesTrabalhados(dados.dataAdmissao, dados.dataDemissao);
    calculosProprios.fgtsTotalEstimado = dados.fgtsSaldoTotal;
    calculosProprios.fgtsTotalReceber = dados.fgtsSaldoTotal + calculosProprios.fgtsDeposito + calculosProprios.multaFgts;

    // Saque FGTS
    const elegiveisSaque = ['SJC', 'RESCISAO_INDIRETA', 'ANTEC_EMPREGADOR', 'DISPENSA_COLETIVA', 'ACORDO', 'CULPA_RECIPROCA', 'APOSENTADORIA', 'TERMINO_CONTRATO', 'FALECIMENTO', 'PDV_PDI'];
    calculosProprios.saqueFgtsElegivel = elegiveisSaque.includes(dados.tipoRescisao);

    // Seguro Desemprego
    const mesesVinculoSD = getMesesTrabalhados(dados.dataAdmissao, dados.dataDemissao);
    const resultadoSD = calcularSeguroDesemprego(dados.tipoRescisao, remuneracaoBase, mesesVinculoSD);
    calculosProprios.seguroDesempregoParcelas = resultadoSD.parcelas;
    calculosProprios.seguroDesempregoValorParcela = resultadoSD.valorParcela;
    calculosProprios.seguroDesempregoElegivel = resultadoSD.seguroDesempregoElegivel;

    // Data Limite para Ação Trabalhista (Prescrição Bienal)
    const dataLimite = new Date(dados.dataDemissao.getTime());
    dataLimite.setFullYear(dataLimite.getFullYear() + 2);
    calculosProprios.dataLimiteAcaoTrabalhista = dataLimite;


    // 6. TOTAIS E GERAÇÃO DE RUBRICAS
    const proventos = calculosProprios.saldoSalario + calculosProprios.avisoPrevio + calculosProprios.decimoTerceiro + calculosProprios.feriasVencidas + calculosProprios.feriasProporcionais + adicionaisMensaisProporcionais + calculosProprios.multaArt477 + calculosProprios.estabilidadeIndenizacao + calculosProprios.multaArt479;
    const deducoes = calculosProprios.inss + calculosProprios.inss13 + calculosProprios.irrf + calculosProprios.irrf13 + calculosProprios.avisoPrevioDesconto + calculosProprios.multaArt480 + calculosProprios.descontoAdiantamentoSalario + dados.descontoAdiantamentoFerias + dados.descontoAdiantamento13 + dados.descontoValeTransporte + dados.descontoPensaoAlimenticia + calculosProprios.descontoOutros;
    calculosProprios.proventosBrutos = proventos;
    calculosProprios.deducoes = deducoes;
    calculosProprios.liquido = proventos - deducoes;

    const rubricas = [
        { nome: '--- PROVENTOS ---', valor: 0.00, tipo: 'S' },
        { nome: 'Saldo de Salário (' + diasTrabalhadosMes + ' dias)', valor: calculosProprios.saldoSalario, tipo: 'P' },
        { nome: 'Aviso Prévio (' + diasAvisoPrevioTotal + ' dias)', valor: calculosProprios.avisoPrevio, tipo: 'P' },
        { nome: 'Férias Proporcionais (' + avosFeriasProp + '/12) + 1/3', valor: calculosProprios.feriasProporcionais, tipo: 'P' },
        { nome: 'Férias Vencidas (' + dados.feriasVencidasQtd + ' períodos) + 1/3', valor: calculosProprios.feriasVencidas, tipo: 'P' },
        { nome: '13º Salário Proporcional (' + avos13Prop + '/12)', valor: calculosProprios.decimoTerceiro, tipo: 'P' },
        { nome: 'Adicional de Insalubridade (' + dados.grauInsalubridadePercentual + '%) Proporcional', valor: calculosProprios.adicionalInsalubridade, tipo: 'P' },
        { nome: 'Adicional de Periculosidade 30% - Proporcional', valor: calculosProprios.adicionalPericulosidade, tipo: 'P' },
        { nome: 'Adicional de Transferencia 25% - Proporcional', valor: calculosProprios.adicionalTransferencia, tipo: 'P' },
        { nome: 'Adicional Noturno 20% - Proporcional', valor: calculosProprios.adicionalNoturno, tipo: 'P' },
        { nome: 'Adicionais de Média (Outros)', valor: dados.outrosAdicionais, tipo: 'P' },
        { nome: 'Média Mensal de Comissões', valor: dados.comissoesMedia, tipo: 'P' },
        { nome: 'Média Mensal de Horas Extras', valor: dados.horasExtrasMedia, tipo: 'P' },
        { nome: 'Auxílio Alimentação (em dinheiro)', valor: dados.auxilioAlimentacao, tipo: 'P' },
        { nome: 'Média Mensal de Gueltas', valor: dados.gueltasMedia, tipo: 'P' },
        { nome: 'Média Mensal de Gorjetas', valor: dados.gorjetasMedia, tipo: 'P' },
        { nome: 'Salário Família', valor: dados.salarioFamilia, tipo: 'P' },
        { nome: 'Gratificação de Função - Proporcional', valor: calculosProprios.gratificacaoFuncao, tipo: 'P' },
        { nome: 'Gratificação por Tempo de Serviço - Proporcional', valor: calculosProprios.gratificacaoTempoServico, tipo: 'P' },
        { nome: 'Gratificação por Produtividade - Proporcional', valor: calculosProprios.gratificacaoProdutividade, tipo: 'P' },
        { nome: 'Gratificação por Assiduidade - Proporcional', valor: calculosProprios.gratificacaoAssiduidade, tipo: 'P' },
        { nome: 'Gratificação Quebra de Caixa - Proporcional', valor: calculosProprios.gratificacaoQuebraCaixa, tipo: 'P' },
        { nome: 'Indenização por Estabilidade (' + estabilidadeTipo + ')', valor: calculosProprios.estabilidadeIndenizacao, tipo: 'P' },
        { nome: 'Multa Art. 477, § 8º (Atraso Pagamento)', valor: calculosProprios.multaArt477, tipo: 'P' },
        { nome: 'Multa do Art. 479 (Contrato a Termo - Empregador)', valor: calculosProprios.multaArt479, tipo: 'P' },

        { nome: '--- DEDUÇÕES OBRIGATÓRIAS ---', valor: 0.00, tipo: 'S' },
        { nome: 'INSS (Verbas Mensais)', valor: calculosProprios.inss, tipo: 'D' },
        { nome: 'INSS (13º Salário)', valor: calculosProprios.inss13, tipo: 'D' },
        { nome: 'IRRF (Verbas Mensais)', valor: calculosProprios.irrf, tipo: 'D' },
        { nome: 'IRRF (13º Salário)', valor: calculosProprios.irrf13, tipo: 'D' },

        { nome: '--- DESCONTOS E MULTAS DO EMPREGADO ---', valor: 0.00, tipo: 'S' },
        { nome: 'Desconto Aviso Prévio (30 dias)', valor: calculosProprios.avisoPrevioDesconto, tipo: 'D' },
        { nome: 'Multa do Art. 480 (Contrato a Termo - Empregado)', valor: calculosProprios.multaArt480, tipo: 'D' },
        { nome: 'Adiantamento Salarial', valor: calculosProprios.descontoAdiantamentoSalario, tipo: 'D' },
        { nome: 'Adiantamento de Férias', valor: dados.descontoAdiantamentoFerias, tipo: 'D' },
        { nome: 'Adiantamento de 13º', valor: dados.descontoAdiantamento13, tipo: 'D' },
        { nome: 'Vale Transporte', valor: dados.descontoValeTransporte, tipo: 'D' },
        { nome: 'Pensão Alimentícia', valor: dados.descontoPensaoAlimenticia, tipo: 'D' },
        { nome: 'Outros Descontos Informados', valor: calculosProprios.descontoOutros, tipo: 'D' },
    ].filter(r => r && (r.valor !== 0 || r.tipo === 'S'));

    exibirRelatorioRescisao(rubricas, dados.tipoRescisao, totalMesesTrabalhados, dados);
}

// Funções auxiliares usadas no cálculo, movidas para o bloco F/E
function calcularDataProjetada(dataDemissaoStr, diasAvisoPrevio) {
    const dataDemissao = new Date(dataDemissaoStr + 'T00:00:00');
    if (isNaN(dataDemissao.getTime())) return new Date(NaN);
    let dataProjetada = new Date(dataDemissao.getTime());
    dataProjetada.setDate(dataDemissao.getDate() + diasAvisoPrevio);
    return dataProjetada;
}

function calcularInsalubridade(grauInsalubridade, salarioMinimoRef) {
    return grauInsalubridade > 0 ? salarioMinimoRef * grauInsalubridade : 0.00;
}


//==============================================================================
// H. FUNÇÃO DE EXIBIÇÃO DO RELATÓRIO
//==============================================================================

/** Gera a tabela HTML dos resultados da rescisão. */
function exibirRelatorioRescisao(rubricas, tipoRescisao, totalMesesTrabalhados, dados) {
    const resultadoDiv = document.getElementById('resultadoCalculo');
    let html = '';

    const proventos = calculosProprios.proventosBrutos;
    const deducoes = calculosProprios.deducoes;
    const liquido = calculosProprios.liquido;

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
        } else {
            const isDeducao = r.tipo === 'D';
            const valorFormatado = formatarMoeda(r.valor, false);
            const corValor = isDeducao ? 'text-red-600' : 'text-green-600';
            const valorDisplay = isDeducao ? `- ${valorFormatado}` : valorFormatado;

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

    // --- BLOCO DE FGTS, SEGURO DESEMPREGO E PRAZO DE AÇÃO ---

    // 1. Lógica para exibição do saque do FGTS
    let saqueFgtsStatusHtml;
    if (calculosProprios.saqueFgtsElegivel) {
        if (tipoRescisao === 'ACORDO') {
            saqueFgtsStatusHtml = `<p class="text-md font-bold text-green-700 mt-4">Status de Saque: SIM (80% do Saldo)</p>`;
        } else if (tipoRescisao === 'CULPA_RECIPROCA') {
            saqueFgtsStatusHtml = `<p class="text-md font-bold text-green-700 mt-4">Status de Saque: SIM (Saldo Integral)</p>`;
        } else {
            saqueFgtsStatusHtml = `<p class="text-md font-bold text-green-700 mt-4">Status de Saque: SIM (Saldo Integral)</p>`;
        }
    } else {
        saqueFgtsStatusHtml = `<p class="text-md font-bold text-red-700 mt-4">Status de Saque: NÃO PERMITIDO</p>`;
    }

    // 2. Calcula o percentual de multa para exibir dinamicamente
    let percentualMultaFgts = 0;
    if (['SJC', 'RESCISAO_INDIRETA', 'ANTEC_EMPREGADOR', 'DISPENSA_COLETIVA'].includes(tipoRescisao)) {
        percentualMultaFgts = 40;
    } else if (['ACORDO', 'CULPA_RECIPROCA'].includes(tipoRescisao)) {
        percentualMultaFgts = 20;
    }

    let fgtsDetalhesHtml = `
        <div class="p-6 border border-gray-300 rounded-lg shadow-lg bg-gray-50 mb-6">
            <h5 class="text-lg font-bold text-[#007380] border-b pb-2 mb-3">Detalhamento FGTS e Multa Rescisória</h5>
            <p class="text-sm font-medium">FGTS Depositado em Todo o Período do Contrato:</p>
            <p class="text-lg font-semibold text-[#007380]">${formatarMoeda(calculosProprios.fgtsTotalEstimado)}</p>

            <p class="text-sm font-medium mt-4">Depósito do FGTS das Verbas Rescisórias (8%):</p>
            <p class="text-lg font-semibold text-[#007380]">${formatarMoeda(calculosProprios.fgtsDeposito)}</p>

            <p class="text-sm font-medium mt-4">Multa de ${percentualMultaFgts}% sobre o Saldo Total do FGTS:</p>
            <p class="text-lg font-bold text-[#007380]">${formatarMoeda(calculosProprios.multaFgts)}</p>

            <p class="text-sm font-medium mt-4 border-t pt-2">FGTS a Receber (Depósitos + Multa):</p>
            <p class="text-xl font-extrabold text-[#007380]">${formatarMoeda(calculosProprios.fgtsTotalReceber)}</p>
            
            ${saqueFgtsStatusHtml}

            <p class="text-xs text-gray-500 mt-4"> ATENÇÃO: O valor do FGTS Total e a Multa Rescisória são ESTIMATIVAS baseadas no último Salário Base. O valor real pode ser diferente.</p>
        </div>
    `;

    // 3. Seguro Desemprego
    let seguroDesempregoHtml;
    if (calculosProprios.seguroDesempregoElegivel) {
        seguroDesempregoHtml = `
            <div class="p-6 border border-green-300 rounded-lg shadow-lg bg-green-50 mb-6">
                <h5 class="text-lg font-bold text-green-700 border-b pb-2 mb-3">Seguro Desemprego (Simulação)</h5>
                <p class="text-md font-bold text-green-700">Status: ELEGÍVEL</p>
                <p class="text-sm font-medium mt-2">Nº de Parcelas Estimadas:</p>
                <p class="text-lg font-semibold text-green-700">${calculosProprios.seguroDesempregoParcelas}</p>
                <p class="text-sm font-medium mt-2">Valor Estimado por Parcela:</p>
                <p class="text-lg font-semibold text-green-700">${formatarMoeda(calculosProprios.seguroDesempregoValorParcela)}</p>
                <p class="text-xs text-gray-700 mt-4"> ATENÇÃO: A elegibilidade, o valor e o número de parcelas SÃO ESTIMATIVAS e dependem de verificação de tempo de serviço, solicitações anteriores e média salarial nos órgãos oficiais (CAIXA/MTE).</p>
            </div>
        `;
    } else {
        seguroDesempregoHtml = `
            <div class="p-6 border border-red-300 rounded-lg shadow-lg bg-red-50 mb-6">
                <h5 class="text-lg font-bold text-red-700 border-b pb-2 mb-3">Seguro Desemprego (Simulação)</h5>
                <p class="text-md font-bold text-red-700">Status: NÃO ELEGÍVEL</p>
                <p class="text-sm text-gray-600 mt-2">A modalidade de rescisão selecionada não permite o saque ou o recebimento do Seguro Desemprego, ou o tempo de serviço é insuficiente para a primeira solicitação.</p>
            </div>
        `;
    }

    // 4. Prazo para Ação Trabalhista
    let prazoAcaoTrabalhistaHtml = `
        <div class="p-6 mb-8 border border-red-300 rounded-lg shadow-lg bg-red-50 text-center">
            <h5 class="text-lg font-bold text-red-700 border-b pb-2 mb-3">Prazo Limite para Ação Trabalhista (Prescrição Bienal)</h5>
            <p class="text-sm font-medium text-red-600">O prazo máximo de 2 anos para ingressar com a Reclamação Trabalhista se encerra em:</p>
            <p class="text-3xl font-extrabold text-red-900 mt-2">${formatarData(calculosProprios.dataLimiteAcaoTrabalhista)}</p>
            <p class="text-xs text-gray-700 mt-3">
                A lei estabelece 2 anos após a data de demissão para entrar com a ação.
                <br>
                Você só pode cobrar verbas referentes aos 5 anos anteriores à data de entrada da ação.
            </p>
        </div>
    `;

    // Combina os novos blocos
    html += '<h4 class="text-lg font-semibold text-[#007380] mb-2">Informações Adicionais (Não Inclusas no Valor Líquido)</h4>';

    // NOVO: Adiciona um contêiner flexível
    // flex-col: Em telas pequenas, ficam em coluna (um abaixo do outro)
    // md:flex-row: Em telas médias e grandes, ficam em linha (lado a lado)
    // gap-6: Adiciona espaçamento entre os dois blocos
    html += '<div class="flex flex-col md:flex-row gap-6 mb-6">';

    // NOVO: Adiciona a classe flex-1 ao bloco do FGTS. Isso faz com que ele ocupe 50% da largura do contêiner flexível.
    fgtsDetalhesHtml = fgtsDetalhesHtml.replace('<div class="p-6 border', '<div class="flex-1 p-6 border');
    html += fgtsDetalhesHtml;

    // NOVO: Adiciona a classe flex-1 ao bloco do Seguro Desemprego, fazendo-o ocupar os outros 50%.
    seguroDesempregoHtml = seguroDesempregoHtml.replace('<div class="p-6 border', '<div class="flex-1 p-6 border');
    html += seguroDesempregoHtml;

    // NOVO: Fecha o contêiner flexível
    html += '</div>';
    html += prazoAcaoTrabalhistaHtml;

    // Rodapé
    html += `<div class="flex justify-center gap-4 mt-8 print:hidden">`;
    html += `<button onclick="window.print()" class="bg-[#007380] text-white px-8 py-3 rounded-lg shadow-md hover:bg-[#005a62] transition duration-150 ease-in-out font-semibold mr-4">
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

    const aviso = document.getElementById('aviso-global');
    if (aviso) {
        aviso.style.display = 'block';
    }
}


//==============================================================================
// I. INICIALIZAÇÃO
//==============================================================================
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.accordion-header').forEach(button => {
        button.addEventListener('click', () => toggleAccordion(button));
    });

    const btnCalcular = document.getElementById('btnCalcular');
    if (btnCalcular) {
        btnCalcular.addEventListener('click', calcularRescisao);
    }

    document.querySelectorAll('[data-input-id]').forEach(checkbox => {
        checkbox.addEventListener('change', () => handleCheckboxAndInput(checkbox));
    });

    document.getElementById('tipoRescisaoNew').addEventListener('change', atualizarCampos);

    atualizarCampos();
});