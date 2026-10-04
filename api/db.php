<?php
declare(strict_types=1);

namespace FloodSense;

use PDO;
use PDOException;

class DB {
    private static ?PDO $instance = null;
    private static bool $attempted = false;

    public static function getConnection(): ?PDO {
        if (self::$instance !== null) {
            return self::$instance;
        }

        if (self::$attempted) {
            return null;
        }

        self::$attempted = true;

        if (Config::isDemo()) {
            return null;
        }

        $host = Config::get('DB_HOST', '127.0.0.1');
        $port = Config::get('DB_PORT', '3306');
        $database = Config::get('DB_DATABASE', 'local_govtech_floodsense');
        $username = Config::get('DB_USERNAME', 'root');
        $password = Config::get('DB_PASSWORD', '');

        try {
            $dsn = "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_TIMEOUT => 3,
            ];

            self::$instance = new PDO($dsn, $username, $password, $options);
            return self::$instance;
        } catch (PDOException $e) {
            error_log("FloodSense DB connection failed: " . $e->getMessage());
            return null;
        }
    }

    public static function isAvailable(): bool {
        return self::getConnection() !== null;
    }
}
