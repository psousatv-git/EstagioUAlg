//var processoCodigo = []

// Os resultados da Seleção é redirecionado para a processosResults.html
// Quando se seleciona um processo - obtem a identificação do processo e passa para o "Título"
function processoSelected() { 

  var params = new URLSearchParams(window.location.search);
  var codigo = params.get("codigoProcesso"); 
  
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("processoSelected").innerHTML = this.responseText;
    }
  }

  //console.log("Código passa do Search: ", codigo);

  xmlhttp.open("GET","dados/processoShowNome.php?codigoProcesso="+codigo,true);
  xmlhttp.send();

        resumoProcesso(codigo);
        historicoProcesso(codigo);
        pagamentosProcesso(codigo);
        faturacaoProcesso(codigo);
        faturasProcesso(codigo);
        garantiasProcesso(codigo);

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

// Facturação
function faturacaoProcesso(codigo) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("lstFaturacao").innerHTML = this.responseText;
    }
  }

  xmlhttp.open("GET","dados/processoFinanceiro.php?codigoProcesso="+codigo,true);
  xmlhttp.send();
};

// Plano de Pagamentos
function pagamentosProcesso(codigo) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("lstPagamentos").innerHTML = this.responseText;
    }
  }

  xmlhttp.open("GET","dados/processoFinanceiro2.php?codigoProcesso="+codigo,true);
  xmlhttp.send();
};

// Facturas
function faturasProcesso(codigo) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("lstFaturas").innerHTML = this.responseText;
    }
  }
  
  xmlhttp.open("GET","dados/processoFaturas.php?codigoProcesso="+codigo,true);
  xmlhttp.send();
};


// Facturas
function garantiasProcesso(codigo) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("lstGarantias").innerHTML = this.responseText;
    }

    
  }
  
  xmlhttp.open("GET","dados/processoGarantias.php?codigoProcesso="+codigo,true);
  xmlhttp.send();
};

// Ao clicar nos botões, redirecina para a página ou rotina selecionada
function botao(codigo){
  var obrasURL = "../../producao/obras/dados/obra.html?codigoProcesso=" + codigo;
  window.location.href = obrasURL;
};

// Botões
