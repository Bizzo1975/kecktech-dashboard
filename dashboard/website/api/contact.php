<?php
// Kecktech contact form mailer
// Receives POST from /api/contact.php, validates, and sends via Microsoft Graph

header('Content-Type: application/json');

require_once __DIR__ . '/graph_mail.php';

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// CORS — only allow kecktech.net origin
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (str_contains($origin, 'kecktech.net') || $origin === '') {
    header('Access-Control-Allow-Origin: ' . ($origin ?: '*'));
}

// --- Anti-spam layer added 2026-08-21, hardened 2026-08-22 (fail-closed honeypot/timing + subnet rate limit) ---

// Resolve the real visitor IP. This container sits behind Cloudflare -> Traefik,
// so $_SERVER['REMOTE_ADDR'] is Traefik's internal docker IP for every visitor —
// using it directly would rate-limit all traffic as a single shared bucket.
// Prefer Cloudflare's own header (hardest to spoof since Cloudflare sets it at
// their edge), then the nearest X-Forwarded-For hop, then fall back to REMOTE_ADDR.
function get_client_ip(): string {
    $cf = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? '';
    if ($cf !== '' && filter_var($cf, FILTER_VALIDATE_IP)) return $cf;

    $xff = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($xff !== '') {
        $parts = array_map('trim', explode(',', $xff));
        $last = end($parts);
        if ($last && filter_var($last, FILTER_VALIDATE_IP)) return $last;
    }

    $xri = $_SERVER['HTTP_X_REAL_IP'] ?? '';
    if ($xri !== '' && filter_var($xri, FILTER_VALIDATE_IP)) return $xri;

    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}
$client_ip = get_client_ip();

// Derive the /24 subnet for IPv4 (spam observed 2026-08-22 rotates IPs within a
// single /24 block to dodge per-IP rate limiting). IPv6 falls back to the full
// address (no subnet grouping) since it isn't the observed attack vector.
function get_client_subnet(string $ip): string {
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        $parts = explode('.', $ip);
        if (count($parts) === 4) {
            return "{$parts[0]}.{$parts[1]}.{$parts[2]}.0/24";
        }
    }
    return $ip;
}
$client_subnet = get_client_subnet($client_ip);

// 1) Honeypot + timing — the live frontend (ContactForm.astro, rebuilt 2026-08-22)
//    always submits both "website" (hidden, must stay empty) and "form_rendered_at"
//    (ms epoch set on page load). A request missing either field is not a real
//    submission from this form — likely a script POSTing directly to this endpoint,
//    bypassing the page entirely. Fail closed: fake success, no mail sent.
if (!array_key_exists('website', $_POST) || !array_key_exists('form_rendered_at', $_POST)) {
    error_log('[contact][blocked:missing-fields] ip=' . $client_ip);
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Message sent successfully']);
    exit;
}

if (!empty($_POST['website'])) {
    error_log('[contact][blocked:honeypot] ip=' . $client_ip);
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Message sent successfully']);
    exit;
}

if (!is_numeric($_POST['form_rendered_at'])) {
    error_log('[contact][blocked:timing-invalid] ip=' . $client_ip);
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Message sent successfully']);
    exit;
}
$elapsed_ms = (int)(microtime(true) * 1000) - (int)$_POST['form_rendered_at'];
if ($elapsed_ms < 0 || $elapsed_ms < 3000) {
    error_log('[contact][blocked:timing] ip=' . $client_ip . " elapsed_ms={$elapsed_ms}");
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Message sent successfully']);
    exit;
}

// 2) Cloudflare Turnstile — only enforced once TURNSTILE_SECRET_KEY is set in the
//    container env. Inert (no-op) until that key exists, so this is safe to ship now
//    and will start protecting automatically the moment the key is added + restarted.
$turnstile_secret = getenv('TURNSTILE_SECRET_KEY') ?: '';
if ($turnstile_secret !== '') {
    $ts_token = $_POST['cf-turnstile-response'] ?? '';
    $ts_ok = false;
    if ($ts_token !== '') {
        $ts_ctx = stream_context_create([
            'http' => [
                'method'  => 'POST',
                'header'  => "Content-Type: application/x-www-form-urlencoded\r\n",
                'content' => http_build_query([
                    'secret'   => $turnstile_secret,
                    'response' => $ts_token,
                    'remoteip' => $client_ip,
                ]),
                'timeout' => 10,
                'ignore_errors' => true,
            ],
        ]);
        $ts_raw = @file_get_contents('https://challenges.cloudflare.com/turnstile/v0/siteverify', false, $ts_ctx);
        $ts_json = $ts_raw ? json_decode($ts_raw, true) : null;
        $ts_ok = !empty($ts_json['success']);
    }
    if (!$ts_ok) {
        error_log('[contact][blocked:turnstile] ip=' . $client_ip);
        http_response_code(400);
        echo json_encode(['error' => 'Verification failed — please try again']);
        exit;
    }
}

// 3) Rate limiting — sliding window per real visitor IP: max 1 per 20s,
//    max 8/hour, max 20/day. Plus a coarser per-/24-subnet cap (max 15/hour,
//    max 40/day) to catch bots that rotate IPs within one block to dodge the
//    per-IP limit — added 2026-08-22 after observing exactly that pattern.
function rate_check(string $key_id, int $per_hour_max, int $per_day_max): bool {
    $rate_file = sys_get_temp_dir() . '/kecktech_contact_' . md5($key_id) . '.json';
    $now = time();
    $hits = [];
    if (file_exists($rate_file)) {
        $raw = @file_get_contents($rate_file);
        $decoded = $raw ? json_decode($raw, true) : [];
        if (is_array($decoded)) $hits = $decoded;
    }
    $hits = array_values(array_filter($hits, fn($t) => ($now - $t) < 86400));

    $last = end($hits);
    $in_last_hour = count(array_filter($hits, fn($t) => ($now - $t) < 3600));
    $too_soon = $last !== false && ($now - $last) < 20;

    if ($too_soon || $in_last_hour >= $per_hour_max || count($hits) >= $per_day_max) {
        return false;
    }

    $hits[] = $now;
    @file_put_contents($rate_file, json_encode($hits));
    return true;
}

if (!rate_check($client_ip, 8, 20)) {
    error_log("[contact][blocked:ratelimit-ip] ip={$client_ip}");
    http_response_code(429);
    echo json_encode(['error' => 'Too many requests — please wait a moment']);
    exit;
}

if (!rate_check($client_subnet, 15, 40)) {
    error_log("[contact][blocked:ratelimit-subnet] ip={$client_ip} subnet={$client_subnet}");
    http_response_code(429);
    echo json_encode(['error' => 'Too many requests — please wait a moment']);
    exit;
}

// --- end anti-spam layer ---

// Sanitize inputs
function clean(string $v): string {
    return htmlspecialchars(strip_tags(trim($v)), ENT_QUOTES, 'UTF-8');
}

$name         = clean($_POST['name']         ?? '');
$email        = filter_var(trim($_POST['email'] ?? ''), FILTER_SANITIZE_EMAIL);
$business     = clean($_POST['business']     ?? '');
$phone        = clean($_POST['phone']        ?? '');
$service      = clean($_POST['service']      ?? '');
$message      = clean($_POST['message']      ?? '');
$request_type = clean($_POST['request_type'] ?? 'general');

// Validate required fields
if (empty($name) || empty($email) || empty($message)) {
    http_response_code(400);
    echo json_encode(['error' => 'Name, email, and message are required']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email address']);
    exit;
}

// Build email
$to = getenv('CONTACT_TO') ?: 'support@kecktech.net';
$type_labels = [
    'new-service'      => 'New Service',
    'tech-support'     => 'Tech Support',
    'customer-support' => 'Customer Support',
    'sales'            => 'Sales Inquiry',
    'general'          => 'General Question',
];
$type_label = $type_labels[$request_type] ?? ucwords(str_replace('-', ' ', $request_type));
$subject = "[{$type_label}] {$name}" . ($business ? " ({$business})" : '');

$body  = "New contact form submission from kecktech.net\n";
$body .= "==============================================\n\n";
$body .= "Name:     {$name}\n";
if ($business) $body .= "Business: {$business}\n";
$body .= "Email:    {$email}\n";
$body .= "Request:  {$type_label}\n";
if ($phone) $body .= "Phone:    {$phone}\n";
if ($service) $body .= "Service:  {$service}\n";
$body .= "\nMessage:\n{$message}\n\n";
$body .= "---\nSent from kecktech.net contact form\n";
$body .= "IP: {$client_ip}\n";

$mail_ok = false;
$mail_error = null;
$from_mailbox = getenv('GRAPH_MAILBOX') ?: 'support@kecktech.net';
try {
    $mail_ok = graph_send_mail($to, $subject, $body, $email, $from_mailbox);
} catch (Throwable $e) {
    $mail_error = $e->getMessage();
    error_log('[contact] Graph send failed: ' . $mail_error);
}

if ($mail_ok) {
    try {
        graph_send_contact_confirmation(
            $email,
            $name,
            $from_mailbox,
            'Kecktech IT Solutions'
        );
    } catch (Throwable $e) {
        error_log('[contact] Graph confirmation failed: ' . $e->getMessage());
    }
}

// Fire-and-forget to n8n webhook for Zammad ticket creation
// Non-blocking: failures here do not affect the user response
$n8n_url = getenv('N8N_CONTACT_WEBHOOK') ?: 'https://n8n.kecktech.net/webhook/contact-form';
$n8n_payload = json_encode([
    'name'         => $name,
    'email'        => $email,
    'phone'        => $phone,
    'business'     => $business,
    'service'      => $service,
    'request_type' => $request_type,
    'message'      => $message,
]);
$n8n_ctx = stream_context_create([
    'http' => [
        'method'        => 'POST',
        'header'        => "Content-Type: application/json\r\n",
        'content'       => $n8n_payload,
        'timeout'       => 3,
        'ignore_errors' => true,
    ],
]);
@file_get_contents($n8n_url, false, $n8n_ctx);

if ($mail_ok) {
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Message sent successfully']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Mail delivery failed — please email support@kecktech.net']);
}
