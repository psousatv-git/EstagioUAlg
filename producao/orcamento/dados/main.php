<?php
//session_start();
include "../../../global/config/dbConn.php";

if(isset($_POST["action"]))
{
	if($_POST["action"] == 'fetch')
	{
		$main_query = 'SELECT
					   r.rub_tipo AS tipo,
					   r.rub_rubrica AS rubrica,
					   r.rub_item AS item,
					   ROUND(SUM(o.orc_valor_previsto), 2) AS previsto,
					   ROUND(SUM(o.orc_valor_adjudicado), 2) AS adjudicado,
					   ROUND((SUM(o.orc_valor_adjudicado)  / SUM(o.orc_valor_previsto)) * 100, 2) AS orcamento_percent,
					   ROUND(SUM(o.orc_valor_faturado), 2) AS faturado,
					   ROUND((SUM(o.orc_valor_faturado)  / SUM(o.orc_valor_adjudicado)) * 100, 2) AS faturado_percent
					   FROM orcamento o
					   INNER JOIN rubricas r ON r.rub_cod = o.orc_rub_cod ';
					   
        $search_query = ' ';
        
        if(isset($_POST["search"]["value"]))
        {
			$search_query .= 'WHERE o.orc_ano LIKE "%'.$_POST["search"]["value"].'%" ';
		}
 
		$group_by_query = ' GROUP BY tipo, rubrica, item ';

		$order_by_query = '';

		if(isset($_POST["tabela"]))
        {
			$order_by_query = ' ORDER BY '.$order_column[$_POST["tabela"]["0"]["column"]].' '.$_POST["tabela"]["0"]["dir"].' ';
		}
		else
		{
			$order_by_query = ' ORDER BY tipo DESC, rubrica ASC, item ASC ';
		}

		$limit_query = '';

		if($_POST["length"] != -1){
			$limit_query = 'LIMIT ' . $_POST["start"] . ', ' . $_POST["length"];
		}

		$statement = $myConn->prepare($main_query .$search_query .$group_by_query .$order_by_query);
		$statement->execute();

		$filtered_rows = $statement->rowCount();

		$statement = $myConn->prepare($main_query .$group_by_query .$order_by_query);
		$statement->execute();

		$total_rows = $statement->rowCount();

		//$result = $myConn->query($main_query . $search_query .$group_by_query . $order_by_query . $limit_query, PDO::FETCH_ASSOC);
		$result = $myConn->query($main_query .$search_query .$group_by_query .$order_by_query .$limit_query, PDO::FETCH_ASSOC);
		
		//$data = $result->fetchAll(PDO::FETCH_ASSOC);

        $data = array();

		foreach($result as $row)
		{
			$sub_array = array();
			$sub_array[] = $row['tipo'];
            $sub_array[] = $row['rubrica'];
			$sub_array[] = $row['item'];
			$sub_array[] = $row['previsto'];
			$sub_array[] = $row['orcamento_percent'];
            $sub_array[] = $row['adjudicado'];
			$sub_array[] = $row['faturado'];
			$sub_array[] = $row['faturado_percent'];

			$data[] = $sub_array;
		}

		$output = array(
			"draw"			=>	intval($_POST["draw"]),
			"recordsTotal"	=>	$total_rows,
			"recordsFiltered" => $filtered_rows,
			"data"			=>	$data
		);

		echo json_encode($output);
	}
}

?>