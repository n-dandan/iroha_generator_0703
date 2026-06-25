<?php
// =====================================================
// api/generate.php — 配色＆フォント提案エンドポイント
// フロントから入力値を受け取り、プロンプトを組み立てて
// Gemini を呼び出し、proposals 2案を返す。
// APIキー・プロンプトはすべてサーバー側に隠蔽する。
// =====================================================

require __DIR__ . '/cors.php';
require __DIR__ . '/helpers.php';
require __DIR__ . '/font-catalog.php';
$cfg = require __DIR__ . '/config.php';

// ---- 定数（logic.js から移植） ----

const MAIN_COLOR_LABELS = [
    'red'      => '赤',
    'orange'   => 'オレンジ',
    'yellow'   => '黄',
    'green'    => '緑',
    'blue'     => '青',
    'purple'   => '紫',
    'monotone' => 'モノクロ',
];

const TONE_AXES = [
    ['key' => 'form',   'left' => 'やわらか',   'right' => 'かっちり'],
    ['key' => 'era',    'left' => 'クラシック', 'right' => 'モダン'],
    ['key' => 'energy', 'left' => 'にぎやか',   'right' => '静か'],
    ['key' => 'class',  'left' => 'カジュアル', 'right' => 'ラグジュアリー'],
];

function response_schema(): array {
    return [
        'type' => 'object',
        'properties' => [
            'proposals' => [
                'type' => 'array',
                'minItems' => 2,
                'maxItems' => 2,
                'items' => [
                    'type' => 'object',
                    'properties' => [
                        'theme'      => ['type' => 'string'],
                        'reason'     => ['type' => 'string'],
                        'fontReason' => ['type' => 'string'],
                        'palette' => [
                            'type' => 'array',
                            'items' => [
                                'type' => 'object',
                                'properties' => [
                                    'hex'  => ['type' => 'string'],
                                    'role' => ['type' => 'string', 'enum' => ['primary', 'secondary', 'accent', 'base', 'text']],
                                    'name' => ['type' => 'string'],
                                ],
                                'required' => ['hex', 'role', 'name'],
                            ],
                        ],
                        'fontPairing' => [
                            'type' => 'object',
                            'properties' => [
                                'heading' => [
                                    'type' => 'object',
                                    'properties' => ['family' => ['type' => 'string'], 'weight' => ['type' => 'number']],
                                    'required' => ['family', 'weight'],
                                ],
                                'body' => [
                                    'type' => 'object',
                                    'properties' => ['family' => ['type' => 'string'], 'weight' => ['type' => 'number']],
                                    'required' => ['family', 'weight'],
                                ],
                            ],
                            'required' => ['heading', 'body'],
                        ],
                    ],
                    'required' => ['theme', 'reason', 'fontReason', 'palette', 'fontPairing'],
                ],
            ],
        ],
        'required' => ['proposals'],
    ];
}

// ---- プロンプト組み立て（logic.js から移植） ----

function build_user_prompt(?string $mainColor, array $tone, string $purpose, string $fontMode, string $langMode, string $free): string {
    $parts = [];

    if ($mainColor !== null && isset(MAIN_COLOR_LABELS[$mainColor])) {
        $parts[] = 'メインカラーの方向性：' . MAIN_COLOR_LABELS[$mainColor];
    }

    $toneParts = [];
    foreach (TONE_AXES as $ax) {
        $v = $tone[$ax['key']] ?? 0;
        if ($v === -1) $toneParts[] = $ax['left'] . '寄り';
        if ($v === 1)  $toneParts[] = $ax['right'] . '寄り';
    }
    if ($toneParts) $parts[] = 'トンマナ：' . implode('、', $toneParts);

    $parts[] = $purpose === 'print' ? '用途：印刷物' : '用途：デジタル（Web）';
    $parts[] = $fontMode === 'single'
        ? 'フォント：タイトルと本文で同一のフォントを使う'
        : 'フォント：タイトルと本文で別のフォントを使う';
    $parts[] = $langMode === 'jp_only'
        ? 'フォント言語：日本語フォントのみ'
        : 'フォント言語：日本語フォントと英語フォントの組み合わせ';

    if ($free !== '') $parts[] = '自由記入（最優先で反映）：' . $free;

    if (!$parts) $parts[] = 'おまかせで、汎用的に使いやすい上質な配色とフォントを提案してください。';

    return implode("\n", $parts);
}

function build_system_prompt(array $fontCatalog, string $purpose): string {
    $lines = [
        'あなたは日本語UI向けのアートディレクターです。指示に合う「デザインの方向性」を必ず2案提案します。',
        '2案は互いにムード・配色・フォントの方向性に明確な差をつけ、ユーザーが選ぶ意味があるようにします。',
        '各案は配色5色とフォントペアのセットで構成します。',
        '',
        '【配色】',
        '各案の配色は必ず5色で、role を primary / secondary / accent / base / text に1つずつ割り当てます。',
        'base は背景向けの明るい色、text は base 上で十分読める文字色にします（コントラスト比4.5以上を意識）。',
        'name は各色の短い日本語名（例：朱赤、墨、生成り）。',
        '',
        '【フォント】',
        'フォントは必ず次のカタログの family からのみ選びます（存在しない名前を作らない）。',
        '日本語の本文・見出しには subset が jp のフォントを選びます。',
        'bilingual（日英の組み合わせ）の場合は、heading に subset が latin のフォントを、body に subset が jp のフォントを選んでください。',
        'カタログ: ' . json_encode($fontCatalog, JSON_UNESCAPED_UNICODE),
        '',
        '【指示の優先順位】',
        'ユーザーの「自由記入」が他の選択（メインカラー・トンマナ）と矛盾する場合は、自由記入を優先します。',
        '',
        $purpose === 'print'
            ? '【印刷用途】用途が「印刷物」の場合、印刷で再現が難しい高彩度・蛍光色を避け、彩度をやや抑えた配色にします。'
            : '',
        '',
        '【各案に含めるテキスト】',
        'theme … 提案の方向性を表す短い日本語のテーマ名（15文字以内）',
        'reason … なぜこの配色・フォントがその指示に合うかの理由（1〜2文）',
        'fontReason … フォントペア全体の選定理由（1文・タイトルと本文をまとめて）',
    ];
    return implode("\n", array_filter($lines, fn($l) => $l !== ''));
}

// ---- リクエスト処理 ----

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('METHOD_NOT_ALLOWED', 'POSTリクエストのみ受け付けます。', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    json_error('VALIDATION_ERROR', 'リクエストボディが不正です。', 400);
}

// mainColor: null または enum
$mainColor = $input['mainColor'] ?? null;
if ($mainColor !== null) {
    $mainColor = validate_enum($mainColor, array_keys(MAIN_COLOR_LABELS));
}

// tone: 各軸 -1 / 0 / 1 の整数
$toneIn = is_array($input['tone'] ?? null) ? $input['tone'] : [];
$tone = [];
foreach (TONE_AXES as $ax) {
    $v = $toneIn[$ax['key']] ?? 0;
    if (!in_array($v, [-1, 0, 1], true)) {
        json_error('VALIDATION_ERROR', "トンマナ「{$ax['key']}」の値が不正です。", 400);
    }
    $tone[$ax['key']] = $v;
}

$purpose  = validate_enum($input['purpose']  ?? '', ['digital', 'print']);
$fontMode = validate_enum($input['fontMode'] ?? '', ['split', 'single']);
$langMode = validate_enum($input['langMode'] ?? '', ['bilingual', 'jp_only']);
$free     = validate_optional_string($input['free'] ?? '', 500);

// ---- レート制限 ----
$ipKey = 'iroha:' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
rate_limit_check($ipKey, $cfg['rate_limit']['limit'], $cfg['rate_limit']['window']);

// ---- プロンプト組み立て ----
$fontCatalog  = get_font_catalog();
$systemPrompt = build_system_prompt($fontCatalog, $purpose);
$userPrompt   = build_user_prompt($mainColor, $tone, $purpose, $fontMode, $langMode, $free);

$payload = json_encode([
    'system_instruction' => ['parts' => [['text' => $systemPrompt]]],
    'contents'           => [['role' => 'user', 'parts' => [['text' => $userPrompt]]]],
    'generationConfig'   => [
        'responseMimeType' => 'application/json',
        'responseSchema'   => response_schema(),
        'temperature'      => $cfg['temperature'],
        'maxOutputTokens'  => $cfg['max_output_tokens'],
    ],
], JSON_UNESCAPED_UNICODE);

// ---- Gemini 呼び出し（失敗時1回リトライ） ----
$url = 'https://generativelanguage.googleapis.com/v1beta/models/'
     . rawurlencode($cfg['model']) . ':generateContent?key=' . urlencode($cfg['gemini_key']);
$headers = ['Content-Type: application/json'];

try {
    $res = curl_post($url, $payload, $headers);
    if ($res['status'] === 429) {
        sleep(3);
        $res = curl_post($url, $payload, $headers);
    }
    if ($res['status'] !== 200) {
        json_error('UPSTREAM_ERROR', "Gemini APIエラー: HTTP {$res['status']}", 502);
    }
} catch (RuntimeException $e) {
    // ネットワークエラー等は1回だけリトライ
    try {
        $res = curl_post($url, $payload, $headers);
        if ($res['status'] !== 200) {
            json_error('UPSTREAM_ERROR', "Gemini APIエラー: HTTP {$res['status']}", 502);
        }
    } catch (RuntimeException $e2) {
        json_error('UPSTREAM_ERROR', 'AIサービスへの接続に失敗しました。', 502);
    }
}

// ---- レスポンスパース ----
$data = json_decode($res['body'], true);
$text = trim($data['candidates'][0]['content']['parts'][0]['text'] ?? '');
$text = preg_replace('/^```json\s*/i', '', $text);
$text = preg_replace('/```\s*$/i', '', $text);
$parsed = json_decode(trim($text), true);

if (!is_array($parsed) || !isset($parsed['proposals']) || count($parsed['proposals']) !== 2) {
    json_error('GEMINI_PARSE_ERROR', 'AIの返答を読み取れませんでした。もう一度お試しください。', 502);
}

json_ok(['proposals' => $parsed['proposals']]);
