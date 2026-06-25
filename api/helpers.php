<?php
// =====================================================
// api/helpers.php — 共通ユーティリティ関数
// =====================================================

// ---- レスポンス出力 ----

function json_ok($data, int $status = 200): never {
    http_response_code($status);
    echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error(string $code, string $message, int $status = 400): never {
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => ['code' => $code, 'message' => $message]], JSON_UNESCAPED_UNICODE);
    exit;
}

// ---- cURL ラッパー ----

function curl_post(string $url, string $body, array $headers = []): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 60,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_HTTPHEADER     => $headers,
    ]);
    $resp   = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error  = curl_error($ch);
    curl_close($ch);
    if ($error) throw new RuntimeException("cURL error: $error");
    return ['status' => $status, 'body' => $resp];
}

// ---- バリデーション ----

// 任意の文字列（空可）。最大長のみチェックして trim 後を返す。
function validate_optional_string(mixed $val, int $max = 500): string {
    if (!is_string($val)) return '';
    $val = trim($val);
    if (mb_strlen($val) > $max) {
        json_error('VALIDATION_ERROR', "パラメータが長すぎます（最大{$max}文字）。", 400);
    }
    return $val;
}

function validate_enum(mixed $val, array $allowed): string {
    if (!in_array($val, $allowed, true)) {
        json_error('VALIDATION_ERROR', '許可されていない値です。', 400);
    }
    return $val;
}

// ---- レート制限（ファイルベース・共用サーバー対応） ----

function rate_limit_check(string $key, int $limit, int $window_sec): void {
    $dir = sys_get_temp_dir() . '/iroha_rl';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    $file = $dir . '/' . md5($key) . '.json';
    $fp = @fopen($file, 'c+');
    if (!$fp) return; // ファイルが開けない場合はスキップ（サーバー環境によって）

    flock($fp, LOCK_EX);
    $content = stream_get_contents($fp);
    $times = $content ? json_decode($content, true) : [];
    if (!is_array($times)) $times = [];

    $now = time();
    $cutoff = $now - $window_sec;
    $times = array_values(array_filter($times, fn($t) => $t > $cutoff));

    if (count($times) >= $limit) {
        flock($fp, LOCK_UN);
        fclose($fp);
        json_error('RATE_LIMIT_EXCEEDED', 'リクエスト数が上限に達しました。しばらく時間をおいてからお試しください。', 429);
    }

    $times[] = $now;
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($times));
    flock($fp, LOCK_UN);
    fclose($fp);
}
