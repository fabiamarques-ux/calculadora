/* ==========================================================================
   calculorescisao.test.js - Testes Unitários para as Funções de Cálculo
   ========================================================================== */

// Importa as funções que não interagem com o DOM para teste unitário
// Nota: O ambiente de testes (Jest) precisa estar configurado para suportar 'export/import'
import { 
    formatarMoeda, 
    converterParaNumero, 
    getDataMesesAnos, 
    getDiasAvisoPrevio, 
    calcularDecimoTerceiro, 
    calcularFerias,
    calcularAvisoPrevio,
    calcularMultaFGTS,
    calcularInss,
    calcularIrrf
} from './calculorescisao.js';


// --------------------------------------------------------------------------
// Testes para Funções de Formatação e Conversão
// --------------------------------------------------------------------------
describe('Funções de Formatação e Conversão', () => {

    test('formatarMoeda deve formatar um número para o formato BRL', () => {
        expect(formatarMoeda(1250.75)).toBe('R$ 1.250,75');
        expect(formatarMoeda(0)).toBe('R$ 0,00');
        expect(formatarMoeda(99.99)).toBe('R$ 99,99');
        expect(formatarMoeda(1234567.89)).toBe('R$ 1.234.567,89');
        expect(formatarMoeda(NaN)).toBe('R$ 0,00'); 
    });

    test('converterParaNumero deve converter uma string BRL para número', () => {
        expect(converterParaNumero('R$ 1.250,75')).toBe(1250.75);
        expect(converterParaNumero('1.250,75')).toBe(1250.75);
        expect(converterParaNumero('R$ 0,00')).toBe(0);
        expect(converterParaNumero('99,99')).toBe(99.99);
        expect(converterParaNumero('R$ 1.234.567,89')).toBe(1234567.89);
        expect(converterParaNumero('Texto Inválido')).toBe(0); 
    });
});

// --------------------------------------------------------------------------
// Testes para Funções de Prazos
// --------------------------------------------------------------------------
describe('Funções de Prazos', () => {
    
    // Período de 1 ano, 1 mês e 15 dias (375 dias) - Deve contar 14 meses (avos)
    test('getDataMesesAnos deve calcular corretamente a duração e os avos de mês (>= 15 dias)', () => {
        const dataAdmissao = new Date('2023-01-01T00:00:00');
        const dataDemissao = new Date('2024-02-15T00:00:00');
        const resultado = getDataMesesAnos(dataAdmissao, dataDemissao);

        expect(resultado.anos).toBe(1);
        expect(resultado.meses).toBe(1); 
        expect(resultado.dias).toBe(14); // 15 - 1
        expect(resultado.totalMeses).toBe(14); // 12 + 1 + 1 (por ter >= 15 dias)
    });

    // Período de 1 ano, 1 mês e 14 dias (374 dias) - Deve contar 13 meses (avos)
    test('getDataMesesAnos deve desconsiderar avos se tiver menos de 15 dias', () => {
        const dataAdmissao = new Date('2023-01-01T00:00:00');
        const dataDemissao = new Date('2024-02-14T00:00:00');
        const resultado = getDataMesesAnos(dataAdmissao, dataDemissao);

        expect(resultado.totalMeses).toBe(13); // 12 + 1 + 0 
    });
    
    test('getDiasAvisoPrevio deve calcular 30 dias para menos de 1 ano', () => {
        const dataAdmissao = new Date('2024-01-01T00:00:00');
        const dataDemissao = new Date('2024-10-30T00:00:00');
        expect(getDiasAvisoPrevio(dataAdmissao, dataDemissao)).toBe(30);
    });
    
    test('getDiasAvisoPrevio deve calcular 36 dias para 2 anos de serviço', () => {
        const dataAdmissao = new Date('2022-01-01T00:00:00');
        const dataDemissao = new Date('2024-02-01T00:00:00'); // 2 anos completos
        expect(getDiasAvisoPrevio(dataAdmissao, dataDemissao)).toBe(36); // 30 + (2 * 3)
    });
    
    test('getDiasAvisoPrevio deve calcular o máximo de 90 dias', () => {
        const dataAdmissao = new Date('1990-01-01T00:00:00'); // Mais de 20 anos
        const dataDemissao = new Date('2024-01-01T00:00:00'); 
        expect(getDiasAvisoPrevio(dataAdmissao, dataDemissao)).toBe(90); // 30 + 60
    });
});

// --------------------------------------------------------------------------
// Testes para Funções de Cálculo de Verbas
// --------------------------------------------------------------------------
describe('Funções de Cálculo de Verbas', () => {

    test('calcularDecimoTerceiro deve calcular 13º proporcional sem faltas', () => {
        const salario = 3000.00;
        const avosTrabalhados = 4;
        const resultado = calcularDecimoTerceiro(salario, avosTrabalhados, 0);

        // 3000 / 12 * 4 = 1000
        expect(resultado.decimoTerceiroProp).toBeCloseTo(1000.00);
    });

    test('calcularDecimoTerceiro deve descontar avos devido às faltas injustificadas', () => {
        const salario = 3000.00;
        const avosTrabalhados = 10;
        const faltas = 31; // Desconta 2 avos (31/15 = 2.06 -> 2)
        const resultado = calcularDecimoTerceiro(salario, avosTrabalhados, faltas);

        // 10 avos - 2 avos de falta = 8 avos
        // 3000 / 12 * 8 = 2000
        expect(resultado.decimoTerceiroProp).toBeCloseTo(2000.00);
    });

    test('calcularFerias deve calcular férias e 1/3 proporcionais sem faltas (12 avos)', () => {
        const salario = 3000.00;
        const avosFerias = 12;
        const feriasVencidasQtd = 0;
        const resultado = calcularFerias(salario, avosFerias, 0, feriasVencidasQtd);

        // Férias Prop: 3000 / 12 * 12 = 3000
        // 1/3 Prop: 3000 / 3 = 1000
        expect(resultado.feriasProp).toBeCloseTo(3000.00);
        expect(resultado.tercoProp).toBeCloseTo(1000.00);
        expect(resultado.feriasVencidas).toBe(0);
    });
    
    test('calcularFerias deve calcular férias vencidas (1 período)', () => {
        const salario = 3000.00;
        const avosFerias = 5;
        const feriasVencidasQtd = 1;
        const resultado = calcularFerias(salario, avosFerias, 0, feriasVencidasQtd);

        // Férias Vencidas: 3000 * 1 = 3000
        // 1/3 Vencidas: 3000 / 3 = 1000
        expect(resultado.feriasVencidas).toBeCloseTo(3000.00);
        expect(resultado.tercoVencidas).toBeCloseTo(1000.00);
    });

    test('calcularAvisoPrevio deve indenizar 36 dias de aviso', () => {
        const salario = 3600.00;
        const diasAviso = 36;
        const resultado = calcularAvisoPrevio('INDENIZADO', salario, diasAviso);

        // 3600 / 30 * 36 = 4320
        expect(resultado.avisoPrevio).toBeCloseTo(4320.00);
        expect(resultado.avisoPrevioDesconto).toBe(0);
    });

    test('calcularAvisoPrevio deve descontar 30 dias de aviso (Pedido de Demissão)', () => {
        const salario = 3000.00;
        const diasAviso = 30; // Embora a função de dias calcule mais, o desconto é de 30
        const resultado = calcularAvisoPrevio('NAO_CUMPRIDO', salario, diasAviso);

        expect(resultado.avisoPrevio).toBe(0);
        expect(resultado.avisoPrevioDesconto).toBeCloseTo(3000.00);
    });

    test('calcularMultaFGTS deve calcular 40% para Demissão Sem Justa Causa', () => {
        const saldo = 10000.00;
        expect(calcularMultaFGTS(saldo, 'SJC')).toBeCloseTo(4000.00);
    });

    test('calcularMultaFGTS deve calcular 20% para Comum Acordo', () => {
        const saldo = 10000.00;
        expect(calcularMultaFGTS(saldo, 'ACORDO')).toBeCloseTo(2000.00);
    });
});

// --------------------------------------------------------------------------
// Testes para Funções de Descontos (INSS e IRRF)
// --------------------------------------------------------------------------
describe('Funções de Descontos', () => {
    
    // NOTA: Os testes de INSS e IRRF utilizam as faixas de exemplo da função.

    test('calcularInss deve calcular 7.5% para salários na primeira faixa (Ex: 1000)', () => {
        expect(calcularInss(1000.00)).toBeCloseTo(75.00); // 1000 * 0.075
    });

    test('calcularInss deve calcular o teto de contribuição (Ex: 8000)', () => {
        // Teto de contribuição simulado na função: 908.85
        expect(calcularInss(8000.00)).toBeCloseTo(908.85); 
    });

    test('calcularIrrf deve ser zero para base na faixa de isenção (Ex: 2000)', () => {
        // 2000 < 2259.20 (faixa de isenção simulada)
        expect(calcularIrrf(2000.00, 0)).toBe(0); 
    });
    
    test('calcularIrrf deve calcular IR com dedução de dependente', () => {
        // Base de 4000, 1 dependente (dedução simulada: 189.59)
        // Base Líquida: 4000 - 189.59 = 3810.41
        // Faixa de 22.5% - 662.77
        const irrfEsperado = (3810.41 * 0.225) - 662.77; 
        expect(calcularIrrf(4000.00, 1)).toBeCloseTo(irrfEsperado); 
    });

});

// --------------------------------------------------------------------------
// Teste para funções de interação com o DOM (Exemplo)
// --------------------------------------------------------------------------
describe('Funções de Interação com o DOM', () => {
    
    // As funções que interagem com o DOM (toggleAccordion, atualizarCampos, etc.) 
    // não podem ser testadas aqui diretamente pois dependem da estrutura do HTML.
    // Para testá-las, seria necessário utilizar Mocks de DOM, como o JSDOM.

    test.skip('As funções que interagem com o DOM (Ex: calcularRescisao) precisam de mock de DOM para serem testadas unitariamente.', () => {
        // Exemplo: Simular o HTML para testar a função calcularRescisao
        // document.body.innerHTML = `...`;
        // expect(calcularRescisao()).not.toThrow();
    });
});