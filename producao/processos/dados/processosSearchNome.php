<?php
//session_start();
include "../../../global/config/dbConn.php";

$nomeProcesso = $_GET['nomeProcesso'];

$query = "SELECT proces_check, proces_padm, proces_nome, ent_nome, ent_nif 
          FROM processo
          INNER JOIN entidade ON ent_cod = proces_ent_cod
          WHERE proces_nome LIKE '%".$nomeProcesso."%'
          ORDER BY ent_nome, proces_nome";


$stmt = $myConn->query($query);
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

$rows = $stmt->rowCount();

//header('Content-Type: application/json');
//echo json_encode($data);

foreach($data as $row) {
echo '
    <div class="col-md-10 col-lg-10">
        <div class="card col-md-12">
            <table class="table table-responsive table-striped" >';
echo '
                <tr class="small" onclick="redirectProcesso('.$row["proces_check"].')">
                    <td>'.$row["ent_nome"].'</td>
                    <td>'.$row["ent_nif"].'</td>
                    <td>'.$row["proces_nome"].'
                </tr>';
echo '      </table>
        </div>
    </div>';
};
