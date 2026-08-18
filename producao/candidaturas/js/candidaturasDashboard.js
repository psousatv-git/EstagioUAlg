// Variáveis globais
var allData = [];
var dadosProgresso = [];
var dadosGrafico = [];
var titulo_colunas = [];
var nome_candidatura = [];

// Função para converter string em número
function intVal(i) {
    return typeof i === 'string'
        ? i.replace(/\./g, '').replace(',', '.') * 1
        : typeof i === 'number' ? i : 0;
}

// Redireciona ao selecionar uma candidatura
function candidaturaRedirected(itemProcurado) {
    var URL = "candidaturasGeral.html?itemProcurado=" + encodeURIComponent(itemProcurado); // alterar para candidaturaNested
    window.location.href = URL;
}


// FORMATADORES GLOBAIS
const Formatters = {
    currency: new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }),
    number: new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }),
    percent: new Intl.NumberFormat('de-DE', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
};

$(document).ready(function () {

    // 🔹 Converte valores para cálculos
    function intVal(i) {
        return typeof i === 'string'
            ? parseFloat(i.replace(/[^\d,-]/g, '').replace(',', '.')) || 0
            : typeof i === 'number'
                ? i
                : 0;
    }

    // 🔹 Calcula coluna Apoio
    function calcularApoio(row) {
        return (row.elegivel || 0) * (row.taxa || 0);
    }

    fetch("dados/candidaturasDashboard.php")
        .then(response => response.json())
        .then(data => {

            var dataTable = $('#tabela').DataTable({
                searching: false,
                lengthChange: false,
                aaData: data,

                columns: [
                    { data: 'candidatura' },

                    {
                        data: 'taxa',
                        className: 'dt-body-right',
                        render: function (data, type) {
                            if (type === 'sort' || type === 'type') return data || 0;
                            return Formatters.percent.format(data || 0);
                        }
                    },

                    {
                        data: 'elegivel',
                        className: 'dt-body-right',
                        render: function (data, type) {
                            if (type === 'sort' || type === 'type') return data || 0;
                            return Formatters.number.format(data || 0);
                        }
                    },

                    {
                        data: 'adjudicado',
                        className: 'dt-body-right',
                        render: function (data, type) {
                            if (type === 'sort' || type === 'type') return data || 0;
                            return Formatters.number.format(data || 0);
                        }
                    },

                    {
                        data: 'faturado',
                        className: 'dt-body-right',
                        render: function (data, type) {
                            if (type === 'sort' || type === 'type') return data || 0;
                            return Formatters.number.format(data || 0);
                        }
                    },

                    // ✅ Coluna calculada Apoio
                    {
                        data: null,
                        className: 'dt-body-right',
                        render: function (data, type, row) {
                            const valor = calcularApoio(row);
                            if (type === 'sort' || type === 'type') return valor;
                            return Formatters.number.format(valor);
                        }
                    },

                    {
                        data: 'recebido',
                        className: 'dt-body-right',
                        render: function (data, type) {
                            if (type === 'sort' || type === 'type') return data || 0;
                            return Formatters.number.format(data || 0);
                        }
                    },

                    {
                        data: 'faturado_recebido_percent',
                        className: 'dt-body-right',
                        render: function (data, type) {
                            if (type === 'sort' || type === 'type') return data || 0;
                            return Formatters.percent.format(data || 0);
                        }
                    },

                    {
                        data: 'elegivel_recebido_percent',
                        className: 'dt-body-right',
                        render: function (data, type) {
                            if (type === 'sort' || type === 'type') return data || 0;
                            return Formatters.percent.format(data || 0);
                        }
                    },

                    { data: 'inicio', visible: false }
                ],

                order: [[1, 'desc']],

                // ✅ Totais no footer
                footerCallback: function () {
                    var api = this.api();

                    [2, 3, 4, 5, 6].forEach(function (colIndex) {

                        let totalGlobal = 0;
                        let totalPagina = 0;

                        if (colIndex === 5) {
                            // Coluna calculada Apoio
                            totalGlobal = api.rows().data().toArray()
                                .reduce((sum, row) => sum + calcularApoio(row), 0);

                            totalPagina = api.rows({ page: 'current' }).data().toArray()
                                .reduce((sum, row) => sum + calcularApoio(row), 0);

                        } else {
                            totalGlobal = api.column(colIndex).data()
                                .reduce((a, b) => intVal(a) + intVal(b), 0);

                            totalPagina = api.column(colIndex, { page: 'current' }).data()
                                .reduce((a, b) => intVal(a) + intVal(b), 0);
                        }

                        $(api.column(colIndex).footer()).html(
                            `<div class="text-right">
                                ${Formatters.currency.format(totalPagina)}<br>
                                <small>(Global: ${Formatters.currency.format(totalGlobal)})</small>
                            </div>`
                        );
                    });
                }
            });

            console.table(data);
            
            // 🔹 Arrays auxiliares
            dataTable.rows().every(function () {
                var rowData = this.data();

                allData.push(rowData);
                titulo_colunas = Object.keys(rowData);
                nome_candidatura.push(rowData.candidatura);

                dadosProgresso.push([
                    rowData.candidatura,
                    rowData.recebido,
                    rowData.elegivel_recebido_percent
                ]);

                dadosGrafico.push(rowData.recebido);
            });

            // 🔹 Cartões
            var containerOutroEstado = $('#cartoesCandidaturaOutroEstado');
            var containerCurso = $('#cartoesCandidaturaEmCurso');
            var containerEncerrada = $('#cartoesCandidaturaEncerrada');

            containerOutroEstado.empty();
            containerCurso.empty();
            containerEncerrada.empty();

            data.forEach(dados => {

                let classeCartao, iconeCartao;

                if(dados.estado != 'Em Curso' && dados.estado != 'Encerrada'){
                    classeCartao = 'bg-dark text-white';
                    iconeCartao = 'fa fa-hourglass-half';
                } else {
                    if (dados.faturado_recebido_percent < 0.50) {
                        classeCartao = 'bg-danger text-white';
                        iconeCartao = 'fa fa-thumbs-down';
                    } else if (dados.faturado_recebido_percent < 0.70) {
                        classeCartao = 'bg-warning text-dark';
                        iconeCartao = 'fa fa-exclamation-triangle';
                    } else if (dados.faturado_recebido_percent < 0.85) {
                        classeCartao = 'bg-primary text-white';
                        iconeCartao = 'fa fa-cog fa-spin';
                    } else {
                        classeCartao = 'bg-success text-white';
                        iconeCartao = 'fa fa-smile';
                    }
                }

                let cartao = `
                <div class="col-sm-6 col-md-3 mb-2">
                    <div class="card h-100 ${classeCartao}" onclick="candidaturaRedirected('${dados.candidatura}')">
                        <div class="d-flex px-3 py-2 small">
                            <div class="flex-grow-1 text-left">
                                <p class="mb-1 font-weight-bold">${dados.aviso}: ${dados.candidatura}</p>

                                <div>
                                    <h6>
                                        ${Formatters.currency.format(dados.faturado)} -
                                        ${Formatters.currency.format(dados.recebido)} -
                                        ${Formatters.percent.format(dados.faturado_recebido_percent)}
                                    </h6>
                                </div>

                                <div>
                                    <h5>
                                        ${Formatters.currency.format(dados.elegivel)}
                                        <span class="h6">
                                            - ${Formatters.percent.format(dados.elegivel_recebido_percent)}
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

                if (dados.estado === 'Em Curso') {
                    containerCurso.append(cartao);
                } else if(dados.estado === 'Encerrada') {
                    containerEncerrada.append(cartao);
                } else {
                    containerOutroEstado.append(cartao);
                }
            });

        })
        .catch(error => console.error("Erro ao carregar dados:", error));

    // 🔹 Outras tabelas ou indicadores
    veIndicador();

});



// Indicadores Gerais por Candidatura e por Processo
function veIndicador() {
    fetch('dados/candidaturasIndicadores.php')
      .then(response => response.json())
      .then(data => {

        const botoesContainer = $('#botoesIndicadores');
        const tabelaContainer = $('#tabelaIndicadores');

        botoesContainer.empty();
        tabelaContainer.empty();

        // CSS aplicado diretamente
        const style = `
        <style>
            table.dataTable thead th {
                vertical-align: middle !important;
                text-align: center;
            }
            table.dataTable thead tr:first-child th {
                border-bottom: none;
                font-weight: bold;
            }
            table.dataTable thead tr:nth-child(2) th {
                border-top: none;
                font-weight: normal;
            }
            .dt-body-right {
                text-align: right;
            }
        </style>
        `;
        tabelaContainer.append(style);

        // Agrupa dados por programa
        const grupos = {};
        data.forEach(item => {
            const key = `${item.programa}`;
            if (!grupos[key]) grupos[key] = [];
            grupos[key].push(item);
        });

        const path = "../../global/imagens";

        Object.keys(grupos).forEach((key, index) => {

            const groupData = grupos[key];
            const logoName = groupData[0].logo || '';
            const logoURL = logoName ? `${path}/${logoName}` : '';

            // BOTÃO LOGOTIPO   
            botoesContainer.append(`
                <div class="col-auto mb-2 d-flex justify-content-center">
                    <button class="btn btn-outline-primary text-white fw-bold group-btn"
                        style="background-image:url('${logoURL}');
                               background-size:contain;
                               background-repeat:no-repeat;
                               background-position:center 10px;
                               padding-top:50px; min-width:120px;"
                        data-group-index="${index}">
                    </button>
                </div>
            `);

            const tableId = `tabela_${index}`;

            // TABELA COM HEADER DUPLO
            tabelaContainer.append(`
                <div class="col-12 table-responsive mb-3" id="container_${tableId}" style="display:none;">
                    <table id="${tableId}" class="display table table-sm table-striped table-hover small" style="width:100%;">
                        
                        <thead>
                            <tr>
                                <th rowspan="2">Aviso</th>
                                <th rowspan="2">Candidatura</th>
                                <th rowspan="2">Processo</th>
                                <th colspan="2">Valores</th>
                                <th colspan="2">Rede (Km)</th>
                                <th colspan="2">Ramais (un)</th>
                            </tr>
                            <tr>
                                <th>Adjudicado</th>
                                <th>Faturado</th>
                                <th>Previsto</th>
                                <th>Executado</th>
                                <th>Previsto</th>
                                <th>Executado</th>
                            </tr>
                        </thead>

                        <tfoot>
                            <tr>
                                <th colspan="3" class="text-right">Totais</th>
                                <th></th>
                                <th></th>
                                <th></th>
                                <th></th>
                                <th></th>
                                <th></th>
                            </tr>
                        </tfoot>

                    </table>
                </div>
            `);

            // DATATABLE
            const table = $(`#${tableId}`).DataTable({
                data: groupData,
                columns: [
                    { data: 'aviso' },
                    { data: 'candidatura' },
                    { data: 'processo_nome' },

                    {
                        data: 'adjudicado_por_processo',
                        className: 'dt-body-right',
                        render: data => Formatters.currency.format(Number(data) || 0)
                    },
                    {
                        data: 'faturado_por_processo',
                        className: 'dt-body-right',
                        render: data => Formatters.currency.format(Number(data) || 0)
                    },

                    {
                        data: 'KmRede_previsto',
                        className: 'dt-body-right',
                        render: data => Formatters.number.format(Number(data) || 0)
                    },
                    {
                        data: 'KmRede_executado',
                        className: 'dt-body-right',
                        render: data => Formatters.number.format(Number(data) || 0)
                    },

                    {
                        data: 'numRamais_previsto',
                        className: 'dt-body-right',
                        render: data => Formatters.number.format(Number(data) || 0)
                    },
                    {
                        data: 'numRamais_executado',
                        className: 'dt-body-right',
                        render: data => Formatters.number.format(Number(data) || 0)
                    }
                ],

                paging: false,
                searching: false,
                info: false,
                autoWidth: false,

                footerCallback: function () {
                    const api = this.api();

                    const soma = col =>
                        api.column(col).data().reduce((a, b) => a + (parseFloat(b) || 0), 0);

                    $(api.column(3).footer()).html(Formatters.currency.format(soma(3))).addClass('text-right');
                    $(api.column(4).footer()).html(Formatters.currency.format(soma(4))).addClass('text-right');

                    $(api.column(5).footer()).html(Formatters.number.format(soma(5)) + ' km').addClass('text-right');
                    $(api.column(6).footer()).html(Formatters.number.format(soma(6)) + ' km').addClass('text-right');

                    $(api.column(7).footer()).html(Formatters.number.format(soma(7))).addClass('text-right');
                    $(api.column(8).footer()).html(Formatters.number.format(soma(8))).addClass('text-right');
                }
            });

        });

        // EVENTO BOTÕES
        $('.group-btn').on('click', function () {
            const index = $(this).data('group-index');
            tabelaContainer.children().hide();
            $(`#container_tabela_${index}`).slideDown();
        });

      })
      .catch(error => console.error('Erro ao buscar dados:', error));
}