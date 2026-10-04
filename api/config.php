<?php
declare(strict_types=1);

namespace FloodSense;

class Config {
    private static array $env = [];

    public static function load(?string $dir = null): void {
        if (!empty(self::$env)) return;

        $dir = $dir ?? dirname(__DIR__);
        $envFile = $dir . '/.env';

        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line) || $line[0] === '#') continue;
                $parts = explode('=', $line, 2);
                if (count($parts) === 2) {
                    $key = trim($parts[0]);
                    $val = trim($parts[1]);
                    // remove surrounding quotes
                    if (strlen($val) >= 2 && (($val[0] === '"' && $val[-1] === '"') || ($val[0] === "'" && $val[-1] === "'"))) {
                        $val = substr($val, 1, -1);
                    }
                    self::$env[$key] = $val;
                }
            }
        }
    }

    public static function get(string $key, mixed $default = null): mixed {
        self::load();
        if (isset(self::$env[$key])) return self::$env[$key];
        $val = getenv($key);
        if ($val !== false) return $val;
        return $default;
    }

    public static function isDemo(): bool {
        $val = strtolower((string)self::get('DEMO_MODE', 'true'));
        return $val === 'true' || $val === '1';
    }
}
