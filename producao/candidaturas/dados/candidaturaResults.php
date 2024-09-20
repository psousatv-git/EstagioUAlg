<?php
//session_start();
include "../../../global/config/dbConn.php";

$nomeCandidatura = $_GET['nomeCandidatura'];

$query = "SELECT  *
          FROM processo
          WHERE proces_cand LIKE '%".$nomeCandidatura."%'
          AND proces_report_valores = 1
          ORDER BY proces_estado_nome ASC";

$stmt = $myConn->query($query);
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);
$rows = count($data);

$sql = "SELECT
          SUM(proces_cand_elegivel) AS elegivel
          FROM processo
          WHERE proces_cand LIKE '%".$nomeCandidatura."%'
          AND proces_report_valores = 1";

          $stmt = $myConn->query($sql);
          $sqlTotal = $stmt->fetchAll(PDO::FETCH_ASSOC);


$totalCandidatura = array();
foreach($sqlTotal as $r) {
  $totalCandidatura[] = $r["elegivel"];
}


echo '
<div class="card col-md-12">
  <div class="card-body">
  <div class="card-header bg-secondary text-white" >Processos na Candidatura ('.$rows.') - '.number_format($totalCandidatura[0], 2, ",", ".").'€</div>
  <h1 class="mt-2"></h1>
    <div class="col col-md-12">
      <div class="row">
        <table class="table table-striped small">';
        foreach($data as $row) {
            echo '
              <tr>
                <td onclick="redirectProcesso('.$row["proces_check"].')">'
                  .$row["proces_estado_nome"].' <td> '
                  .$row["proces_nome"].'</td> ';
                  if($row["proces_val_adjudicacoes"] == 0){
                    echo '<td class="bg-warning text-right">'.number_format($row["proces_val_max"], 2, ",", ".").'€</td>';
                  } else {
                    echo '<td class="bg-success text-right">'.number_format($row["proces_val_adjudicacoes"], 2, ",", ".").'€</td>';
                  }
                };
            echo '
                </td>
              </tr>
        </table>
      </div>
    </div>
  </div>
</div>
';