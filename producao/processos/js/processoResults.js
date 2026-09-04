
var processoCodigo = [];
var variaveis = [];

// Os resultados da Seleção é redirecionado para a processosResults.html
// Quando se seleciona um processo - obtem a identificação do processo e passa para o "Título"

function processoSelected() { 

  var params = new URLSearchParams(window.location.search);
  var codigo = params.get("codigoProcesso");
  var item = 106;
  var ano = 2026;
  //var item = params.get("codigoProcesso");
  //var ano = params.get("codigoProcesso");

  
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("processoSelected").innerHTML = this.responseText;
      processoCodigo.push(codigo);
      variaveis.push(codigo, item, ano);    
    }
  }

  xmlhttp.open("GET","dados/processoTitulo.php?codigoProcesso="+codigo,true);
  xmlhttp.send();

        resumoProcesso(codigo);
        historicoProcesso(codigo);
        fasesProcesso(codigo); // Milestones
        resumoCCP(codigo);
        relacoesProcesso(codigo);
        Financeiro(codigo);
        //pagamentosProcesso(codigo); // Plano de Pagamentos
        faturasProcesso(codigo); // Detalhes daas Faturas
        //garantiasProcesso(codigo);

};


// Resumo do Processo
function resumoProcesso(codigo) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      data = document.getElementById("lstResumo").innerHTML = this.responseText;

    }
  }
  xmlhttp.open("GET","dados/processoResumo.php?codigoProcesso="+codigo,true);
  xmlhttp.send();

};

// Fases do Processo - Milestones
function fasesProcesso(codigo) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("lstFasesProcesso").innerHTML = this.responseText;

      console.log("Milestones: ", this.responseText);
    }
  }
  xmlhttp.open("GET","dados/processoMilestones.php?codigoProcesso="+codigo,true);
  xmlhttp.send();
};

// REsumo do Processo - Enquadramento CCP
function resumoCCP(codigo) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("lstResumoCCP").innerHTML = this.responseText;

    }
  }
  xmlhttp.open("GET","dados/processoResumoCCP.php?codigoProcesso="+codigo,true);
  xmlhttp.send();
};

// Histórico
function historicoProcesso(codigo) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("lstHistorico").innerHTML = this.responseText;
    }
  }

  xmlhttp.open("GET","dados/processoHistorico.php?codigoProcesso="+codigo,true);
  xmlhttp.send();
};

// Relacoes
function relacoesProcesso(codigo) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("lstRelacoes").innerHTML = this.responseText;
    }
  }

  xmlhttp.open("GET","dados/processoRelacoes.php?codigoProcesso=" + codigo, true);
  xmlhttp.send();
};

// Plano de Pagamentos
//function pagamentosProcesso(codigo) {
//  var xmlhttp = new XMLHttpRequest();
//  xmlhttp.onreadystatechange = function() {
//    if (this.readyState == 4 && this.status == 200) {
//      document.getElementById("lstPagamentos").innerHTML = this.responseText;
//    }
//  }
//
//  xmlhttp.open("GET","dados/processoFinanceiro.php?codigoProcesso="+codigo,true);
//  xmlhttp.send();
//};

//Financeiro
function Financeiro(codigoProcesso){
  //const codigoProcesso = new URLSearchParams(window.location.search).get("codigoProcesso");
  // Carregar tabelas financeiras
  ProcessoObra.Financeiro.carregar(codigoProcesso, 'tabelaPrevisto', 'tabelaRealizado');
  // Carregar cartões
  ProcessoObra.Cartoes.carregar(codigoProcesso, 'lstObraCartoes', 'cartaoGrauExecucao');
  // Criar gráfico
  ProcessoObra.Grafico.criar(codigoProcesso, 'lstObraGrafico');
};

// Facturas
function faturasProcesso(codigo) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("lstFaturas").innerHTML = this.responseText;
    }
  }
  
  xmlhttp.open("GET","dados/processoFaturas.php?codigoProcesso=" + codigo,true);
  xmlhttp.send();
};

// Garantias
//function garantiasProcesso(codigo) {
//  var xmlhttp = new XMLHttpRequest();
//  xmlhttp.onreadystatechange = function() {
//    if (this.readyState == 4 && this.status == 200) {
//      document.getElementById("lstGarantias").innerHTML = this.responseText;
//    }
//
//    
//  }
//  
//  xmlhttp.open("GET","dados/processoGarantias.php?codigoProcesso="+codigo,true);
//  xmlhttp.send();
//};

// Botões
// Ao clicar nos botões, redireciona para a página ou rotina selecionada
function redirectObras(){
  var obrasURL = "../../producao/obras/obraResults.html?codigoProcesso=" + processoCodigo;
  //window.open(obrasURL, "_blank");
  window.location.href = obrasURL;
};
//Orçamento
function redirectOrcamento(){
  var obrasURL = "../../producao/orcamento/orcamentoNested.html?itemProcurado=" + variaveis[1] + "&anoCorrente=" + variaveis[2];
  //window.open(obrasURL, "_blank");
  window.location.href = obrasURL;
};
function redirectHome(){
  var URL = "../../producao/obras/processoSearch.html";
  //window.open(URL, "_blank");
  window.location.href = URL;
};

// Os resultados da Seleção é redirecionado para a processosResults.html
// Quando se seleciona um processo - obtem a identificação do processo e passa para o "Título"
function redirectProcesso(codigo) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      //document.getElementById("Avisos").style.display = "none";

      var params = codigo;
      var URL = "processoResults.html?codigoProcesso=" + params;
      //window.open(URL, "_blank");
      window.location.href = URL;
    }
  }

  xmlhttp.open("GET","../_search/searchEngine.php?codigoProcesso="+ codigo, true);
  xmlhttp.send();

};

function redirectInformacoesCPV(){
  window.alert("Futuramente listará as Aquisições da mesma natureza");
};

// =========================
// EXPORTA PARA PDF - Fases do Processo
// =========================
async function criarPDFFases() {
  
  const codigo = processoCodigo;
  const resposta = await fetch(
      `dados/processoMilestones.php?codigoProcesso=${codigo}&formato=json`
  );

  if (!resposta.ok) {
      throw new Error("Não foi possível obter os dados do processo.");
  }

  const { pontos, contexto } = await resposta.json();

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");


    // -----------------------------
    // Construção das linhas
    // -----------------------------
    const linhas = pontos.map(p => ([
        p.documento,
        formatarData(p.data_doc),
        formatarData(p.data_val),
        p.refer ?? "",
        p.notas ?? "",
        formatarEuro(p.valor) ?? ""
    ]));

    // -----------------------------
    // Cabeçalho
    // -----------------------------

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);

    doc.text(
        "Relatório das Fases do Processo",
        15,
        15
    );


    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    let y = 24;

    // Processo com quebra automática
    const linhasProcesso = doc.splitTextToSize(
        `Processo: ${contexto.nome ?? "-"}`, 180);
    doc.text(linhasProcesso, 15, y);
    y += linhasProcesso.length * 5;
    
    //Resumo
    const linhasResumo = doc.splitTextToSize(`Resumo: ${contexto.resumo ?? "-"}`, 180);
    doc.text(linhasResumo, 15, y);
    
    // Desce conforme o número de linhas do processo
    y += linhasResumo.length * 5;
    // Restantes informações
    const info = [
        `Candidatura: ${contexto.candidatura ?? "-"}`,
        `Regime: ${contexto.regime ?? "-"}`,
        `Contrato: ${contexto.contrato ?? "-"}`,
        `Procedimento: ${contexto.procedimento ?? "-"}`,
        `CPV Principal: ${contexto.cpv1 ?? "-"}`,
        `CPV Secundário: ${contexto.cpv2 ?? "-"}`
    ];

    info.forEach(linha => {

        doc.text(linha, 15, y);
        y += 5;

    });


    // -----------------------------
    // Tabela
    // -----------------------------
    doc.autoTable({

        startY: y + 8,

        theme: "grid",

        head: [[
            "Documento",
            "Emissão",
            "Validação",
            "Referência",
            "Notas",
            "Valor"
        ]],

        body: linhas,

        styles: {
            font: "helvetica",
            fontSize: 8,
            cellPadding: 2,
            valign: "middle",
            overflow: "linebreak",
            lineWidth: 0.1
        },

        headStyles: {
            fillColor: [0, 102, 204],
            textColor: 255,
            fontStyle: "bold",
            halign: "center",
            valign: "middle"
        },

        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },

        columnStyles: {

            // Documento
            0: {cellWidth: 30},
            // Emissão
            1: {cellWidth: 22, halign: "center"},
            // Validação
            2: {cellWidth: 22, halign: "center"},
            // Referência
            3: {cellWidth: 35},
            // Notas
            4: {cellWidth: "auto"},
            // Notas
            5: {cellWidth: 25, halign: "right"}
        },

        margin: {
            left: 10,
            right: 10
        },

        didDrawPage: function () {

            

        }

    });

    // -----------------------------
    // Footer: Página X de Y
    // -----------------------------

    const totalPaginas = doc.getNumberOfPages();
    const altura = doc.internal.pageSize.height;
    const largura = doc.internal.pageSize.width;

    for (let i = 1; i <= totalPaginas; i++) {

        doc.setPage(i);

        doc.setDrawColor(180);

        doc.line(
            10,
            altura - 12,
            largura - 10,
            altura - 12
        );


        doc.setFontSize(8);
        doc.setTextColor(120);

        // Data à esquerda
        doc.text(
            `Data: ${new Date().toLocaleDateString("pt-PT")}`,
            10,
            altura - 6
        );


        // Página X de Y à direita
        doc.text(
            `Página ${i} de ${totalPaginas}`,
            largura - 10,
            altura - 6,
            {
                align: "right"
            }
        );
    }

    return {
      doc,
      codigo
  };
}

async function previewFases() {
  try {
    const { doc } = await criarPDFFases();
    window.open(doc.output("bloburl"), "_blank");
  } catch (erro) {
    console.error(erro);
    alert("Erro ao gerar o PDF.");
  }
}

async function exportarFases() {
  try {
    const { doc, codigo } = await criarPDFFases();
    doc.save(`Processo_${codigo}.pdf`);
  } catch (erro) {
    console.error(erro);
    alert("Erro ao gerar o PDF.");
  }
}


function formatarEuro(valor){
  return new Intl.NumberFormat('de-DE', {minimumFractionDigits: 2}).format(valor || 0) + '€';
}

function formatarData(data) {
  if (!data) return "";
  const d = new Date(data);
  if (isNaN(d)) return data;
  return d.toLocaleDateString("pt-PT");
}
