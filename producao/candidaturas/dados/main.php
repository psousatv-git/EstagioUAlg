<?php
//session_start();
include "../../../global/config/dbConn.php";


// dados para dashCandidaturas sem interações - Search ou outras
$query = "SELECT
          proces_cand AS candidatura,
          cs.candoper_programa AS programa,
          YEAR(cs.candoper_dt_inicio) AS inicio,
          
          ROUND(SUM(proces_cand_elegivel), 2) AS elegivel,
          ROUND(SUM(proces_cand_recebido), 2) AS recebido,
          IF(SUM(proces_cand_recebido) = 0 OR SUM(proces_cand_elegivel) = 0, 0,
          ROUND((SUM(proces_cand_recebido) / SUM(proces_cand_elegivel))*100, 2)) AS recebido_percent,
          
          ROUND(SUM(proces_val_adjudicacoes), 2) AS adjudicado,
          ROUND(SUM(proces_val_faturacao), 2) AS faturado,
          IF(SUM(proces_val_faturacao) = 0 OR SUM(proces_val_adjudicacoes) = 0, 0,
          ROUND((SUM(proces_val_faturacao) / SUM(proces_val_adjudicacoes))*100, 2)) AS faturado_percent
          FROM processo
          INNER JOIN candidaturas_submetidas cs ON cs.candoper_codigo = proces_cand
          WHERE proces_cand <> 'n.a.' AND proces_report_valores = 1
          GROUP BY proces_cand
          ORDER BY YEAR(cs.candoper_dt_inicio) DESC ";

$stmt = $myConn->query($query);
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Set the HTTP Content-Type header to indicate that the response is in JSON format
header('Content-Type: application/json');

echo json_encode($data);

