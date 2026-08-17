// Variável para armazenar o ano atual
var anoCorrente = new Date().getFullYear();  

// Função para carregar os cartões
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

            let adjudicado_percent = dados.adjudicado === 0 && dados.faturado === 0 ? 0 :
                        dados.adjudicado > 0 && dados.faturado === 0 ? 0 :
                        (dados.faturado / dados.adjudicado);
            let previsto_percent = dados.previsto === 0 && dados.faturado === 0 ? 0 :
                        dados.previsto > 0 && dados.faturado === 0 ? 0 :
                        (dados.faturado / dados.previsto);

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
                                    <span>${Intl.NumberFormat("de-DE", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(adjudicado_percent)}</span>
                                </h6>
                            </div>
                            <div>
                                <h5>
                                    ${Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(dados.previsto)} 
                                    <span class="h6">- ${Intl.NumberFormat("de-DE", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(previsto_percent)}</span>
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
            } else if(dados.tipo === 'Gastos' && dados.item === 'SubContratos') {
                containerProtocolos.innerHTML += cartao;
            } else {
                containerGastos.innerHTML += cartao;
                
            }
        });
    });
}

// Valida o ano (somente números, entre 2000 e 2100)
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

// Atualiza o ano e recarrega os cartões
function mudaAno() {
    var anoFormulario = document.getElementById('anoCorrente').value;

    if (!validaAno(anoFormulario)) {
        // Se não for válido, restaura o input para o anoCorrente atual
        document.getElementById('anoCorrente').value = anoCorrente;
        return;
    }

    anoCorrente = anoFormulario;  // Atualiza a variável global

    var url = 'dados/orcamentoDashboard.php?anoCorrente=' + anoCorrente;
    cartoes(url);
}

// Inicializa o formulário com o ano atual e carrega os cartões
function anoDefault() {
    document.getElementById('anoCorrente').value = anoCorrente;
    var url = 'dados/orcamentoDashboard.php?anoCorrente=' + anoCorrente;
    cartoes(url);
}

// Redirecionamento
function orcamentoResults(itemProcurado) {
    var URL = "orcamentoResults.html?itemProcurado=" + itemProcurado + "&anoCorrente=" + anoCorrente;
    window.location.href = URL;
};

function orcamentoNested(itemProcurado) {
    var URL = "orcamentoNested.html?itemProcurado=" + itemProcurado + "&anoCorrente=" + anoCorrente;
    window.location.href = URL;
};

// Chamada automática ao carregar a página
window.onload = anoDefault;
