<?php
// =====================================================
// api/migrate_json_to_db.php — 既存の data/*.json をDBへ移行（一回限り）
// CLI専用。実行: php api/migrate_json_to_db.php
// 冪等（何度実行しても重複挿入されない）
// =====================================================

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "CLI only\n");
    exit(1);
}

require __DIR__ . '/db.php';

const FAV_MAX = 10;
$dataDir = __DIR__ . '/../data';
$usersFile = $dataDir . '/users.json';
$favDir = $dataDir . '/favorites';

$pdo = db();

// ---- users.json → users テーブル ----

$users = [];
if (is_file($usersFile)) {
    $content = file_get_contents($usersFile);
    $decoded = json_decode($content, true);
    if (is_array($decoded)) $users = $decoded;
}

$userIdByKey = []; // name_key => user_id
$userCount = 0;

$insertUser = $pdo->prepare(
    'INSERT INTO users (name, name_key, password_hash, created_at) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)'
);
$selectUserId = $pdo->prepare('SELECT id FROM users WHERE name_key = ?');

foreach ($users as $key => $u) {
    if (!is_array($u) || !isset($u['name'], $u['password_hash'])) continue;
    $createdAt = isset($u['created_at']) ? (int) $u['created_at'] : time();

    $insertUser->execute([$u['name'], $key, $u['password_hash'], $createdAt]);
    $selectUserId->execute([$key]);
    $id = $selectUserId->fetchColumn();
    if ($id === false) continue;

    $userIdByKey[$key] = (int) $id;
    $userCount++;
}

// ---- favorites/*.json → favorites テーブル ----
// ファイル名は md5(name_key) なので、上のマップから逆引きする

$hashToKey = [];
foreach ($userIdByKey as $key => $id) {
    $hashToKey[md5($key)] = $key;
}

$favCount = 0;
$skipped = 0;

$deleteFav = $pdo->prepare('DELETE FROM favorites WHERE user_id = ? AND kind = ?');
$insertFav = $pdo->prepare(
    'INSERT INTO favorites (user_id, kind, item_id, payload, position, created_at) VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload), position = VALUES(position)'
);

$files = is_dir($favDir) ? glob($favDir . '/*.json') : [];
foreach ($files as $file) {
    $hash = basename($file, '.json');
    if (!isset($hashToKey[$hash])) {
        echo "skip: orphaned favorites file {$file} (no matching user)\n";
        $skipped++;
        continue;
    }

    $key = $hashToKey[$hash];
    $uid = $userIdByKey[$key];

    $content = file_get_contents($file);
    $decoded = json_decode($content, true);
    if (!is_array($decoded)) continue;

    $now = time();
    foreach (['color' => 'colors', 'font' => 'fonts'] as $kind => $field) {
        $list = isset($decoded[$field]) && is_array($decoded[$field]) ? $decoded[$field] : [];
        $list = array_slice(array_values($list), 0, FAV_MAX);

        foreach ($list as $i => $item) {
            if (!is_array($item) || !isset($item['id'])) continue;
            $insertFav->execute([
                $uid,
                $kind,
                (string) $item['id'],
                json_encode($item, JSON_UNESCAPED_UNICODE),
                $i,
                $now,
            ]);
            $favCount++;
        }
    }
}

echo "{$userCount} users migrated, {$favCount} favorites rows inserted, {$skipped} orphaned favorites files skipped\n";
