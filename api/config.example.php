<?php
// =====================================================
// api/config.example.php — 設定ファイルの雛形（Git管理する）
// ★ このファイルをコピーして config.php を作成し、キーを入力する。
// ★ 実際に使う config.php は .gitignore で除外する（コミットしない）。
// =====================================================

return [
    // Gemini API キー（Google AI Studio で取得）
    'gemini_key' => '',

    // 使用モデル（軽量・低コスト）
    'model' => 'gemini-3.1-flash-lite',

    // 生成パラメータ
    'temperature'       => 0.9,
    'max_output_tokens' => 900,

    // レート制限（IPアドレスごと）
    'rate_limit' => ['limit' => 10, 'window' => 60],  // 10回/分

    // データベース接続（ユーザー／お気に入り）
    'db' => [
        'host'    => '127.0.0.1',
        'name'    => 'iroha_generator',
        'user'    => 'root',
        'pass'    => '',
        'charset' => 'utf8mb4',
    ],
];
