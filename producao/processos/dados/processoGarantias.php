<?php
//session_start();
include "../../../global/config/dbConn.php";

$codigoProcesso = intval($_GET['codigoProcesso']);
//$q = $_GET['q'];

//Histórico Processos
$processoGarantias = "SELECT 
                    fact_proces_check,
                    ROUND(SUM(fact_duovalor), 2) AS duo,
                    ROUND(SUM(fact_garban), 2) AS gb,
                    ROUND(SUM(fact_duopaga), 2) AS duoDevolve,
                    ROUND(SUM(fact_garbanpaga), 2) AS gbReducao,
                    (ROUND(SUM(fact_duovalor), 2) + ROUND(SUM(fact_garban), 2)) -
                    (ROUND(SUM(fact_duopaga), 2) + ROUND(SUM(fact_garbanpaga), 2)) AS cativo 
                    FROM factura
                    WHERE fact_proces_check = '" .$codigoProcesso. "'
                    GROUP BY fact_proces_check" ;

$stmt = $myConn->query($processoGarantias);
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Valores Descontados na Faturação
echo "
<b>Valores Descontados na Faturação</b>
<table class='table table-responsive table-striped table-hover small'>
  <tr class='text-center'>
    <th class='bg-warning'>Cativo</th>  
    <th>Duodécimos</th>
    <th>Devolvido</th>
    <th>Garantia</th>
    <th>Reduções</th>
  </tr>";
foreach($data as $row)
{
  echo "
    <tr>
      <td class='bg-warning'  style='text-align:left'>" .number_format($row['cativo'], 2, ',', '.'). "</td>  
      <td  style='text-align:right'>" .number_format($row['duo'], 2, ',', '.'). "</td>
      <td  style='text-align:right'>" .number_format($row['duoDevolve'], 2, ',', '.'). "</td>
      <td  style='text-align:right'>" .number_format($row['gb'], 2, ',', '.'). "</td>
      <td  style='text-align:right'>" .number_format($row['gbReducao'], 2, ',', '.'). "</td>
    </tr>";
};
echo "</table>";