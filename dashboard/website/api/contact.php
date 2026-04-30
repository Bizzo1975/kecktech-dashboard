<?php
// Kecktech contact form mailer
// Receives POST from /api/contact.php, validates, and sends email

header('Content-Type: application/json');

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

// Rate limiting — basic: check a tmp file
$rate_file = sys_get_temp_dir() . '/kecktech_contact_' . md5($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$now = time();
if (file_exists($rate_file)) {
    $last = (int)file_get_contents($rate_file);
    if ($now - $last < 60) {
        http_response_code(429);
        echo json_encode(['error' => 'Too many requests — please wait a moment']);
        exit;
    }
}
file_put_contents($rate_file, $now);

// Build email
$to      = 'support@kecktech.net';
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
$body .= "IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . "\n";

$headers  = "From: support@kecktech.net\r\n";
$headers .= "Reply-To: {$email}\r\n";
$headers .= "X-Mailer: Kecktech-ContactForm/1.0\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

$mail_ok = mail($to, $subject, $body, $headers);

// Fire-and-forget to n8n webhook for Zammad ticket creation
// Non-blocking: failures here do not affect the user response
$n8n_url = 'https://n8n.kecktech.net/webhook/contact-form';
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
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Mail delivery failed — please call or email directly']);
}
