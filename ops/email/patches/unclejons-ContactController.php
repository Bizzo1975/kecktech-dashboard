<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ContactController extends Controller
{
    public function show()
    {
        return view('contact');
    }

    private function graphSend(string $token, string $sendAsMailbox, string $from, string $to, string $subject, string $body, ?string $replyTo = null): bool
    {
        $opts = ['curl' => [CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4], 'timeout' => 25];
        $message = [
            'subject' => $subject,
            'body' => [
                'contentType' => 'Text',
                'content' => $body,
            ],
            'from' => ['emailAddress' => ['address' => $from]],
            'toRecipients' => [['emailAddress' => ['address' => $to]]],
        ];
        if ($replyTo) {
            $message['replyTo'] = [['emailAddress' => ['address' => $replyTo]]];
        }

        $send = Http::withOptions($opts)
            ->withToken($token)
            ->acceptJson()
            ->asJson()
            ->post('https://graph.microsoft.com/v1.0/users/'.rawurlencode($sendAsMailbox).'/sendMail', [
                'message' => $message,
                'saveToSentItems' => true,
            ]);

        if (!$send->successful()) {
            Log::error('Unclejons Graph send failed', ['status' => $send->status(), 'body' => $send->body()]);
            return false;
        }
        return true;
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:190',
            'message' => 'required|string|max:5000',
        ]);

        $tenant = env('GRAPH_TENANT_ID');
        $client = env('GRAPH_CLIENT_ID');
        $secret = env('GRAPH_CLIENT_SECRET');
        $sendAsMailbox = env('GRAPH_MAILBOX', 'support@kecktech.net');
        $brandFrom = env('GRAPH_MAILBOX_UNCLEJONS', 'support@unclejonsitgarage.com');
        $brandName = "Uncle Jon's IT Garage";

        if (!$tenant || !$client || !$secret) {
            return back()->with('error', 'Mail is not configured. Email support@unclejonsitgarage.com.');
        }

        $opts = ['curl' => [CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4], 'timeout' => 25];

        $tokenRes = Http::withOptions($opts)->asForm()->post("https://login.microsoftonline.com/{$tenant}/oauth2/v2.0/token", [
            'client_id' => $client,
            'client_secret' => $secret,
            'scope' => 'https://graph.microsoft.com/.default',
            'grant_type' => 'client_credentials',
        ]);
        if (!$tokenRes->ok() || empty($tokenRes['access_token'])) {
            Log::error('Unclejons Graph token failed', ['body' => $tokenRes->body()]);
            return back()->with('error', 'Could not send message. Email support@unclejonsitgarage.com.');
        }

        $token = $tokenRes['access_token'];
        $ok = $this->graphSend(
            $token,
            $sendAsMailbox,
            $brandFrom,
            $brandFrom,
            '[Contact] '.$data['name'],
            "New contact form from unclejonsitgarage.com\n\nName: {$data['name']}\nEmail: {$data['email']}\n\nMessage:\n{$data['message']}\n",
            $data['email']
        );

        if (!$ok) {
            return back()->with('error', 'Could not send message. Email support@unclejonsitgarage.com.');
        }

        $who = trim($data['name']) !== '' ? trim($data['name']) : 'there';
        try {
            $this->graphSend(
                $token,
                $sendAsMailbox,
                $brandFrom,
                $data['email'],
                "We received your message — {$brandName}",
                "Hi {$who},\n\n".
                "Thanks for contacting {$brandName}. We received your message and will get back to you soon ".
                "(typically within 2 business hours on weekdays).\n\n".
                "If you need to add anything, reply to this email.\n\n".
                "— {$brandName}\n"
            );
        } catch (\Throwable $e) {
            Log::error('Unclejons confirmation failed', ['err' => $e->getMessage()]);
        }

        return back()->with('success', 'Message sent. We will get back to you soon.');
    }
}
