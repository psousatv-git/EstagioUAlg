<?php
//session_start();
include "../../../global/config/dbConn.php";

if(isset($_GET['anoCorrente'])){
      $anoCorrente = intval($_GET['anoCorrente']);
} else {
      $anoCorrente = date('Y') -1 ;
};

$qryOrcamento = "SELECT
            o.orc_ano AS ano,
            o.orc_rubrica AS cod,
            r.rub_tipo AS tipo,
            r.rub_rubrica AS rubrica,
            r.rub_item AS item,
            COALESCE(SUM(o.orc_valor_previsto), 0) AS previsto,
            COALESCE(SUM(hs.adjudicado), 0) AS adjudicado,
            COALESCE(SUM(fs.faturado), 0) AS faturado
      FROM orcamento o
      LEFT JOIN rubricas r ON r.rub_cod = o.orc_rubrica
      LEFT JOIN (SELECT 
                  p.proces_orc_check, SUM(h.historico_valor) AS adjudicado
                  FROM historico h
      LEFT JOIN processo p ON p.proces_check = h.historico_proces_check
      WHERE YEAR(h.historico_dataemissao) = :anoCorrente AND h.historico_descr_cod IN (9, 14, 100)
      GROUP BY p.proces_orc_check) hs ON hs.proces_orc_check = o.orc_check
      LEFT JOIN (SELECT 
                  p.proces_orc_check, SUM(f.fact_valor) AS faturado
                  FROM factura f
      INNER JOIN processo p ON p.proces_check = f.fact_proces_check
      WHERE YEAR(f.fact_data) = :anoCorrente AND f.fact_tipo IN ('FTN', 'FTC', 'NC')
      GROUP BY p.proces_orc_check) fs ON fs.proces_orc_check = o.orc_check
      WHERE o.orc_ano = :anoCorrente AND o.orc_rubrica NOT IN (999)
      GROUP BY o.orc_ano, o.orc_rubrica, r.rub_tipo, r.rub_rubrica, r.rub_item
      ORDER BY o.orc_rubrica, r.rub_tipo DESC, r.rub_rubrica ASC, r.rub_item ASC";

$stmt = $myConn->prepare($qryOrcamento);
$stmt->bindParam(':itemProcurado', $itemProcurado, PDO::PARAM_INT);
$stmt->bindParam(':anoCorrente', $anoCorrente, PDO::PARAM_INT);
$stmt->execute();
$dadosOrcamento = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Set the HTTP Content-Type header to indicate that the response is in JSON format
header('Content-Type: application/json');
echo json_encode($dadosOrcamento);