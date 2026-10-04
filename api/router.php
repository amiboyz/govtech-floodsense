<?php
declare(strict_types=1);

// Router for PHP built-in web server: php -S 127.0.0.1:8787 api/router.php
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Serve project images directly
if (str_starts_with($uri, '/project-images/')) {
    $subPath = substr($uri, strlen('/project-images/'));
    $file = dirname(__DIR__) . '/docs/db/images/' . $subPath;
    if (file_exists($file) && is_file($file)) {
        $mime = match (pathinfo($file, PATHINFO_EXTENSION)) {
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'svg' => 'image/svg+xml',
            'webp' => 'image/webp',
            default => 'application/octet-stream',
        };
        header("Content-Type: {$mime}");
        readfile($file);
        return true;
    }
}

// Route API requests to index.php
if (str_starts_with($uri, '/api/')) {
    require __DIR__ . '/index.php';
    return true;
}

// Fallback: let PHP serve static file if it exists, otherwise 404
$filePath = dirname(__DIR__) . $uri;
if (file_exists($filePath) && is_file($filePath)) {
    return false;
}

http_response_code(404);
echo json_encode(['error' => ['code' => 'NOT_FOUND', 'message' => 'Not found']]);
return true;
