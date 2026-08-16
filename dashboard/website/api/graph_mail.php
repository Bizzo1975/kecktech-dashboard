<?php
/**
 * Send mail via Microsoft Graph (application permissions).
 * Env: GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, GRAPH_MAILBOX
 */
function graph_get_token(): string {
    $tenant = getenv('GRAPH_TENANT_ID') ?: '';
    $client = getenv('GRAPH_CLIENT_ID') ?: '';
    $secret = getenv('GRAPH_CLIENT_SECRET') ?: '';
    if ($tenant === '' || $client === '' || $secret === '') {
        throw new RuntimeException('GRAPH_TENANT_ID, GRAPH_CLIENT_ID, and GRAPH_CLIENT_SECRET are required');
    }

    $url = "https://login.microsoftonline.com/{$tenant}/oauth2/v2.0/token";
    $body = http_build_query([
        'client_id'     => $client,
        'client_secret' => $secret,
        'scope'         => 'https://graph.microsoft.com/.default',
        'grant_type'    => 'client_credentials',
    ]);

    $ctx = stream_context_create([
        'http' => [
            'method'        => 'POST',
            'header'        => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content'       => $body,
            'timeout'       => 20,
            'ignore_errors' => true,
        ],
    ]);
    $raw = file_get_contents($url, false, $ctx);
    if ($raw === false) {
        throw new RuntimeException('Failed to obtain Graph token');
    }
    $json = json_decode($raw, true);
    if (empty($json['access_token'])) {
        $err = $json['error_description'] ?? $json['error'] ?? $raw;
        throw new RuntimeException('Graph token error: ' . $err);
    }
    return $json['access_token'];
}

/**
 * @param string $to Recipient address
 * @param string $subject Subject
 * @param string $bodyText Plain text body
 * @param string|null $replyTo Optional Reply-To address
 * @param string|null $fromAddress Visible From (alias); send path always uses GRAPH_MAILBOX shared mailbox
 * @return bool
 */
function graph_send_mail(
    string $to,
    string $subject,
    string $bodyText,
    ?string $replyTo = null,
    ?string $fromAddress = null
): bool {
    $mailbox = getenv('GRAPH_MAILBOX') ?: (getenv('SMTP_FROM') ?: 'support@kecktech.net');
    $from = $fromAddress ?: $mailbox;
    $token = graph_get_token();

    $message = [
        'message' => [
            'subject' => $subject,
            'body' => [
                'contentType' => 'Text',
                'content'     => $bodyText,
            ],
            'from' => [
                'emailAddress' => ['address' => $from],
            ],
            'toRecipients' => [
                ['emailAddress' => ['address' => $to]],
            ],
        ],
        'saveToSentItems' => true,
    ];
    if ($replyTo) {
        $message['message']['replyTo'] = [
            ['emailAddress' => ['address' => $replyTo]],
        ];
    }

    $url = 'https://graph.microsoft.com/v1.0/users/' . rawurlencode($mailbox) . '/sendMail';
    $payload = json_encode($message);
    $ctx = stream_context_create([
        'http' => [
            'method'        => 'POST',
            'header'        => "Authorization: Bearer {$token}\r\nContent-Type: application/json\r\n",
            'content'       => $payload,
            'timeout'       => 30,
            'ignore_errors' => true,
        ],
    ]);
    $raw = file_get_contents($url, false, $ctx);
    $status = 0;
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
        $status = (int)$m[1];
    }
    // Graph sendMail returns 202 Accepted with empty body on success
    return $status >= 200 && $status < 300;
}

/**
 * Confirmation email to the person who submitted a contact form.
 * From: brand mailbox alias (must be a proxy on the shared mailbox).
 */
function graph_send_contact_confirmation(
    string $toSubmitter,
    string $submitterName,
    string $fromMailbox,
    string $brandName
): bool {
    $name = trim($submitterName) !== '' ? trim($submitterName) : 'there';
    $subject = "We received your message — {$brandName}";
    $body  = "Hi {$name},\n\n";
    $body .= "Thanks for contacting {$brandName}. We received your message and will get back to you soon";
    $body .= " (typically within 2 business hours on weekdays).\n\n";
    $body .= "If you need to add anything, reply to this email.\n\n";
    $body .= "— {$brandName}\n";
    return graph_send_mail($toSubmitter, $subject, $body, null, $fromMailbox);
}
