// ==========================================================
// FUNÇÕES GLOBAIS DE APOIO
// ==========================================================
function formatNumero(valor) {
  const resultado = Number(valor);
  return Number.isFinite(resultado) ? resultado : 0;
}

function formatCurrency(valor) {
  return new Intl.NumberFormat('de-DE', {style: 'currency', currency: 'EUR'}).format(formatNumero(valor));
}

function formatDate(valor) {
  if (!valor) {return '';}

  const data = String(valor).substring(0, 10);
  const partes = data.split('-');

  if (partes.length !== 3) {return escapeHtml(valor);}

  const [ano, mes, dia] = partes;

  return `${dia}-${mes}-${ano}`;
}

function formatPercentage(valor) {

  const resultado = Number(valor);

  if (!Number.isFinite(resultado)) { return '';}

  return `${resultado.toLocaleString('pt-PT', {minimumFractionDigits: 0, maximumFractionDigits: 2})}%`;
}

function escapeHtml(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatExpediente(valor) {

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

$(document).ready(function () {
  const queryParams = getQueryParams();
  let table;

  let dadosExportacao = {rubrica: {}, orcamentos: []};

  // ==========================================================
  // FUNÇÕES DE APOIO AOS CÁLCULOS
  // ==========================================================
  
  function calcularFaturadoProcesso(processo) {
    
    const faturas = Array.isArray(processo.faturas) ? processo.faturas : [];
    
    return faturas.reduce((total, fatura) => total + formatNumero(fatura.fact_valor), 0);

  }

  function calcularTotaisOrcamento(orcamento) {
    
    const processos = Array.isArray(orcamento.processos) ? orcamento.processos : [];
    const totalOrcamento = formatNumero(orcamento.orcamento);
    const totalAdjudicado = processos.reduce((total, processo) => total + formatNumero(processo.adjudicado), 0);
    const totalFaturado = processos.reduce((total, processo) => total + calcularFaturadoProcesso(processo), 0);
    const saldo = totalAdjudicado !== 0 ? totalOrcamento - totalAdjudicado : totalOrcamento;

    return {
      totalOrcamento,
      totalAdjudicado,
      totalFaturado,
      saldo
    };
  }

  function prepararDados(data) {
    data.forEach(orcamento => {

      const processos = Array.isArray(orcamento.processos) ? orcamento.processos : [];

      processos.forEach(processo => {
        processo.val_max = formatNumero(processo.val_max);
        processo.adjudicado = formatNumero(processo.adjudicado);
        processo.faturado = calcularFaturadoProcesso(processo);

        processo.saldo = processo.adjudicado !== 0
          ? processo.val_max - processo.adjudicado
          : processo.val_max;
      });

      const totais = calcularTotaisOrcamento(orcamento);

      orcamento.total_orcamento = totais.totalOrcamento;
      orcamento.total_adjudicado = totais.totalAdjudicado;
      orcamento.total_faturado = totais.totalFaturado;
      orcamento.saldo = totais.saldo;

    });

    return data;
  }

  // ==========================================================
  // NESTED ROWS DOS PROCESSOS
  // ==========================================================
  function formatNested(processos) {
    if (!Array.isArray(processos) || processos.length === 0) {
      return '<div class="p-2 text-muted">Sem processos.</div>';
    }

    const rows = [...processos].sort((a, b) =>
      String(a.designacao || '').localeCompare(
        String(b.designacao || ''),
        'pt-PT'
      )
    );

    let html = `
      <table class="table nested table-dark mb-0 small">
        <thead>
          <tr>
            <th>Regime</th>
            <th>Linha ORC.</th>
            <th>Linha SE.</th>
            <th>Designação</th>
            <th class="text-center">Processos</th>
            <th class="text-center">Planeado</th>
            <th class="text-center">Faturado</th>
            <th class="text-center">Saldo</th>
            <th style="width: 45px;">Faturas</th>
            <th class="text-center" style="width: 95px;">Exportar</th>
          </tr>
        </thead>

        <tbody>
    `;

    rows.forEach(processo => {
      const processoId = String(processo.proces_check);

      const temFaturas =
        Array.isArray(processo.faturas) &&
        processo.faturas.length > 0;

      html += `
        <tr class="linha-processo" data-processo-id="${escapeHtml(processoId)}">
          
          <td>${escapeHtml(processo.regime || '')}</td>
          <td>${escapeHtml(processo.linha_orcamento || '')}</td>
          <td>${escapeHtml(processo.linha_se || '')}</td>
          <td>
            <a
              href="#"
              class="text-white link-processo"
              title="Abrir processo">
              ${escapeHtml(processo.designacao || '')}
            </a>
          </td>
          <td class="text-right">${formatCurrency(processo.val_max)}</td>
          <td class="text-right">${formatCurrency(processo.adjudicado)}</td>
          <td class="text-right">${formatCurrency(processo.faturado)}</td>
          <td class="text-right">${formatCurrency(processo.saldo)}</td>
          <!-- FATURAS -->
          <td class="text-center align-middle">${temFaturas ? `
            <button
              type="button"
              class="btn btn-sm btn-outline-light btn-faturas"
              data-processo-id="${escapeHtml(processoId)}"
              title="Ver faturas">
              <i class="fa-solid fa-plus"></i>
            </button>`: `
            <span class="text-white-50" title="Sem faturas">
              <i class="fa-solid fa-minus"></i>
            </span>`}
          </td>
          <!-- EXPORTAÇÃO -->
          <td class="text-center align-middle">
            <div class="d-flex flex-nowrap justify-content-center">
              <button
                type="button"
                class="btn btn-sm btn-danger btn-exportar-processo-pdf mr-1"
                data-processo-id="${escapeHtml(processoId)}"
                title="Exportar processo para PDF">
                <i class="fa-solid fa-file-pdf"></i>
              </button>

              <button
                type="button"
                class="btn btn-sm btn-success btn-exportar-processo-excel"
                data-processo-id="${escapeHtml(processoId)}"
                title="Exportar processo para Excel">
                <i class="fa-solid fa-file-excel"></i>
              </button>
            </div>
          </td>
        </tr>
        <tr
          id="faturas-${escapeHtml(processoId)}"
          class="linha-faturas"
          style="display: none;">
          <td colspan="10" class="p-0">${formatFaturas(processo.faturas)}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    return html;
  }

  // ==========================================================
  // TABELA DAS FATURAS DE CADA PROCESSO
  // ==========================================================
  function formatFaturas(faturas) {
    if (!Array.isArray(faturas) || faturas.length === 0) {
      return `
        <div class="bg-light text-muted p-3">
          Este processo não possui faturas.
        </div>
      `;
    }

    const faturasOrdenadas = [...faturas].sort((a, b) => {
      
      const dataA = a.fact_data ? new Date(a.fact_data).getTime() : 0;
      const dataB = b.fact_data ? new Date(b.fact_data).getTime() : 0;

      return dataA - dataB;
    });

    const totalFaturas = faturasOrdenadas.reduce((total, fatura) => total + formatNumero(fatura.fact_valor), 0);

    let html = `
      <div class="bg-light p-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <strong class="text-dark">Faturas do processo</strong>
          <span class="badge badge-warning">${faturasOrdenadas.length}
            ${faturasOrdenadas.length === 1 ? 'fatura' : 'faturas'}
          </span>
        </div>

        <div class="table-responsive">
          <table class="table table-sm table-bordered table-striped bg-white mb-0">
            <thead class="thead-light">
              <tr>
                <th>Entidade</th>
                <th>Expediente</th>
                <th>Tipo</th>  
                <th>Auto</th>
                <th>Data do auto</th>
                <th>Data da fatura</th>
                <th>N.º da fatura</th>              
                <th class="text-right">IVA</th>
                <th class="text-right">Valor</th>
              </tr>
            </thead>

            <tbody>
    `;

    faturasOrdenadas.forEach(fatura => {
      html += `
        <tr>
          <td>${escapeHtml(fatura.ent_nome || '')}</td>
          <td>${formatExpediente(fatura.fact_expediente || '')}</td>
          <td>
            <span class="badge badge-info">${escapeHtml(fatura.fact_tipo || '')}</span>
          </td>  
          <td>${escapeHtml(fatura.fact_auto_num || '')}</td>
          <td>${formatDate(fatura.fact_auto_data)}</td>
          <td>${formatDate(fatura.fact_data)}</td>
          <td>${escapeHtml(fatura.fact_num || '')}</td>
          <td class="text-right">${formatCurrency(fatura.fact_iva)}</td>
          <td class="text-right font-weight-bold">${formatCurrency(fatura.fact_valor)}</td>
        </tr>
      `;
    });

    html += `
            </tbody>
            <tfoot>
              <tr>
                <th colspan="8" class="text-right">Total faturado</th>
                <th class="text-right">${formatCurrency(totalFaturas)}</th>
              </tr>
            </tfoot>
          </table>
        </div>

      </div>
    `;

    return html;
  }
  
  // ==========================================================
  // TÍTULO DA PÁGINA
  // ==========================================================
  function renderTitulo(rubrica, data) {
    const ano = data.length > 0
      ? data[0].ano
      : queryParams.anoCorrente || '';

    $('#titulo').html(`
      <div class="row no-gutters align-items-center mb-2">

        <div class="col-10">
          <div class="d-flex justify-content-start bg-primary text-white text-truncate px-3 py-2">
            ${rubrica.rubrica || ''}: ${rubrica.tipo || ''} - ${rubrica.grupo || ''} - ${rubrica.descritivo || ''}
          </div>
        </div>

        <div class="col-2">
          <divclass="d-flex justify-content-end px-3 py-2" style="padding: 6px 16px; min-height: 50px;">
            
            <a href="orcamentoDashboard.html" 
              class="btn btn-info mr-1" style="padding: 6px 14px;" title="Detalhes">
              <i class="fa-solid fa-arrow-left text-light"></i>
            </a>

            <a href="orcamentoNested.html?itemProcurado=${encodeURIComponent(rubrica.rubrica || '')}&anoCorrente=${encodeURIComponent(ano)}"
              class="btn btn-secondary mr-1" style="padding: 6px 14px;" title="Atualizar">
              <i class="fa-solid fa-rotate text-light"></i>
            </a>

          </div>
        </div>

      </div>
    `);
  }

  // ==========================================================
  // KPIs
  // ==========================================================
  function renderKpis(data) {
    const totais = data.reduce(
      (acc, orcamento) => {
        acc.totalOrcamento += formatNumero(orcamento.total_orcamento);
        acc.totalAdjudicado += formatNumero(orcamento.total_adjudicado);
        acc.totalFaturado += formatNumero(orcamento.total_faturado);

        return acc;
      },
      {
        totalOrcamento: 0,
        totalAdjudicado: 0,
        totalFaturado: 0
      }
    );

    const saldoTitulo = totais.totalAdjudicado !== 0
      ? totais.totalOrcamento - totais.totalAdjudicado
      : totais.totalOrcamento;

    $('#kpiValores').html(`
      <div class="row align-items-center mb-2">

        <!-- ORÇAMENTO -->
        <div class="col-md-2">
          <div class="card bg-primary text-white h-100">
            <div class="card-body py-2 px-2">
              <div class="small">Orçamento</div>

              <div class="text-right font-weight-bold">
                ${formatCurrency(totais.totalOrcamento)}
              </div>
            </div>
          </div>
        </div>

        <!-- PLANO DE PAGAMENTOS - inicialmente ADJUDICADO -->
        <div class="col-md-2">
          <div class="card bg-secondary text-white h-100">
            <div class="card-body py-2 px-2">
              <div class="small">Planeado</div>

              <div class="text-right font-weight-bold">
                ${formatCurrency(totais.totalAdjudicado)}
              </div>
            </div>
          </div>
        </div>

        <!-- FATURADO -->
        <div class="col-md-2">
          <div class="card bg-warning text-dark h-100">
            <div class="card-body py-2 px-2">
              <div class="small">Faturado</div>

              <div class="text-right font-weight-bold">
                ${formatCurrency(totais.totalFaturado)}
              </div>
            </div>
          </div>
        </div>

        <!-- SALDO -->
        <div class="col-md-2">
          <div class="card bg-success text-white h-100">
            <div class="card-body py-2 px-2">
              <div class="small">Saldo</div>

              <div class="text-right font-weight-bold">
                ${formatCurrency(saldoTitulo)}
              </div>
            </div>
          </div>
        </div>

        <!-- BOTÕES -->
        <div class="col-md-4 text-right">

          <button
            id="exportarPDF"
            class="btn btn-danger btn-lg shadow-sm mr-2"
            title="Exportar PDF"
          >
            <i class="fa-solid fa-file-pdf"></i>
          </button>

          <button
            id="exportarExcel"
            class="btn btn-success btn-lg shadow-sm"
            title="Exportar Excel"
          >
            <i class="fa-solid fa-file-excel"></i>
          </button>

        </div>

      </div>
    `);

    return saldoTitulo;
  }

  // ==========================================================
  // LOCALIZAR PROCESSO PARA EXPORTAÇÃO INDIVIDUAL
  // ==========================================================
  function obterProcessoPorId(processoId) {
    const orcamentos = Array.isArray(dadosExportacao.orcamentos)
      ? dadosExportacao.orcamentos
      : [];

    for (const orcamento of orcamentos) {
      const processos = Array.isArray(orcamento.processos)
        ? orcamento.processos
        : [];

      const processo = processos.find(
        item =>
          String(item.proces_check) ===
          String(processoId)
      );

      if (processo) {
        return {
          ...processo,

          orc_check: orcamento.orc_check,
          orcamento_tipo: orcamento.tipo,
          orcamento_regime: orcamento.regime,
          orcamento_descritivo: orcamento.descritivo,
          valor_orcamento: formatNumero(orcamento.orcamento)
        
        };
      }
    }

    return null;
  }

  // ==========================================================
  // EXPORTAR UM PROCESSO ISOLADAMENTE
  // ==========================================================
  function exportarProcesso(
    processoId,
    formato
  ) {
    try {
      const processo = obterProcessoPorId(processoId);

      if (!processo) {alert('Não foi possível encontrar o processo.');     
        return;
      }

      const rubrica = dadosExportacao.rubrica || {};

      if (formato === 'pdf') {
        const documento = criarDocumentoFaturacaoPDF( rubrica, [processo] );
        window.open(documento.output('bloburl'), '_blank');
        return;
      }

      if (formato === 'excel') {criarDocumentoFaturacaoExcel(rubrica, [processo]);
        return;
      }

      throw new Error(`Formato inválido: ${formato}`);

    } catch (erro) {

      console.error('Erro ao exportar o processo:', erro);
      alert('Ocorreu um erro ao exportar o processo.');
    }
  }


  // ==========================================================
  // DATATABLE
  // ==========================================================
  table = $('#processosNested').DataTable({
    ajax: {
      url: 'dados/orcamentoNested.php',

      data: function (d) {
        return {
          ...d,
          ...queryParams
        };
      },

      dataSrc: function (json) {
        if (json.error) {
          console.error(
            json.error,
            json.details || ''
          );

          $('#notaRodape').text(json.error);

          return [];
        }

        const rubrica = json.rubrica || {};

        const data = prepararDados(Array.isArray(json.data) ? json.data : []);

        dadosExportacao = {rubrica, orcamentos: data};

        data.sort((a, b) => 
          String(a.tipo || '').localeCompare(String(b.tipo || ''), 'pt-PT'));

        window.processosPorLinha = data.map(row => 
          Array.isArray(row.processos) ? row.processos.length : 0);

        const totalProcessos = window.processosPorLinha.reduce(
          (total, quantidade) => total + quantidade, 0);

        renderTitulo(rubrica, data);

        const saldoTitulo = renderKpis(data);

        $('#notaRodape').text(
          `Total de processos: ${totalProcessos} | Saldo: ${formatCurrency(saldoTitulo)}`
        );

        //console.table(data);

        return data;
      },

      error: function (xhr, error, thrown) {
        console.error(
          'Erro ao carregar os dados:', error, thrown);

        $('#notaRodape').text('Erro ao carregar os dados.');}
    },

    paging: false,
    searching: false,
    select: true,

    columnDefs: [{className: 'dt-head-center', targets: '_all'}],
    order: [[0, 'asc']],
    columns: [
      {data: 'regime'},
      {data: 'descritivo',
        render: function (data, type, row) {
          const totalProcessosLinha = Array.isArray(row.processos) ? row.processos.length: 0;
          return `${data || ''}
            <span class="badge bg-info text-white">
              (${totalProcessosLinha})
            </span>
          `;
        }
      },
      {data: 'total_orcamento',
        className: 'dt-body-right',
        render: $.fn.dataTable.render.number('.', ',', 2, '')
      },
      {data: 'total_adjudicado', 
        className: 'dt-body-right',
        render: $.fn.dataTable.render.number('.', ',', 2, '')
      },
      {data: 'total_faturado',
        className: 'dt-body-right',
        render: $.fn.dataTable.render.number('.', ',', 2, '')
      },
      {data: 'saldo',
        className: 'dt-body-right',
        render: $.fn.dataTable.render.number('.', ',', 2, '')
      },
      {data: null,
        className: 'details-control dt-center align-middle',
        orderable: false,
        defaultContent: `<button class="btn-detalhe"><i class="fa-plus"></i></button>`
      },
      {data: 'tipo',
        visible: false
      }
    ]
  });

  // ==========================================================
  // ABRIR / FECHAR PROCESSOS DO ORÇAMENTO
  // ==========================================================
  $('#processosNested tbody').on('click', 'td.details-control button',
    function (event) {
      event.preventDefault();
      event.stopPropagation();

      const tr = $(this).closest('tr');
      const row = table.row(tr);
      const icon = $(this).find('i');

      if (!row.data()) {
        return;
      }

      if (row.child.isShown()) {row.child.hide();
        tr.removeClass('shown');
        icon
          .removeClass('fa-minus')
          .addClass('fa-plus');
      } else {
        row.child(formatNested(row.data().processos)).show();
        tr.addClass('shown');
        icon
          .removeClass('fa-plus')
          .addClass('fa-minus');
      }
    }
  );

  // ==========================================================
  // ABRIR / FECHAR FATURAS DO PROCESSO
  // ==========================================================
  $('#processosNested').on(
    'click',
    '.btn-faturas',
    function (event) {
      event.preventDefault();
      event.stopPropagation();

      const botao = $(this);
      const linhaProcesso = botao.closest('tr.linha-processo');
      const linhaFaturas = linhaProcesso.next('tr.linha-faturas');
      const icon = botao.find('i');

      if (!linhaFaturas.length) {console.error('Linha de faturas não encontrada.');
        return;
      }

      if (linhaFaturas.is(':visible')) {
        linhaFaturas.hide();
        icon
          .removeClass('fa-minus')
          .addClass('fa-plus');
      } else {
        linhaFaturas.show();
        icon
          .removeClass('fa-plus')
          .addClass('fa-minus');
      }
    }
  );

  // ==========================================================
  // EXPORTAÇÃO PDF E EXCEL
  // ==========================================================
  async function exportarFaturacao(formato) {
    try {
      const rubrica = dadosExportacao.rubrica || {};
      const orcamentos = Array.isArray(dadosExportacao.orcamentos)
        ? dadosExportacao.orcamentos
        : [];

      const processos = obterProcessosExportacao(orcamentos);

      if (processos.length === 0) {
        alert('Não existem processos para exportar.');
        return;
      }

      if (formato === 'pdf') {const documento = criarDocumentoFaturacaoPDF(rubrica, processos);
        window.open(documento.output('bloburl'), '_blank');
        return;
      }

      if (formato === 'excel') {criarDocumentoFaturacaoExcel(rubrica, processos);
        return;
      }

      throw new Error(`Formato de exportação inválido: ${formato}`);

    } catch (erro) {console.error('Erro ao exportar a faturação:', erro);

      alert('Ocorreu um erro ao gerar o documento.');
    }
  }


  // ==========================================================
  // OBTER TODOS OS PROCESSOS DOS ORÇAMENTOS
  // ==========================================================
  function obterProcessosExportacao(orcamentos) {
    const processos = [];

    orcamentos.forEach(orcamento => {
      const listaProcessos = Array.isArray(orcamento.processos)
        ? orcamento.processos
        : [];

      listaProcessos.forEach(processo => {
        processos.push({
          ...processo,

          orc_check: orcamento.orc_check,
          orcamento_tipo: orcamento.tipo,
          orcamento_regime: orcamento.regime,
          orcamento_descritivo: orcamento.descritivo,
          valor_orcamento: formatNumero(orcamento.orcamento)
        });
      });
    });

    return processos.sort((a, b) =>
      String(a.designacao || '').localeCompare(
        String(b.designacao || ''),
        'pt-PT'
      )
    );
  }


  // ==========================================================
  // NOME COMPLETO DA RUBRICA
  // ==========================================================
  function obterNomeRubrica(rubrica) {
    const partes = [
      rubrica.rubrica,
      rubrica.tipo,
      rubrica.grupo,
      rubrica.descritivo
    ].filter(valor =>
      valor !== null &&
      valor !== undefined &&
      String(valor).trim() !== ''
    );

    return partes.join(' - ');
  }


  // ==========================================================
  // LIMPAR TEXTO PARA PDF
  // ==========================================================
  function cleanPdfText(valor) {
    return String(valor ?? '')
      .replace(/\u00a0/g, ' ')
      .replace(/[^\x20-\xFF]/g, '')
      .trim();
  }


  // ==========================================================
  // PDF
  // ==========================================================
  function criarDocumentoFaturacaoPDF(rubrica, processos) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error('A biblioteca jsPDF não está disponível.');
    }

    const { jsPDF } = window.jspdf;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    if (typeof doc.autoTable !== 'function') {
      throw new Error(
        'A biblioteca jsPDF AutoTable não está disponível.'
      );
    }

    const pageWidth = doc.internal.pageSize.getWidth();

    const pageHeight = doc.internal.pageSize.getHeight();

    const marginLeft = 10;
    const marginRight = 10;

    const tableWidth = pageWidth - marginLeft - marginRight;

    const nomeRubrica = obterNomeRubrica(rubrica) || 'Rubrica não identificada';

    let startY = 30;
    let totalFaturadoGeral = 0;
    let totalAdjudicadoGeral = 0;
    let totalLimiteGeral = 0;

    const totaisPorTipoFatura = {};

    // ========================================================
    // FATURAÇÃO POR MÊS / ANO
    // ========================================================
    function calcularFaturacaoMensal(processos) {

      const faturacaoPorMes = {};

      processos.forEach(processo => {

        const faturas =
          Array.isArray(processo.faturas)
            ? processo.faturas
            : [];

        faturas.forEach(fatura => {

          if (!fatura.fact_data) {
            return;
          }

          const partes =
            String(fatura.fact_data)
              .substring(0, 10)
              .split('-');

          if (partes.length !== 3) {
            return;
          }

          const ano = Number(partes[0]);
          const mes = Number(partes[1]);

          if (
            !ano ||
            mes < 1 ||
            mes > 12
          ) {
            return;
          }

          const chave =
            `${ano}-${String(mes).padStart(2, '0')}`;

          if (
            !Object.prototype.hasOwnProperty.call(
              faturacaoPorMes,
              chave
            )
          ) {
            faturacaoPorMes[chave] = 0;
          }

          faturacaoPorMes[chave] +=
            formatNumero(fatura.fact_valor);
        });
      });

      const chaves =
        Object.keys(faturacaoPorMes)
          .sort();

      if (chaves.length === 0) {
        return {
          labels: [],
          valores: []
        };
      }

      const [anoInicial, mesInicial] =
        chaves[0]
          .split('-')
          .map(Number);

      const [anoFinal, mesFinal] =
        chaves[chaves.length - 1]
          .split('-')
          .map(Number);

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

      let ano = anoInicial;
      let mes = mesInicial;

      /*
      * Preenche todos os meses entre
      * a primeira e a última fatura.
      */
      while (
        ano < anoFinal ||
        (
          ano === anoFinal &&
          mes <= mesFinal
        )
      ) {

        const chave =
          `${ano}-${String(mes).padStart(2, '0')}`;

        labels.push(
          `${nomesMeses[mes - 1]} ${ano}`
        );

        valores.push(
          faturacaoPorMes[chave] || 0
        );

        mes++;

        if (mes > 12) {
          mes = 1;
          ano++;
        }
      }

      return {
        labels,
        valores
      };
    }
    
    // ========================================================
    // CRIAR IMAGEM DO GRÁFICO MENSAL / ANUAL
    // ========================================================
    function criarImagemGraficoMensal(processos) {

      const canvas =
        document.createElement('canvas');

      canvas.width = 1200;
      canvas.height = 500;

      const contexto =
        canvas.getContext('2d');

      const {
        labels,
        valores
      } =
        calcularFaturacaoMensal(processos);

      // ======================================================
      // PLUGIN PARA MOSTRAR OS VALORES EM CIMA DAS COLUNAS
      // ======================================================
      const pluginValores = {

        id: 'pluginValoresFaturacao',

        afterDatasetsDraw(chart) {

          const { ctx } = chart;

          ctx.save();

          ctx.font = 'bold 16px Arial';
          ctx.fillStyle = '#212529';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';

          const dataset =
            chart.data.datasets[0];

          const meta =
            chart.getDatasetMeta(0);

          meta.data.forEach(
            (barra, index) => {

              const valor =
                Number(
                  dataset.data[index]
                ) || 0;

              if (valor === 0) {
                return;
              }

              const texto =
                formatCurrency(valor);

              ctx.fillText(
                texto,
                barra.x,
                barra.y - 8
              );
            }
          );

          ctx.restore();
        }
      };

      const grafico =
        new Chart(
          contexto,
          {
            type: 'bar',

            data: {

              labels,

              datasets: [
                {
                  label: 'Faturação',

                  data:
                    valores,

                  backgroundColor:
                    '#17a2b8',

                  borderColor:
                    '#117a8b',

                  borderWidth: 1
                }
              ]
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

                    /*
                    * Importante quando o processo
                    * tem faturação em vários anos.
                    */
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
          }
        );

      grafico.update();

      const imagem =
        canvas.toDataURL(
          'image/png',
          1
        );

      grafico.destroy();

      return {
        imagem,
        valoresMensais: valores
      };
    }

    // ========================================================
    // ADICIONAR GRÁFICO MENSAL AO PDF
    // ========================================================
    function adicionarGraficoMensal() {
      const alturaGrafico = 72;

      if (startY > pageHeight - alturaGrafico - 20) {
        adicionarNovaPagina();
      }

      const {
        imagem,
        valoresMensais
      } = criarImagemGraficoMensal(processos);

      const totalGrafico = valoresMensais.reduce(
        (total, valor) => total + valor,
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

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      doc.text(
        `Total: ${formatCurrency(totalGrafico)}`,
        pageWidth - marginRight - 3,
        startY + 6,
        {
          align: 'right'
        }
      );

      doc.addImage(
        imagem,
        'PNG',
        marginLeft,
        startY + 11,
        tableWidth,
        alturaGrafico
      );

      startY += alturaGrafico + 17;
    }

    // ========================================================
    // CABEÇALHO
    // ========================================================
    function adicionarCabecalho() {
      const dataGeracao =
        new Date().toLocaleDateString('pt-PT');

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);

      doc.text('EXECUÇÃO ORÇAMENTAL — RUBRICA', marginLeft, 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);

      const linhasRubrica = doc.splitTextToSize(cleanPdfText(nomeRubrica), pageWidth - marginLeft - marginRight - 35);

      doc.text(linhasRubrica, marginLeft, 16);
      doc.text(`Gerado em: ${dataGeracao}`, pageWidth - marginRight, 10, {align: 'right'});

      doc.setDrawColor(180, 180, 180);

      doc.line(marginLeft, 23, pageWidth - marginRight, 23);
    }


    // ========================================================
    // NOVA PÁGINA
    // ========================================================
    function adicionarNovaPagina() {
      doc.addPage();
      adicionarCabecalho();
      startY = 30;
    }

    // ========================================================
    // CABEÇALHO DO PROCESSO
    // ========================================================
    function adicionarCabecalhoProcesso(processo, totalFaturadoProcesso) {
      const padm = processo.padm || processo.proces_check || '-';

      const designacao = cleanPdfText(
        processo.designacao || 'Processo sem designação'
      );

      const tituloProcesso = `${padm} — ${designacao}`;

      /*
      * Divide o título em várias linhas,
      * respeitando a largura disponível.
      */
      const tituloLinhas = doc.splitTextToSize(tituloProcesso, tableWidth - 6);

      /*
      * Altura dinâmica da caixa do título.
      * Cada linha ocupa aproximadamente 4 mm.
      */
      const alturaLinhaTitulo = 4;
      const alturaTitulo = Math.max(9, 5 + tituloLinhas.length * alturaLinhaTitulo);

      /*
      * Espaço estimado necessário:
      * título + tabela de resumo do processo.
      */
      const alturaNecessaria = alturaTitulo + 38;

      if (startY > pageHeight - alturaNecessaria) {adicionarNovaPagina();}

      // Fundo do título
      doc.setFillColor(52, 58, 64);

      doc.rect(marginLeft, startY, tableWidth, alturaTitulo, 'F');

      // Texto do título
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);

      doc.text(tituloLinhas, marginLeft + 3, startY + 5, {lineHeightFactor: 1.15});
      doc.setTextColor(0, 0, 0);

      /*
      * A tabela começa depois da altura dinâmica
      * ocupada pelo título.
      */
      doc.autoTable({
        startY: startY + alturaTitulo + 2,

        body: [
          [
            {content: 'Regime', styles: {fontStyle: 'bold', fillColor: [240, 240, 240]}}, processo.regime || '-',
            {content: 'Linha ORC.', styles: {fontStyle: 'bold', fillColor: [240, 240, 240]}}, processo.linha_orcamento || '-',
            {content: 'Linha SE.', styles: {fontStyle: 'bold', fillColor: [240, 240, 240]}}, processo.linha_se || '-',
            {content: 'Orçamento', styles: {fontStyle: 'bold', fillColor: [240, 240, 240]}}, 
              {content: formatCurrency(processo.val_max), styles: {halign: 'right'}}
          ],
          [
            {content: 'Planeado', styles: {fontStyle: 'bold', fillColor: [240, 240, 240]}},
              {content: formatCurrency(processo.adjudicado), styles: {halign: 'right'}},
            {content: 'Faturado', styles: {fontStyle: 'bold', fillColor: [240, 240, 240]}},
              {content: formatCurrency(totalFaturadoProcesso), styles: {halign: 'right'}},
            {content: 'Saldo*', styles: {fontStyle: 'bold', fillColor: [240, 240, 240]}},
              {content: formatCurrency(processo.saldo), styles: {halign: 'right'}},
            {content: '', colSpan: 2}
          ],
          [
            {content: 'N.º de faturas', styles: {fontStyle: 'bold', fillColor: [240, 240, 240]}},
              {content: Array.isArray(processo.faturas) ? String(processo.faturas.length) : '0', styles: {halign: 'center'}},
            {content: '', colSpan: 6}
          ]
        ],

        theme: 'grid',

        margin: {left: marginLeft, right: marginRight},

        styles: {fontSize: 7.5, cellPadding: 1.5, valign: 'middle', overflow: 'linebreak'},

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


    // ========================================================
    // TABELA DE FATURAS
    // ========================================================
    function adicionarFaturasProcesso(processo) {
      const faturas = Array.isArray(processo.faturas) ? processo.faturas : [];

      if (faturas.length === 0) {
        doc.autoTable({
          startY,

          body: [['Este processo não possui faturas.']],
          theme: 'grid',
          margin: {left: marginLeft, right: marginRight },
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

      const linhas = faturas.map(fatura => 
        [
        cleanPdfText(fatura.ent_nome || '-'),
        formatDate(fatura.fact_data) || '-',
        [fatura.fact_tipo, fatura.fact_num].filter(Boolean).join(' ') || '-',
        formatExpediente(fatura.fact_expediente) || '-',
        fatura.fact_auto_num || '-',      
        formatDate(fatura.fact_auto_data) || '-',
        formatNumero(fatura.fact_iva) || '-',
        formatNumero(fatura.fact_valor)
        ]
      );

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
          0: { cellWidth: 42 },                   // Entidade
          1: { cellWidth: 18, halign: 'center' }, // Data
          2: { cellWidth: 28 },                   // Fatura
          3: { cellWidth: 26 },                   // Expediente
          4: { cellWidth: 16, halign: 'center' }, // Auto
          5: { cellWidth: 20, halign: 'center' }, // Data Auto
          6: { cellWidth: 20, halign: 'right' },  // IVA
          7: { cellWidth: 20, halign: 'right' }   // Valor
        },
        
        didParseCell(data) {
          if (data.section === 'body' && [6, 7].includes(data.column.index)) {
            data.cell.text = [formatCurrency(data.cell.raw)];
          }
        },
        

        didDrawPage() {adicionarCabecalho();}

      });

      startY = doc.lastAutoTable.finalY + 8;
    }

    // ========================================================
    // ACUMULAR TOTAIS POR TIPO DE FATURA
    // ========================================================
    function acumularTotaisPorTipo(faturas) {
      if (!Array.isArray(faturas)) {
        return;
      }

      faturas.forEach(fatura => {
        const tipo = String(fatura.fact_tipo || 'SEM TIPO')
          .trim()
          .toUpperCase();

        if (!totaisPorTipoFatura[tipo]) {totaisPorTipoFatura[tipo] = {
            quantidade: 0,
            valor: 0
          };
        }

        totaisPorTipoFatura[tipo].quantidade += 1;
        totaisPorTipoFatura[tipo].valor += formatNumero(fatura.fact_valor);

      });
    }

    // ========================================================
    // RESUMO FINAL
    // ========================================================
    function adicionarResumoFinal() {
      const tiposOrdenados = Object.entries(totaisPorTipoFatura).sort(
        ([tipoA], [tipoB]) => tipoA.localeCompare(tipoB, 'pt-PT')
      );

      /*
      * Linhas principais do resumo.
      */
      const linhasResumo = [
        ['Total Orçamentado no Ano', '', formatCurrency(totalLimiteGeral)],
        ['Total Planeado no Ano', '', formatCurrency(totalAdjudicadoGeral)],
        ['Total Faturado', '', formatCurrency(totalFaturadoGeral)],
        ['Saldo', '', formatCurrency(totalLimiteGeral - totalAdjudicadoGeral)]
      ];

      /*
      * Separador visual antes dos totais
      * por tipo de documento.
      */
      if (tiposOrdenados.length > 0) {
        linhasResumo.push(
          [
            'Faturação por tipo',
            'Registos',
            'Valor'
          ]
        );

        tiposOrdenados.forEach(([tipo, totais]) => {linhasResumo.push(
          [tipo, String(totais.quantidade), formatCurrency(totais.valor)]
        );});
      }

      /*
      * Calcula aproximadamente o espaço necessário.
      * Cada linha ocupa cerca de 7 mm.
      */
      const alturaEstimada = 25 + linhasResumo.length * 7;

      if (startY > pageHeight - alturaEstimada ) {
        adicionarNovaPagina();
      }

      doc.setFillColor(33, 37, 41);

      doc.rect(marginLeft, startY, tableWidth, 9, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);

      doc.text('RESUMO', marginLeft + 3, startY + 6);

      doc.setTextColor(0, 0, 0);

      doc.autoTable({
        startY: startY + 11,

        body: linhasResumo,

        theme: 'grid',

        margin: {left: marginLeft, right: marginRight},

        tableWidth: 120,

        styles: {fontSize: 9, cellPadding: 2, valign: 'middle'},

        columnStyles: {
          0: {cellWidth: 65},
          1: {cellWidth: 20, halign: 'center'},
          2: {cellWidth: 35, halign: 'right'}
        },

        didParseCell(data) {
          /*
          * Formatar as quatro linhas principais.
          */
          if (data.row.index < 4) {
            if (data.column.index === 0) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [245, 245, 245];
            }

            /*
            * Junta visualmente as duas primeiras colunas nas linhas principais.
            */
            if (data.column.index === 1) {data.cell.styles.fillColor = [245, 245, 245];}
          }

          /*
          * Cabeçalho da secção por tipo.
          */
          if (tiposOrdenados.length > 0 && data.row.index === 4) {
            data.cell.styles.fillColor = [23, 162, 184];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });

      startY = doc.lastAutoTable.finalY + 8;
    }


    // ========================================================
    // CONSTRUÇÃO DO DOCUMENTO
    // ========================================================
    adicionarCabecalho();

    processos.forEach(processo => {
      const faturas = Array.isArray(processo.faturas) ? processo.faturas : [];
      
      acumularTotaisPorTipo(faturas);

      const totalFaturadoProcesso = faturas.reduce((total, fatura) =>
            total + formatNumero(fatura.fact_valor), 0
        );

      totalLimiteGeral += formatNumero(processo.val_max);
      totalAdjudicadoGeral += formatNumero(processo.adjudicado);
      totalFaturadoGeral += totalFaturadoProcesso;
      
      
      adicionarCabecalhoProcesso(processo, totalFaturadoProcesso);
      adicionarFaturasProcesso(processo);

    });

    adicionarResumoFinal();
    adicionarGraficoMensal();
    adicionarPaginacaoPDF(doc);

    return doc;
  }


  // ==========================================================
  // PAGINAÇÃO DO PDF
  // ==========================================================
  function adicionarPaginacaoPDF(doc) {
    const totalPaginas =
      doc.getNumberOfPages();

    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
      
      doc.setPage(pagina);

      const pageWidth = doc.internal.pageSize.getWidth();

      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);

      doc.text(`Página ${pagina} / ${totalPaginas}`, pageWidth - 10, pageHeight - 7, {align: 'right'});

    }
  }


  // ==========================================================
  // EXCEL
  // ==========================================================
  function criarDocumentoFaturacaoExcel(rubrica, processos ) {
    
    if (!window.XLSX) {throw new Error('A biblioteca XLSX não está disponível.');}

    const linhas = criarLinhasFaturacaoExcel(processos);

    if (linhas.length === 0) {alert('Não existem dados para exportar.');

      return;

    }

    const nomeRubrica = obterNomeRubrica(rubrica);
    const worksheet = XLSX.utils.json_to_sheet(linhas);
    const workbook = XLSX.utils.book_new();

    configurarLargurasFaturacaoExcel(worksheet);

    worksheet['!autofilter'] = {ref: worksheet['!ref']};

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Faturação');

    const processoUnico = processos.length === 1 ? processos[0] : null;

    const nomeFicheiro = criarNomeFicheiroFaturacao(rubrica, 'xlsx', processoUnico);

    XLSX.writeFile(workbook, nomeFicheiro);
    
  }


  // ==========================================================
  // LINHAS DO EXCEL
  // ==========================================================
  function criarLinhasFaturacaoExcel(processos) {

    const linhas = [];

    processos.forEach(processo => {
      
      const faturas = Array.isArray(processo.faturas) ? processo.faturas : [];

      const dadosProcesso = {
        Processo: processo.padm || processo.proces_check || '-',
        Designação: processo.designacao || '-',
        Regime: processo.regime || '-',
        'Linha ORC.': processo.linha_orcamento || '-',
        'Linha SE.': processo.linha_se || '-',
        Limite: formatNumero(processo.val_max),
        Adjudicado: formatNumero(processo.adjudicado),
        Saldo: formatNumero(processo.saldo)
      };

      if (faturas.length === 0) {
        linhas.push({
          ...dadosProcesso,

          'Data da fatura': '-',
          Tipo: '-',
          Fatura: '-',
          Expediente: '-',
          Auto: '-',
          'Data do auto': '-',
          IVA: 0,
          'Valor da fatura': 0
        });

        return;
      }

      faturas.forEach(fatura => {
        linhas.push({
          ...dadosProcesso,

          Entidade: fatura.ent_nome || '-',
          'Data da fatura': fatura.fact_data || '-',
          Tipo: fatura.fact_tipo || '-',
          Fatura: fatura.fact_num || '-',
          Expediente: formatExpediente(fatura.fact_expediente) || '-',
          Auto: fatura.fact_auto_num || '-',
          'Data do auto': fatura.fact_auto_data || '-',
          IVA: formatNumero(fatura.fact_iva),
          'Valor da fatura': formatNumero(fatura.fact_valor)
        });
      });
    });

    return linhas;
  }


  // ==========================================================
  // LARGURAS DAS COLUNAS EXCEL
  // ==========================================================
  function configurarLargurasFaturacaoExcel(
    worksheet
  ) {
    worksheet['!cols'] = [
      { wch: 16 }, // Processo
      { wch: 55 }, // Designação
      { wch: 24 }, // Regime
      { wch: 14 }, // Linha ORC.
      { wch: 14 }, // Linha SE.
      { wch: 15 }, // Orçamentado - inicialmente -> Limite
      { wch: 15 }, // Planeado no Ano - Inicialmente -> Adjudicado
      { wch: 15 }, // Saldo - Entre Orçamento e o Plano
      { wch: 40 }, // Entidade
      { wch: 15 }, // Data da fatura
      { wch: 10 }, // Tipo
      { wch: 18 }, // Fatura
      { wch: 22 }, // Expediente
      { wch: 14 }, // Auto
      { wch: 15 }, // Data do auto
      { wch: 10 }, // IVA
      { wch: 18 }  // Valor da fatura
    ];
  }


  // ==========================================================
  // NOME DO FICHEIRO
  // ==========================================================
  function criarNomeFicheiroFaturacao(rubrica, formato, processo = null) {
    
    const codigoRubrica = rubrica.rubrica || 'rubrica';
    const codigoProcesso = processo ? (processo.padm || processo.proces_check || 'processo') : 'todos';

    const nomeSeguro = String(`faturacao_${codigoRubrica}_${codigoProcesso}`)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();

    return `${nomeSeguro}.${formato}`;
  }


  // ==========================================================
  // EVENTOS DOS BOTÕES
  // ==========================================================
  $('#kpiValores').on('click', '#exportarPDF',
    function (event) {
      event.preventDefault();
      exportarFaturacao('pdf');
    }
  );

  $('#kpiValores').on('click', '#exportarExcel',
    function (event) {
      event.preventDefault();
      exportarFaturacao('excel');
    }
  );

  // ==========================================================
  // EXPORTAR PROCESSO PARA PDF
  // ==========================================================
  $('#processosNested').on('click', '.btn-exportar-processo-pdf',
    function (event) {
      event.preventDefault();
      event.stopPropagation();

      const processoId = $(this).data('processo-id');

      exportarProcesso(processoId, 'pdf');

    }
  );


  // ==========================================================
  // EXPORTAR PROCESSO PARA EXCEL
  // ==========================================================
  $('#processosNested').on('click', '.btn-exportar-processo-excel',
    function (event) {
      event.preventDefault();
      event.stopPropagation();

      const processoId = $(this).data('processo-id');

      exportarProcesso(processoId, 'excel');

    }
  );


  // ==========================================================
  // ABRIR PROCESSO - CLICAR EM QUALQUER CAMPO DA LINHA
  // ==========================================================
  $('#processosNested').on('click', '.linha-processo',
    function (event) {
  
      if ($(event.target).closest('button').length) {
        return;
      }
  
      if ($(event.target).closest('.btn-faturas').length) {
        return;
      }
  
      if ($(event.target).closest('.btn-exportar-processo-pdf').length) {
        return;
      }
  
      if ($(event.target).closest('.btn-exportar-processo-excel').length) {
        return;
      }
  
      const processoId = $(this).data('processo-id');
  
      redirectProcesso(processoId);

    }
  );
});

// ==========================================================
// PARÂMETROS DO URL
// ==========================================================
function getQueryParams() {
  const params = {};

  const query = new URLSearchParams(window.location.search);

  for (const [key, value] of query.entries()) {
    params[key] = value;
  }

  return params;
}

// ==========================================================
// REDIRECIONAR PARA O PROCESSO
// ==========================================================
function redirectProcesso(codigoProcesso) {
  const obrasURL = '../../producao/processos/processoResults.html?codigoProcesso=' + encodeURIComponent(codigoProcesso);

  window.location.href = obrasURL;
}
