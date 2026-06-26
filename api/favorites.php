<?php
// =====================================================
// api/favorites.php — お気に入り読み書き（要ログイン）
// GET  : ログイン中ユーザーのお気に入りを返す
// POST : {colors, fonts} を保存
// =====================================================

require __DIR__ . '/cors.php';
require __DIR__ . '/helpers.php';
require __DIR__ . '/store.php';

session_boot();
$name = require_login();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    json_ok(fav_load($name));
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        json_error('VALIDATION_ERROR', 'リクエストボディが不正です。', 400);
    }

    $colors = isset($input['colors']) && is_array($input['colors']) ? $input['colors'] : [];
    $fonts  = isset($input['fonts'])  && is_array($input['fonts'])  ? $input['fonts']  : [];

    // 壊れたデータの保存を防ぐ軽い検証
    foreach ($colors as $c) {
        if (!is_array($c) || !isset($c['id'], $c['palette']) || !is_array($c['palette'])) {
            json_error('VALIDATION_ERROR', '配色データの形式が不正です。', 400);
        }
    }
    foreach ($fonts as $f) {
        if (!is_array($f) || !isset($f['id'], $f['heading'], $f['body'])) {
            json_error('VALIDATION_ERROR', 'フォントデータの形式が不正です。', 400);
        }
    }

    json_ok(fav_save($name, $colors, $fonts));
}

json_error('METHOD_NOT_ALLOWED', 'GET または POST のみ受け付けます。', 405);
