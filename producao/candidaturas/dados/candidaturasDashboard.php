<?php
//session_start();
include "../../../global/config/dbConn.php";


// dados para dashCandidaturas sem interações - Search ou outras
$queryOLD = "SELECT
          proces_cand AS candidatura,
          cs.candsub_estado AS estado,
          cs.candsub_programa AS programa,
          cs.candsub_fundo * 100 AS taxa,
          YEAR(cs.candsub_dt_inicio) AS inicio,
          ROUND(SUM(proces_val_adjudicacoes), 2) AS adjudicado,
          ROUND(SUM(proces_cand_elegivel), 2) AS elegivel,
          ROUND(SUM(proces_val_faturacao), 2) AS faturado,
          ROUND(SUM(proces_cand_recebido), 2) AS recebido,         
         COALESCE(ROUND((SUM(proces_cand_recebido) / SUM(proces_val_faturacao)), 4), 0) AS faturado_recebido_percent,
         COALESCE(ROUND((SUM(proces_cand_recebido) / SUM(proces_cand_elegivel)), 4), 0) AS elegivel_recebido_percent
         FROM processo
         INNER JOIN candidaturas_submetidas cs ON cs.candsub_codigo = proces_cand
         INNER JOIN historico h ON h.historico_proces_check = proces_check
         WHERE proces_cand NOT LIKE '%n.a.%' AND proces_report_valores = 1 
         GROUP BY proces_cand
         ORDER BY YEAR(cs.candsub_dt_inicio) DESC ";

// dados para candidaturasDashboard
$query = "SELECT
    cs.candsub_programa AS programa,
    ca.cand_logo AS logo,
    cs.candsub_aviso AS aviso,
    cs.candsub_codigo AS candidatura,
    cs.candsub_estado AS estado,
    cs.candsub_nome AS descricao,
    YEAR(cs.candsub_dt_inicio) AS inicio,
    YEAR(cs.candsub_dt_fim) AS termo,
    cs.candsub_max_elegivel AS elegivel,
    ROUND(cs.candsub_iva, 2) AS iva,
    ROUND(cs.candsub_forfait, 2) AS forfait,
    ROUND(cs.candsub_fundo, 2) AS taxa,
    COUNT(DISTINCT p.proces_check) AS processos,
    COALESCE(SUM(ha.adjudicado), 0) AS adjudicado,
    COALESCE(SUM(fp.faturado), 0) AS faturado,
    COALESCE(SUM(ha.pedido), 0) AS pedido,
    COALESCE(SUM(ha.recebido), 0) AS recebido,
    COALESCE(ROUND(SUM(ha.recebido) / NULLIF(SUM(fp.faturado), 0), 4), 0) AS faturado_recebido_percent,
    COALESCE(ROUND(SUM(ha.recebido) / NULLIF(cs.candsub_max_elegivel * cs.candsub_iva * cs.candsub_fundo, 0), 4), 0) AS elegivel_recebido_percent

FROM candidaturas_submetidas cs

LEFT JOIN candidaturas_avisos ca ON ca.cand_aviso = cs.candsub_aviso

LEFT JOIN processo p ON p.proces_cand = cs.candsub_codigo
   AND p.proces_cand NOT LIKE '%n.a.%'
   AND p.proces_report_valores = 1

LEFT JOIN (
    SELECT
        historico_proces_check,
        SUM(CASE WHEN historico_descr_cod = 14 THEN historico_valor ELSE 0 END) AS adjudicado,
        SUM(CASE WHEN historico_descr_cod = 91 THEN historico_valor ELSE 0 END) AS pedido,
        SUM(CASE WHEN historico_descr_cod = 92 THEN historico_valor ELSE 0 END) AS recebido
    FROM historico
    GROUP BY historico_proces_check
) ha ON ha.historico_proces_check = p.proces_check
LEFT JOIN (
    SELECT
        fact_proces_check,
        SUM(CASE WHEN fact_tipo IN ('FTN', 'FTC', 'NC', 'REF', 'IND') THEN ROUND(fact_valor, 2) ELSE 0 END) AS faturado
    FROM factura
    GROUP BY fact_proces_check
) fp ON fp.fact_proces_check = p.proces_check

GROUP BY cs.candsub_codigo
ORDER BY cs.candsub_estado, cs.candsub_programa, YEAR(cs.candsub_dt_inicio) DESC";

$stmt = $myConn->query($query);
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Set the HTTP Content-Type header to indicate that the response is in JSON format
header('Content-Type: application/json');
echo json_encode($data, JSON_PRETTY_PRINT);