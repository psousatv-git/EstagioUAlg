let processosGlobais = [];
let pedidoExportacaoModal = [];
let pedidoExportacaoKey = null;
let table;


function formatCurrency(value){
  return new Intl.NumberFormat('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(value || 0) + '€';
}

function formatExpediente(str){
  return str 
  ? `${str[0]}.${str.slice(1, 6)}.${str.slice(6)}`
  : '';
}


function cleanPdfText(text) {
  if (!text) return "";

  return String(text)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&/g, "&") // protege contra lixo residual
    .trim();
}

$(document).ready(function () {
  const queryParams = getQueryParams();

  // Nested row: apenas os itens financeiros do processo clicado
  function formatNested(processo) {
    if (!processo) return 'Sem registros';

    let html = `<table class="table table-sm table-bordered small">
                  <thead>
                    <tr>
                        <th class="table-dark text-center" colspan="4">Pedidos</th>
                        <th class="table-info text-center" colspan="4">Reembolsos</th>
                        <th class="table-success text-center">Balanço</th>
                        <th class="table-warning text-center">Faturas</th>
                    </tr>
                    <tr>
                        <!-- PEDIDOS -->
                        <th class="table-dark">Número</th>
                        <th class="table-dark">Expediente</th>
                        <th class="table-dark">Data</th>
                        <th class="table-dark text-right">Valor</th>
                        <!-- REEMBOLSOS -->
                        <th class="table-info">Número</th>
                        <th class="table-info">Expediente</th>
                        <th class="table-info">Data</th>
                        <th class="table-info text-right">Valor</th>
                        <!-- BALANÇO -->
                        <th class="table-success text-right">Valor</th>
                        <!-- FATURAS -->
                        <th class="table-warning">Expediente / Data / Número / Auto / Valor</th>
                    </tr>
                  </thead>
              <tbody>`;

        const { pedidosMap, faturasOrfaos, reembolsosOrfaos } = (processo.historico || []).reduce(
          (acc, h) => {
            const num = h.historico_num;
        
            // Separar pedidos
            if (h.historico_descr_cod === 91 && num != null) {
              acc.pedidosMap[num] ??= { pedido: h, faturas: [], reembolsos: [] };
            }
        
            // Separar reembolsos
            if (h.historico_descr_cod === 92 && num != null) {
              if (acc.pedidosMap[num]) {
                acc.pedidosMap[num].reembolsos.push(h);
              } else {
                acc.reembolsosOrfaos.push(h);
              }
            }
        
            return acc;
          },
          { pedidosMap: {}, faturasOrfaos: [], reembolsosOrfaos: [] }
        );
        
        // Associar faturas aos pedidos
        (processo.faturas || []).forEach(f => {

          const num = f.fact_finan_pp;
          if (pedidosMap[num]) {
            pedidosMap[num].faturas.push(f);
          } else {
            faturasOrfaos.push(f);
          }
        });
      

      // Monta linhas de pedidos, faturas e reembolsos
      Object.values(pedidosMap).forEach(item => {

        // -------------------------
        // PEDIDO
        // -------------------------
        const pedidoText = item.pedido
            ? [
                item.pedido.historico_num,
                item.pedido.historico_doc,
                item.pedido.historico_dataemissao,
                formatCurrency(item.pedido.historico_valor)
            ]
            : ['', '', '', ''];
    
        const faturasNormais = item.faturas.map(f => [
          formatExpediente(f.fact_expediente),
          f.fact_data,
          `${f.fact_tipo}_${f.fact_num}`,
          `${f.fact_auto_num}`,
          formatCurrency(f.fact_valor)
        ].join(' / '));

        // -------------------------
        // REEMBOLSOS CANCELADOS
        // Se valor negativo + expediente cancelado
        // aparecem também em FATURAS
        // -------------------------
        const cancelamentos = item.reembolsos
            .filter(r =>
                r.historico_valor < 0 &&
                r.historico_doc &&
                r.historico_doc.toLowerCase().includes('cancel')
            )
            .map(r => [
                r.historico_num,
                'CANCELADO'
            ].join(' -> '));
    
        // -------------------------
        // JUNTA FATURAS + CANCELAMENTOS
        // -------------------------
        const faturasText = [
          ...faturasNormais,
          ...cancelamentos
      ].map(f => `<div class="mb-1">${f}</div>`).join('');
    
        // -------------------------
        // SEM REEMBOLSOS
        // -------------------------
        if (item.reembolsos.length === 0) {
    
            html += `
                <tr>
                    <td class="table-dark text-white">${pedidoText[0]}</td>
                    <td class="table-dark text-white">${pedidoText[1]}</td>
                    <td class="table-dark text-white">${pedidoText[2]}</td>
                    <td class="table-dark text-white text-right">${pedidoText[3]}</td>
    
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
    
                    <td></td>
    
                    <td class="table-warning">
                        ${faturasText}
                    </td>
                </tr>
            `;
    
        } else {
    
            // -------------------------
            // COM REEMBOLSOS
            // -------------------------
            item.reembolsos.forEach(reemb => {
    
                const reembText = [
                    reemb.historico_num,
                    reemb.historico_doc,
                    reemb.historico_dataemissao,
                    formatCurrency(reemb.historico_valor)
                ];
    
                const saldo = reemb.historico_valor >= 0
                    ? reemb.historico_valor - item.pedido.historico_valor
                    : 0;
    
                const saldoClass = saldo >= 0
                    ? 'table-success'
                    : 'table-danger';
    
                html += `
                    <tr>
    
                        <!-- PEDIDOS -->
                        <td class="table-dark text-white">${pedidoText[0]}</td>
                        <td class="table-dark text-white">${pedidoText[1]}</td>
                        <td class="table-dark text-white">${pedidoText[2]}</td>
                        <td class="table-dark text-white text-right">${pedidoText[3]}</td>
    
                        <!-- REEMBOLSOS -->
                        <td class="table-info">${reembText[0]}</td>
                        <td class="table-info">${reembText[1]}</td>
                        <td class="table-info">${reembText[2]}</td>
                        <td class="table-info text-right">${reembText[3]}</td>
    
                        <!-- SALDO -->
                        <td class="${saldoClass} text-right">
                            ${formatCurrency(saldo)}
                        </td>
    
                        <!-- FATURAS -->
                        <td class="table-warning">
                            ${faturasText}
                        </td>
    
                    </tr>
                `;
            });
        }
      });

      // Linhas de faturas órfãs
      faturasOrfaos.forEach(f => {
          const fText = [
            formatExpediente(f.fact_expediente), 
            f.fact_data, 
            f.fact_tipo + "_" + f.fact_num, "AM_" + f.fact_auto_num, 
            formatCurrency(f.fact_valor)];

          html += `<tr>
                      <td></td><td></td><td></td><td></td>
                      <td></td><td></td><td></td><td></td><td></td>
                      <td class="table-danger">
                      ${fText.join(' / ')}
                      </td>
                  </tr>`;
      });

      // Linhas de reembolsos órfãos
      reembolsosOrfaos.forEach(r => {
          const reembText = [r.historico_num, r.historico_doc, r.historico_dataemissao, formatCurrency(r.historico_valor)];
          html += `<tr>
                      <td></td><td></td><td></td><td></td>
                      <td class="table-danger">
                      ${reembText.join(' / ')}
                      </td>
                      <td></td><td></td><td></td><td></td><td></td>
                      
                  </tr>`;
      });

      html += `</tbody></table>`;
      return html;
    }

    function renderReembolsosCards(processos) {

      const grupos = {};
    
      // =====================================================
      // 1. PERCORRER TODOS OS PROCESSOS (AGREGAÇÃO GLOBAL)
      // =====================================================
      processos.forEach(processo => {

        const historico = processo.historico || [];
      
        historico.forEach(h => {
      

          // FILTRO PP
          if (h.historico_num && !String(h.historico_num).startsWith('PP')) return;
      
          const key = h.historico_num || 'ORFAO';
      
          if (!grupos[key]) {
            grupos[key] = {
              key,
              totalPedido: 0,
              totalReembolso: 0
            };
          }
      
          if (h.historico_descr_cod === 91) {
            grupos[key].totalPedido += (h.historico_valor || 0);
          }
      
          if (h.historico_descr_cod === 92) {
            grupos[key].totalReembolso += (h.historico_valor || 0);
          }

        });
      });
    
      // =====================================================
      // 2. ORDENAR ALFABÉTICO (ORFÃO NO FIM)
      // =====================================================
      const ordenados = Object.values(grupos)
        .filter(Boolean)
        .sort((a, b) => {
          if (!a || !b) return 0;

          if (a.key === 'ORFAO') return 1;
          if (b.key === 'ORFAO') return -1;
 
          return String(a.key).localeCompare(String(b.key), 'pt');
      });
      
      // =====================================================
      // 3. RENDER CARDS
      // =====================================================
      let html = `<div class="row g-2">`;
    
      ordenados.forEach(g => {

        // Reembolso anulado é lançado com valor negativo ( - )
        const isAnulado = (g.totalPedido + g.totalReembolso === 0);
              
        const percentValue = g.totalPedido > 0
          ? (g.totalReembolso / g.totalPedido) * 100
          : 0;
      
        const badgeClass = isAnulado
          ? "bg-danger text-white"
          : "bg-warning text-dark";
                
          html += `
          <div class="col-6 col-sm-3 col-md-2 col-lg-1-5 mt-1">
      
            <div class="card border-info shadow-sm h-100 reembolso-card"
                 data-key="${g.key}">
      
              <div class="card-header bg-info text-white p-1 text-center small">
                ${g.key === 'ORFAO' ? 'Órfão' : g.key}
              </div>
      
              <div class="card-body p-1 small text-center">
      
                <div style="font-size: 11px;">
                  <b>P:</b> ${formatCurrency(g.totalPedido)}
                </div>
      
                <div style="font-size: 11px;">
                  <b>R:</b> ${formatCurrency(g.totalReembolso)}
                </div>
      
                <div class="mt-1">
                  <span class="badge ${badgeClass}" style="font-size: 10px;">
                    ${isAnulado ? "Anulado" : percentValue.toFixed(1) + "%"}
                  </span>
                </div>
      
              </div>
      
            </div>
      
          </div>
        `;
      });
    
      html += `</div>`;
    
      return html;
    }

  // Inicializa DataTable principal
  table = $('#processosNested').DataTable({
    ajax: {
      url: 'dados/candidaturasNested.php',
      dataSrc: function (json) {
        // Retorna todos os processos como linhas
        const processos = json.processos.map(proc => ({
          ...proc,
          candidatura: json.candidatura,
          estado: json.estado,
          aviso: json.aviso,
          programa: json.programa,
          nome: json.designacao,
          taxa: json.taxa,
          logo: json.logo
        }));

        processosGlobais = processos

        //console.table(json);
        //console.table(processosGlobais);

        // Caminho para o Logotipo da Candidatura
        const path = "../../global/imagens";

        // Título da candidatura
        $('#titulo').html(`
          <div class="row no-gutters align-items-center mb-2">

            <div class="col-8">
                <div class="d-flex justify-content-start bg-primary text-white text-truncate px-3 py-2">
                ${json.candidatura || ''} - ${json.designacao || ''}
                </div>
            </div>

            <div class="col-2">
                <div class="d-flex justify-content-end px-3 py-2" style="padding: 6px 16px; min-height: 50px;">

                  <a href="candidaturasGeral.html?itemProcurado=${json.candidatura}"
                    class="btn btn-primary mr-1"
                    style="padding: 6px 14px;"
                    title="Voltar à Candidatura">
                    <i class="fa-solid fa-arrow-left text-light"></i>
                  </a>

                  <a href="candidaturasNested.html?itemProcurado=${json.candidatura}"
                    class="btn btn-info mr-1"
                    style="padding: 6px 14px;"
                    title="Atualizar">
                    <i class="fa-solid fa-rotate text-light"></i>
                  </a>
                  
                   <a href="candidaturasDashboard.html?"
                    class="btn btn-secondary mr-1"
                    style="padding: 6px 14px;"
                    title="Dashboard">
                    <i class="fa-solid fa-home text-light"></i>
                  </a>


                </div>
            </div>

            <!-- Logotipo -->
            <div class="col-2 d-flex justify-content-end align-items-center">
              <img src="${path}/${json.logo}" alt="Logotipo" style="max-height: 50px;">
            </div>

          </div>
        `);
       
        const totalPedidos = processos
        .reduce((sumProc, p) => sumProc +
          (p.historico || [])
            .filter(h =>
              h.historico_descr_cod === 91 &&
              Number(h.historico_valor) > 0
            )
            .reduce((s, h) => s + Number(h.historico_valor), 0),
          0
        );

        const totalReembolsos = processos
          .reduce((sumProc, p) => sumProc +
            (p.historico || [])
              .filter(h =>
                h.historico_descr_cod === 92 &&
                Number(h.historico_valor) > 0
              )
              .reduce((s, h) => s + Number(h.historico_valor), 0),
            0
          );
        

          $('#kpiValores').html(`
            <div class="row align-items-center mb-2">
        
                <!-- ELEGÍVEL -->
                <div class="col-md-2">
                    <div class="card bg-primary text-white h-100">
                        <div class="card-body py-2 px-2">
                            <div class="small">Elegível</div>
                            <div class="text-right font-weight-bold">
                                ${formatCurrency(json.elegivel * json.iva)}
                            </div>
                        </div>
                    </div>
                </div>
        
                <!-- FUNDO -->
                <div class="col-md-2">
                    <div class="card bg-secondary text-white h-100">
                        <div class="card-body py-2 px-2">
                            <div class="small">Fundo</div>
                            <div class="text-right font-weight-bold">
                                ${formatCurrency(json.elegivel * json.iva * json.taxa)}
                            </div>
                        </div>
                    </div>
                </div>
        
                <!-- PEDIDO -> FATURADO -->
                <div class="col-md-2">
                    <div class="card bg-warning text-dark h-100">
                        <div class="card-body py-2 px-2">
                            <div class="small">Pedido → Faturado - confirmar IVA</div>
                            <div class="text-right font-weight-bold">
                                ${formatCurrency(totalPedidos * json.iva)}
                            </div>
                        </div>
                    </div>
                </div>
        
                <!-- REEMBOLSOS -->
                <div class="col-md-2">
                    <div class="card bg-success text-white h-100">
                        <div class="card-body py-2 px-2">
                            <div class="small">Reembolsos - confirmar IVA</div>
                            <div class="text-right font-weight-bold">
                                ${formatCurrency(totalReembolsos)}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SALDO -->
                <div class="col-md-2">
                    <div class="card bg-primary text-white h-100">
                        <div class="card-body py-2 px-2">
                            <div class="small">Saldo</div>
                            <div class="text-right font-weight-bold">
                                ${formatCurrency(totalPedidos - totalReembolsos)}
                            </div>
                        </div>
                    </div>
                </div>
        
                <!-- BOTÕES -->
                <div class="col-md-2 text-right">
        
                    <button
                        id="exportResumo"
                        class="btn btn-danger btn-lg shadow-sm mr-2"
                        title="Exportar PDF">
                        <i class="fa-solid fa-file-pdf"></i>
                    </button>
        
                    <button
                        id="exportALLExcel"
                        class="btn btn-success btn-lg shadow-sm"
                        title="Exportar Excel">
                        <i class="fa-solid fa-file-excel"></i>
                    </button>
        
                </div>
        
            </div>
        `);


        // Cartões
        $('#cartoesReembolsos').html(renderReembolsosCards(processos) );

        return processos;

      },
      data: function(d) {
        return { ...d, ...queryParams };
      }
    },
    paging: false,
    searching: false,
    select: true,
    order: [[1, 'asc']],   // <-- ordena pela Designação
    columnDefs: [{ className: "dt-head-center", targets: "_all" }],
    columns: [
      { data: 'padm' },
      {
        data: 'designacao',
        render: function(data, type, row) {
    
            if (type === 'sort' || type === 'type') {
                return data;
            }
    
            const totalPedidosLinha = row.historico?.length || 0;
    
            return `${data} <span class="badge bg-info text-white">(${totalPedidosLinha})</span>`;
        }
    },
      { 
        data: null,
        className: 'dt-body-right',
        render: function(data, type, row) {
          const totalAdjudicado = row.historico
            ?.filter(h => 
              h.historico_descr_cod === 14 
              && (h.historico_valor || 0) > 0)
            .reduce((sum, h) => sum + h.historico_valor, 0) || 0;
      
          return formatCurrency(totalAdjudicado);
        }
      },
      { 
        data: null,
        className: 'dt-body-right',
        render: function(data, type, row) {
          const tiposValidos = ['FTN', 'FTC', 'NC', 'REF', 'IND'];
          const totalFaturas = row.faturas 
            ?.filter(f => tiposValidos.includes(f.fact_tipo))
            .reduce((sum, f) => sum + (f.fact_valor || 0), 0) || 0;
          return formatCurrency(totalFaturas);
        }
      },
      { 
        data: null,
        className: 'dt-body-right',
        render: function(data, type, row) {
          const totalReembolsos = row.historico 
          ?.filter(h => 
            h.historico_descr_cod === 92 &&
            (h.historico_valor || 0) > 0 &&
            !(h.historico_num?.includes("Ad")))
          .reduce((sum, h) => sum + (h.historico_valor || 0), 0) || 0;
          return formatCurrency(totalReembolsos);
        }
      },
      {
        data: null,
        className: 'details-control dt-center align-middle',
        orderable: false,
        defaultContent: '<button class="btn-detalhe"><i class="fa-solid fa-circle-info"></i></button>'
      }
    ]
  });

  $(document).on('click', '.reembolso-card', function () {

    const key = $(this).data('key');

    pedidoExportacaoKey = key;

    const processos = table.rows().data().toArray();

    pedidoExportacaoModal = processos.filter(processo => {

        const temPedido = (processo.historico || []).some(h =>
            h.historico_descr_cod === 91 &&
            String(h.historico_num) === String(key)
        );

        const temReembolso = (processo.historico || []).some(h =>
            h.historico_descr_cod === 92 &&
            String(h.historico_num) === String(key)
        );

        const temFatura = (processo.faturas || []).some(f =>
            String(f.fact_finan_pp) === String(key)
        );

        return temPedido || temReembolso || temFatura;

    });



    // =====================================================
    // CONSTRUÇÃO DO MODAL
    // =====================================================
    let html = '';

    pedidoExportacaoModal.forEach(processo => {


        const pedido = (processo.historico || [])
            .find(h =>
                h.historico_descr_cod === 91 &&
                String(h.historico_num) === String(key)
            );


        const reembolsos = (processo.historico || [])
            .filter(h =>
                h.historico_descr_cod === 92 &&
                String(h.historico_num) === String(key)
            );


        const faturas = (processo.faturas || [])
            .filter(f =>
                String(f.fact_finan_pp) === String(key)
            );


        html += `
        <div class="border rounded p-3 mb-3">

            <h6 class="text-primary mb-2"
                style="cursor:pointer; text-decoration: underline;"
                onclick="redirectProcesso('${processo.proces_check}')">

                Processo: ${processo.designacao} (${processo.proces_check})

            </h6>


            <div class="row">


                <!-- PEDIDO -->
                <div class="col-md-4">

                    <div class="card border-dark h-100">

                        <div class="card-header bg-dark text-white p-1 small">
                            Pedido
                        </div>


                        <div class="card-body small">

                            ${
                            pedido
                            ?
                            `
                            <div><b>Nº:</b> ${pedido.historico_num}</div>
                            <div><b>Expediente:</b> ${pedido.historico_doc || '-'}</div>
                            <div><b>Data:</b> ${pedido.historico_dataemissao || '-'}</div>
                            <div><b>Valor:</b> ${formatCurrency(pedido.historico_valor)}</div>
                            `
                            :
                            `
                            <span class="text-muted">
                                Sem pedido
                            </span>
                            `
                            }

                        </div>

                    </div>

                </div>



                <!-- REEMBOLSOS -->
                <div class="col-md-4">

                    <div class="card border-info h-100">

                        <div class="card-header bg-info text-white p-1 small">
                            Reembolsos
                        </div>


                        <div class="card-body small">

                            ${reembolsos.length ? reembolsos.map(r => `
                            
                                <div class="border-bottom mb-1 pb-1">

                                    <div><b>Nº:</b> ${r.historico_num}</div>
                                    <div><b>Expediente:</b> ${r.historico_doc || '-'}</div>
                                    <div><b>Data:</b> ${r.historico_dataemissao || '-'}</div>
                                    <div><b>Valor:</b> ${formatCurrency(r.historico_valor)}</div>

                                </div>

                            `).join('')
                            :
                            `
                            <span class="text-muted">
                                Sem reembolsos
                            </span>
                            `
                            }

                        </div>

                    </div>

                </div>



                <!-- FATURAS -->
                <div class="col-md-4">

                    <div class="card border-warning h-100">

                        <div class="card-header bg-warning text-dark p-1 small">
                            Faturas
                        </div>


                        <div class="card-body small">

                            ${faturas.length ? faturas.map(f => `

                                <div class="border-bottom p-2 mb-2">

                                    <div>
                                        <b>Expediente:</b>
                                        ${formatExpediente(f.fact_expediente)}
                                    </div>

                                    <div>
                                        <b>Data:</b>
                                        ${f.fact_data || '-'}
                                    </div>

                                    <div>
                                        <b>Doc:</b>
                                        ${f.fact_tipo}_${f.fact_num}
                                    </div>

                                    <div>
                                        <b>Auto:</b>
                                        ${f.fact_auto_num || '-'}
                                    </div>

                                    <div>
                                        <b>Valor:</b>
                                        ${formatCurrency(f.fact_valor)}
                                    </div>

                                </div>

                            `).join('')
                            :
                            `
                            <span class="text-muted">
                                Sem faturas
                            </span>
                            `
                            }

                        </div>

                    </div>

                </div>


            </div>

        </div>
        `;

    });


    // =====================================================
    // BOTÕES EXPORTAÇÃO MODAL
    // =====================================================
    const exportBtns = `
    <div class="d-flex justify-content-end gap-2 mb-2">

        <button id="previewResumoModal"
                class="btn btn-danger btn-sm"
                title="Exportar PDF">

            <i class="fa-solid fa-file-pdf"></i>

        </button>


        <button id="modalExportExcel"
                class="btn btn-success btn-sm"
                title="Exportar Excel">

            <i class="fa-solid fa-file-excel"></i>

        </button>

    </div>
    `;


    $('#modalReembolsosBody')
        .html(exportBtns + (html || '<p>Sem dados.</p>'));


    new bootstrap.Modal(
        document.getElementById('modalReembolsos')
    ).show();


});

  // Toggle nested row
  $('#processosNested tbody').on('click', 'td.details-control button', function () {
    const tr = $(this).closest('tr');
    const row = table.row(tr);
    const icon = $(this).find('i');

    if (row.child.isShown()) {
      row.child.hide();
      icon.removeClass('fa-circle-minus').addClass('fa-circle-info');
    } else {
      row.child(formatNested(row.data())).show();
      icon.removeClass('fa-circle-info').addClass('fa-circle-minus');
    }
  });

  // Clique em qualquer parte da linha (exceto no botão de detalhe)
  $('#processosNested tbody').on('click', 'tr', function (e) {

    // Não aciona se clicar no botão de detalhes
    if ($(e.target).closest('.btn-detalhe').length) return;

    const rowData = table.row(this).data();
    if (!rowData) return;

    redirectProcesso(rowData.proces_check);
  });

  // ==========================================================
  // EXPORTAÇÃO MODAL
  // ==========================================================
  $(document).on('click', '#previewResumoModal', function () {
    exportarReembolsos({
      formato: 'pdf',
      processos: pedidoExportacaoModal,
      key: pedidoExportacaoKey,
      escopo: 'modal'
    });
  });

  $(document).on('click', '#modalExportExcel', function () {
    exportarReembolsos({
      formato: 'excel',
      processos: pedidoExportacaoModal,
      key: pedidoExportacaoKey,
      escopo: 'modal'
    });
  });

  // ==========================================================
  // EXPORTAÇÃO GLOBAL
  // ==========================================================
  $(document).on('click', '#exportResumo', function () {
    exportarReembolsos({
      formato: 'pdf',
      processos: processosGlobais,
      escopo: 'global'
    });
  });

  $(document).on('click', '#exportALLExcel', function () {
    exportarReembolsos({
      formato: 'excel',
      processos: processosGlobais,
      escopo: 'global'
    });
  });

});

// ==========================================================
// EXPORTAÇÃO UNIFICADA
// ==========================================================

async function exportarReembolsos({
  formato,
  processos = processosGlobais,
  key = null,
  escopo = 'global'
} = {}) {
  try {
    if (!Array.isArray(processos) || processos.length === 0) {
      alert('Não existem dados para exportar.');
      return;
    }

    let grupos = getReembolsosAgrupadosDetalhado(processos);

    if (key !== null) {
      grupos = grupos.filter(
        grupo => String(grupo.key) === String(key)
      );
    }

    grupos = grupos.filter(
      grupo =>
        grupo &&
        grupo.processos &&
        Object.keys(grupo.processos).length > 0
    );

    if (grupos.length === 0) {
      alert('Não foram encontrados dados para exportar.');
      return;
    }

    if (formato === 'pdf') {
      const doc = criarDocumentoReembolsosPDF(grupos, {
        processos,
        key,
        escopo
      });

      window.open(doc.output('bloburl'), '_blank');
      return;
    }

    if (formato === 'excel') {
      criarDocumentoReembolsosExcel(grupos, {
        key,
        escopo
      });
      return;
    }

    throw new Error(`Formato de exportação inválido: ${formato}`);

  } catch (erro) {
    console.error('Erro ao exportar reembolsos:', erro);
    alert('Ocorreu um erro ao gerar o ficheiro.');
  }
}


// ==========================================================
// PDF - RELATÓRIO DE REEMBOLSOS
// ==========================================================
function criarDocumentoReembolsosPDF(
  grupos,
  {
    processos = processosGlobais,
    escopo = 'global'
  } = {}
) {

  // ========================================================
  // VERIFICAÇÕES
  // ========================================================
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

  // ========================================================
  // DIMENSÕES
  // ========================================================
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const marginLeft = 10;
  const marginRight = 10;

  const tableWidth =
    pageWidth -
    marginLeft -
    marginRight;

  let startY = 30;

  // ========================================================
  // TOTAIS GERAIS
  // ========================================================
  let totalPedidoGeral = 0;
  let totalReembolsoGeral = 0;
  let totalFaturadoGeral = 0;

  let quantidadeFaturasGeral = 0;
  let quantidadeFaturasOrfas = 0;
  let totalFaturasOrfasGeral = 0;

  const totaisPorTipoFatura = {};

  // ========================================================
  // DADOS DA CANDIDATURA
  // ========================================================
  const candidatura =
    processos?.[0] ||
    processosGlobais?.[0] ||
    {};

  // ========================================================
  // FORMATAÇÃO LOCAL DE DATA
  // ========================================================
  function formatDatePDF(valor) {

    if (!valor) {
      return '-';
    }

    const data =
      String(valor)
        .substring(0, 10);

    const partes =
      data.split('-');

    if (partes.length !== 3) {
      return cleanPdfText(valor);
    }

    const [ano, mes, dia] =
      partes;

    return `${dia}-${mes}-${ano}`;
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
  // CABEÇALHO PRINCIPAL
  // ========================================================
  function adicionarCabecalho() {

    const dataGeracao =
      new Date()
        .toLocaleDateString('pt-PT');

    const codigoCandidatura =
      candidatura.candidatura ||
      candidatura.codigo_candidatura ||
      'N/D';

    const designacaoCandidatura =
      candidatura.nome ||
      candidatura.designacao_candidatura ||
      '';

    const estadoCandidatura =
      candidatura.estado
        ? ` | ${candidatura.estado}`
        : '';

    // ------------------------------------------------------
    // TÍTULO
    // ------------------------------------------------------
    doc.setTextColor(0, 0, 0);

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.setFontSize(12);

    doc.text(
      'RELATÓRIO DE REEMBOLSOS',
      marginLeft,
      10
    );

    // ------------------------------------------------------
    // CANDIDATURA
    // ------------------------------------------------------
    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.setFontSize(8.5);

    const textoCandidatura =
      cleanPdfText(
        `Candidatura: ${codigoCandidatura}` +
        (
          designacaoCandidatura
            ? ` - ${designacaoCandidatura}`
            : ''
        ) +
        estadoCandidatura
      );

    const linhasCandidatura =
      doc.splitTextToSize(
        textoCandidatura,
        pageWidth -
        marginLeft -
        marginRight -
        35
      );

    doc.text(
      linhasCandidatura,
      marginLeft,
      16
    );

    // ------------------------------------------------------
    // DATA
    // ------------------------------------------------------
    doc.text(
      `Gerado em: ${dataGeracao}`,
      pageWidth - marginRight,
      10,
      {
        align: 'right'
      }
    );

    // ------------------------------------------------------
    // LINHA
    // ------------------------------------------------------
    doc.setDrawColor(
      180,
      180,
      180
    );

    doc.line(
      marginLeft,
      23,
      pageWidth - marginRight,
      23
    );
  }

  // ========================================================
  // CALCULAR TOTAL FATURADO DO ITEM / PROCESSO
  // ========================================================
  function calcularTotalFaturadoItem(item) {

    const faturas =
      Array.isArray(item?.faturas)
        ? item.faturas
        : [];

    return faturas.reduce(
      (total, fatura) =>
        total +
        (
          Number(fatura.fact_valor) ||
          0
        ),
      0
    );
  }

  // ========================================================
  // TOTAL FATURADO DO GRUPO
  // ========================================================
  function calcularTotalFaturadoGrupo(grupo) {

    return Object.values(
      grupo?.processos || {}
    ).reduce(
      (total, item) =>
        total +
        calcularTotalFaturadoItem(item),
      0
    );
  }

  // ========================================================
  // ACUMULAR FATURAÇÃO POR TIPO
  // ========================================================
  function acumularTotaisPorTipo(faturas) {

    if (!Array.isArray(faturas)) {
      return;
    }

    faturas.forEach(fatura => {

      const tipo =
        String(
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

      totaisPorTipoFatura[tipo]
        .quantidade += 1;

      totaisPorTipoFatura[tipo]
        .valor +=
          Number(fatura.fact_valor) ||
          0;
    });
  }

  // ========================================================
  // FATURAÇÃO POR MÊS / ANO
  // Cada ano corresponde a uma série diferente
  // ========================================================
  function calcularFaturacaoMensal() {

    const faturacaoPorAno = {};

    grupos.forEach(grupo => {

      Object.values(
        grupo?.processos || {}
      ).forEach(item => {

        const faturas =
          Array.isArray(item.faturas)
            ? item.faturas
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

          // Criar o ano caso ainda não exista
          if (!faturacaoPorAno[ano]) {
            faturacaoPorAno[ano] =
              Array(12).fill(0);
          }

          // Acumular no mês correspondente
          faturacaoPorAno[ano][mes - 1] +=
            Number(fatura.fact_valor) || 0;
        });
      });
    });

    // Ordenar os anos cronologicamente
    const anos =
      Object.keys(faturacaoPorAno)
        .map(Number)
        .sort((a, b) => a - b);

    return {
      anos,
      faturacaoPorAno
    };
  }

  // ========================================================
  // CRIAR IMAGEM DO GRÁFICO
  // Cada ano é apresentado como uma série
  // ========================================================
  function criarImagemGraficoMensal() {

    const canvas =
      document.createElement('canvas');

    canvas.width = 1200;
    canvas.height = 500;

    const contexto =
      canvas.getContext('2d');

    const {
      anos,
      faturacaoPorAno
    } =
      calcularFaturacaoMensal();

    const meses = [
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

    // ------------------------------------------------------
    // CORES DAS SÉRIES
    // ------------------------------------------------------
    const cores = [
      {
        fundo: '#17a2b8',
        bordo: '#117a8b'
      },
      {
        fundo: '#28a745',
        bordo: '#1e7e34'
      },
      {
        fundo: '#ffc107',
        bordo: '#d39e00'
      },
      {
        fundo: '#6f42c1',
        bordo: '#59339d'
      },
      {
        fundo: '#fd7e14',
        bordo: '#d96b0b'
      },
      {
        fundo: '#dc3545',
        bordo: '#bd2130'
      }
    ];

    // ------------------------------------------------------
    // UM DATASET POR ANO
    // ------------------------------------------------------
    const datasets =
      anos.map((ano, index) => {

        const cor = cores[index % cores.length];

        return {
          label: String(ano),
          data: faturacaoPorAno[ano],
          backgroundColor: cor.fundo,
          borderColor: cor.bordo,
          borderWidth: 1
        };
      });

    // ------------------------------------------------------
    // VALORES SOBRE AS BARRAS
    // ------------------------------------------------------
    const pluginValores = {

      id: 'pluginValoresReembolsos',
      afterDatasetsDraw(chart) {

        const { ctx } = chart;

        ctx.save();

        ctx.font = 'bold 13px Arial';
        ctx.fillStyle = '#212529';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        chart.data.datasets.forEach((dataset, datasetIndex) => {
            const meta = chart.getDatasetMeta(datasetIndex);

            meta.data.forEach((barra, index) => {
                const valor = Number(dataset.data[index]) || 0;

                // Não apresentar valores zero
                if (valor === 0) {
                  return;
                }

                ctx.fillText(formatCurrency(valor), barra.x, barra.y - 6);

              }
            );
          }
        );

        ctx.restore();
      }
    };

    // ------------------------------------------------------
    // GRÁFICO
    // ------------------------------------------------------
    const grafico = new Chart(contexto,{
          type: 'bar',
          data: {
            labels: meses,
            datasets
          },
          plugins: [pluginValores],
          options: {
            responsive: false,
            animation: false,
            maintainAspectRatio: false,
            layout: {
              padding: {
                top: 35,
                right: 10,
                left: 10,
                bottom: 10
              }
            },
            plugins: {
              // Agora precisamos da legenda
              // para identificar cada ano
              legend: {
                display: true,
                position: 'top',
                labels: {
                  boxWidth: 18,
                  boxHeight: 10,
                  font: {size: 13}
                }
              }
            },
            scales: {
              x: {
                grid: {display: false},
                ticks: {
                  autoSkip: false,
                  maxRotation: 0,
                  minRotation: 0
                }
              },
              y: {
                beginAtZero: true,
                ticks: {callback(valor) {
                    return new Intl.NumberFormat('pt-PT', {notation: 'compact', maximumFractionDigits: 1}).format(valor);
                  }
                }
              }
            }
          }
        }
      );

    grafico.update();

    const imagem = canvas.toDataURL('image/png', 1);

    grafico.destroy();

    // ------------------------------------------------------
    // TOTAL DE TODOS OS ANOS
    // ------------------------------------------------------
    const valoresMensais = Array(12).fill(0);

    anos.forEach(ano => {faturacaoPorAno[ano].forEach((valor, mes) => {
          valoresMensais[mes] += Number(valor) || 0;
        });
    });

    return {
      imagem,
      valoresMensais
    };
  }

  // ========================================================
  // CABEÇALHO DO GRUPO PP
  // ========================================================
  function adicionarCabecalhoGrupo(grupo) {

    const isOrfao = grupo.key === 'ORFAO';

    if (startY > pageHeight - 35) {
      adicionarNovaPagina();
    }

    // ------------------------------------------------------
    // TOTAL DO GRUPO
    // ------------------------------------------------------
    const totalPedido = Number(grupo.totalPedido) || 0;
    const totalReembolso = Number(grupo.totalReembolso) || 0;
    const totalFaturado = calcularTotalFaturadoGrupo(grupo);
    const aReceber = totalPedido - Math.abs(totalReembolso);

    // ------------------------------------------------------
    // BARRA DO TÍTULO
    // ------------------------------------------------------
    doc.setFillColor(33, 37, 41);
    doc.rect(marginLeft, startY, tableWidth, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(isOrfao ? 'FATURAS ÓRFÃS' : String(grupo.key), marginLeft + 3, startY + 6);
    doc.setTextColor(0, 0, 0
    );

    // ------------------------------------------------------
    // RESUMO DO GRUPO
    // ------------------------------------------------------
    if (isOrfao) {

      doc.autoTable({

        startY:
          startY + 11,

        body: [
          [
            {
              content:
                'Total das faturas órfãs',

              styles: {
                fontStyle:
                  'bold',

                fillColor:
                  [240, 240, 240]
              }
            },

            {
              content:
                formatCurrency(
                  totalFaturado
                ),

              styles: {
                halign:
                  'right'
              }
            }
          ]
        ],

        theme: 'grid',

        margin: {
          left: marginLeft,
          right: marginRight
        },

        tableWidth: 90,

        styles: {
          fontSize: 8,
          cellPadding: 1.7,
          valign: 'middle'
        },

        columnStyles: {
          0: {
            cellWidth: 55
          },

          1: {
            cellWidth: 35
          }
        }
      });

    } else {

      doc.autoTable({

        startY:
          startY + 11,

        body: [
          [
            {
              content: 'Pedido',

              styles: {
                fontStyle:
                  'bold',

                fillColor:
                  [240, 240, 240]
              }
            },

            {
              content:
                formatCurrency(
                  totalPedido
                ),

              styles: {
                halign:
                  'right'
              }
            },

            {
              content:
                'Reembolso',

              styles: {
                fontStyle:
                  'bold',

                fillColor:
                  [240, 240, 240]
              }
            },

            {
              content:
                formatCurrency(
                  totalReembolso
                ),

              styles: {
                halign:
                  'right'
              }
            },

            {
              content:
                'A Receber',

              styles: {
                fontStyle:
                  'bold',

                fillColor:
                  [240, 240, 240]
              }
            },

            {
              content:
                formatCurrency(
                  aReceber
                ),

              styles: {
                halign:
                  'right'
              }
            },

            {
              content:
                'Faturado',

              styles: {
                fontStyle:
                  'bold',

                fillColor:
                  [240, 240, 240]
              }
            },

            {
              content:
                formatCurrency(
                  totalFaturado
                ),

              styles: {
                halign:
                  'right'
              }
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
          valign: 'middle'
        },

        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 28 },

          2: { cellWidth: 22 },
          3: { cellWidth: 28 },

          4: { cellWidth: 22 },
          5: { cellWidth: 28 },

          6: { cellWidth: 20 },
          7: { cellWidth: 22 }
        }
      });
    }

    startY =
      doc.lastAutoTable.finalY +
      6;
  }

  // ========================================================
  // CABEÇALHO / RESUMO DO PROCESSO
  // ========================================================
  function adicionarCabecalhoProcesso(
    grupo,
    item
  ) {

    const processo =
      item.processo || {};

    const faturas =
      Array.isArray(item.faturas)
        ? item.faturas
        : [];

    const padm =
      processo.padm ||
      processo.proces_check ||
      '-';

    const designacao =
      cleanPdfText(
        processo.designacao ||
        'Processo sem designação'
      );

    const tituloProcesso =
      `${padm} — ${designacao}`;

    const tituloLinhas =
      doc.splitTextToSize(
        tituloProcesso,
        tableWidth - 6
      );

    const alturaLinhaTitulo =
      4;

    const alturaTitulo =
      Math.max(
        9,
        5 +
        tituloLinhas.length *
        alturaLinhaTitulo
      );

    const alturaNecessaria =
      alturaTitulo + 30;

    if (
      startY >
      pageHeight -
      alturaNecessaria
    ) {
      adicionarNovaPagina();
    }

    // ------------------------------------------------------
    // MOVIMENTOS DESTE PROCESSO / GRUPO
    // ------------------------------------------------------
    const pedidos =
      filtrarMovimentosGrupo(
        processo,
        grupo.key,
        91
      );

    const reembolsos =
      filtrarMovimentosGrupo(
        processo,
        grupo.key,
        92
      );

    const pedidoValor =
      somarMovimentos(
        pedidos
      );

    const reembolsoValor =
      somarMovimentos(
        reembolsos
      );

    const aReceber =
      pedidoValor -
      Math.abs(
        reembolsoValor
      );

    const totalFaturadoProcesso =
      calcularTotalFaturadoItem(
        item
      );

    // ------------------------------------------------------
    // TÍTULO
    // ------------------------------------------------------
    doc.setFillColor(
      52,
      58,
      64
    );

    doc.rect(
      marginLeft,
      startY,
      tableWidth,
      alturaTitulo,
      'F'
    );

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.setFontSize(8.5);

    doc.setTextColor(
      255,
      255,
      255
    );

    doc.text(
      tituloLinhas,
      marginLeft + 3,
      startY + 5,
      {
        lineHeightFactor:
          1.15
      }
    );

    doc.setTextColor(
      0,
      0,
      0
    );

    // ------------------------------------------------------
    // PROCESSO ÓRFÃO
    // ------------------------------------------------------
    if (
      grupo.key === 'ORFAO'
    ) {

      doc.autoTable({

        startY:
          startY +
          alturaTitulo +
          2,

        body: [
          [
            {
              content:
                'Faturado',

              styles: {
                fontStyle:
                  'bold',

                fillColor:
                  [240, 240, 240]
              }
            },

            {
              content:
                formatCurrency(
                  totalFaturadoProcesso
                ),

              styles: {
                halign:
                  'right'
              }
            },

            {
              content:
                'N.º de faturas',

              styles: {
                fontStyle:
                  'bold',

                fillColor:
                  [240, 240, 240]
              }
            },

            {
              content:
                String(
                  faturas.length
                ),

              styles: {
                halign:
                  'center'
              }
            }
          ]
        ],

        theme: 'grid',

        margin: {
          left: marginLeft,
          right: marginRight
        },

        tableWidth: 100,

        styles: {
          fontSize: 7.5,
          cellPadding: 1.5,
          valign: 'middle'
        },

        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 30 },
          2: { cellWidth: 25 },
          3: { cellWidth: 20 }
        }
      });

    } else {

      // ----------------------------------------------------
      // PROCESSO NORMAL
      // ----------------------------------------------------
      doc.autoTable({

        startY:
          startY +
          alturaTitulo +
          2,

        body: [
          [
            {
              content:
                'Pedido',

              styles: {
                fontStyle:
                  'bold',

                fillColor:
                  [240, 240, 240]
              }
            },

            {
              content:
                formatCurrency(
                  pedidoValor
                ),

              styles: {
                halign:
                  'right'
              }
            },

            {
              content:
                'Reembolso',

              styles: {
                fontStyle:
                  'bold',

                fillColor:
                  [240, 240, 240]
              }
            },

            {
              content:
                formatCurrency(
                  reembolsoValor
                ),

              styles: {
                halign:
                  'right'
              }
            },

            {
              content:
                'A Receber',

              styles: {
                fontStyle:
                  'bold',

                fillColor:
                  [240, 240, 240]
              }
            },

            {
              content:
                formatCurrency(
                  aReceber
                ),

              styles: {
                halign:
                  'right'
              }
            }
          ],

          [
            {
              content:
                'Faturado',

              styles: {
                fontStyle:
                  'bold',

                fillColor:
                  [240, 240, 240]
              }
            },

            {
              content:
                formatCurrency(
                  totalFaturadoProcesso
                ),

              styles: {
                halign:
                  'right'
              }
            },

            {
              content:
                'N.º de faturas',

              styles: {
                fontStyle:
                  'bold',

                fillColor:
                  [240, 240, 240]
              }
            },

            {
              content:
                String(
                  faturas.length
                ),

              styles: {
                halign:
                  'center'
              }
            },

            {
              content: '',
              colSpan: 2
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
          overflow:
            'linebreak'
        },

        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 35 },

          2: { cellWidth: 27 },
          3: { cellWidth: 35 },

          4: { cellWidth: 25 },
          5: { cellWidth: 43 }
        },

        didDrawPage() {
          adicionarCabecalho();
        }
      });
    }

    startY =
      doc.lastAutoTable.finalY +
      3;
  }

  // ========================================================
  // TABELA DE FATURAS DO PROCESSO
  // ========================================================
  function adicionarFaturasProcesso(item) {

    const faturas =
      Array.isArray(item.faturas)
        ? item.faturas
        : [];

    // ------------------------------------------------------
    // SEM FATURAS
    // ------------------------------------------------------
    if (
      faturas.length === 0
    ) {

      doc.autoTable({

        startY,

        body: [
          [
            'Este processo não possui faturas.'
          ]
        ],

        theme: 'grid',

        margin: {
          left: marginLeft,
          right: marginRight
        },

        styles: {
          fontSize: 8,

          textColor: [
            100,
            100,
            100
          ],

          fillColor: [
            250,
            250,
            250
          ],

          cellPadding: 2
        }
      });

      startY =
        doc.lastAutoTable.finalY +
        7;

      return;
    }

    // ------------------------------------------------------
    // ORDENAR FATURAS
    // ------------------------------------------------------
    const faturasOrdenadas =
      [...faturas]
        .sort(
          (a, b) => {

            const dataA =
              a.fact_data
                ? new Date(
                    a.fact_data
                  ).getTime()
                : 0;

            const dataB =
              b.fact_data
                ? new Date(
                    b.fact_data
                  ).getTime()
                : 0;

            return dataA - dataB;
          }
        );

    // ------------------------------------------------------
    // LINHAS
    // ------------------------------------------------------
    const linhas =
      faturasOrdenadas.map(
        fatura => [

          cleanPdfText(
            fatura.ent_nome ||
            '-'
          ),

          formatDatePDF(
            fatura.fact_data
          ),

          [
            fatura.fact_tipo,
            fatura.fact_num
          ]
            .filter(Boolean)
            .join(' ') ||
            '-',

          formatExpediente(
            fatura.fact_expediente
          ) ||
            '-',

          fatura.fact_auto_num ||
            '-',

          formatDatePDF(
            fatura.fact_auto_data
          ),

          Number(
            fatura.fact_iva
          ) ||
            0,

          Number(
            fatura.fact_valor
          ) ||
            0
        ]
      );

    // ------------------------------------------------------
    // TABELA
    // ------------------------------------------------------
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

      body:
        linhas,

      theme:
        'grid',

      margin: {
        left:
          marginLeft,

        right:
          marginRight,

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
        fillColor: [
          23,
          162,
          184
        ],

        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },

      columnStyles: {

        0: {
          cellWidth: 42
        },

        1: {
          cellWidth: 18,
          halign: 'center'
        },

        2: {
          cellWidth: 28
        },

        3: {
          cellWidth: 26
        },

        4: {
          cellWidth: 16,
          halign: 'center'
        },

        5: {
          cellWidth: 20,
          halign: 'center'
        },

        6: {
          cellWidth: 20,
          halign: 'right'
        },

        7: {
          cellWidth: 20,
          halign: 'right'
        }
      },

      didParseCell(data) {

        if (
          data.section ===
            'body' &&
          [6, 7].includes(
            data.column.index
          )
        ) {

          data.cell.text = [
            formatCurrency(
              data.cell.raw
            )
          ];
        }
      },

      didDrawPage() {
        adicionarCabecalho();
      }
    });

    startY =
      doc.lastAutoTable.finalY +
      8;
  }

  // ========================================================
  // RESUMO FINAL
  // ========================================================
  function adicionarResumoFinal() {

    const aReceberGeral =
      totalPedidoGeral -
      Math.abs(
        totalReembolsoGeral
      );

    const tiposOrdenados =
      Object.entries(
        totaisPorTipoFatura
      ).sort(
        ([tipoA], [tipoB]) =>
          tipoA.localeCompare(
            tipoB,
            'pt-PT'
          )
      );

    // ------------------------------------------------------
    // LINHAS PRINCIPAIS
    // ------------------------------------------------------
    const linhasResumo = [
      [
        'Total faturado',
        '',
        formatCurrency(
          totalFaturadoGeral
        )
      ],

      [
        'Total de pedidos',
        '',
        formatCurrency(
          totalPedidoGeral
        )
      ],

      [
        'Total de reembolsos',
        '',
        formatCurrency(
          totalReembolsoGeral
        )
      ],

      [
        'A Receber',
        '',
        formatCurrency(
          aReceberGeral
        )
      ],

      [
        'Faturas órfãs',
        String(
          quantidadeFaturasOrfas
        ),
        formatCurrency(
          totalFaturasOrfasGeral
        )
      ]
    ];

    // ------------------------------------------------------
    // FATURAÇÃO POR TIPO
    // ------------------------------------------------------
    if (
      tiposOrdenados.length > 0
    ) {

      linhasResumo.push(
        [
          'Faturação por tipo',
          'Registos',
          'Valor'
        ]
      );

      tiposOrdenados.forEach(
        ([tipo, totais]) => {

          linhasResumo.push(
            [
              tipo,

              String(
                totais.quantidade
              ),

              formatCurrency(
                totais.valor
              )
            ]
          );
        }
      );
    }

    const alturaEstimada =
      25 +
      linhasResumo.length *
      7;

    if (
      startY >
      pageHeight -
      alturaEstimada
    ) {

      adicionarNovaPagina();
    }

    // ------------------------------------------------------
    // TÍTULO RESUMO
    // ------------------------------------------------------
    doc.setFillColor(
      33,
      37,
      41
    );

    doc.rect(
      marginLeft,
      startY,
      tableWidth,
      9,
      'F'
    );

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.setFontSize(10);

    doc.setTextColor(
      255,
      255,
      255
    );

    doc.text(
      'RESUMO',
      marginLeft + 3,
      startY + 6
    );

    doc.setTextColor(
      0,
      0,
      0
    );

    // ------------------------------------------------------
    // TABELA RESUMO
    // ------------------------------------------------------
    doc.autoTable({

      startY:
        startY + 11,

      body:
        linhasResumo,

      theme:
        'grid',

      margin: {
        left:
          marginLeft,

        right:
          marginRight
      },

      tableWidth:
        120,

      styles: {
        fontSize: 9,
        cellPadding: 2,
        valign: 'middle'
      },

      columnStyles: {

        0: {
          cellWidth: 65
        },

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

        // ----------------------------------------------------
        // LINHAS PRINCIPAIS
        // ----------------------------------------------------
        if (
          data.row.index < 5
        ) {

          if (
            data.column.index === 0
          ) {

            data.cell.styles
              .fontStyle =
                'bold';

            data.cell.styles
              .fillColor =
                [
                  245,
                  245,
                  245
                ];
          }

          if (
            data.column.index === 1
          ) {

            data.cell.styles
              .fillColor =
                [
                  245,
                  245,
                  245
                ];
          }
        }

        // ----------------------------------------------------
        // CABEÇALHO DOS TIPOS
        // ----------------------------------------------------
        if (
          tiposOrdenados.length >
            0 &&
          data.row.index === 5
        ) {

          data.cell.styles
            .fillColor =
              [
                23,
                162,
                184
              ];

          data.cell.styles
            .textColor =
              [
                255,
                255,
                255
              ];

          data.cell.styles
            .fontStyle =
              'bold';
        }
      }
    });

    startY =
      doc.lastAutoTable.finalY +
      8;
  }

  // ========================================================
  // GRÁFICO MENSAL
  // ========================================================
  function adicionarGraficoMensal() {

    // Sem Chart.js, simplesmente não cria o gráfico.
    if (
      typeof Chart ===
      'undefined'
    ) {
      return;
    }

    const alturaGrafico =
      72;

    if (
      startY >
      pageHeight -
      alturaGrafico -
      20
    ) {

      adicionarNovaPagina();
    }

    const {
      imagem,
      valoresMensais
    } =
      criarImagemGraficoMensal();

    const totalGrafico =
      valoresMensais.reduce(
        (total, valor) =>
          total + valor,
        0
      );

    // ------------------------------------------------------
    // CABEÇALHO
    // ------------------------------------------------------
    doc.setFillColor(
      33,
      37,
      41
    );

    doc.rect(
      marginLeft,
      startY,
      tableWidth,
      9,
      'F'
    );

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.setFontSize(10);

    doc.setTextColor(
      255,
      255,
      255
    );

    doc.text(
      'FATURAÇÃO POR MÊS',
      marginLeft + 3,
      startY + 6
    );

    doc.setTextColor(
      255,
      255,
      255
    );

    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.setFontSize(8);

    doc.text(
      `Total: ${formatCurrency(totalGrafico)}`,
      pageWidth -
      marginRight -
      3,
      startY + 6,
      {
        align: 'right'
      }
    );

    // ------------------------------------------------------
    // IMAGEM
    // ------------------------------------------------------
    doc.addImage(
      imagem,
      'PNG',
      marginLeft,
      startY + 11,
      tableWidth,
      alturaGrafico
    );

    startY +=
      alturaGrafico +
      17;
  }

  // ========================================================
  // PAGINAÇÃO DO PDF
  // ========================================================
  function adicionarPaginacaoPDF(doc) {

    const totalPaginas =
      doc.internal.getNumberOfPages();

    const pageWidth =
      doc.internal.pageSize.getWidth();

    const pageHeight =
      doc.internal.pageSize.getHeight();

    const margemEsquerda = 10;
    const margemDireita = 10;

    for (
      let pagina = 1;
      pagina <= totalPaginas;
      pagina++
    ) {

      doc.setPage(pagina);

      // ----------------------------------------------------
      // LINHA DO RODAPÉ
      // ----------------------------------------------------
      doc.setDrawColor(
        200,
        200,
        200
      );
      

      doc.setLineWidth(0.2);

      doc.line(
        margemEsquerda,
        pageHeight - 12,
        pageWidth - margemDireita,
        pageHeight - 12
      );

      // ----------------------------------------------------
      // TEXTO DA PAGINAÇÃO
      // ----------------------------------------------------
      doc.setFont(
        'helvetica',
        'normal'
      );

      doc.setFontSize(7.5);

      doc.setTextColor(
        100,
        100,
        100
      );

      doc.text(
        `Página ${pagina} de ${totalPaginas}`,
        pageWidth / 2,
        pageHeight - 7,
        {
          align: 'center'
        }
      );
    }

    // Repor cor normal do texto
    doc.setTextColor(
      0,
      0,
      0
    );
  }
  // ========================================================
  // CONSTRUÇÃO DO DOCUMENTO
  // ========================================================
  adicionarCabecalho();

  grupos.forEach(grupo => {

    if (
      !grupo ||
      !grupo.processos ||
      Object.keys(
        grupo.processos
      ).length === 0
    ) {
      return;
    }

    // ------------------------------------------------------
    // TOTAIS GERAIS DO PP
    // ------------------------------------------------------
    const totalPedido =
      Number(
        grupo.totalPedido
      ) || 0;

    const totalReembolso =
      Number(
        grupo.totalReembolso
      ) || 0;

    const totalFaturadoGrupo =
      calcularTotalFaturadoGrupo(
        grupo
      );

    totalPedidoGeral +=
      totalPedido;

    totalReembolsoGeral +=
      totalReembolso;

    totalFaturadoGeral +=
      totalFaturadoGrupo;

    // ------------------------------------------------------
    // FATURAS ÓRFÃS
    // ------------------------------------------------------
    if (
      grupo.key ===
      'ORFAO'
    ) {

      totalFaturasOrfasGeral +=
        totalFaturadoGrupo;
    }

    // ------------------------------------------------------
    // CABEÇALHO PP
    // ------------------------------------------------------
    adicionarCabecalhoGrupo(
      grupo
    );

    // ------------------------------------------------------
    // PROCESSOS DO GRUPO
    // ------------------------------------------------------
    const itens =
      Object.values(
        grupo.processos
      ).sort(
        (a, b) => {

          const designacaoA =
            a.processo
              ?.designacao ||
            '';

          const designacaoB =
            b.processo
              ?.designacao ||
            '';

          return String(
            designacaoA
          ).localeCompare(
            String(
              designacaoB
            ),
            'pt-PT'
          );
        }
      );

    itens.forEach(item => {

      const faturas =
        Array.isArray(
          item.faturas
        )
          ? item.faturas
          : [];

      // ----------------------------------------------------
      // CONTADORES
      // ----------------------------------------------------
      quantidadeFaturasGeral +=
        faturas.length;

      if (
        grupo.key ===
        'ORFAO'
      ) {

        quantidadeFaturasOrfas +=
          faturas.length;
      }

      acumularTotaisPorTipo(
        faturas
      );

      // ----------------------------------------------------
      // PROCESSO
      // ----------------------------------------------------
      adicionarCabecalhoProcesso(
        grupo,
        item
      );

      adicionarFaturasProcesso(
        item
      );
    });
  });

  // ========================================================
  // RESUMO
  // ========================================================
  adicionarResumoFinal();

  // ========================================================
  // GRÁFICO
  // ========================================================
  adicionarGraficoMensal();

  // ========================================================
  // PAGINAÇÃO
  // ========================================================
  adicionarPaginacaoPDF(
    doc
  );

  return doc;
}


function filtrarMovimentosGrupo(processo, key, codigo) {
  return (processo.historico || []).filter(movimento =>
    Number(movimento.historico_descr_cod) === Number(codigo) &&
    String(movimento.historico_num || 'ORFAO') === String(key)
  );
}


function somarMovimentos(movimentos) {
  return movimentos.reduce(
    (total, movimento) =>
      total + (Number(movimento.historico_valor) || 0),
    0
  );
}


function formatarFaturasPDF(faturas = []) {
  if (!faturas.length) {
    return 'Sem faturas';
  }

  return faturas.map(fatura => {
    const expediente =
      formatExpediente(fatura.fact_expediente) || '-';

    const data = fatura.fact_data || '-';

    const documento = [
      fatura.fact_tipo,
      fatura.fact_num
    ]
      .filter(Boolean)
      .join('_') || '-';

    const auto = fatura.fact_auto_num
      ? `AM_${fatura.fact_auto_num}`
      : '-';

    return [
      expediente,
      data,
      documento,
      auto,
      formatCurrency(fatura.fact_valor)
    ].join(' / ');
  }).join('\n');
}


function adicionarResumoFinalPDF(
  doc,
  {
    startY,
    marginLeft,
    totalPedidoGeral,
    totalReembolsoGeral,
    diferencialGeral
  }
) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);

  doc.text('RESUMO', marginLeft, startY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  doc.text(
    `Total de pedidos: ${formatCurrency(totalPedidoGeral)}`,
    marginLeft,
    startY + 8
  );

  doc.text(
    `Total de reembolsos: ${formatCurrency(totalReembolsoGeral)}`,
    marginLeft,
    startY + 15
  );

  doc.text(
    `Diferencial: ${formatCurrency(diferencialGeral)}`,
    marginLeft,
    startY + 22
  );
}


function adicionarPaginacaoPDF(doc) {
  const totalPaginas = doc.getNumberOfPages();

  for (let pagina = 1; pagina <= totalPaginas; pagina++) {
    doc.setPage(pagina);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    doc.text(
      `Página ${pagina} / ${totalPaginas}`,
      pageWidth - 35,
      pageHeight - 7
    );
  }
}


// ==========================================================
// EXCEL
// ==========================================================

function criarDocumentoReembolsosExcel(
  grupos,
  {
    key = null,
    escopo = 'global'
  } = {}
) {
  const rows = criarLinhasExcel(grupos);

  if (rows.length === 0) {
    alert('Não existem registos para exportar.');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  configurarLargurasExcel(worksheet);

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'Reembolsos'
  );

  const nomeFicheiro = criarNomeFicheiroExportacao({
    formato: 'xlsx',
    key,
    escopo
  });

  XLSX.writeFile(workbook, nomeFicheiro);
}


function criarLinhasExcel(grupos) {
  const rows = [];

  grupos.forEach(grupo => {
    Object.values(grupo.processos).forEach(item => {
      const processo = item.processo || {};

      const pedidos = filtrarMovimentosGrupo(
        processo,
        grupo.key,
        91
      );

      const reembolsos = filtrarMovimentosGrupo(
        processo,
        grupo.key,
        92
      );

      const pedidoRef = formatarReferenciasMovimentos(pedidos);
      const reembolsoRef =
        formatarReferenciasMovimentos(reembolsos);

      const totalPedido = somarMovimentos(pedidos);
      const totalReembolso = somarMovimentos(reembolsos);

      const dadosComuns = {
        Grupo:
          grupo.key === 'ORFAO'
            ? 'Faturas órfãs'
            : grupo.key,

        Processo:
          processo.padm ||
          processo.proces_check ||
          '-',

        Designação:
          cleanPdfText(processo.designacao || '-'),

        Pedido: pedidoRef,
        'Valor pedido': totalPedido,

        Reembolso: reembolsoRef,
        'Valor reembolso': totalReembolso,

        Diferencial:
          totalPedido - Math.abs(totalReembolso)
      };

      if (!item.faturas?.length) {
        rows.push({
          ...dadosComuns,
          Data: '-',
          Fatura: '-',
          Expediente: '-',
          Auto: '-',
          'Valor fatura': 0
        });

        return;
      }

      item.faturas.forEach(fatura => {
        rows.push({
          ...dadosComuns,

          Data: fatura.fact_data || '-',

          Fatura: [
            fatura.fact_tipo,
            fatura.fact_num
          ]
            .filter(Boolean)
            .join('_') || '-',

          Expediente:
            formatExpediente(fatura.fact_expediente) || '-',

          Auto:
            fatura.fact_auto_num
              ? `AM_${fatura.fact_auto_num}`
              : '-',

          'Valor fatura':
            Number(fatura.fact_valor) || 0
        });
      });
    });
  });

  return rows;
}


function formatarReferenciasMovimentos(movimentos) {
  if (!movimentos.length) {
    return '-';
  }

  return movimentos.map(movimento => {
    return [
      movimento.historico_num,
      movimento.historico_doc,
      movimento.historico_dataemissao
    ]
      .filter(Boolean)
      .join(' / ');
  }).join(' | ');
}


function configurarLargurasExcel(worksheet) {
  worksheet['!cols'] = [
    { wch: 18 }, // Grupo
    { wch: 16 }, // Processo
    { wch: 50 }, // Designação
    { wch: 35 }, // Pedido
    { wch: 16 }, // Valor pedido
    { wch: 35 }, // Reembolso
    { wch: 18 }, // Valor reembolso
    { wch: 16 }, // Diferencial
    { wch: 13 }, // Data
    { wch: 18 }, // Fatura
    { wch: 22 }, // Expediente
    { wch: 14 }, // Auto
    { wch: 16 }  // Valor fatura
  ];
}


function criarNomeFicheiroExportacao({
  formato,
  key,
  escopo
}) {
  const candidatura =
    processosGlobais?.[0]?.candidatura ||
    'candidatura';

  const referencia =
    escopo === 'modal' && key
      ? key
      : 'todos';

  const nomeSeguro = String(
    `reembolsos_${candidatura}_${referencia}`
  )
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

  return `${nomeSeguro}.${formato}`;
}

function getGrupoPP(valor) {

  const numero = String(valor || '').trim();

  return numero.startsWith('PP')
      ? numero
      : 'ORFAO';
}

function getReembolsosAgrupadosDetalhado(processos) {

  const grupos = {};

  processos.forEach(processo => {

    const historico = processo.historico || [];
    const faturas = processo.faturas || [];

    const movimentos = historico.filter(h =>
      h.historico_descr_cod === 91 || h.historico_descr_cod === 92 
    );

    // ============================
    // AGRUPAR MOVIMENTOS
    // ============================
    movimentos.forEach(h => {

      const key = getGrupoPP(h.historico_num);

      if (!grupos[key]) {
        grupos[key] = {
          key,
          totalPedido: 0,
          totalReembolso: 0,
          processos: {}
        };
      }

      if (h.historico_descr_cod === 91) {
        grupos[key].totalPedido += (h.historico_valor || 0);
      }

      if (h.historico_descr_cod === 92) {
        grupos[key].totalReembolso += (h.historico_valor || 0);
      }

      if (!grupos[key].processos[processo.proces_check]) {
        grupos[key].processos[processo.proces_check] = {
          processo,
          faturas: []
        };
      }
    });

    // ============================
    // ORFÃO (SEM MOVIMENTOS)
    // ============================
    if (movimentos.length === 0) {

      if (!grupos['ORFAO']) {
        grupos['ORFAO'] = {
          key: 'ORFAO',
          totalPedido: 0,
          totalReembolso: 0,
          processos: {}
        };
      }

      if (!grupos['ORFAO'].processos[processo.proces_check]) {
        grupos['ORFAO'].processos[processo.proces_check] = {
          processo,
          faturas: []
        };
      }
    }

    // ============================
    // FATURAS
    // ============================
    faturas.forEach(f => {

      const key = getGrupoPP(f.fact_finan_pp);

      if (!grupos[key]) {
        grupos[key] = {
          key,
          totalPedido: 0,
          totalReembolso: 0,
          processos: {}
        };
      }
      
      const grupo = grupos[key];

      if (!grupo.processos[processo.proces_check]) {
        grupo.processos[processo.proces_check] = {
          processo,
          faturas: []
        };
      }

      grupo.processos[processo.proces_check].faturas.push(f);
    });

  });

  return Object.values(grupos).sort((a, b) => {
    if (a.key === 'ORFAO') return 1;
    if (b.key === 'ORFAO') return -1;
    return String(a.key).localeCompare(String(b.key), 'pt');
  });
}


// Query params
function getQueryParams() {
  const params = {};
  const query = new URLSearchParams(window.location.search);
  for (const [key, value] of query.entries()) {
    params[key] = value;
  }
  return params;
}

// Redireciona para o processo
function redirectProcesso(codigoProcesso){
  const obrasURL = `../../producao/processos/processoResults.html?codigoProcesso=${codigoProcesso}`;
  window.location.href = obrasURL;
}