<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/services/evaluation.php';

use FloodSense\Config;
use FloodSense\DB;
use FloodSense\Services\EvaluationService;

// Ensure proper headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';

// Helper to send json file directly
function sendDataFile(string $filename, array $headers = []): void {
    $path = __DIR__ . '/data/' . $filename;
    if (!file_exists($path)) {
        http_response_code(404);
        echo json_encode(['error' => ['code' => 'NOT_FOUND', 'message' => "Dataset {$filename} not found."]]);
        exit;
    }
    foreach ($headers as $k => $v) {
        header("{$k}: {$v}");
    }
    readfile($path);
    exit;
}

// 1. Health check
if ($requestUri === '/api/v1/health' || $requestUri === '/api/health') {
    echo json_encode([
        'status' => 'ok',
        'runtime' => 'php',
        'php_version' => PHP_VERSION,
        'database' => DB::isAvailable() ? 'connected' : (Config::isDemo() ? 'demo_mode' : 'unavailable'),
        'timestamp' => date(DATE_ATOM),
    ]);
    exit;
}

// 2. Monitoring Summary
if ($requestUri === '/api/v1/monitoring/summary') {
    sendDataFile('summary.json');
}

// 3. TMA Stations
if ($requestUri === '/api/v1/monitoring/tma') {
    sendDataFile('tma.json');
}

// 4. Rain Stations
if ($requestUri === '/api/v1/monitoring/rain') {
    sendDataFile('rain.json');
}

// 5. Investments POI
if ($requestUri === '/api/v1/monitoring/investments') {
    sendDataFile('investments.json');
}

// 6. Strategic Pipeline Projects 2026
if ($requestUri === '/api/v1/monitoring/projects-2026') {
    $path = __DIR__ . '/data/projects-2026.json';
    if (!file_exists($path)) {
        http_response_code(404);
        echo json_encode(['error' => ['code' => 'NOT_FOUND', 'message' => 'Projects dataset not found']]);
        exit;
    }

    $sector = isset($_GET['sector']) && $_GET['sector'] !== 'all' ? strtolower(trim((string)$_GET['sector'])) : null;
    $status = isset($_GET['status']) && $_GET['status'] !== 'all' ? strtolower(trim((string)$_GET['status'])) : null;
    $risk = isset($_GET['risk']) && $_GET['risk'] !== 'all' ? trim((string)$_GET['risk']) : null;
    $q = isset($_GET['q']) ? strtolower(trim((string)$_GET['q'])) : null;

    if ($sector === null && $status === null && $risk === null && $q === null) {
        sendDataFile('projects-2026.json');
    }

    $raw = json_decode(file_get_contents($path), true);
    $items = $raw['data'] ?? [];

    $filtered = array_values(array_filter($items, function($p) use ($sector, $status, $risk, $q) {
        if ($sector !== null && strtolower((string)($p['sector'] ?? '')) !== $sector) return false;
        if ($status !== null && !str_contains(strtolower((string)($p['status'] ?? '')), $status)) return false;
        if ($risk !== null && ($p['risk_level'] ?? '') !== $risk) return false;
        if ($q !== null) {
            $nameMatch = str_contains(strtolower((string)($p['name'] ?? '')), $q);
            $sectorMatch = str_contains(strtolower((string)($p['sector'] ?? '')), $q);
            $ownerMatch = str_contains(strtolower((string)($p['owner_name'] ?? '')), $q);
            $locMatch = str_contains(strtolower((string)($p['location'] ?? '')), $q);
            if (!$nameMatch && !$sectorMatch && !$ownerMatch && !$locMatch) return false;
        }
        return true;
    }));

    echo json_encode(['data' => $filtered, 'meta' => ['count' => count($filtered), 'status' => 'ok']]);
    exit;
}

// 6b. Single Project 2026 Detail: /api/v1/monitoring/projects-2026/{id}
if (preg_match('#^/api/v1/monitoring/projects-2026/([^/]+)$#', $requestUri, $matches)) {
    $idOrSlug = $matches[1];
    $path = __DIR__ . '/data/projects-2026.json';
    if (!file_exists($path)) {
        http_response_code(404);
        echo json_encode(['error' => ['code' => 'NOT_FOUND', 'message' => 'Project not found']]);
        exit;
    }

    $raw = json_decode(file_get_contents($path), true);
    $items = $raw['data'] ?? [];
    $found = null;
    foreach ($items as $p) {
        if ((string)$p['id'] === $idOrSlug || (string)($p['slug'] ?? '') === $idOrSlug) {
            $found = $p;
            break;
        }
    }

    if (!$found) {
        http_response_code(404);
        echo json_encode(['error' => ['code' => 'PROJECT_NOT_FOUND', 'message' => 'Project not found']]);
        exit;
    }

    $pdo = DB::getConnection();
    if ($pdo !== null) {
        try {
            $stmt = $pdo->prepare('SELECT id, section_key, title, content, sort_order FROM jktjic_potensiproject_2026_sections WHERE project_id = ? ORDER BY sort_order ASC');
            $stmt->execute([$found['id']]);
            $found['sections'] = $stmt->fetchAll() ?: [];

            $stmt = $pdo->prepare('SELECT id, image_type, relative_path, caption, width, height FROM jktjic_potensiproject_2026_images WHERE project_id = ?');
            $stmt->execute([$found['id']]);
            $found['images'] = $stmt->fetchAll() ?: [];

            $stmt = $pdo->prepare('SELECT id, name, role, email, is_primary FROM jktjic_potensiproject_2026_contacts WHERE project_id = ?');
            $stmt->execute([$found['id']]);
            $found['contacts'] = $stmt->fetchAll() ?: [];
        } catch (\Throwable $e) {}
    }

    echo json_encode(['data' => $found, 'meta' => ['status' => 'ok']]);
    exit;
}

// 7. Flood Reports
if ($requestUri === '/api/v1/monitoring/flood-reports') {
    sendDataFile('flood-reports.json');
}

// 8. Infrastructure (Pumps, Gates, Waduk)
if ($requestUri === '/api/v1/monitoring/infrastructure') {
    sendDataFile('infrastructure.json');
}

// 9. Rivers Network
if ($requestUri === '/api/v1/monitoring/rivers') {
    sendDataFile('rivers.json');
}

// 10. Catchment DAS
if ($requestUri === '/api/v1/monitoring/das' || $requestUri === '/api/v1/gis/das') {
    sendDataFile('das.json');
}

// 11. Thiessen Polygons
if ($requestUri === '/api/v1/monitoring/thiessen') {
    sendDataFile('thiessen.json');
}

// 12. Transit Hubs
if ($requestUri === '/api/v1/monitoring/transit') {
    sendDataFile('transit.json');
}

// 13. Dynamic Station History
if ($requestUri === '/api/v1/monitoring/history') {
    $stationId = (string)($_GET['id'] ?? '');
    $type = (string)($_GET['type'] ?? 'tma');
    if (empty($stationId)) {
        http_response_code(400);
        echo json_encode(['error' => ['code' => 'INVALID_PARAMS', 'message' => 'id parameter is required']]);
        exit;
    }
    $history = EvaluationService::getStationHistory($stationId, $type);
    echo json_encode(['data' => $history, 'meta' => ['status' => 'ok']]);
    exit;
}

// 14. Dynamic Evaluate Location (Arbitrary Click)
if ($requestUri === '/api/v1/monitoring/evaluate-location') {
    $lat = isset($_GET['lat']) ? (float)$_GET['lat'] : null;
    $lng = isset($_GET['lng']) ? (float)$_GET['lng'] : null;
    if ($lat === null || $lng === null) {
        http_response_code(400);
        echo json_encode(['error' => ['code' => 'INVALID_COORDINATES', 'message' => 'lat and lng parameters are required']]);
        exit;
    }
    $eval = EvaluationService::evaluateLocation($lat, $lng);
    echo json_encode(['data' => $eval, 'meta' => ['status' => 'ok', 'evaluated_at' => date(DATE_ATOM)]]);
    exit;
}

// 15. GIS Objek Vital
if ($requestUri === '/api/v1/gis/vital-objects') {
    $vitalPath = dirname(__DIR__) . '/docs/data_gis/objek_vital.json';
    if (file_exists($vitalPath)) {
        $data = json_decode(file_get_contents($vitalPath), true);
        echo json_encode(['data' => $data, 'meta' => ['count' => count($data), 'source' => 'jakarta_objek_vital']]);
        exit;
    }
    http_response_code(404);
    echo json_encode(['error' => ['code' => 'NOT_FOUND', 'message' => 'Vital objects GIS not found']]);
    exit;
}

// 16. GIS Kelurahan
if ($requestUri === '/api/v1/gis/kelurahan') {
    $kelPath = dirname(__DIR__) . '/docs/data_gis/kelurahan_jabodetabek.json';
    if (file_exists($kelPath)) {
        readfile($kelPath);
        exit;
    }
    http_response_code(404);
    echo json_encode(['error' => ['code' => 'NOT_FOUND', 'message' => 'Kelurahan GIS not found']]);
    exit;
}

// 17. Evidence Replay
if ($requestUri === '/api/v1/evidence/replay') {
    $repPath = dirname(__DIR__) . '/analysis/results/historical-replay.json';
    if (file_exists($repPath)) {
        $study = json_decode(file_get_contents($repPath), true);
        echo json_encode(['data' => $study, 'meta' => ['data_mode' => 'historical_experiment', 'live' => false, 'spatial_accuracy_available' => false]]);
        exit;
    }
    http_response_code(503);
    echo json_encode(['error' => ['code' => 'REPLAY_NOT_READY', 'message' => 'Historical replay data not generated']]);
    exit;
}

// 18. Study
if ($requestUri === '/api/v1/study') {
    $studyPath = dirname(__DIR__) . '/analysis/results/das-study.json';
    if (!file_exists($studyPath)) $studyPath = dirname(__DIR__) . '/analysis/results/initial-study.json';
    if (file_exists($studyPath)) {
        $study = json_decode(file_get_contents($studyPath), true);
        echo json_encode(['data' => $study, 'meta' => ['generated_at' => $study['generated_at'] ?? date(DATE_ATOM), 'data_mode' => 'das_catchment_study']]);
        exit;
    }
    http_response_code(503);
    echo json_encode(['error' => ['code' => 'STUDY_NOT_AVAILABLE', 'message' => 'Study data not available']]);
    exit;
}

// 404 Fallback
http_response_code(404);
echo json_encode([
    'error' => [
        'code' => 'ENDPOINT_NOT_FOUND',
        'message' => "Route {$requestUri} was not found on FloodSense API.",
    ]
]);
