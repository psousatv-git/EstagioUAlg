<?php
include "../../../global/config/dbConn.php";

$codigoProcesso = isset($_GET['codigoProcesso'])
    ? intval($_GET['codigoProcesso'])
    : 0;

$formato = $_GET['formato'] ?? 'html';
$descritivos = [1, 4, 5, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 21, 26, 27, 28, 29, 30, 60];

/**
 * 1️⃣ Buscar dados
 */
function buscarResultados(PDO $conn, int $codigoProcesso, array $descritivos): array
{
    $placeholders = implode(',', array_fill(0, count($descritivos), '?'));

    $sql = "
        SELECT
            p2.proced_regime AS regime,
            p2.proced_contrato AS contrato,
            p2.proced_escolha AS procedimento,

            p1.proces_padm AS padm,
            p1.proces_nome AS processo,
            p1.proces_obs AS resumo,
            CONCAT(p1.proces_18cpv1, ' - ', cpv1.cpv1_nome) AS cpv1,
            CONCAT(p1.proces_18cpv2, ' - ', cpv2.cpv2_nome) AS cpv2,
            p1.proces_cand AS candidatura,
            p1.proces_prz_exec AS prazo,

            d.descr_cod AS codigo,
            d.descr_nome AS documento,

            h.historico_dataemissao AS data_documento,
            h.historico_datamov AS data_validacao_documento,
            h.historico_valor AS valor_documento,
            h.historico_doc AS referencias,
            h.historico_notas AS notas

        FROM descritivos d

        LEFT JOIN (
            SELECT *
            FROM (
                SELECT
                    h1.*,
                    ROW_NUMBER() OVER (
                        PARTITION BY h1.historico_descr_cod
                        ORDER BY h1.historico_datamov DESC
                    ) AS rn
                FROM historico h1
                WHERE h1.historico_proces_check = ?
            ) x
            WHERE x.rn = 1
        ) h
            ON h.historico_descr_cod = d.descr_cod

        LEFT JOIN processo p1
            ON p1.proces_check = h.historico_proces_check

        LEFT JOIN procedimento p2
            ON p2.proced_cod = p1.proces_proced_cod

        LEFT JOIN 18cpv1 cpv1
            ON cpv1.cpv1_cod = p1.proces_18cpv1

        LEFT JOIN 18cpv2 cpv2
            ON cpv2.cpv2_cod = p1.proces_18cpv2

        WHERE d.descr_cod IN ($placeholders)

        ORDER BY d.descr_cod
    ";

    $stmt = $conn->prepare($sql);

    $params = array_merge([$codigoProcesso], $descritivos);

    $stmt->execute($params);

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * 2️⃣ Criar contexto único do processo
 */
function criarContexto(array $resultados): array
{
    if (empty($resultados)) {
        return [
            'regime' => null,
            'procedimento' => null,
            'contrato' => null,
            'movimentos' => [],
            'valorMovimento4' => null,
            'valorMovimento21' => null,
            'erro' => false,
            'mensagem' => null,
            'nome' => null,
            'resumo' => null,
            'candidatura' => null,
            'cpv1' => null,
            'cpv2' => null,
            'prazo' => null,
            'data18' => null,
            'data60' => null
        ];
    }

    $base = $resultados[0];

    $movimentos = array_values(array_unique(
        array_column($resultados, 'codigo')
    ));

    $valorMovimento4 = null;
    $valorMovimento21 = null;
    $data18 = null;
    $data60 = null;

    foreach ($resultados as $r) {

        $codigo = (int)$r['codigo'];

        if ($codigo === 4) {
            $valorMovimento4 = $r['valor_documento'] !== null
                ? (float)$r['valor_documento']
                : null;
        }

        if ($codigo === 21) {
            $valorMovimento21 = $r['valor_documento'] !== null
                ? (int)$r['valor_documento']
                : 0;
        }

        if ($codigo === 18 && !empty($r['data_documento'])) {
            $data18 = $r['data_documento'];
        }

        if ($codigo === 60 && !empty($r['data_documento'])) {
            $data60 = $r['data_documento'];
        }
    }

    $erro = false;
    $mensagem = null;

    if ($valorMovimento4 === null || $valorMovimento4 == 0) {
        $erro = true;
        $mensagem = 'Início de Procedimento inexistente nos movimentos do processo.';
    }

    return [
        'regime' => $base['regime'] ?? null,
        'procedimento' => $base['procedimento'] ?? null,
        'contrato' => $base['contrato'] ?? null,
        'movimentos' => $movimentos,
        'valorMovimento4' => $valorMovimento4,
        'valorMovimento21' => $valorMovimento21,
        'erro' => $erro,
        'mensagem' => $mensagem,
        'nome' => ($base['padm'] ?? null) . '-' . ($base['processo'] ?? null),
        'resumo' => $base['resumo'] ?? null,
        'candidatura' => $base['candidatura'] ?? null,
        'cpv1' => $base['cpv1'] ?? null,
        'cpv2' => $base['cpv2'] ?? null,

        // NOVOS
        'prazo' => isset($base['prazo']) ? (int)$base['prazo'] : null,
        'data18' => $data18,
        'data60' => $data60
    ];
}
/**
 * Calcular a data de termo
 */

 function calcularDataTermoPrevisto(array $ctx): ?string
 {
     if (empty($ctx['data18']) || empty($ctx['prazo'])) {
         return null;
     }
 
     $dataBase = new DateTime($ctx['data18']);
 
     /*
      * Se existir movimento 60 e for posterior ao movimento 18,
      * passa a ser a nova data-base.
      */
     if (!empty($ctx['data60'])) {
 
         $data60 = new DateTime($ctx['data60']);
 
         if ($data60 > $dataBase) {
             $dataBase = $data60;
         }
     }
 
     /*
      * Prazo contratual inicial
      */
     $prazo = (int)$ctx['prazo'];
 
     /*
      * Descritivo 21:
      * dias adicionais resultantes de
      * prorrogação/suspensão da obra.
      */
     $diasProrrogacao = (int)($ctx['valorMovimento21'] ?? 0);
 
     /*
      * Prazo total = prazo inicial + prorrogação/suspensão
      */
     $prazoTotal = $prazo + $diasProrrogacao;
 
     $dataBase->modify("+{$prazoTotal} days");
 
     return $dataBase->format('d-m-Y');
 }
/**
 * 3️⃣ Definir fases + regra do movimento 4 + Excessões pelo tipo de procedimento
 */
function definirFases(array $ctx): array
{
    $fasesBase = [

        'Aquisição de Serviços' => [1, 4, 5, 10, 13, 14, 16, 17, 19, 28],
        'Aquisição de Bens'     => [1, 4, 5, 10, 13, 14, 16, 17, 19, 27],
        'Empreitada'            => [1, 4, 5, 10, 13, 14, 16, 17, 18, 19, 26, 29, 30],

    ];

    /**
     * Movimentos a ignorar
     */
    $dispensas = [

        'Ajuste Direto Simplificado' => [5, 11, 12, 13, 18, 19, 26, 27, 28, 29, 30],
        'Aquisição de Serviços'      => [11, 12, 26, 27, 29, 30],
        'Aquisição de Bens'          => [11, 12, 26, 28, 29, 30],
        'Empreitada'                 => [11, 12, 27, 28],

    ];

    if ($ctx['erro']) {

        return [[], [
            'erro' => true,
            'mensagem' => $ctx['mensagem']
        ]];

    }

    /**
     * Fases base pelo tipo de contrato
     */
    $movimentos = $fasesBase[$ctx['contrato']] ?? [];

    /**
     * Regra:
     * movimento 4 < 10000 remove 17
     */
    if (
        isset($ctx['valorMovimento4']) &&
        $ctx['valorMovimento4'] < 10000
    ) {

        $movimentos = array_diff($movimentos, [16, 17]);

    }

    /**
     * Aplicar exceções do procedimento
     */
    if (
        !empty($ctx['procedimento']) &&
        isset($dispensas[$ctx['procedimento']])
    ) {

        $movimentos = array_diff(
            $movimentos,
            $dispensas[$ctx['procedimento']]
        );

    }

    /**
     * Reindexar array
     */
    $movimentos = array_values($movimentos);

    return [$movimentos, null];
}

/**
 * 4️⃣ Filtrar pontos
 */
function filtrarPontosControle(array $resultados, array $fases): array
{
    $pontos = [];

    foreach ($resultados as $r) {

        if (in_array($r['codigo'], $fases)) {

            $pontos[] = [
                'codigo'    => (int)$r['codigo'], // NOVO
                'documento' => $r['documento'],
                'data_doc'  => $r['data_documento'],
                'data_val'  => $r['data_validacao_documento'],
                'refer'     => $r['referencias'],
                'notas'     => $r['notas'],
                'valor'     => $r['valor_documento']
            ];
        }
    }

    return $pontos;
}

/**
 * 5️⃣ Render HTML
 */
function gerarHTMLStepper(array $pontos, array $ctx): void
{
    echo '<div class="stepper-wrapper">';

    $dataTermoPrevisto = calcularDataTermoPrevisto($ctx);

    foreach ($pontos as $i => $pt) {

        $status = 'nulo';
        $dias = '';

        // Descritivo apresentado no stepper
        $descritivo = $pt['documento'];

        /*
         * DESCRITIVOS 26, 27 e 28
         *
         * Em vez do número de dias, apresenta sempre
         * a Data de Termo Previsto.
         */
        if (in_array((int)$pt['codigo'], [26, 27, 28], true)) {

            $dias = $dataTermoPrevisto ?? '';

            // Altera apenas o texto apresentado
            $descritivo = 'Termo Previsto';

            if ($pt['data_doc'] != 0) {
                $status = 'conforme';
            }

        } else {

            /*
             * Restantes descritivos:
             * mantém o comportamento atual.
             */
            if ($pt['data_doc'] != 0) {

                $status = 'conforme';

                if ($i > 0 && $pontos[$i - 1]['data_val'] != 0) {

                    $d1 = new DateTime($pt['data_val']);
                    $d2 = new DateTime($pontos[$i - 1]['data_val']);

                    $dias = $d1->diff($d2)->days;

                    if ($pt['documento'] === 'BaseGov' && $dias > 20) {
                        $status = 'desconforme';
                    }
                }
            }
        }

        $badge = $dias !== ''
            ? '<span class="badge rounded-pill bg-'
                . ($status === 'desconforme' ? 'danger' : 'info')
                . ' text-white badge-notification" '
                . 'style="position:absolute;top:0;right:0;'
                . 'transform:translate(50%,-50%);">'
                . $dias .
              '</span>'
            : '';

        echo '
        <div class="stepper-item ' . $status . '">

            <div class="step-counter position-relative"
                tabindex="0"
                role="button"
                data-bs-toggle="popover"
                data-bs-trigger="focus"
                data-bs-placement="top"
                title="[E:' . $pt['data_doc'] .
                    ' - V:' . $pt['data_val'] .
                    '] - ' . $pt['notas'] . '"
                data-bs-content="' . $pt['data_val'] . '">

                ' . ($i + 1) . $badge . '

            </div>

            <div class="step-name badge bg-' .
                ($status === 'conforme'
                    ? 'success'
                    : ($status === 'desconforme'
                        ? 'danger'
                        : 'secondary'))
                . ' text-white">'
                . $descritivo .
            '</div>

        </div>';
    }

    echo '</div>';
}

/**
 * 🚀 EXECUÇÃO
 */
$resultados = buscarResultados($myConn, $codigoProcesso, $descritivos);

$ctx = criarContexto($resultados);

if ($ctx['erro']) {
    echo '<div class="alert alert-warning">'
        . $ctx['mensagem'] .
    '</div>';
    exit;
}

[$fases, $erroFases] = definirFases($ctx);

if (!empty($erroFases)) {
    echo '<div class="alert alert-warning">'
        . $erroFases['mensagem'] .
    '</div>';
    exit;
}

$pontos = filtrarPontosControle($resultados, $fases);

if ($formato === 'json') {

    header('Content-Type: application/json');

    echo json_encode([
        'pontos' => $pontos,
        'contexto' => $ctx
    ]);

    exit;
}

gerarHTMLStepper($pontos, $ctx);