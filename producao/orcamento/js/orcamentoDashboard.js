// ==========================================================
// ORÇAMENTO DASHBOARD
// ==========================================================

var anoCorrente = new Date().getFullYear();


// ==========================================================
// CARTÕES
// ==========================================================

function cartoes(endereco) {

    $.ajax({
        url: endereco,
        method: 'GET',
        contentType: 'application/json'
    }).done(function(data) {

        var containerInvestimentos = document.getElementById('cartoesInvestimentos');
        var containerGastos = document.getElementById('cartoesGastos');
        var containerProtocolos = document.getElementById('cartoesProtocolos');

        containerInvestimentos.innerHTML = "";
        containerGastos.innerHTML = "";
        containerProtocolos.innerHTML = "";

        data.forEach(dados => {

            let classeCartao, iconeCartao;

            let adjudicado_percent =
                dados.adjudicado === 0 && dados.faturado === 0 ? 0 :
                dados.adjudicado > 0 && dados.faturado === 0 ? 0 :
                dados.faturado / dados.adjudicado;

            let previsto_percent =
                dados.previsto === 0 && dados.faturado === 0 ? 0 :
                dados.previsto > 0 && dados.faturado === 0 ? 0 :
                dados.faturado / dados.previsto;

            if (previsto_percent > 0.85) {
                classeCartao = 'bg-danger text-white';
                iconeCartao = 'fa fa-thumbs-down';
            } else if (previsto_percent > 0.60) {
                classeCartao = 'bg-warning text-white';
                iconeCartao = 'fa fa-cog fa-spin';
            } else {
                classeCartao = 'bg-success text-white';
                iconeCartao = 'fa fa-smile';
            }

            let cartao = `
                <div class="col-sm-6 col-md-3 mb-2">
                    <div class="card h-100 ${classeCartao}" onclick="orcamentoNested('${dados.cod}')">
                        <div class="d-flex px-3 py-2 small">

                            <div class="flex-grow-1 text-left">
                                <p class="mb-1 font-weight-bold">${dados.item}</p>

                                <div>
                                    <h6>
                                        ${Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(dados.adjudicado)} -
                                        ${Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(dados.faturado)} -
                                        <span>${Intl.NumberFormat("de-DE", {
                                            style: "percent",
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        }).format(adjudicado_percent)}</span>
                                    </h6>
                                </div>

                                <div>
                                    <h5>
                                        ${Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(dados.previsto)}
                                        <span class="h6">
                                            - ${Intl.NumberFormat("de-DE", {
                                                style: "percent",
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            }).format(previsto_percent)}
                                        </span>
                                    </h5>
                                </div>
                            </div>

                            <div class="pl-2 mt-auto">
                                <i class="fas ${iconeCartao} fa-3x"></i>
                            </div>

                        </div>
                    </div>
                </div>
            `;

            if (dados.tipo === 'Investimento') {
                containerInvestimentos.innerHTML += cartao;
            } else if (dados.tipo === 'Gastos' && dados.item === 'SubContratos') {
                containerProtocolos.innerHTML += cartao;
            } else {
                containerGastos.innerHTML += cartao;
            }
        });
    });
}


// ==========================================================
// ANO
// ==========================================================

function validaAno(ano) {

    ano = parseInt(ano, 10);

    if (isNaN(ano)) {
        alert("Ano inválido! Por favor insira um número.");
        return false;
    }

    if (ano < 2000 || ano > 2100) {
        alert("Ano fora do intervalo permitido (2000-2100).");
        return false;
    }

    return true;
}


function mudaAno() {

    var anoFormulario = document.getElementById('anoCorrente').value;

    if (!validaAno(anoFormulario)) {
        document.getElementById('anoCorrente').value = anoCorrente;
        return;
    }

    anoCorrente = anoFormulario;

    cartoes('dados/orcamentoDashboard.php?anoCorrente=' + anoCorrente);
}


function anoDefault() {

    document.getElementById('anoCorrente').value = anoCorrente;

    cartoes('dados/orcamentoDashboard.php?anoCorrente=' + anoCorrente);
}


// ==========================================================
// REDIRECIONAMENTOS
// ==========================================================

function orcamentoResults(itemProcurado) {

    var URL =
        "orcamentoResults.html?itemProcurado=" +
        itemProcurado +
        "&anoCorrente=" +
        anoCorrente;

    window.location.href = URL;
}


function orcamentoNested(itemProcurado) {

    var URL =
        "orcamentoNested.html?itemProcurado=" +
        itemProcurado +
        "&anoCorrente=" +
        anoCorrente;

    window.location.href = URL;
}


window.onload = anoDefault;


// ==========================================================
// EXECUÇÃO ORÇAMENTAL GERAL - PDF
// ==========================================================

async function exportarExecucaoGeralPDF() {

    const botao = document.getElementById('exportarExecucaoPDF');

    try {

        if (!window.jspdf || !window.jspdf.jsPDF) {
            throw new Error('A biblioteca jsPDF não está disponível.');
        }

        const ano = parseInt(document.getElementById('anoCorrente').value, 10);

        if (!validaAno(ano)) return;

        if (botao) {
            botao.disabled = true;
            botao.innerHTML =
                '<i class="fas fa-spinner fa-spin mr-1"></i> A gerar PDF...';
        }

        const response = await fetch(
            'dados/orcamentoDashboard.php?anoCorrente=' +
            encodeURIComponent(ano)
        );

        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}`);
        }

        const resultado = await response.json();

        const rubricas =
            Array.isArray(resultado)
                ? resultado
                : Array.isArray(resultado.rubricas)
                    ? resultado.rubricas
                    : [];

        if (rubricas.length === 0) {
            alert(`Não existem dados de execução orçamental para o ano ${ano}.`);
            return;
        }

        const doc = criarDocumentoExecucaoGeralPDF(rubricas, ano);

        //doc.save(`Execucao_Orcamental_${ano}.pdf`);
        window.open(doc.output('bloburl'), '_blank');

    } catch (error) {

        console.error('Erro ao gerar execução orçamental:', error);

        alert(
            'Não foi possível gerar o relatório de execução orçamental.\n\n' +
            error.message
        );

    } finally {

        if (botao) {
            botao.disabled = false;
            botao.innerHTML =
                '<i class="fas fa-file-pdf mr-1"></i> Execução Orçamental';
        }
    }
}


// ==========================================================
// CRIAR DOCUMENTO PDF
// ==========================================================

function criarDocumentoExecucaoGeralPDF(rubricas, ano) {

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    if (typeof doc.autoTable !== 'function') {
        throw new Error('A biblioteca jsPDF AutoTable não está disponível.');
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const marginLeft = 10;
    const marginRight = 10;
    const tableWidth = pageWidth - marginLeft - marginRight;

    let startY = 30;

    let totalPrevistoGeral = 0;
    let totalLimiteGeral = 0;
    let totalAdjudicadoGeral = 0;
    let totalFaturadoGeral = 0;

    let numeroProcessosGeral = 0;
    let numeroFaturasGeral = 0;

    const totaisPorTipoFatura = {};


    // ======================================================
    // FUNÇÕES AUXILIARES
    // ======================================================

    function numero(valor) {
        const resultado = Number(valor);
        return Number.isFinite(resultado) ? resultado : 0;
    }


    function moeda(valor) {
        return new Intl.NumberFormat('de-DE', {style: 'currency', currency: 'EUR'}).format(numero(valor));
    }


    function textoPDF(valor) {

        if (valor === null || valor === undefined) return '';

        return String(valor)
            .replace(/\u00A0/g, ' ')
            .replace(/[^\x20-\xFFÀ-ÿ]/g, '');
    }


    function dataPT(valor) {
        if (!valor) {return '';}

        const data = String(valor).substring(0, 10);
        const partes = data.split('-');
      
        if (partes.length !== 3) {return escapeHtml(valor);}
      
        const [ano, mes, dia] = partes;
      
        return `${dia}-${mes}-${ano}`;
    }


    function expediente(valor) {
        if (!valor) {return '';}

        const texto = String(valor).trim();
      
        if (/^[A-Za-z0-9]\.\d+\.\d+$/.test(texto)) {
          return texto;
        }
      
        const prefixo = texto.charAt(0);
        const registo = texto.slice(1, -2);
        const ano = texto.slice(-2);
        
      
        return `${prefixo}.${registo.padStart(5, '0')}.${ano}`;

    }


    // ======================================================
    // CABEÇALHO
    // ======================================================

    function adicionarCabecalho() {

        const dataGeracao = new Date().toLocaleDateString('pt-PT');

        doc.setTextColor(0, 0, 0);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('EXECUÇÃO ORÇAMENTAL GERAL', marginLeft, 10);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Ano: ${ano}`, marginLeft, 16);

        doc.setFontSize(8.5);
        doc.text(
            `Gerado em: ${dataGeracao}`,
            pageWidth - marginRight,
            10,
            { align: 'right' }
        );

        doc.setDrawColor(180, 180, 180);
        doc.line(marginLeft, 23, pageWidth - marginRight, 23);
    }


    function novaPagina() {

        doc.addPage();
        adicionarCabecalho();
        startY = 30;
    }


    // ======================================================
    // RUBRICA
    // ======================================================

    function obterNomeRubrica(rubrica) {

        return textoPDF(
            rubrica.item ||
            rubrica.designacao ||
            rubrica.rub_designacao ||
            rubrica.rubrica ||
            `Rubrica ${rubrica.cod || rubrica.rub_cod || '-'}`
        );
    }


    function adicionarRubrica(rubrica, processos) {

        if (startY > pageHeight - 40) {
            novaPagina();
        }

        const codigo =
            rubrica.cod ||
            rubrica.rub_cod ||
            rubrica.codigo ||
            '';

        const nome = obterNomeRubrica(rubrica);

        const titulo = [codigo, nome]
            .filter(Boolean)
            .join(' — ');

        const linhasTitulo = doc.splitTextToSize(titulo, tableWidth - 6);

        const altura = Math.max(
            10,
            5 + linhasTitulo.length * 4
        );

        doc.setFillColor(0, 123, 255);
        doc.rect(marginLeft, startY, tableWidth, altura, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);

        doc.text(
            linhasTitulo,
            marginLeft + 3,
            startY + 5,
            { lineHeightFactor: 1.15 }
        );

        doc.setTextColor(0, 0, 0);

        startY += altura + 2;


        // --------------------------------------------------
        // TOTAIS DA RUBRICA
        // --------------------------------------------------

        let previstoRubrica = numero(
            rubrica.previsto ||
            rubrica.valor_previsto
        );

        let limiteRubrica = 0;
        let adjudicadoRubrica = 0;
        let faturadoRubrica = 0;
        let numeroFaturasRubrica = 0;

        processos.forEach(processo => {

            limiteRubrica += numero(
                processo.val_max ||
                processo.limite
            );

            adjudicadoRubrica += numero(processo.adjudicado);

            const faturas =
                Array.isArray(processo.faturas)
                    ? processo.faturas
                    : [];

            faturadoRubrica += faturas.reduce(
                (total, fatura) =>
                    total + numero(fatura.fact_valor),
                0
            );

            numeroFaturasRubrica += faturas.length;
        });

        if (previstoRubrica === 0 && limiteRubrica > 0) {
            previstoRubrica = limiteRubrica;
        }


        doc.autoTable({

            startY,

            body: [
                [
                    {
                        content: 'Previsto',
                        styles: {
                            fontStyle: 'bold',
                            fillColor: [240, 240, 240]
                        }
                    },
                    {
                        content: moeda(previstoRubrica),
                        styles: { halign: 'right' }
                    },
                    {
                        content: 'Adjudicado',
                        styles: {
                            fontStyle: 'bold',
                            fillColor: [240, 240, 240]
                        }
                    },
                    {
                        content: moeda(adjudicadoRubrica),
                        styles: { halign: 'right' }
                    }
                ],

                [
                    {
                        content: 'Faturado',
                        styles: {
                            fontStyle: 'bold',
                            fillColor: [240, 240, 240]
                        }
                    },
                    {
                        content: moeda(faturadoRubrica),
                        styles: { halign: 'right' }
                    },
                    {
                        content: 'Processos / Faturas',
                        styles: {
                            fontStyle: 'bold',
                            fillColor: [240, 240, 240]
                        }
                    },
                    {
                        content: `${processos.length} / ${numeroFaturasRubrica}`,
                        styles: { halign: 'center' }
                    }
                ]
            ],

            theme: 'grid',

            margin: {
                left: marginLeft,
                right: marginRight
            },

            styles: {
                fontSize: 8,
                cellPadding: 1.8
            },

            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 55 },
                2: { cellWidth: 38 },
                3: { cellWidth: 67 }
            }
        });


        startY = doc.lastAutoTable.finalY + 5;


        return {
            previsto: previstoRubrica,
            limite: limiteRubrica,
            adjudicado: adjudicadoRubrica,
            faturado: faturadoRubrica,
            numeroFaturas: numeroFaturasRubrica
        };
    }


    // ======================================================
    // PROCESSO
    // ======================================================

    function adicionarProcesso(processo, totalFaturadoProcesso) {

        const padm =
            processo.padm ||
            processo.proces_check ||
            '-';

        const designacao = textoPDF(
            processo.designacao ||
            processo.proces_designacao ||
            'Processo sem designação'
        );

        const titulo = `${padm} — ${designacao}`;

        const linhasTitulo = doc.splitTextToSize(
            titulo,
            tableWidth - 6
        );

        const alturaLinha = 4;

        const alturaTitulo = Math.max(
            9,
            5 + linhasTitulo.length * alturaLinha
        );

        const alturaNecessaria = alturaTitulo + 38;

        if (startY > pageHeight - alturaNecessaria) {
            novaPagina();
        }


        doc.setFillColor(52, 58, 64);
        doc.rect(
            marginLeft,
            startY,
            tableWidth,
            alturaTitulo,
            'F'
        );

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);

        doc.text(
            linhasTitulo,
            marginLeft + 3,
            startY + 5,
            { lineHeightFactor: 1.15 }
        );

        doc.setTextColor(0, 0, 0);


        const limite = numero(
            processo.val_max ||
            processo.limite
        );

        const adjudicado = numero(processo.adjudicado);

        const saldo =
            processo.saldo !== undefined
                ? numero(processo.saldo)
                : limite - adjudicado;

        const faturas =
            Array.isArray(processo.faturas)
                ? processo.faturas
                : [];


        doc.autoTable({

            startY: startY + alturaTitulo + 2,

            body: [

                [
                    {
                        content: 'Regime',
                        styles: {
                            fontStyle: 'bold',
                            fillColor: [240, 240, 240]
                        }
                    },

                    processo.regime || '-',

                    {
                        content: 'Linha ORC.',
                        styles: {
                            fontStyle: 'bold',
                            fillColor: [240, 240, 240]
                        }
                    },

                    processo.linha_orcamento ||
                    processo.linha_orc ||
                    '-',

                    {
                        content: 'Linha SE.',
                        styles: {
                            fontStyle: 'bold',
                            fillColor: [240, 240, 240]
                        }
                    },

                    processo.linha_se || '-',

                    {
                        content: 'Limite',
                        styles: {
                            fontStyle: 'bold',
                            fillColor: [240, 240, 240]
                        }
                    },

                    {
                        content: moeda(limite),
                        styles: { halign: 'right' }
                    }
                ],

                [
                    {
                        content: 'Adjudicado',
                        styles: {
                            fontStyle: 'bold',
                            fillColor: [240, 240, 240]
                        }
                    },

                    {
                        content: moeda(adjudicado),
                        styles: { halign: 'right' }
                    },

                    {
                        content: 'Faturado',
                        styles: {
                            fontStyle: 'bold',
                            fillColor: [240, 240, 240]
                        }
                    },

                    {
                        content: moeda(totalFaturadoProcesso),
                        styles: { halign: 'right' }
                    },

                    {
                        content: 'Saldo',
                        styles: {
                            fontStyle: 'bold',
                            fillColor: [240, 240, 240]
                        }
                    },

                    {
                        content: moeda(saldo),
                        styles: { halign: 'right' }
                    },

                    {
                        content: '',
                        colSpan: 2
                    }
                ],

                [
                    {
                        content: 'N.º de faturas',
                        styles: {
                            fontStyle: 'bold',
                            fillColor: [240, 240, 240]
                        }
                    },

                    {
                        content: String(faturas.length),
                        styles: { halign: 'center' }
                    },

                    {
                        content: '',
                        colSpan: 6
                    }
                ]
            ],

            theme: 'grid',

            margin: {
                left: marginLeft,
                right: marginRight
            },

            styles: {
                fontSize: 7.5,
                cellPadding: 1.5,
                valign: 'middle',
                overflow: 'linebreak'
            },

            columnStyles: {
                0: { cellWidth: 22 },
                1: { cellWidth: 34 },
                2: { cellWidth: 21 },
                3: { cellWidth: 24 },
                4: { cellWidth: 19 },
                5: { cellWidth: 24 },
                6: { cellWidth: 18 },
                7: { cellWidth: 28 }
            },

            didDrawPage() {
                adicionarCabecalho();
            }
        });


        startY = doc.lastAutoTable.finalY + 3;
    }


    // ======================================================
    // FATURAS
    // ======================================================

    function adicionarFaturas(processo) {

        const faturas =
            Array.isArray(processo.faturas)
                ? processo.faturas
                : [];


        if (faturas.length === 0) {

            doc.autoTable({

                startY,

                body: [
                    ['Este processo não possui faturas.']
                ],

                theme: 'grid',

                margin: {
                    left: marginLeft,
                    right: marginRight
                },

                styles: {
                    fontSize: 8,
                    textColor: [100, 100, 100],
                    fillColor: [250, 250, 250],
                    cellPadding: 2
                }
            });

            startY = doc.lastAutoTable.finalY + 7;

            return;
        }


        const linhas = faturas.map(fatura => [

            textoPDF(fatura.ent_nome || '-'),

            dataPT(fatura.fact_data),

            [
                fatura.fact_tipo,
                fatura.fact_num
            ]
            .filter(Boolean)
            .join(' ') || '-',

            expediente(fatura.fact_expediente),

            fatura.fact_auto_num || '-',

            dataPT(fatura.fact_auto_data),

            numero(fatura.fact_iva),

            numero(fatura.fact_valor)
        ]);


        doc.autoTable({

            startY,

            head: [[
                'Entidade',
                'Data',
                'Fatura',
                'Expediente',
                'Auto',
                'Data do auto',
                'IVA',
                'Valor'
            ]],

            body: linhas,

            theme: 'grid',

            margin: {
                left: marginLeft,
                right: marginRight,
                top: 27,
                bottom: 15
            },

            styles: {
                fontSize: 6.7,
                cellPadding: 1.3,
                overflow: 'linebreak',
                valign: 'middle'
            },

            headStyles: {
                fillColor: [23, 162, 184],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },

            columnStyles: {
                0: { cellWidth: 42 },
                1: { cellWidth: 18, halign: 'center' },
                2: { cellWidth: 28 },
                3: { cellWidth: 26 },
                4: { cellWidth: 16, halign: 'center' },
                5: { cellWidth: 20, halign: 'center' },
                6: { cellWidth: 20, halign: 'right' },
                7: { cellWidth: 20, halign: 'right' }
            },

            didParseCell(data) {

                if (
                    data.section === 'body' &&
                    [6, 7].includes(data.column.index)
                ) {
                    data.cell.text = [
                        moeda(data.cell.raw)
                    ];
                }
            },

            didDrawPage() {
                adicionarCabecalho();
            }
        });


        startY = doc.lastAutoTable.finalY + 8;
    }


    // ======================================================
    // TOTAIS POR TIPO DE FATURA
    // ======================================================

    function acumularTipoFatura(faturas) {

        if (!Array.isArray(faturas)) return;

        faturas.forEach(fatura => {

            const tipo = String(
                fatura.fact_tipo ||
                'SEM TIPO'
            )
            .trim()
            .toUpperCase();

            if (!totaisPorTipoFatura[tipo]) {
                totaisPorTipoFatura[tipo] = {
                    quantidade: 0,
                    valor: 0
                };
            }

            totaisPorTipoFatura[tipo].quantidade += 1;
            totaisPorTipoFatura[tipo].valor += numero(fatura.fact_valor);
        });
    }


    // ======================================================
    // FATURAÇÃO MENSAL / VÁRIOS ANOS
    // ======================================================

    function calcularFaturacaoMensal() {

        const faturacaoPorMes = {};

        rubricas.forEach(rubrica => {

            const processos =
                Array.isArray(rubrica.processos)
                    ? rubrica.processos
                    : [];

            processos.forEach(processo => {

                const faturas =
                    Array.isArray(processo.faturas)
                        ? processo.faturas
                        : [];

                faturas.forEach(fatura => {

                    if (!fatura.fact_data) return;

                    const partes = String(fatura.fact_data)
                        .substring(0, 10)
                        .split('-');

                    if (partes.length !== 3) return;

                    const anoFatura = Number(partes[0]);
                    const mes = Number(partes[1]);

                    if (!anoFatura || mes < 1 || mes > 12) return;

                    const chave =
                        `${anoFatura}-${String(mes).padStart(2, '0')}`;

                    if (!Object.prototype.hasOwnProperty.call(
                        faturacaoPorMes,
                        chave
                    )) {
                        faturacaoPorMes[chave] = 0;
                    }

                    faturacaoPorMes[chave] += numero(fatura.fact_valor);
                });
            });
        });


        const chaves = Object.keys(faturacaoPorMes).sort();

        if (chaves.length === 0) {
            return {
                labels: [],
                valores: []
            };
        }


        const [anoInicial, mesInicial] =
            chaves[0].split('-').map(Number);

        const [anoFinal, mesFinal] =
            chaves[chaves.length - 1].split('-').map(Number);


        const nomesMeses = [
            'Jan.',
            'Fev.',
            'Mar.',
            'Abr.',
            'Mai.',
            'Jun.',
            'Jul.',
            'Ago.',
            'Set.',
            'Out.',
            'Nov.',
            'Dez.'
        ];


        const labels = [];
        const valores = [];

        let a = anoInicial;
        let m = mesInicial;


        while (
            a < anoFinal ||
            (a === anoFinal && m <= mesFinal)
        ) {

            const chave =
                `${a}-${String(m).padStart(2, '0')}`;

            labels.push(
                `${nomesMeses[m - 1]} ${a}`
            );

            valores.push(
                faturacaoPorMes[chave] || 0
            );

            m++;

            if (m > 12) {
                m = 1;
                a++;
            }
        }


        return {
            labels,
            valores
        };
    }


    // ======================================================
    // GRÁFICO
    // ======================================================

    function criarGraficoMensal() {

        const {
            labels,
            valores
        } = calcularFaturacaoMensal();


        if (labels.length === 0) return null;


        const canvas = document.createElement('canvas');

        canvas.width = 1200;
        canvas.height = 500;

        const ctx = canvas.getContext('2d');


        const pluginValores = {

            id: 'valoresExecucaoOrcamental',

            afterDatasetsDraw(chart) {

                const { ctx } = chart;

                ctx.save();

                ctx.font = 'bold 16px Arial';
                ctx.fillStyle = '#212529';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';

                const dataset = chart.data.datasets[0];
                const meta = chart.getDatasetMeta(0);

                meta.data.forEach((barra, index) => {

                    const valor =
                        Number(dataset.data[index]) || 0;

                    if (valor === 0) return;

                    ctx.fillText(
                        moeda(valor),
                        barra.x,
                        barra.y - 8
                    );
                });

                ctx.restore();
            }
        };


        const grafico = new Chart(ctx, {

            type: 'bar',

            data: {

                labels,

                datasets: [{
                    label: 'Faturação',
                    data: valores,
                    backgroundColor: '#17a2b8',
                    borderColor: '#117a8b',
                    borderWidth: 1
                }]
            },

            plugins: [
                pluginValores
            ],

            options: {

                responsive: false,
                animation: false,
                maintainAspectRatio: false,

                layout: {
                    padding: {
                        top: 30,
                        right: 10,
                        left: 10,
                        bottom: 10
                    }
                },

                plugins: {
                    legend: {
                        display: false
                    }
                },

                scales: {

                    x: {

                        grid: {
                            display: false
                        },

                        ticks: {
                            autoSkip: true,
                            maxRotation: 45,
                            minRotation: 0
                        }
                    },

                    y: {

                        beginAtZero: true,

                        ticks: {

                            callback(valor) {

                                return new Intl.NumberFormat(
                                    'pt-PT',
                                    {
                                        notation: 'compact',
                                        maximumFractionDigits: 1
                                    }
                                ).format(valor);
                            }
                        }
                    }
                }
            }
        });


        grafico.update();

        const imagem =
            canvas.toDataURL('image/png', 1);

        grafico.destroy();


        return {
            imagem,
            valores
        };
    }


    // ======================================================
    // RESUMO GERAL
    // ======================================================

    function adicionarResumoGeral() {

        const tipos = Object.entries(
            totaisPorTipoFatura
        ).sort(
            ([a], [b]) =>
                a.localeCompare(b, 'pt-PT')
        );


        const linhas = [

            [
                'Total previsto',
                '',
                moeda(totalPrevistoGeral)
            ],

            [
                'Total limite dos processos',
                '',
                moeda(totalLimiteGeral)
            ],

            [
                'Total adjudicado',
                '',
                moeda(totalAdjudicadoGeral)
            ],

            [
                'Total faturado',
                '',
                moeda(totalFaturadoGeral)
            ],

            [
                'Saldo',
                '',
                moeda(
                    totalLimiteGeral -
                    totalAdjudicadoGeral
                )
            ],

            [
                'Processos',
                '',
                String(numeroProcessosGeral)
            ],

            [
                'Faturas',
                '',
                String(numeroFaturasGeral)
            ]
        ];


        if (tipos.length > 0) {

            linhas.push([
                'Faturação por tipo',
                'Registos',
                'Valor'
            ]);

            tipos.forEach(([tipo, totais]) => {

                linhas.push([
                    tipo,
                    String(totais.quantidade),
                    moeda(totais.valor)
                ]);
            });
        }


        const alturaEstimada =
            25 +
            linhas.length * 7;


        if (startY > pageHeight - alturaEstimada) {
            novaPagina();
        }


        doc.setFillColor(33, 37, 41);

        doc.rect(
            marginLeft,
            startY,
            tableWidth,
            9,
            'F'
        );


        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);

        doc.text(
            'RESUMO GERAL',
            marginLeft + 3,
            startY + 6
        );

        doc.setTextColor(0, 0, 0);


        const indiceTipos = 7;


        doc.autoTable({

            startY: startY + 11,

            body: linhas,

            theme: 'grid',

            margin: {
                left: marginLeft,
                right: marginRight
            },

            tableWidth: 120,

            styles: {
                fontSize: 9,
                cellPadding: 2,
                valign: 'middle'
            },

            columnStyles: {
                0: { cellWidth: 65 },
                1: {
                    cellWidth: 20,
                    halign: 'center'
                },
                2: {
                    cellWidth: 35,
                    halign: 'right'
                }
            },

            didParseCell(data) {

                if (data.row.index < indiceTipos) {

                    if (data.column.index === 0) {

                        data.cell.styles.fontStyle = 'bold';

                        data.cell.styles.fillColor = [
                            245,
                            245,
                            245
                        ];
                    }

                    if (data.column.index === 1) {

                        data.cell.styles.fillColor = [
                            245,
                            245,
                            245
                        ];
                    }
                }


                if (
                    tipos.length > 0 &&
                    data.row.index === indiceTipos
                ) {

                    data.cell.styles.fillColor = [
                        23,
                        162,
                        184
                    ];

                    data.cell.styles.textColor = [
                        255,
                        255,
                        255
                    ];

                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });


        startY = doc.lastAutoTable.finalY + 8;
    }


    // ======================================================
    // GRÁFICO GERAL
    // ======================================================

    function adicionarGraficoGeral() {

        const grafico = criarGraficoMensal();

        if (!grafico) return;


        const alturaGrafico = 72;


        if (
            startY >
            pageHeight -
            alturaGrafico -
            20
        ) {
            novaPagina();
        }


        const total = grafico.valores.reduce(
            (acumulado, valor) =>
                acumulado + valor,
            0
        );


        doc.setFillColor(33, 37, 41);

        doc.rect(
            marginLeft,
            startY,
            tableWidth,
            9,
            'F'
        );


        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);

        doc.text(
            'FATURAÇÃO POR MÊS / ANO',
            marginLeft + 3,
            startY + 6
        );


        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        doc.text(
            `Total: ${moeda(total)}`,
            pageWidth - marginRight - 3,
            startY + 6,
            { align: 'right' }
        );


        doc.addImage(
            grafico.imagem,
            'PNG',
            marginLeft,
            startY + 11,
            tableWidth,
            alturaGrafico
        );


        startY += alturaGrafico + 17;
    }


    // ======================================================
    // CONSTRUIR DOCUMENTO
    // ======================================================

    adicionarCabecalho();


    rubricas.forEach(rubrica => {

        const processos =
            Array.isArray(rubrica.processos)
                ? rubrica.processos
                : [];


        const totaisRubrica =
            adicionarRubrica(
                rubrica,
                processos
            );


        totalPrevistoGeral += totaisRubrica.previsto;
        totalLimiteGeral += totaisRubrica.limite;
        totalAdjudicadoGeral += totaisRubrica.adjudicado;
        totalFaturadoGeral += totaisRubrica.faturado;

        numeroProcessosGeral += processos.length;
        numeroFaturasGeral += totaisRubrica.numeroFaturas;


        processos.forEach(processo => {

            const faturas =
                Array.isArray(processo.faturas)
                    ? processo.faturas
                    : [];


            const totalFaturadoProcesso =
                faturas.reduce(
                    (total, fatura) =>
                        total +
                        numero(fatura.fact_valor),
                    0
                );


            acumularTipoFatura(faturas);

            adicionarProcesso(
                processo,
                totalFaturadoProcesso
            );

            adicionarFaturas(processo);
        });


        startY += 3;
    });


    // Resumo primeiro
    adicionarResumoGeral();

    // Gráfico depois
    adicionarGraficoGeral();

    // Paginação
    adicionarPaginacaoExecucaoPDF(doc);


    return doc;
}


// ==========================================================
// PAGINAÇÃO
// ==========================================================

function adicionarPaginacaoExecucaoPDF(doc) {

    const totalPaginas = doc.getNumberOfPages();


    for (let pagina = 1; pagina <= totalPaginas; pagina++) {

        doc.setPage(pagina);

        const pageWidth =
            doc.internal.pageSize.getWidth();

        const pageHeight =
            doc.internal.pageSize.getHeight();


        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(90, 90, 90);


        doc.text(
            `Página ${pagina} / ${totalPaginas}`,
            pageWidth - 10,
            pageHeight - 7,
            { align: 'right' }
        );
    }
}
