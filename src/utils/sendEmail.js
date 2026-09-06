import nodemailer from "nodemailer";

/**
 * Reusable SMTP Transporter Singleton with Connection Pooling.
 * Hostinger SMTP specifications:
 * - Host: smtp.hostinger.com
 * - Port: 465 (SSL, secure: true) or 587 (TLS/STARTTLS, secure: false)
 * - Username: full email address (e.g., support@yourdomain.com)
 */
let transporter = null;

export const getTransporter = () => {
  if (transporter) return transporter;

  const port = Number(process.env.EMAIL_PORT) || 465;
  const isSecure =
    process.env.EMAIL_SECURE !== undefined
      ? process.env.EMAIL_SECURE === "true" || process.env.EMAIL_SECURE === true
      : port === 465;

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.hostinger.com",
    port: port,
    secure: isSecure, // true for 465, false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Connection pooling for high performance & reusable sockets
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5, // max 5 messages per second to respect provider limits
    tls: {
      // Ensure strict SSL/TLS handshake
      rejectUnauthorized: true,
    },
  });

  return transporter;
};

/**
 * Verify SMTP connection with Hostinger servers.
 */
export const verifyEmailConnection = async () => {
  try {
    const client = getTransporter();
    await client.verify();
    console.log("✅ [Hostinger SMTP] Email server connection established and verified successfully.");
    return { success: true };
  } catch (error) {
    console.error("❌ [Hostinger SMTP] Connection verification failed:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Strips HTML tags for a clean plain-text fallback.
 * Plain-text versions significantly improve email deliverability and avoid spam filters.
 */
const stripHtmlToPlainText = (html = "") => {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Send an email using Hostinger SMTP.
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email address(es)
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML content
 * @param {string} [options.text] - Optional plain text alternative
 * @param {string} [options.from] - Custom from header (defaults to EMAIL_FROM or EMAIL_USER)
 * @param {string} [options.replyTo] - Optional reply-to address
 * @param {Array} [options.attachments] - Optional attachments
 */
export const sendEmail = async ({
  to,
  subject,
  html,
  text,
  from,
  replyTo,
  attachments,
  cc,
  bcc,
}) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn("⚠️ [Email] EMAIL_USER or EMAIL_PASS not configured. Skipping email dispatch.");
      return { success: false, error: "SMTP credentials not configured" };
    }

    const client = getTransporter();

    // Professional From header: "Brand Name" <support@domain.com>
    const defaultFromName = process.env.EMAIL_FROM_NAME || "Cloudvyn";
    const senderEmail = process.env.EMAIL_USER;
    const defaultFrom = process.env.EMAIL_FROM || `"${defaultFromName}" <${senderEmail}>`;

    const mailOptions = {
      from: from || defaultFrom,
      to,
      subject,
      html,
      text: text || stripHtmlToPlainText(html),
      replyTo: replyTo || defaultFrom,
      attachments,
      cc,
      bcc,
    };

    const info = await client.sendMail(mailOptions);
    console.log(`📧 [Email Sent] ID: ${info.messageId} | To: ${Array.isArray(to) ? to.join(", ") : to} | Subject: "${subject}"`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ [Email Error] Failed to send email to ${to}:`, error);
    throw error;
  }
};

/**
 * Build a modern, bulletproof, responsive transactional email template for Cloudvyn.
 * Adheres to enterprise email standards (Outlook VML, Apple Mail, Gmail, Yahoo)
 * with Cloudvyn's warm-minimalist aesthetic (#FAF9F6, #4F46E5, #0F172A).
 *
 * @param {Object} options
 * @param {string} [options.preheader="Update from Cloudvyn"] - Inbox preview snippet
 * @param {string} [options.greeting="Hello"] - Eyebrow badge or greeting text
 * @param {string} [options.badge] - Optional custom pill badge text
 * @param {string} options.heading - Primary headline
 * @param {string} options.message - Body content (HTML or plain text)
 * @param {string} [options.ctaText] - Primary button label
 * @param {string} [options.ctaLink] - Primary button URL
 * @param {string} [options.secondaryCtaText] - Optional secondary action link text
 * @param {string} [options.secondaryCtaLink] - Optional secondary action link URL
 * @param {string} [options.quickTip] - Optional callout tip at bottom of card
 * @param {string} [options.footerNote] - Optional custom footer message
 * @param {string} [options.brandName="Cloudvyn"] - Brand display name
 * @param {string} [options.brandUrl="https://cloudvyn.com"] - Brand homepage URL
 * @param {string} [options.supportEmail="support@cloudvyn.com"] - Contact email
 */
export const buildCloudvynEmail = ({
  preheader = "Update from Cloudvyn",
  greeting = "Hello",
  badge,
  heading,
  message,
  ctaText,
  ctaLink,
  secondaryCtaText,
  secondaryCtaLink,
  quickTip,
  footerNote,
  brandName = "Cloudvyn",
  brandUrl = process.env.FRONTEND_URL || "https://cloudvyn.com",
  supportEmail = process.env.EMAIL_USER || "support@cloudvyn.com",
}) => {
  const badgeText = badge || greeting;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${heading || brandName}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #FAF9F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Helvetica, Arial, sans-serif; }
    
    /* Interactive & Hover Effects */
    .cta-button {
      transition: all 0.2s ease-in-out;
    }
    .cta-button:hover {
      background-color: #4338CA !important;
      box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4) !important;
    }
    .footer-link:hover {
      color: #4F46E5 !important;
      text-decoration: underline !important;
    }

    /* Message content typography */
    .email-body-content p {
      margin: 0 0 16px 0;
      font-size: 15px;
      line-height: 25px;
      color: #334155;
    }
    .email-body-content p:last-child {
      margin-bottom: 0;
    }
    .email-body-content strong {
      color: #0F172A;
      font-weight: 600;
    }
    .email-body-content a {
      color: #4F46E5;
      text-decoration: underline;
      font-weight: 500;
    }
    .email-body-content blockquote {
      margin: 16px 0;
      padding: 14px 18px;
      background-color: #F8FAFC;
      border-left: 3px solid #4F46E5;
      border-radius: 0 8px 8px 0;
      color: #334155;
      font-style: italic;
      font-size: 14px;
      line-height: 22px;
    }

    /* Mobile Responsive Styles */
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        width: 100% !important;
        padding-left: 12px !important;
        padding-right: 12px !important;
      }
      .email-card {
        border-radius: 12px !important;
      }
      .content-padding {
        padding: 32px 20px 28px 20px !important;
      }
      .header-padding {
        padding-top: 28px !important;
        padding-bottom: 20px !important;
      }
      .hero-title {
        font-size: 24px !important;
        line-height: 32px !important;
      }
      .button-cell {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }
      .cta-link-btn {
        width: 100% !important;
        padding: 14px 20px !important;
        box-sizing: border-box !important;
        text-align: center !important;
      }
      .footer-padding {
        padding: 28px 16px 36px 16px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #FAF9F6; -webkit-font-smoothing: antialiased;">

  <!-- HIDDEN PREHEADER WITH ANTI-BLEED SNIPPET -->
  <div style="display:none;font-size:1px;color:#FAF9F6;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
    ${preheader}
  </div>
  <div style="display:none;font-size:1px;color:#FAF9F6;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <!-- EMAIL OUTER WRAPPER -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FAF9F6; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 0 16px;">

        <!-- 580px CONTAINER -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 580px; margin: 0 auto;" class="email-wrapper">
          
          <!-- BRAND HEADER -->
          <tr>
            <td align="center" class="header-padding" style="padding-top: 40px; padding-bottom: 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="vertical-align: middle;">
                    <a href="${brandUrl}" target="_blank" style="text-decoration: none; display: inline-flex; align-items: center; justify-content: center;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <!-- Brand Icon Mark -->
                          <td style="background-color: #4F46E5; width: 34px; height: 34px; border-radius: 9px; text-align: center; vertical-align: middle; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);">
                            <!--[if mso]>
                            <span style="font-family: sans-serif; font-size: 16px; font-weight: bold; color: #FFFFFF; line-height: 34px;">C</span>
                            <![endif]-->
                            <!--[if !mso]><!-->
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: 0 auto;">
                              <path d="M2 12h3l3-7 4 14 3-7h3l2 4h4" />
                            </svg>
                            <!--<![endif]-->
                          </td>
                          <!-- Brand Wordmark -->
                          <td style="padding-left: 10px; vertical-align: middle;">
                            <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Helvetica, Arial, sans-serif; font-size: 21px; font-weight: 700; color: #0F172A; letter-spacing: -0.03em; line-height: 1;">${brandName}</span>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN CARD -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-card" style="background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.04), 0 2px 6px -1px rgba(15, 23, 42, 0.02);">
                
                <!-- TOP BRAND GRADIENT ACCENT STRIP -->
                <tr>
                  <td height="4" style="height: 4px; background: #4F46E5; background: linear-gradient(90deg, #4F46E5 0%, #6366F1 50%, #818CF8 100%); font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>

                <!-- CARD MAIN CONTENT AREA -->
                <tr>
                  <td class="content-padding" style="padding: 44px 44px 32px 44px;">
                    
                    ${badgeText ? `
                    <!-- EYEBROW / GREETING PILL BADGE -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 16px auto;">
                      <tr>
                        <td style="background-color: #EEF2FF; border: 1px solid #E0E7FF; border-radius: 9999px; padding: 5px 14px; text-align: center;">
                          <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 700; color: #4F46E5; letter-spacing: 0.6px; text-transform: uppercase; display: inline-block;">
                            ${badgeText}
                          </span>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    <!-- HERO HEADLINE -->
                    <h1 class="hero-title" style="margin: 0 0 18px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Helvetica, Arial, sans-serif; font-size: 28px; line-height: 36px; font-weight: 700; color: #0F172A; letter-spacing: -0.03em; text-align: center;">
                      ${heading}
                    </h1>

                    <!-- BODY COPY / MESSAGE -->
                    <div class="email-body-content" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Helvetica, Arial, sans-serif; font-size: 15px; line-height: 25px; color: #475569; text-align: left;">
                      ${message}
                    </div>

                  </td>
                </tr>

                <!-- CALL TO ACTION BUTTON (IF LINK PROVIDED) -->
                ${ctaLink ? `
                <tr>
                  <td class="button-cell" style="padding: 0 44px 36px 44px;" align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="border-radius: 10px; background-color: #4F46E5; box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.35);">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${ctaLink}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="20%" stroke="f" fillcolor="#4F46E5">
                            <w:anchorlock/>
                            <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">${ctaText || 'Continue'}</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${ctaLink}" target="_blank" class="cta-button cta-link-btn" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: -0.01em;">
                            ${ctaText || 'Continue'} &rarr;
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>

                    ${secondaryCtaLink ? `
                    <div style="margin-top: 14px; text-align: center;">
                      <a href="${secondaryCtaLink}" target="_blank" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 600; color: #64748B; text-decoration: underline;">
                        ${secondaryCtaText || 'Alternative Action'}
                      </a>
                    </div>
                    ` : ''}

                    <!-- Accessibility / Plain text link fallback -->
                    <div style="margin-top: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Helvetica, Arial, sans-serif; font-size: 12px; color: #94A3B8; text-align: center; line-height: 18px;">
                      Button not displaying properly? 
                      <a href="${ctaLink}" target="_blank" style="color: #4F46E5; text-decoration: underline; word-break: break-all;">Click here to open in browser</a>
                    </div>
                  </td>
                </tr>
                ` : `
                <tr><td style="padding-bottom: 20px;"></td></tr>
                `}

                ${quickTip ? `
                <!-- CARD DIVIDER & CALLOUT TIP -->
                <tr>
                  <td style="padding: 0 44px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr><td style="border-top: 1px solid #F1F5F9; font-size: 0; line-height: 0;">&nbsp;</td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 18px 44px 22px 44px;" align="center">
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Helvetica, Arial, sans-serif; font-size: 13px; color: #64748B; line-height: 20px;">
                      ⚡ <strong>Quick Tip:</strong> ${quickTip}
                    </span>
                  </td>
                </tr>
                ` : ''}

              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td class="footer-padding" style="padding: 32px 24px 48px 24px;" align="center">
              
              <!-- Brand Tagline -->
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 8px;">
                ${brandName} — AI-Powered Interview Preparation
              </div>

              <!-- Quick Links -->
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Helvetica, Arial, sans-serif; font-size: 12px; color: #64748B; margin-bottom: 16px; line-height: 20px;">
                <a href="${brandUrl}/interview" target="_blank" class="footer-link" style="color: #4F46E5; text-decoration: none; font-weight: 500;">Practice Interviews</a>
                &nbsp;&bull;&nbsp;
                <a href="${brandUrl}/pricing" target="_blank" class="footer-link" style="color: #4F46E5; text-decoration: none; font-weight: 500;">Plans</a>
                &nbsp;&bull;&nbsp;
                <a href="${brandUrl}/contact" target="_blank" class="footer-link" style="color: #4F46E5; text-decoration: none; font-weight: 500;">Help & Support</a>
                &nbsp;&bull;&nbsp;
                <a href="${brandUrl}" target="_blank" class="footer-link" style="color: #4F46E5; text-decoration: none; font-weight: 500;">cloudvyn.com</a>
              </div>

              <!-- Legal / Security Notice -->
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Helvetica, Arial, sans-serif; font-size: 11px; line-height: 18px; color: #94A3B8; max-width: 440px; margin: 0 auto;">
                ${footerNote || `You received this email because you created an account or initiated a request on <a href="${brandUrl}" target="_blank" style="color: #64748B; text-decoration: underline;">cloudvyn.com</a>.`}
                <br/>
                &copy; ${new Date().getFullYear()} ${brandName} Technologies. All rights reserved.
              </div>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`;
};

/**
 * Pre-built template for Contact Us / Support inquiries.
 */
export const contactEmailTemplate = ({ name, email, message, subject }) => buildCloudvynEmail({
  preheader: `New Support Request from ${name}`,
  badge: "Support Query",
  greeting: `Query from ${name}`,
  heading: "New Contact Request",
  message: `
    <p style="margin-bottom: 16px;">We have received a new message from the contact form.</p>
    ${email || subject ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; margin: 16px 0; font-size: 14px;">
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #EDF2F7; font-weight: 600; color: #64748B; width: 80px;">From</td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #EDF2F7; color: #0F172A;">${name} (${email || 'No email provided'})</td>
      </tr>
      ${subject ? `
      <tr>
        <td style="padding: 10px 14px; font-weight: 600; color: #64748B;">Subject</td>
        <td style="padding: 10px 14px; color: #0F172A;">${subject}</td>
      </tr>
      ` : ''}
    </table>
    ` : ''}
    <blockquote style="margin: 16px 0; padding: 14px 18px; background-color: #F8FAFC; border-left: 3px solid #4F46E5; border-radius: 0 8px 8px 0; color: #334155; font-style: italic; font-size: 14px; line-height: 22px;">
      "${message}"
    </blockquote>
    <p style="margin-top: 16px; color: #64748B; font-size: 13px;">Our support team is reviewing your request and will respond shortly.</p>
  `,
  ctaText: "Reply to Candidate",
  ctaLink: email ? `mailto:${email}?subject=Re: ${encodeURIComponent(subject || 'Your Cloudvyn Query')}` : undefined,
});

