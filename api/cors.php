<?php
// =====================================================
// api/cors.php — CORSヘッダー・共通初期化
// 各エンドポイントの先頭で require する
// =====================================================

ob_start();

set_exception_handler(function (Throwable $e) {
    ob_end_clean();
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(500);
    }
    echo json_encode(['ok' => false, 'error' => ['code' => 'INTERNAL_ERROR', 'message' => 'サーバー内部エラーが発生しました。']]);
    exit;
});

register_shutdown_function(function () {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        ob_end_clean();
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(500);
        }
        echo json_encode(['ok' => false, 'error' => ['code' => 'INTERNAL_ERROR', 'message' => 'サーバー内部エラーが発生しました。']]);
    }
});

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// ローカル開発（XAMPP）では localhost / 127.0.0.1 を許可。
// 本番デプロイ時は $allowed_origins に本番ドメインを追加する。
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed_origins = [
    'http://localhost',
    'http://127.0.0.1',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    // 'https://yourdomain.com',  // ← 本番ドメインをここに追加
];

if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
} elseif ($origin === '') {
    // 同一オリジンからのリクエスト（共用サーバー本番環境）はそのまま許可
}

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONSプリフライトリクエストに即応答
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
