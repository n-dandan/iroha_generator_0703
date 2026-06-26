<?php
// =====================================================
// api/auth.php — 認証エンドポイント
// POST {action: register|login|logout|me, ...}
// 名前＋パスワードによるログイン。セッションで状態管理。
// =====================================================

require __DIR__ . '/cors.php';
require __DIR__ . '/helpers.php';
require __DIR__ . '/store.php';

session_boot();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('METHOD_NOT_ALLOWED', 'POSTリクエストのみ受け付けます。', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) $input = [];

$action = $input['action'] ?? '';

// ---- 入力検証ヘルパー ----

function valid_name(mixed $val): string {
    if (!is_string($val)) json_error('VALIDATION_ERROR', '名前を入力してください。', 400);
    $val = trim($val);
    $len = mb_strlen($val);
    if ($len < 1 || $len > 30) {
        json_error('VALIDATION_ERROR', '名前は1〜30文字で入力してください。', 400);
    }
    return $val;
}

function valid_password(mixed $val): string {
    if (!is_string($val)) json_error('VALIDATION_ERROR', 'パスワードを入力してください。', 400);
    $len = mb_strlen($val);
    if ($len < 6 || $len > 100) {
        json_error('VALIDATION_ERROR', 'パスワードは6〜100文字で入力してください。', 400);
    }
    return $val;
}

// localFavorites（ゲスト分）を安全に取り出す
function extract_local_fav(array $input): array {
    $lf = $input['localFavorites'] ?? [];
    if (!is_array($lf)) return [['colors' => [], 'fonts' => []]][0];
    $colors = isset($lf['colors']) && is_array($lf['colors']) ? $lf['colors'] : [];
    $fonts  = isset($lf['fonts'])  && is_array($lf['fonts'])  ? $lf['fonts']  : [];
    return ['colors' => $colors, 'fonts' => $fonts];
}

// ---- アクション分岐 ----

switch ($action) {

    case 'register': {
        $name = valid_name($input['name'] ?? null);
        $password = valid_password($input['password'] ?? null);

        if (user_find($name) !== null) {
            json_error('NAME_TAKEN', 'この名前はすでに使われています。', 409);
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        user_create($name, $hash);

        // セッション確立
        session_regenerate_id(true);
        $_SESSION['user'] = $name;

        // ゲストのお気に入りをマージして保存
        $local = extract_local_fav($input);
        $merged = fav_merge(fav_load($name), $local['colors'], $local['fonts']);
        $saved = fav_save($name, $merged['colors'], $merged['fonts']);

        json_ok(['name' => $name, 'favorites' => $saved]);
    }

    case 'login': {
        // 軽いブルートフォース対策
        rate_limit_check('login:' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 20, 60);

        $name = valid_name($input['name'] ?? null);
        $password = valid_password($input['password'] ?? null);

        $user = user_find($name);
        if ($user === null || !password_verify($password, $user['password_hash'])) {
            json_error('INVALID_CREDENTIALS', '名前またはパスワードが違います。', 401);
        }

        // セッション確立（保存名は登録時の表記を使う）
        session_regenerate_id(true);
        $_SESSION['user'] = $user['name'];

        // ゲストのお気に入りをサーバーデータにマージ
        $local = extract_local_fav($input);
        $merged = fav_merge(fav_load($user['name']), $local['colors'], $local['fonts']);
        $saved = fav_save($user['name'], $merged['colors'], $merged['fonts']);

        json_ok(['name' => $user['name'], 'favorites' => $saved]);
    }

    case 'logout': {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        session_destroy();
        json_ok(['user' => null]);
    }

    case 'me': {
        $name = current_user();
        if ($name === null) {
            json_ok(['user' => null]);
        }
        json_ok(['name' => $name, 'favorites' => fav_load($name)]);
    }

    default:
        json_error('VALIDATION_ERROR', '不正なアクションです。', 400);
}
