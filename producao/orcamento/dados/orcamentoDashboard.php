<?php

// ==========================================================
// ORÇAMENTO DASHBOARD
// Rubrica -> Orçamento -> Processo -> Faturas
// ==========================================================

include "../../../global/config/dbConn.php";

header('Content-Type: application/json; charset=utf-8');


// ==========================================================
// ANO
// ==========================================================

if (isset($_GET['anoCorrente'])) {
    $anoCorrente = (int) $_GET['anoCorrente'];
} else {
    $anoCorrente = (int) date('Y');
}


try {

    // ======================================================
    // 1. RUBRICAS / TOTAIS DOS CARTÕES
    // ======================================================
    //
    // Mantemos a estrutura já utilizada pelo JavaScript:
    //
    // cod
    // tipo
    // rubrica
    // item
    // previsto
    // adjudicado
    // faturado
    //
    // Depois acrescentamos:
    //
    // orcamentos
    // processos
    //
    // ======================================================

    $sqlRubricas = "
        SELECT
            o.orc_ano AS ano,
            o.orc_rubrica AS cod,

            r.rub_tipo AS tipo,
            r.rub_rubrica AS rubrica,
            r.rub_item AS item,

            COALESCE(
                SUM(o.orc_valor_previsto),
                0
            ) AS previsto

        FROM orcamento o

        LEFT JOIN rubricas r
            ON r.rub_cod = o.orc_rubrica

        WHERE o.orc_ano = :anoCorrente
          AND o.orc_rubrica NOT IN (999)

        GROUP BY
            o.orc_ano,
            o.orc_rubrica,
            r.rub_tipo,
            r.rub_rubrica,
            r.rub_item

        ORDER BY
            o.orc_rubrica,
            r.rub_tipo DESC,
            r.rub_rubrica ASC,
            r.rub_item ASC
    ";

    $stmtRubricas = $myConn->prepare($sqlRubricas);

    $stmtRubricas->execute([
        ':anoCorrente' => $anoCorrente
    ]);

    $rubricas = $stmtRubricas->fetchAll(PDO::FETCH_ASSOC);


    // ======================================================
    // 2. ORÇAMENTOS DO ANO
    // ======================================================

    $sqlOrcamentos = "
        SELECT
            o.orc_check,
            o.orc_rubrica,

            o.orc_ano AS ano,
            o.orc_tipo AS tipo,
            o.orc_regime AS regime,
            o.orc_conta_descritiva AS descritivo,
            o.orc_valor_previsto AS orcamento

        FROM orcamento o

        WHERE o.orc_ano = :anoCorrente
          AND o.orc_rubrica NOT IN (999)

        ORDER BY
            o.orc_rubrica,
            o.orc_regime,
            o.orc_tipo
    ";

    $stmtOrcamentos = $myConn->prepare($sqlOrcamentos);

    $stmtOrcamentos->execute([
        ':anoCorrente' => $anoCorrente
    ]);

    $orcamentos = $stmtOrcamentos->fetchAll(PDO::FETCH_ASSOC);


    // ======================================================
    // 3. PROCESSOS
    // ======================================================

    $sqlProcessos = "
        SELECT
            p.proces_check,
            p.proces_orc_check,

            o.orc_rubrica,

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

        WHERE o.orc_ano = :anoCorrente

          AND o.orc_rubrica NOT IN (999)

          AND p.proces_report_valores = 1

        ORDER BY
            o.orc_rubrica,
            p.proces_nome
    ";

    $stmtProcessos = $myConn->prepare($sqlProcessos);

    $stmtProcessos->execute([
        ':anoCorrente' => $anoCorrente
    ]);

    $processos = $stmtProcessos->fetchAll(PDO::FETCH_ASSOC);


    // ======================================================
    // 4. ADJUDICAÇÕES POR PROCESSO
    // ======================================================
    //
    // Mantém a mesma lógica do orcamentoNested.php.
    //
    // ======================================================

    $sqlAdjudicados = "
        SELECT
            h.historico_proces_check AS proces_check,

            COALESCE(
                SUM(h.historico_valor),
                0
            ) AS adjudicado

        FROM historico h

        INNER JOIN processo p
            ON p.proces_check = h.historico_proces_check

        INNER JOIN orcamento o
            ON o.orc_check = p.proces_orc_check

        WHERE o.orc_ano = :anoCorrente

          AND o.orc_rubrica NOT IN (999)

          AND p.proces_report_valores = 1

          AND h.historico_descr_cod IN (
              9,
              14,
              100
          )

        GROUP BY
            h.historico_proces_check
    ";

    $stmtAdjudicados = $myConn->prepare($sqlAdjudicados);

    $stmtAdjudicados->execute([
        ':anoCorrente' => $anoCorrente
    ]);

    $adjudicados = $stmtAdjudicados->fetchAll(PDO::FETCH_ASSOC);


    // ======================================================
    // 5. FATURAS DOS PROCESSOS
    // ======================================================
    //
    // A mesma lógica atualmente existente no Nested:
    //
    // FTN
    // FTC
    // NC
    // REF
    // IND
    //
    // ======================================================

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

        WHERE o.orc_ano = :anoCorrente

          AND o.orc_rubrica NOT IN (999)

          AND p.proces_report_valores = 1

          AND f.fact_tipo IN (
              'FTN',
              'FTC',
              'NC',
              'REF',
              'IND'
          )

          AND YEAR(f.fact_data) = :anoFatura

        ORDER BY
            o.orc_rubrica,
            f.fact_proces_check,
            f.fact_data,
            f.fact_num
    ";

    $stmtFaturas = $myConn->prepare($sqlFaturas);

    $stmtFaturas->execute([
        ':anoCorrente' => $anoCorrente,
        ':anoFatura'   => $anoCorrente
    ]);

    $faturas = $stmtFaturas->fetchAll(PDO::FETCH_ASSOC);


    // ======================================================
    // 6. MAPA DE ADJUDICAÇÕES POR PROCESSO
    // ======================================================

    $mapAdjudicados = [];

    foreach ($adjudicados as $item) {

        $procesCheck = $item['proces_check'];

        $mapAdjudicados[$procesCheck] =
            (float) $item['adjudicado'];
    }


    // ======================================================
    // 7. MAPA DE FATURAS POR PROCESSO
    // ======================================================

    $mapFaturas = [];

    foreach ($faturas as $fatura) {

        $procesCheck =
            $fatura['fact_proces_check'];

        if (!isset($mapFaturas[$procesCheck])) {
            $mapFaturas[$procesCheck] = [];
        }

        $mapFaturas[$procesCheck][] =
            $fatura;
    }


    // ======================================================
    // 8. ASSOCIAR ADJUDICAÇÃO E FATURAS AOS PROCESSOS
    // ======================================================

    $mapProcessosPorOrcamento = [];
    $mapProcessosPorRubrica   = [];


    foreach ($processos as $processo) {

        $procesCheck =
            $processo['proces_check'];

        $orcCheck =
            $processo['proces_orc_check'];

        $rubricaCod =
            $processo['orc_rubrica'];


        // --------------------------------------------------
        // Adjudicado
        // --------------------------------------------------

        $processo['adjudicado'] =
            $mapAdjudicados[$procesCheck] ?? 0;


        // --------------------------------------------------
        // Faturas
        // --------------------------------------------------

        $processo['faturas'] =
            $mapFaturas[$procesCheck] ?? [];


        // --------------------------------------------------
        // Total faturado do processo
        // --------------------------------------------------

        $totalFaturadoProcesso = 0;

        foreach ($processo['faturas'] as $fatura) {

            $totalFaturadoProcesso +=
                (float) $fatura['fact_valor'];
        }

        $processo['faturado'] =
            $totalFaturadoProcesso;


        // --------------------------------------------------
        // Saldo
        // --------------------------------------------------

        $processo['saldo'] =
            (float) $processo['val_max']
            -
            (float) $processo['adjudicado'];


        // --------------------------------------------------
        // Por orçamento
        // --------------------------------------------------

        if (!isset(
            $mapProcessosPorOrcamento[$orcCheck]
        )) {
            $mapProcessosPorOrcamento[$orcCheck] = [];
        }

        $mapProcessosPorOrcamento[$orcCheck][] =
            $processo;


        // --------------------------------------------------
        // Diretamente por rubrica
        //
        // Isto é importante para o PDF geral.
        // --------------------------------------------------

        if (!isset(
            $mapProcessosPorRubrica[$rubricaCod]
        )) {
            $mapProcessosPorRubrica[$rubricaCod] = [];
        }

        $mapProcessosPorRubrica[$rubricaCod][] =
            $processo;
    }


    // ======================================================
    // 9. ASSOCIAR PROCESSOS AOS ORÇAMENTOS
    // ======================================================

    $mapOrcamentosPorRubrica = [];

    foreach ($orcamentos as $orcamento) {

        $orcCheck =
            $orcamento['orc_check'];

        $rubricaCod =
            $orcamento['orc_rubrica'];


        $orcamento['processos'] =
            $mapProcessosPorOrcamento[$orcCheck]
            ?? [];


        if (!isset(
            $mapOrcamentosPorRubrica[$rubricaCod]
        )) {
            $mapOrcamentosPorRubrica[$rubricaCod] = [];
        }

        $mapOrcamentosPorRubrica[$rubricaCod][] =
            $orcamento;
    }


    // ======================================================
    // 10. ASSOCIAR TUDO À RUBRICA
    // ======================================================

    foreach ($rubricas as &$rubrica) {

        $rubricaCod =
            $rubrica['cod'];


        // --------------------------------------------------
        // Estrutura completa:
        //
        // Rubrica -> Orçamento -> Processo -> Faturas
        // --------------------------------------------------

        $rubrica['orcamentos'] =
            $mapOrcamentosPorRubrica[$rubricaCod]
            ?? [];


        // --------------------------------------------------
        // Estrutura simplificada:
        //
        // Rubrica -> Processo -> Faturas
        //
        // É esta que o nosso PDF utiliza.
        // --------------------------------------------------

        $rubrica['processos'] =
            $mapProcessosPorRubrica[$rubricaCod]
            ?? [];


        // ==================================================
        // RECALCULAR TOTAIS DA RUBRICA
        // ==================================================

        $totalAdjudicado = 0;
        $totalFaturado   = 0;


        foreach (
            $rubrica['processos']
            as $processo
        ) {

            $totalAdjudicado +=
                (float) $processo['adjudicado'];

            $totalFaturado +=
                (float) $processo['faturado'];
        }


        $rubrica['adjudicado'] =
            $totalAdjudicado;

        $rubrica['faturado'] =
            $totalFaturado;
    }

    unset($rubrica);


    // ======================================================
    // 11. RETORNO FINAL
    // ======================================================
    //
    // IMPORTANTE:
    //
    // Continuamos a devolver diretamente um ARRAY.
    //
    // Portanto isto continua a funcionar:
    //
    // data.forEach(dados => ...)
    //
    // ======================================================

    echo json_encode(
        $rubricas,
        JSON_UNESCAPED_UNICODE
        |
        JSON_PRETTY_PRINT
    );


} catch (PDOException $e) {

    http_response_code(500);

    echo json_encode(
        [
            'error' =>
                'Erro ao consultar a base de dados.',

            'details' =>
                $e->getMessage()
        ],
        JSON_UNESCAPED_UNICODE
        |
        JSON_PRETTY_PRINT
    );
}