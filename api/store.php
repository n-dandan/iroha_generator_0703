<?php
// =====================================================
// api/store.php — ユーザー／お気に入りのDB保存・セッション
// require 専用モジュール（cors.php / helpers.php の後に読み込む）
// =====================================================

require __DIR__ . '/db.php';

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

// ---- ユーザー ----

function _user_key(string $name): string {
    return mb_strtolower(trim($name));
}

function user_find(string $name): ?array {
    $stmt = db()->prepare('SELECT name, password_hash, created_at FROM users WHERE name_key = ?');
    $stmt->execute([_user_key($name)]);
    $row = $stmt->fetch();
    if ($row === false) return null;
    $row['created_at'] = (int) $row['created_at'];
    return $row;
}

function user_create(string $name, string $passwordHash): void {
    $stmt = db()->prepare('INSERT INTO users (name, name_key, password_hash, created_at) VALUES (?, ?, ?, ?)');
    try {
        $stmt->execute([trim($name), _user_key($name), $passwordHash, time()]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') {
            json_error('NAME_TAKEN', 'この名前はすでに使われています。', 409);
        }
        throw $e;
    }
}

function _user_id(string $name): ?int {
    $stmt = db()->prepare('SELECT id FROM users WHERE name_key = ?');
    $stmt->execute([_user_key($name)]);
    $id = $stmt->fetchColumn();
    return $id === false ? null : (int) $id;
}

// ---- お気に入り ----

function fav_load(string $name): array {
    $uid = _user_id($name);
    $colors = [];
    $fonts = [];
    if ($uid === null) {
        return ['colors' => $colors, 'fonts' => $fonts];
    }

    $stmt = db()->prepare('SELECT kind, payload FROM favorites WHERE user_id = ? ORDER BY kind, position ASC');
    $stmt->execute([$uid]);
    foreach ($stmt as $row) {
        $item = json_decode($row['payload'], true);
        if (!is_array($item)) continue;
        if ($row['kind'] === 'color') {
            $colors[] = $item;
        } else {
            $fonts[] = $item;
        }
    }

    return ['colors' => $colors, 'fonts' => $fonts];
}

function fav_save(string $name, array $colors, array $fonts): array {
    $colors = array_slice(array_values($colors), 0, FAV_MAX);
    $fonts  = array_slice(array_values($fonts),  0, FAV_MAX);

    $uid = _user_id($name);
    if ($uid === null) {
        json_error('UNAUTHORIZED', 'ログインが必要です。', 401);
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $del = $pdo->prepare('DELETE FROM favorites WHERE user_id = ? AND kind = ?');
        $ins = $pdo->prepare(
            'INSERT INTO favorites (user_id, kind, item_id, payload, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        );
        $now = time();

        foreach (['color' => $colors, 'font' => $fonts] as $kind => $list) {
            $del->execute([$uid, $kind]);
            foreach (array_values($list) as $i => $item) {
                $ins->execute([
                    $uid,
                    $kind,
                    (string) ($item['id'] ?? ''),
                    json_encode($item, JSON_UNESCAPED_UNICODE),
                    $i,
                    $now,
                ]);
            }
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    return ['colors' => $colors, 'fonts' => $fonts];
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
