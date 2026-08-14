<?php
include "../../../global/config/dbConn.php";

$codigoProcesso = isset($_GET['codigoProcesso']) ? intval($_GET['codigoProcesso']) : 0;

$meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function gerarPivotQuery($tabela, $colData, $colValor, $colExclui, $colProcessoCheck) {
    global $meses;

    $sql = "SELECT YEAR($colData) AS Ano, SUM($colValor) AS Acumulado";

    foreach(range(1,12) as $m) {
        $sql .= ", SUM(IF(MONTH($colData) = $m, $colValor, 0)) AS `" . $meses[$m-1] . "`";
    }

    $sql .= " FROM $tabela 
              WHERE $colProcessoCheck = :codigoProcesso";

    // Adiciona condição extra se existir
    if (!empty($colExclui)) {
        $sql .= " AND $colExclui";
    }

    $sql .= " GROUP BY YEAR($colData)
              ORDER BY YEAR($colData)";

    return $sql;
}

try {

    // =========================
    // PREVISÃO (sem condição extra)
    // =========================
    $sqlPrevisto = gerarPivotQuery(
        'plano_pagamentos',
        "STR_TO_DATE(CONCAT('10/',LPAD(pp_mes_previsto,2,'0'),'/',pp_ano), '%d/%m/%Y')",
        'pp_valor_previsto',
        '',
        'pp_proces_check'
    );

    $stmtPrev = $myConn->prepare($sqlPrevisto);
    $stmtPrev->bindParam(':codigoProcesso', $codigoProcesso, PDO::PARAM_INT);
    $stmtPrev->execute();
    $previsao = $stmtPrev->fetchAll(PDO::FETCH_ASSOC);


    // =========================
    // REALIZADO (Apenas a FAturação Normal e de Complementares)
    // =========================
    $colIncluiRealizado = "fact_tipo IN ('FTN', 'FTC')";

    $sqlRealizado = gerarPivotQuery(
        'factura',
        'fact_auto_data',
        'fact_valor',
        $colIncluiRealizado,
        'fact_proces_check'
    );

    $stmtReal = $myConn->prepare($sqlRealizado);
    $stmtReal->bindParam(':codigoProcesso', $codigoProcesso, PDO::PARAM_INT);
    $stmtReal->execute();
    $realizado = $stmtReal->fetchAll(PDO::FETCH_ASSOC);


    // =========================
    // OUTPUT JSON
    // =========================
    header('Content-Type: application/json; charset=utf-8');

    echo json_encode([
        'previsto'  => $previsao,
        'realizado' => $realizado
    ]);

} catch (PDOException $e) {

    http_response_code(500);

    echo json_encode([
        'erro' => 'Erro ao executar query',
        'detalhe' => $e->getMessage()
    ]);
}