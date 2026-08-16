import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  graphConfigured,
  graphBrandFrom,
  graphSendMail,
  graphSendContactConfirmation,
} from '@/lib/services/graph-mail';

// Rate limiting for contact form submissions
const rateLimit = {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  store: new Map<string, { count: number; resetTime: number }>()
};

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    const now = Date.now();
    const clientData = rateLimit.store.get(ip);

    if (clientData) {
      if (now > clientData.resetTime) {
        rateLimit.store.set(ip, {
          count: 1,
          resetTime: now + rateLimit.windowMs
        });
      } else if (clientData.count >= rateLimit.maxRequests) {
        const minutesUntilReset = Math.ceil((clientData.resetTime - now) / (60 * 1000));
        console.warn('⚠️ Rate limit exceeded for IP:', ip);
        return NextResponse.json(
          {
            success: false,
            error: `Too many requests. Please wait ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''} before submitting again. Maximum ${rateLimit.maxRequests} requests per hour.`
          },
          { status: 429 }
        );
      } else {
        clientData.count += 1;
      }
    } else {
      rateLimit.store.set(ip, {
        count: 1,
        resetTime: now + rateLimit.windowMs
      });
    }

    const formData = await request.formData();

    const contactData = {
      name: (formData.get('name') as string)?.trim() || '',
      email: (formData.get('email') as string)?.trim() || '',
      subject: (formData.get('subject') as string)?.trim() || '',
      message: (formData.get('message') as string)?.trim() || '',
      category: (formData.get('category') as string)?.trim() || '',
      company: (formData.get('company') as string)?.trim() || '',
      phone: (formData.get('phone') as string)?.trim() || '',
      timeline: (formData.get('timeline') as string)?.trim() || '',
      budget: (formData.get('budget') as string)?.trim() || '',
      newsletter: formData.get('newsletter') === 'true',
      terms: formData.get('terms') === 'true',
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') || '',
    };

    if (!contactData.name || !contactData.email || !contactData.subject || !contactData.message) {
      const missingFields = [];
      if (!contactData.name) missingFields.push('name');
      if (!contactData.email) missingFields.push('email');
      if (!contactData.subject) missingFields.push('subject');
      if (!contactData.message) missingFields.push('message');
      return NextResponse.json(
        {
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}. Please fill in all required fields.`
        },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactData.email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address format.' },
        { status: 400 }
      );
    }

    const validCategories = ['general', 'project', 'collaboration'];
    if (contactData.category && !validCategories.includes(contactData.category)) {
      return NextResponse.json(
        { success: false, error: `Invalid category: ${contactData.category}. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }
    if (!contactData.category) {
      contactData.category = 'general';
    }

    const attachmentFiles: string[] = [];
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'contact');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }

    const attachmentKeys = Array.from(formData.keys()).filter(key => key.startsWith('attachment_'));
    for (const key of attachmentKeys) {
      const file = formData.get(key) as File;
      if (file && file.size > 0) {
        try {
          const fileName = `${uuidv4()}_${file.name}`;
          const filePath = path.join(uploadDir, fileName);
          const arrayBuffer = await file.arrayBuffer();
          await writeFile(filePath, Buffer.from(arrayBuffer));
          attachmentFiles.push(fileName);
        } catch (error) {
          console.error('Error saving attachment:', error);
        }
      }
    }

    if (!graphConfigured()) {
      console.error('Graph mail not configured');
      return NextResponse.json(
        { success: false, error: 'Email service not configured. Please try again later or email hello@willworkforlunch.com.' },
        { status: 500 }
      );
    }

    const brandFrom = graphBrandFrom();
    const staffBody = [
      'New contact form submission from willworkforlunch.com',
      '',
      `Name: ${contactData.name}`,
      `Email: ${contactData.email}`,
      `Category: ${contactData.category}`,
      `Subject: ${contactData.subject}`,
      contactData.company ? `Company: ${contactData.company}` : '',
      contactData.phone ? `Phone: ${contactData.phone}` : '',
      contactData.timeline ? `Timeline: ${contactData.timeline}` : '',
      contactData.budget ? `Budget: ${contactData.budget}` : '',
      attachmentFiles.length ? `Attachments: ${attachmentFiles.join(', ')}` : '',
      '',
      'Message:',
      contactData.message,
      '',
    ].filter(Boolean).join('\n');

    const staffOk = await graphSendMail({
      to: brandFrom,
      from: brandFrom,
      replyTo: contactData.email,
      subject: `[${contactData.category}] ${contactData.subject}`,
      body: staffBody,
    });

    if (!staffOk) {
      return NextResponse.json(
        { success: false, error: 'Mail delivery failed. Please email hello@willworkforlunch.com.' },
        { status: 500 }
      );
    }

    try {
      await graphSendContactConfirmation(contactData.email, contactData.name, 'willworkforlunch');
    } catch (error) {
      console.error('Error sending confirmation:', error);
    }

    if (contactData.newsletter) {
      try {
        const newsletterResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/newsletter/subscribers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: contactData.email,
            name: contactData.name,
            phone: contactData.phone || null,
            company: contactData.company || null,
            source: 'contact_form',
            metadata: {
              contactCategory: contactData.category,
              contactSubject: contactData.subject,
              submittedAt: new Date().toISOString(),
              ipAddress: ip,
              userAgent: contactData.userAgent
            }
          })
        });
        const newsletterResult = await newsletterResponse.json();
        if (!newsletterResult.success) {
          console.error('Newsletter subscription failed:', newsletterResult.error);
        }
      } catch (error) {
        console.error('Error subscribing to newsletter:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully!' + (contactData.newsletter ? ' You have also been subscribed to our newsletter.' : '')
    });

  } catch (error) {
    console.error('❌ Contact form error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage || 'An error occurred while processing your request. Please try again later.'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://willworkforlunch.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
