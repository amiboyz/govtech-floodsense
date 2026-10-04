<?php
declare(strict_types=1);

namespace FloodSense\Services;

use FloodSense\DB;

class EvaluationService {
    private static ?array $tmaData = null;
    private static ?array $rainData = null;
    private static ?array $reportData = null;
    private static ?array $infraData = null;
    private static ?array $riverData = null;
    private static ?array $transitData = null;

    public static function getDistanceKm(float $lat1, float $lon1, float $lat2, float $lon2): float {
        $earthRadius = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return $earthRadius * $c;
    }

    private static function loadCached(string $filename): array {
        $path = dirname(__DIR__) . '/data/' . $filename;
        if (!file_exists($path)) return [];
        $raw = file_get_contents($path);
        $decoded = json_decode($raw, true);
        return $decoded['data'] ?? [];
    }

    public static function evaluateLocation(float $lat, float $lng): array {
        if (self::$tmaData === null) self::$tmaData = self::loadCached('tma.json');
        if (self::$rainData === null) self::$rainData = self::loadCached('rain.json');
        if (self::$reportData === null) self::$reportData = self::loadCached('flood-reports.json');
        if (self::$infraData === null) self::$infraData = self::loadCached('infrastructure.json');
        if (self::$riverData === null) self::$riverData = self::loadCached('rivers.json');
        if (self::$transitData === null) self::$transitData = self::loadCached('transit.json');

        // 1. Nearest TMA
        $closestTma = null;
        $minTmaDist = INF;
        foreach (self::$tmaData as $t) {
            $d = self::getDistanceKm($lat, $lng, (float)$t['latitude'], (float)$t['longitude']);
            if ($d < $minTmaDist) {
                $minTmaDist = $d;
                $closestTma = $t;
            }
        }

        // 2. Nearest Rain
        $closestRain = null;
        $minRainDist = INF;
        foreach (self::$rainData as $r) {
            $d = self::getDistanceKm($lat, $lng, (float)$r['latitude'], (float)$r['longitude']);
            if ($d < $minRainDist) {
                $minRainDist = $d;
                $closestRain = $r;
            }
        }

        // 3. Nearest Flood Report
        $closestReport = null;
        $minRepDist = INF;
        foreach (self::$reportData as $rep) {
            $d = self::getDistanceKm($lat, $lng, (float)$rep['latitude'], (float)$rep['longitude']);
            if ($d < $minRepDist) {
                $minRepDist = $d;
                $closestReport = $rep;
            }
        }

        // 4. Nearest River
        $closestRiver = null;
        $minRiverDist = INF;
        $rivers = self::$riverData['features'] ?? [];
        foreach ($rivers as $feat) {
            $coords = $feat['geometry']['coordinates'] ?? [];
            $type = $feat['geometry']['type'] ?? '';
            $checkPoint = function($lon, $la) use ($lat, $lng, &$minRiverDist, &$closestRiver, $feat) {
                $d = EvaluationService::getDistanceKm($lat, $lng, (float)$la, (float)$lon);
                if ($d < $minRiverDist) {
                    $minRiverDist = $d;
                    $closestRiver = $feat['properties'] ?? [];
                }
            };

            if ($type === 'LineString') {
                foreach ($coords as $pt) {
                    if (is_array($pt) && count($pt) >= 2) $checkPoint($pt[0], $pt[1]);
                }
            } elseif ($type === 'MultiLineString') {
                foreach ($coords as $line) {
                    foreach ($line as $pt) {
                        if (is_array($pt) && count($pt) >= 2) $checkPoint($pt[0], $pt[1]);
                    }
                }
            }
        }

        // 5. Nearest Pump
        $closestPump = null;
        $minPumpDist = INF;
        $pumps = self::$infraData['pumps'] ?? [];
        foreach ($pumps as $p) {
            $d = self::getDistanceKm($lat, $lng, (float)$p['latitude'], (float)$p['longitude']);
            if ($d < $minPumpDist) {
                $minPumpDist = $d;
                $closestPump = $p;
            }
        }

        // 6. Nearest Waduk
        $closestWaduk = null;
        $minWadukDist = INF;
        $waduks = self::$infraData['waduk'] ?? [];
        foreach ($waduks as $w) {
            $d = self::getDistanceKm($lat, $lng, (float)$w['latitude'], (float)$w['longitude']);
            if ($d < $minWadukDist) {
                $minWadukDist = $d;
                $closestWaduk = $w;
            }
        }

        // 7. Nearest Gate
        $closestGate = null;
        $minGateDist = INF;
        $gates = self::$infraData['gates'] ?? [];
        foreach ($gates as $g) {
            $d = self::getDistanceKm($lat, $lng, (float)$g['latitude'], (float)$g['longitude']);
            if ($d < $minGateDist) {
                $minGateDist = $d;
                $closestGate = $g;
            }
        }

        // 8. Nearest Transit Hub
        $closestTransit = null;
        $minTransitDist = INF;
        foreach (self::$transitData as $tr) {
            $d = self::getDistanceKm($lat, $lng, (float)$tr['latitude'], (float)$tr['longitude']);
            if ($d < $minTransitDist) {
                $minTransitDist = $d;
                $closestTransit = $tr;
            }
        }

        // Compound Hazard Scoring
        $fluvialScore = 0.0;
        if ($closestTma) {
            $siaga = $closestTma['siaga_level'] ?? 4;
            $distFactor = max(0.0, 1.0 - ($minTmaDist / 12.0));
            $siagaWeight = $siaga === 1 ? 100 : ($siaga === 2 ? 75 : ($siaga === 3 ? 50 : 20));
            $fluvialScore = $siagaWeight * $distFactor;
        }

        $pluvialScore = 0.0;
        if ($closestRain) {
            $rainMm = (float)($closestRain['rain_current'] ?? $closestRain['rain_today'] ?? 0);
            $distFactor = max(0.0, 1.0 - ($minRainDist / 15.0));
            $pluvialScore = min(100.0, ($rainMm / 100.0) * 100.0) * $distFactor;
        }

        $coastalScore = 0.0;
        if ($lat > -6.16) {
            $distCoast = (-6.10 - $lat) * 111.0;
            if ($distCoast < 6.0) {
                $coastalScore = max(0.0, (6.0 - max(0.0, $distCoast)) / 6.0) * 85.0;
            }
        }

        $compositeScore = round(max($fluvialScore, $pluvialScore) * 0.7 + ($fluvialScore + $pluvialScore + $coastalScore) / 3 * 0.3, 1);
        $riskLevel = $compositeScore >= 70 ? 'high' : ($compositeScore >= 40 ? 'moderate' : 'low');

        return [
            'latitude' => $lat,
            'longitude' => $lng,
            'risk_level' => $riskLevel,
            'composite_score' => $compositeScore,
            'fluvial_index' => round($fluvialScore, 1),
            'pluvial_index' => round($pluvialScore, 1),
            'coastal_index' => round($coastalScore, 1),
            'nearest_tma' => $closestTma ? [
                'station_id' => $closestTma['station_id'],
                'name' => $closestTma['name'],
                'river' => $closestTma['river'],
                'level' => $closestTma['level'],
                'status' => $closestTma['status'],
                'distance_km' => round($minTmaDist, 2),
            ] : null,
            'nearest_rain' => $closestRain ? [
                'station_id' => $closestRain['station_id'],
                'name' => $closestRain['name'],
                'rain_current' => $closestRain['rain_current'] ?? 0,
                'intensity' => $closestRain['intensity'] ?? 'Nihil',
                'distance_km' => round($minRainDist, 2),
            ] : null,
            'nearest_report' => $closestReport ? [
                'kelurahan' => $closestReport['kelurahan'] ?? '',
                'city' => $closestReport['city'] ?? '',
                'depth_cm_raw' => $closestReport['depth_cm_raw'] ?? '',
                'distance_km' => round($minRepDist, 2),
            ] : null,
            'nearest_river' => $closestRiver ? [
                'name' => $closestRiver['nama_sungai'] ?? '',
                'orde' => $closestRiver['orde'] ?? 0,
                'orde_label' => $closestRiver['orde_label'] ?? '',
                'distance_km' => round($minRiverDist, 2),
            ] : null,
            'infrastructure_profile' => [
                'nearest_pump' => $closestPump ? [
                    'name' => $closestPump['name'],
                    'distance_km' => round($minPumpDist, 2),
                ] : null,
                'nearest_waduk' => $closestWaduk ? [
                    'name' => $closestWaduk['name'],
                    'distance_km' => round($minWadukDist, 2),
                ] : null,
                'nearest_gate' => $closestGate ? [
                    'name' => $closestGate['name'],
                    'distance_km' => round($minGateDist, 2),
                ] : null,
            ],
            'transit_proximity' => $closestTransit ? [
                'name' => $closestTransit['name'],
                'mode' => $closestTransit['mode'] ?? 'MRT',
                'distance_km' => round($minTransitDist, 2),
            ] : null,
        ];
    }

    public static function getStationHistory(string $stationId, string $type): array {
        if ($type === 'tma') {
            if (self::$tmaData === null) self::$tmaData = self::loadCached('tma.json');
            $station = null;
            foreach (self::$tmaData as $s) {
                if ($s['station_id'] === $stationId) {
                    $station = $s;
                    break;
                }
            }

            if (!$station) {
                return ['error' => 'STATION_NOT_FOUND', 'history' => []];
            }

            $s1 = (int)($station['thresholds']['siaga1'] ?? 300);
            $s2 = (int)($station['thresholds']['siaga2'] ?? 250);
            $s3 = (int)($station['thresholds']['siaga3'] ?? 200);
            $s4 = (int)($station['thresholds']['siaga4'] ?? 150);

            $history = [];
            $pdo = DB::getConnection();

            if ($pdo !== null) {
                try {
                    $stmt = $pdo->prepare("
                        SELECT TANGGAL, TINGGI_AIR, STATUS_SIAGA 
                        FROM jakarta_tma 
                        WHERE (ID_PINTU_AIR = ? OR NAMA_PINTU_AIR = ?) 
                          AND TANGGAL > '2000-01-01' 
                          AND TINGGI_AIR IS NOT NULL 
                        ORDER BY TANGGAL DESC 
                        LIMIT 24
                    ");
                    $stmt->execute([$stationId, $station['name']]);
                    $rows = $stmt->fetchAll();

                    if (!empty($rows) && count($rows) >= 6) {
                        $rows = array_reverse($rows);
                        foreach ($rows as $r) {
                            $lvl = (int)$r['TINGGI_AIR'];
                            $st = 'Normal';
                            if ($lvl >= $s1) $st = 'Siaga 1';
                            elseif ($lvl >= $s2) $st = 'Siaga 2';
                            elseif ($lvl >= $s3) $st = 'Siaga 3';

                            $d = new \DateTime($r['TANGGAL']);
                            $history[] = [
                                'hour' => $d->format('H:00'),
                                'datetime' => $d->format(\DateTime::ATOM),
                                'level' => $lvl,
                                'siaga1' => $s1,
                                'siaga2' => $s2,
                                'siaga3' => $s3,
                                'siaga4' => $s4,
                                'status' => $st,
                            ];
                        }
                    }
                } catch (\Throwable $e) {
                    // Fall back to organic hydrological model
                }
            }

            // Fallback: Organic hydrological recession curve (No sine wave)
            if (empty($history)) {
                $now = new \DateTime();
                $current = (int)$station['level'];
                $prev = (int)($station['prev_level'] ?? $current);

                $seed = 0;
                for ($c = 0; $c < strlen($stationId); $c++) {
                    $seed = ($seed * 31 + ord($stationId[$c])) & 0xffffff;
                }

                for ($i = 23; $i >= 0; $i--) {
                    $dt = clone $now;
                    $dt->modify("-{$i} hours");
                    $hourStr = $dt->format('H:00');
                    $progress = (23 - $i) / 23.0;

                    $seed = ($seed * 1664525 + 1013904223) & 0xffffff;
                    $noiseFactor = (($seed / 0xffffff) - 0.5) * 0.015;

                    $trend = $station['trend'] ?? 'stable';
                    if ($trend === 'rising') {
                        $sigmoid = 1.0 / (1.0 + exp(-6.0 * ($progress - 0.6)));
                        $lvl = (int)round($prev + ($current - $prev) * $sigmoid + $current * $noiseFactor);
                    } elseif ($trend === 'falling') {
                        $recession = exp(-2.2 * $progress);
                        $lvl = (int)round($current + ($prev - $current) * $recession + $current * $noiseFactor);
                    } else {
                        $lvl = (int)round($current * (1.0 + $noiseFactor));
                    }

                    $st = 'Normal';
                    if ($lvl >= $s1) $st = 'Siaga 1';
                    elseif ($lvl >= $s2) $st = 'Siaga 2';
                    elseif ($lvl >= $s3) $st = 'Siaga 3';

                    $history[] = [
                        'hour' => $hourStr,
                        'datetime' => $dt->format(\DateTime::ATOM),
                        'level' => max(0, $lvl),
                        'siaga1' => $s1,
                        'siaga2' => $s2,
                        'siaga3' => $s3,
                        'siaga4' => $s4,
                        'status' => $st,
                    ];
                }
            }

            return [
                'station' => $station,
                'period' => ['source' => 'hydrological_model'],
                'history' => $history,
            ];
        } else {
            // Rain station history
            if (self::$rainData === null) self::$rainData = self::loadCached('rain.json');
            $station = null;
            foreach (self::$rainData as $s) {
                if ($s['station_id'] === $stationId) {
                    $station = $s;
                    break;
                }
            }

            if (!$station) {
                return ['error' => 'STATION_NOT_FOUND', 'history' => []];
            }

            $now = new \DateTime();
            $rainCurrent = (float)($station['rain_current'] ?? 0);
            $history = [];

            for ($i = 23; $i >= 0; $i--) {
                $dt = clone $now;
                $dt->modify("-{$i} hours");
                $hourStr = $dt->format('H:00');
                $val = ($i < 3) ? round($rainCurrent * (1 - $i * 0.2), 1) : 0.0;
                $history[] = [
                    'hour' => $hourStr,
                    'datetime' => $dt->format(\DateTime::ATOM),
                    'rain' => max(0.0, $val),
                ];
            }

            return [
                'station' => $station,
                'period' => ['source' => 'meteorological_model'],
                'history' => $history,
            ];
        }
    }
}
