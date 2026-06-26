<?php
// =====================================================
// api/store.php — ユーザー／お気に入りのファイル保存・セッション
// require 専用モジュール（cors.php / helpers.php の後に読み込む）
// =====================================================

const DATA_DIR = __DIR__ . '/../data';
const USERS_FILE = DATA_DIR . '/users.json';
const FAV_DIR = DATA_DIR . '/favorites';
const FAV_MAX = 10; // 各リストの保存上限（フロント favReducer と一致）

// ---- セッション ----

function session_boot(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function current_user(): ?string {
    return $_SESSION['user'] ?? null;
}

function require_login(): string {
    $u = current_user();
    if ($u === null) {
        json_error('UNAUTHORIZED', 'ログインが必要です。', 401);
    }
    return $u;
}

// ---- 内部：JSON ファイル読み書き（flock） ----

function _ensure_data_dir(): void {
    if (!is_dir(DATA_DIR)) @mkdir(DATA_DIR, 0700, true);
    if (!is_dir(FAV_DIR))  @mkdir(FAV_DIR, 0700, true);
}

function _read_json(string $file): array {
    if (!is_file($file)) return [];
    $content = @file_get_contents($file);
    if ($content === false || $content === '') return [];
    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

function _write_json(string $file, array $data): void {
    _ensure_data_dir();
    $fp = @fopen($file, 'c+');
    if (!$fp) {
        json_error('INTERNAL_ERROR', 'データの保存に失敗しました。', 500);
    }
    flock($fp, LOCK_EX);
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($data, JSON_UNESCAPED_UNICODE));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
}

// ---- ユーザー ----

function _user_key(string $name): string {
    return mb_strtolower(trim($name));
}

function users_load(): array {
    return _read_json(USERS_FILE);
}

function user_find(string $name): ?array {
    $users = users_load();
    return $users[_user_key($name)] ?? null;
}

function user_create(string $name, string $passwordHash): void {
    $users = users_load();
    $users[_user_key($name)] = [
        'name'          => trim($name),
        'password_hash' => $passwordHash,
        'created_at'    => time(),
    ];
    _write_json(USERS_FILE, $users);
}

// ---- お気に入り ----

function fav_path(string $name): string {
    return FAV_DIR . '/' . md5(_user_key($name)) . '.json';
}

function fav_load(string $name): array {
    $data = _read_json(fav_path($name));
    return [
        'colors' => isset($data['colors']) && is_array($data['colors']) ? $data['colors'] : [],
        'fonts'  => isset($data['fonts'])  && is_array($data['fonts'])  ? $data['fonts']  : [],
    ];
}

function fav_save(string $name, array $colors, array $fonts): array {
    $colors = array_slice(array_values($colors), 0, FAV_MAX);
    $fonts  = array_slice(array_values($fonts),  0, FAV_MAX);
    $data = ['colors' => $colors, 'fonts' => $fonts];
    _write_json(fav_path($name), $data);
    return $data;
}

// ---- マージ（ゲスト → アカウント） ----
// id をキーに重複を除外して結合。サーバー側を優先し、上限 FAV_MAX。

function _merge_by_id(array $serverList, array $localList): array {
    $seen = [];
    $out = [];
    foreach (array_merge($serverList, $localList) as $item) {
        if (!is_array($item) || !isset($item['id'])) continue;
        $id = (string) $item['id'];
        if (isset($seen[$id])) continue;
        $seen[$id] = true;
        $out[] = $item;
    }
    return array_slice($out, 0, FAV_MAX);
}

function fav_merge(array $serverData, array $localColors, array $localFonts): array {
    return [
        'colors' => _merge_by_id($serverData['colors'] ?? [], $localColors),
        'fonts'  => _merge_by_id($serverData['fonts']  ?? [], $localFonts),
    ];
}
