let processosGlobais = [];
let table;
const path = "../../global/imagens";


$(document).ready(function () {

  const candidatura = getUrlParameter('itemProcurado');

  $.ajax({
    url: 'dados/candidaturasNested.php',
    type: 'GET',
    dataType: 'json',
    data: {
      itemProcurado: candidatura
    },

    success: function (json) {
      renderTitulo(json);
      renderHistorico(json);
      renderPDF(json);
    },

    error: function () {
      $('#historico').html(`
        <div class="alert alert-danger mb-0">
          Erro ao carregar dados do histórico.
        </div>
      `);
    }

  });

});

/* =========================
   RENDER TÍTULO
   ========================= */
function renderTitulo(json){

  let html = `
    <div class="row no-gutters align-items-center mb-2">

      <div class="col-10">
          <div class="d-flex justify-content-start bg-primary text-white text-truncate px-3 py-2">
          ${json.candidatura || ''} - ${json.designacao || ''}
          </div>
      </div>

      <div class="col-2 justify-content-center">
        <!-- Botões -->
        <div class="d-flex justify-content-end px-3 py-2" style="padding: 6px 16px; min-height: 50px;">

          <a href="candidaturasNested.html?itemProcurado=${json.candidatura}"
            class="btn btn-info mr-1"
            style="padding: 6px 14px;"
            title="Detalhes">
            <i class="fa-solid fa-arrow-right text-light"></i>
          </a>

          <a href="candidaturasGeral.html?itemProcurado=${json.candidatura}"
            class="btn btn-secondary mr-1"
            style="padding: 6px 14px;"
            title="Atualizar">
            <i class="fa-solid fa-rotate text-light"></i>
          </a>

          <a href="candidaturasDashboard.html"
            class="btn btn-warning"
            style="padding: 6px 14px;"
            title="Pesquisar">
            <i class="fa-solid fa-search text-dark"></i>
          </a>

        </div>
      


      </div>

    </div>
`;

$('#titulo').html(html);

};

/* =========================
RENDER HISTÓRICO
========================= */
  function renderHistorico(json) {

  let html = `
    <div class="row g-3 align-items-stretch">

      <!-- CARTÃO 1 -->
      <div class="col-md-4">
        <div class="card border-info small text-left shadow-sm h-100">
          <div class="card-body">

            <div class="mb-3 d-flex justify-content-between align-items-center border-bottom pb-2">
              ${json.logo ? `
              <img src="${path}/${json.logo}" style="height:70px;">
              ` : ''}
              <div>
                  <strong>Aviso: ${json.aviso || ''}</strong><br>
                  <small class="text-muted">
                      Abertura: ${json.abertura || ''} - Fecho: ${json.fecho || ''}
                  </small>
              </div>

              
          </div>

            <div class="mb-2">
              <div>Prioridade: ${json.prioridade || ''}</div>
              <div>Tipologia: ${json.tipologia_intervencao || ''}</div>
            </div>

            <div>
              <div>Objetivo: ${json.objetivo || ''}</div>
              <div>Ação: ${json.tipologia_acao || ''}</div>
              <div class="font-weight-bold">Taxa de Cofinanciamento: ${((json.taxa || 0) * 100).toFixed(2)}%</div>
            </div>

          </div>
        </div>
      </div>

      <!-- CARTÃO 2 -->
      <div class="col-md-4">
        <div class="card border-primary small text-left shadow-sm h-100">
          <div class="card-body font-weight-bold text-primary">

            <div class="mb-2">
              <div>Candidatura: ${json.estado || ''}</div>
              <div>Início: ${json.inicio || ''} - Termo: ${json.termo || ''}</div>
            </div>

            <div class="mb-2">
              <div>Submissão: ${json.submissao || ''} </div>
              <div>Aprovação: ${json.aprovacao || ''}</div>
              <div>Termo de Aceitação: ${json.aceitacao || ''}</div>
            </div>
            
            <div class="mb-2">
              <div>Investimento Aprovado: ${formatCurrency(json.elegivel * json.iva) || ''} </div>
              <div>IVA (Incluído): ${formatCurrency((json.elegivel  * json.iva) - json.elegivel) || ''}</div>
              <div>Apoio Aprovado: ${formatCurrency(json.elegivel  * json.iva * json.taxa) || ''}</div>
            </div>

          </div>
        </div>
      </div>

      <!-- CARTÃO 3 -->
      <div class="col-md-4">
        <div class="card border-warning small text-left shadow-sm h-100">
          <div class="card-body">

            <div class="mb-2">
              <strong>Indicadores: Em Construção</strong>
            </div>

            <div class="table-responsive">
              <table class="table table-sm table-hover table-bordered small align-middle mb-0">

                <thead>
                  <tr>
                    <th>Indicador</th>
                    <th>Unidade</th>
                    <th>Meta</th>
                    <th>Execução</th>
                    <th>%</th>
                  </tr>
                </thead>

                <tbody>

                  <tr>
                    <td>RCO 30 ITI</td>
                    <td>Km</td>
                    <td class="text-end">5,11</td>
                    <td class="text-end">0</td>
                    <td class="text-end">0,00%</td>
                  </tr>

                  <tr>
                    <td>RCR 75 ITI</td>
                    <td>Un</td>
                    <td class="text-end">1</td>
                    <td class="text-end">1</td>
                    <td class="text-end">100,00%</td>
                  </tr>

                  <tr>
                    <td>RCR 41 ITI</td>
                    <td>Pessoas</td>
                    <td class="text-end">145</td>
                    <td class="text-end">0</td>
                    <td class="text-end">0,00%</td>
                  </tr>

                  <tr>
                    <td>RCR 43 ITI</td>
                    <td>m3/ano</td>
                    <td class="text-end">Perdas</td>
                    <td class="text-end">Aplicável?</td>
                    <td class="text-end">0,00%</td>
                  </tr>

                </tbody>

              </table>
            </div>

          </div>
        </div>
      </div>

    </div>
  `;

  $('#historico').html(html);

}

/* =========================
RENDER LEITURA PDFs - Aviso e MD do Projeto
========================= */
function renderPDF(json) {

  let html = `
    <div class="row mt-2 g-1 align-items-stretch">

      <!-- CARTÃO 1 - AVISO DA CANDIDATURA -->
      <div class="col-md-6">
        <div class="card border-info small text-left shadow-sm h-100">
          <div class="card-body">
            <div class="card-body">
              <div class="d-flex justify-content-left">
                <div id="flipBook1"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CARTÃO 2 - MEMÓRIA DESCRITIVA DO PROJETO -->
      <div class="col-md-6">
        <div class="card border-primary small text-left shadow-sm h-100">
          <div class="card-body">
              <div class="d-flex justify-content-left">
                <div id="flipBook2"></div>
              </div>
            </div>
        </div>
      </div>
    </div>
  `;

  //html +=  `
  //  <div class="card">
  //    <div class="card-header">Livro do Aviso</div>
  //    <div class="card-body">
  //        <div id="flipBook"
  //             style="width:100%;height:800px;">
  //        </div>
  //    </div>
  //  </div>
  // `;
  
  $('#flipBook').html(html);
  loadPDF(json.documento_aviso, "flipBook1");
  loadPDF(json.documento_aceitacao, "flipBook2");

}

/* =========================
CARREGAR E LER O PDF
========================= */
async function loadPDF(pdfFile, containerId){

  const container = document.getElementById(containerId);

  if (!pdfFile) {
    container.innerHTML = `
      <div class="alert alert-warning m-2">
        Documento inexistente.
      </div>
    `;
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc ='../../vendors/pdfjs/pdf.worker.min.js';

  try {

    const pdf = await pdfjsLib.getDocument('documentos/' + pdfFile).promise;
    const pages=[];

    for(let i=1; i<=pdf.numPages; i++){
      
      const page=await pdf.getPage(i);
      const viewport=page.getViewport({
        scale:1.5
      });
      
      const canvas=document.createElement('canvas');
      
      canvas.width=viewport.width;
      canvas.height=viewport.height;

      const ctx = canvas.getContext("2d");

      await page.render({
          canvasContext: ctx,
          viewport
      }).promise;

      ctx.save();

      ctx.font = "16px Arial";
      ctx.fillStyle = "#444";
      ctx.textAlign = "center";

      ctx.fillText(i, canvas.width / 2, canvas.height - 14);

      ctx.restore();

      const div = document.createElement('div');
      div.className = "page";
      div.appendChild(canvas);

      pages.push(div);

    }

    const pageFlip = new St.PageFlip(
      container,
      {
        width:700,
        height:900,
        size:"stretch",
        showCover:true,
        mobileScrollSupport:true,
        maxShadowOpacity:0.5
      }
    );

    pageFlip.loadFromHTML(pages);

  } catch(error) {

    console.error("Erro ao carregar PDF:", error);

    container.innerHTML = `
      <div class="alert alert-danger m-2">
        Documento inexistente ou impossível de carregar.
      </div>
    `;

  }
}

/* =========================
URL PARAM
========================= */
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

/// ************************ ///
///    UTILITÁRIOS
/// ************************ ///

//Formatação de Moeda
function formatCurrency(value){
  return new Intl.NumberFormat('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(value || 0) + '€';
}

// Formatação de Expediente
function formatExpediente(str){
  return str 
  ? `${str[0]}.${str.slice(1, 6)}.${str.slice(6)}`
  : '';
}

// Formatação para o PDF
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