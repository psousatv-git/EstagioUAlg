<?php

include "../../../global/config/dbConn.php";

header('Content-Type: application/json; charset=utf-8');

$itemProcurado = $_GET['itemProcurado'] ?? null;
$anoCorrente   = $_GET['anoCorrente'] ?? date('Y');

if (!$itemProcurado) {
    http_response_code(400);

    echo json_encode([
        "error" => "Parâmetro 'itemProcurado' é obrigatório."
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

try {

    // ==========================================================
    // 1. RUBRICA
    // ==========================================================
    $sqlRubrica = "
        SELECT
            rub_cod AS rubrica,
            rub_tipo AS tipo,
            rub_rubrica AS grupo,
            rub_item AS descritivo
        FROM rubricas
        WHERE rub_cod = :itemProcurado
    ";

    $stmtRubrica = $myConn->prepare($sqlRubrica);
    $stmtRubrica->execute([
        ':itemProcurado' => $itemProcurado
    ]);

    $rubrica = $stmtRubrica->fetch(PDO::FETCH_ASSOC);

    if (!$rubrica) {
        http_response_code(404);

        echo json_encode([
            "error" => "Rubrica não encontrada."
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }


    // ==========================================================
    // 2. ORÇAMENTOS
    // ==========================================================
    $sqlOrcamentos = "
        SELECT
            orc_check,
            orc_ano AS ano,
            orc_tipo AS tipo,
            orc_regime AS regime,
            orc_conta_descritiva AS descritivo,
            orc_valor_previsto AS orcamento
        FROM orcamento
        WHERE orc_rubrica = :itemProcurado
          AND orc_ano = :anoCorrente
        ORDER BY
            orc_regime,
            orc_tipo
    ";

    $stmtOrcamentos = $myConn->prepare($sqlOrcamentos);
    $stmtOrcamentos->execute([
        ':itemProcurado' => $itemProcurado,
        ':anoCorrente'   => $anoCorrente
    ]);

    $orcamentos = $stmtOrcamentos->fetchAll(PDO::FETCH_ASSOC);


    // ==========================================================
    // 3. PROCESSOS
    // ==========================================================
    $sqlProcessos = "
        SELECT
            p.proces_check,
            p.proces_orc_check,
            p.proces_linha_orc AS linha_orcamento,
            p.proces_linha_se AS linha_se,
            p.proces_padm AS padm,
            proc.proced_regime AS regime,
            p.proces_nome AS designacao,
            p.proces_val_max AS val_max,
            p.proces_report_valores
        FROM processo p
        LEFT JOIN procedimento proc
            ON proc.proced_cod = p.proces_proced_cod
        INNER JOIN orcamento o
            ON o.orc_check = p.proces_orc_check
        WHERE o.orc_rubrica = :itemProcurado
          AND o.orc_ano = :anoCorrente
          AND p.proces_report_valores = 1
        ORDER BY p.proces_nome
    ";

    $stmtProcessos = $myConn->prepare($sqlProcessos);
    $stmtProcessos->execute([
        ':itemProcurado' => $itemProcurado,
        ':anoCorrente'   => $anoCorrente
    ]);

    $processos = $stmtProcessos->fetchAll(PDO::FETCH_ASSOC);


    // ==========================================================
    // 4. VALORES ADJUDICADOS POR PROCESSO
    // ==========================================================
    $sqlAdjudicados = "
        SELECT
            h.historico_proces_check AS proces_check,
            COALESCE(SUM(h.historico_valor), 0) AS adjudicado
        FROM historico h
        INNER JOIN processo p
            ON p.proces_check = h.historico_proces_check
        INNER JOIN orcamento o
            ON o.orc_check = p.proces_orc_check
        WHERE o.orc_rubrica = :itemProcurado
          AND o.orc_ano = :anoCorrente
          AND p.proces_report_valores = 1
          AND h.historico_descr_cod IN (9, 14, 100)
        GROUP BY h.historico_proces_check
    ";

    $stmtAdjudicados = $myConn->prepare($sqlAdjudicados);
    $stmtAdjudicados->execute([
        ':itemProcurado' => $itemProcurado,
        ':anoCorrente'   => $anoCorrente
    ]);

    $adjudicados = $stmtAdjudicados->fetchAll(PDO::FETCH_ASSOC);


    // ==========================================================
    // 5. FATURAS DOS PROCESSOS
    // ==========================================================
    $sqlFaturas = "
        SELECT
            f.fact_proces_check,
            e.ent_nome,
            f.fact_auto_num,
            f.fact_auto_data,
            f.fact_tipo,
            f.fact_expediente,
            f.fact_num,
            f.fact_data,
            f.fact_iva,
            f.fact_valor
        FROM factura f
        INNER JOIN processo p
            ON p.proces_check = f.fact_proces_check
        INNER JOIN orcamento o
            ON o.orc_check = p.proces_orc_check
        INNER JOIN entidade e
            ON e.ent_cod = f.fact_ent_cod
        WHERE o.orc_rubrica = :itemProcurado
          AND o.orc_ano = :anoCorrente
          AND p.proces_report_valores = 1
          AND f.fact_tipo IN ('FTN', 'FTC', 'NC', 'REF', 'IND')
          AND YEAR(f.fact_data) = :anoFatura
        ORDER BY
            f.fact_proces_check,
            f.fact_data,
            f.fact_num
    ";

    $stmtFaturas = $myConn->prepare($sqlFaturas);
    $stmtFaturas->execute([
        ':itemProcurado' => $itemProcurado,
        ':anoCorrente'   => $anoCorrente,
        ':anoFatura'     => $anoCorrente
    ]);

    $faturas = $stmtFaturas->fetchAll(PDO::FETCH_ASSOC);


    // ==========================================================
    // 6. MAPA DE ADJUDICAÇÕES POR PROCESSO
    // ==========================================================
    $mapAdjudicados = [];

    foreach ($adjudicados as $item) {
        $mapAdjudicados[$item['proces_check']] =
            (float) $item['adjudicado'];
    }


    // ==========================================================
    // 7. MAPA DE FATURAS POR PROCESSO
    // ==========================================================
    $mapFaturas = [];

    foreach ($faturas as $fatura) {
        $procesCheck = $fatura['fact_proces_check'];

        if (!isset($mapFaturas[$procesCheck])) {
            $mapFaturas[$procesCheck] = [];
        }

        $mapFaturas[$procesCheck][] = $fatura;
    }


    // ==========================================================
    // 8. ASSOCIAR ADJUDICAÇÃO E FATURAS AOS PROCESSOS
    // ==========================================================
    $mapProcessos = [];

    foreach ($processos as $processo) {
        $procesCheck = $processo['proces_check'];
        $orcCheck    = $processo['proces_orc_check'];

        $processo['adjudicado'] =
            $mapAdjudicados[$procesCheck] ?? 0;

        $processo['faturas'] =
            $mapFaturas[$procesCheck] ?? [];

        if (!isset($mapProcessos[$orcCheck])) {
            $mapProcessos[$orcCheck] = [];
        }

        $mapProcessos[$orcCheck][] = $processo;
    }


    // ==========================================================
    // 9. ASSOCIAR PROCESSOS AOS ORÇAMENTOS
    // ==========================================================
    foreach ($orcamentos as &$orcamento) {
        $orcCheck = $orcamento['orc_check'];

        $orcamento['processos'] =
            $mapProcessos[$orcCheck] ?? [];
    }

    unset($orcamento);


    // ==========================================================
    // 10. RETORNO FINAL
    // Rubrica -> Orçamento -> Processo -> Faturas
    // ==========================================================
    echo json_encode([
        "rubrica" => $rubrica,
        "data"    => $orcamentos
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    http_response_code(500);

    echo json_encode([
        "error"   => "Erro ao consultar a base de dados.",
        "details" => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
