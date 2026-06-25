// config.example.js
// ★ このファイルは Git に含める雛形。
// ★ 実際に使う config.js はこのファイルをコピーして使う。
//
// APIキー・プロンプトはバックエンド（api/config.php / api/generate.php）側に配置する。
// フロントが知る必要があるのはエンドポイントの URL だけ。

window.IROHA_CONFIG = {
  // 配色＆フォント提案エンドポイント（PHPバックエンド）
  API_URL: "api/generate.php",
};
