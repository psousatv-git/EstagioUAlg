<?php
require_once __DIR__ . "/../../../global/config/dbConn.php";

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

$itemProcurado = $_GET['itemProcurado'] ?? null;

if (!$itemProcurado) {
    echo json_encode(["error" => "Parâmetro 'itemProcurado' é obrigatório."]);
    exit;
}

try {

    // === 1) CANDIDATURA ===
    $qryCandidaturas = "SELECT
            candsub_estado AS estado,
            candsub_programa AS programa,
            candsub_aviso AS aviso,
            ca.cand_eixo AS prioridade,
            ca.cand_objetivo AS objetivo,
            ca.cand_tipologia AS tipologia_acao,
            ca.cand_investimento AS tipologia_intervencao,
            ca.cand_abertura AS abertura,
            ca.cand_fecho AS fecho,
            candsub_codigo AS candidatura,
            candsub_nome AS designacao,
            candsub_dt_submissao AS submissao,
            candsub_dt_aprovacao AS aprovacao,
            candsub_dt_aceitacao AS aceitacao,
            candsub_dt_inicio AS inicio,
            candsub_dt_fim AS termo,
            candsub_max_elegivel AS elegivel,
            candsub_forfait AS defice_financeiro,
            candsub_iva AS iva,
            candsub_fundo AS taxa,
            ca.cand_logo AS logo,
            ca.cand_documento AS documento_aviso,
            candsub_documento_aceitacao AS documento_aceitacao
        FROM candidaturas_submetidas
        INNER JOIN candidaturas_avisos ca ON ca.cand_aviso = candsub_aviso
        WHERE candsub_codigo = :itemProcurado";

    $cand = $myConn->prepare($qryCandidaturas);
    $cand->bindParam(':itemProcurado', $itemProcurado, PDO::PARAM_STR);
    $cand->execute();
    $candidatura = $cand->fetch(PDO::FETCH_ASSOC);

    if (!$candidatura) {
        echo json_encode(["error" => "Candidatura não encontrada."]);
        exit;
    }

    // === 2) PROCESSOS ===
    $qryProcessos = "SELECT
            proces_check,
            proces_cand,
            proces_padm AS padm,
            proces_nome AS designacao
        FROM processo
        WHERE proces_cand = :candidatura
        AND proces_report_valores = 1
        ORDER BY proces_nome";

    $stmtProc = $myConn->prepare($qryProcessos);
    $stmtProc->bindParam(':candidatura', $itemProcurado, PDO::PARAM_STR);
    $stmtProc->execute();
    $processos = $stmtProc->fetchAll(PDO::FETCH_ASSOC);

    $candidatura["processos"] = [];

    foreach ($processos as $proc) {
        $proc_check = $proc["proces_check"];

        // === HISTÓRICO ===
        $qryHistorico = "SELECT
                historico_proces_check,
                historico_descr_cod,
                historico_dataemissao,
                historico_doc,
                historico_num,
                historico_obs,
                COALESCE(historico_valor, 0) AS historico_valor
            FROM historico
            WHERE historico_proces_check = :pc
            AND historico_descr_cod IN (14, 91, 92)
            ORDER BY historico_dataemissao";

        $stmtHist = $myConn->prepare($qryHistorico);
        $stmtHist->bindParam(':pc', $proc_check, PDO::PARAM_INT);
        $stmtHist->execute();
        $historico = $stmtHist->fetchAll(PDO::FETCH_ASSOC);

        // Pedidos de pagamento
        $pedidos_pagamento = array_map('strval', array_column(
            array_filter($historico, fn($h) => $h["historico_descr_cod"] == 91),
            "historico_num"
        ));

        // === FATURAS ===
        // Busca todas as faturas do processo, independentemente dos pedidos
        $qryFaturas = "SELECT
                fact_proces_check,
                e.ent_nome,
                fact_finan_pp,
                fact_tipo,
                fact_data,
                fact_expediente,
                fact_auto_num,
                fact_num,
                COALESCE(fact_valor, 0) AS fact_valor,
                COALESCE(fact_finan_max_elegivel, 0) AS fact_elegivel,
                COALESCE(fact_finan_fundo, 0) AS fact_fundo
            FROM factura
            LEFT JOIN entidade e ON e.ent_cod = fact_ent_cod
            WHERE fact_proces_check = ?
            ORDER BY fact_auto_num, fact_data";

        $stmtFat = $myConn->prepare($qryFaturas);
        $stmtFat->bindValue(1, $proc_check, PDO::PARAM_INT);
        $stmtFat->execute();
        $faturas = $stmtFat->fetchAll(PDO::FETCH_ASSOC);

        $proc["historico"] = $historico;
        $proc["faturas"] = $faturas;

        $candidatura["processos"][] = $proc;
    }

    echo json_encode($candidatura, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}