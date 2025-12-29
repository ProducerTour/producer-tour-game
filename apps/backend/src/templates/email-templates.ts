/**
 * Producer Tour Email Templates
 *
 * Inspired by modern mobile-first email designs (Hard Rock Bet style)
 * Brand colors: Blue (#3B82F6), Yellow (#FFF200), Dark (#000000)
 */

// ============================================================================
// SHARED STYLES & COMPONENTS
// ============================================================================

const brandColors = {
  primary: '#3B82F6',      // Producer Tour Blue
  primaryDark: '#2563EB',
  accent: '#FFF200',       // Producer Tour Yellow
  dark: '#000000',
  darkGray: '#18181B',
  lightGray: '#F4F4F5',
  text: '#FFFFFF',
  textMuted: '#A1A1AA',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
};

const baseStyles = `
  <style>
    /* Reset */
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }

    /* Typography */
    .headline { font-size: 48px !important; line-height: 1.1 !important; font-weight: 800 !important; letter-spacing: -1px; }
    .subheadline { font-size: 20px !important; line-height: 1.4 !important; font-weight: 400 !important; }

    /* Buttons */
    .btn-outline {
      display: inline-block;
      padding: 14px 28px;
      border: 2px solid #FFFFFF;
      border-radius: 50px;
      color: #FFFFFF !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
    }
    .btn-outline:hover { background: rgba(255,255,255,0.1); }

    .btn-solid {
      display: inline-block;
      padding: 14px 28px;
      background: #3B82F6;
      border-radius: 50px;
      color: #FFFFFF !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
    }

    .btn-yellow {
      display: inline-block;
      padding: 14px 28px;
      background: #FFF200;
      border-radius: 50px;
      color: #000000 !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
    }

    /* Cards */
    .feature-card {
      background: #27272A;
      border-radius: 16px;
      padding: 24px;
      margin: 16px 0;
    }

    /* Mobile */
    @media screen and (max-width: 600px) {
      .headline { font-size: 36px !important; }
      .subheadline { font-size: 16px !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .mobile-center { text-align: center !important; }
    }
  </style>
`;

// ============================================================================
// TEMPLATE 1: FEATURE ANNOUNCEMENT (Dark Theme - Hard Rock Style)
// ============================================================================

export interface AnnouncementEmailData {
  recipientName: string;
  headline: string;
  subheadline: string;
  featureTitle?: string;
  featureDescription?: string;
  ctaText: string;
  ctaUrl: string;
  previewImageUrl?: string;
}

export function generateAnnouncementEmailHTML(data: AnnouncementEmailData): string {
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${data.headline}</title>
  ${baseStyles}
</head>
<body style="margin: 0; padding: 0; background-color: ${brandColors.dark}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Wrapper -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${brandColors.dark};">
    <tr>
      <td align="center" style="padding: 0;">

        <!-- Email Container -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">

          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 40px 24px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <img src="https://producertour.com/images/logo-white.png" alt="Producer Tour" width="180" style="display: block; max-width: 180px; height: auto;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero Section - Gradient Background -->
          <tr>
            <td style="background: linear-gradient(180deg, ${brandColors.primary} 0%, #6366F1 50%, #8B5CF6 100%); border-radius: 24px 24px 0 0; padding: 48px 40px 32px;" class="mobile-padding">

              <!-- Main Headline -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <h1 class="headline" style="margin: 0; color: ${brandColors.text}; font-size: 48px; font-weight: 800; line-height: 1.1; text-transform: uppercase; letter-spacing: -1px;">
                      ${data.headline}
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <p class="subheadline" style="margin: 0; color: rgba(255,255,255,0.9); font-size: 20px; line-height: 1.4;">
                      ${data.subheadline}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <a href="${data.ctaUrl}" class="btn-outline" style="display: inline-block; padding: 14px 28px; border: 2px solid #FFFFFF; border-radius: 50px; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 16px;">
                      ${data.ctaText} &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              ${data.previewImageUrl ? `
              <!-- Phone/Device Mockup -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <img src="${data.previewImageUrl}" alt="Feature Preview" style="display: block; max-width: 280px; width: 100%; height: auto; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4);" />
                  </td>
                </tr>
              </table>
              ` : ''}

            </td>
          </tr>

          <!-- Feature Details Section -->
          ${data.featureTitle ? `
          <tr>
            <td style="background: ${brandColors.darkGray}; padding: 40px;" class="mobile-padding">

              <!-- Feature Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #27272A; border-radius: 16px; overflow: hidden;">
                <tr>
                  <td style="padding: 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="padding-bottom: 16px;">
                          <span style="font-size: 32px;">&#127911;</span>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-bottom: 12px;">
                          <h2 style="margin: 0; color: ${brandColors.text}; font-size: 24px; font-weight: 700;">
                            ${data.featureTitle}
                          </h2>
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <p style="margin: 0; color: ${brandColors.textMuted}; font-size: 16px; line-height: 1.6;">
                            ${data.featureDescription || ''}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Secondary CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-top: 32px;">
                    <a href="${data.ctaUrl}" class="btn-yellow" style="display: inline-block; padding: 14px 28px; background: ${brandColors.accent}; border-radius: 50px; color: #000000; text-decoration: none; font-weight: 600; font-size: 16px;">
                      ${data.ctaText} &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="background: ${brandColors.dark}; padding: 32px 40px; border-radius: 0 0 24px 24px;" class="mobile-padding">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <img src="https://producertour.com/images/logo-white.png" alt="Producer Tour" width="100" style="display: block; max-width: 100px; height: auto; opacity: 0.6;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <p style="margin: 0; color: ${brandColors.textMuted}; font-size: 13px;">
                      &copy; ${currentYear} Producer Tour. All rights reserved.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: ${brandColors.textMuted}; font-size: 12px;">
                      <a href="https://producertour.com/settings/notifications" style="color: ${brandColors.textMuted}; text-decoration: underline;">Manage notification settings</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
}

// ============================================================================
// TEMPLATE 2: PAYMENT NOTIFICATION (Dark Theme with Stats Cards)
// ============================================================================

export interface PaymentNotificationEmailData {
  recipientName: string;
  proType: string;
  statementFilename: string;
  grossRevenue: number;
  commissionRate: number;
  commissionAmount: number;
  netPayment: number;
  songCount: number;
  paymentDate: string;
  dashboardUrl: string;
}

export function generatePaymentNotificationEmailHTML(data: PaymentNotificationEmailData): string {
  const currentYear = new Date().getFullYear();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Payment Processed</title>
  ${baseStyles}
</head>
<body style="margin: 0; padding: 0; background-color: ${brandColors.dark}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Wrapper -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${brandColors.dark};">
    <tr>
      <td align="center" style="padding: 0;">

        <!-- Email Container -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">

          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 40px 24px; text-align: center;">
              <img src="https://producertour.com/images/logo-white.png" alt="Producer Tour" width="180" style="display: block; margin: 0 auto; max-width: 180px; height: auto;" />
            </td>
          </tr>

          <!-- Hero Section -->
          <tr>
            <td style="background: linear-gradient(180deg, ${brandColors.success} 0%, #16A34A 100%); border-radius: 24px 24px 0 0; padding: 48px 40px 40px;" class="mobile-padding">

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <img src="https://producertour.com/images/logo-white.png" alt="Producer Tour" width="140" style="display: block; max-width: 140px; height: auto;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <h1 class="headline" style="margin: 0; color: ${brandColors.text}; font-size: 42px; font-weight: 800; line-height: 1.1; text-transform: uppercase;">
                      PAYMENT<br/>PROCESSED
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p class="subheadline" style="margin: 0; color: rgba(255,255,255,0.9); font-size: 18px; line-height: 1.4;">
                      Your ${data.proType} royalties are ready
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Payment Details Section -->
          <tr>
            <td style="background: ${brandColors.darkGray}; padding: 32px 40px;" class="mobile-padding">

              <!-- Greeting -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-bottom: 24px;">
                    <p style="margin: 0; color: ${brandColors.text}; font-size: 18px; line-height: 1.5;">
                      Hi ${data.recipientName},<br/><br/>
                      Great news! Your royalty payment has been processed and is ready.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Stats Cards Row -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <!-- Net Payment Card (Featured) -->
                        <td style="width: 50%; padding-right: 8px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, ${brandColors.primary} 0%, #6366F1 100%); border-radius: 16px;">
                            <tr>
                              <td style="padding: 20px; text-align: center;">
                                <p style="margin: 0 0 4px; color: rgba(255,255,255,0.8); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Net Payment</p>
                                <p style="margin: 0; color: ${brandColors.text}; font-size: 28px; font-weight: 800;">${formatCurrency(data.netPayment)}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <!-- Songs Card -->
                        <td style="width: 50%; padding-left: 8px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #27272A; border-radius: 16px;">
                            <tr>
                              <td style="padding: 20px; text-align: center;">
                                <p style="margin: 0 0 4px; color: ${brandColors.textMuted}; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Songs</p>
                                <p style="margin: 0; color: ${brandColors.text}; font-size: 28px; font-weight: 800;">${data.songCount}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Payment Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #27272A; border-radius: 16px; overflow: hidden;">
                <tr>
                  <td style="padding: 24px;">

                    <!-- Detail Rows -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #3F3F46;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="color: ${brandColors.textMuted}; font-size: 14px;">Statement</td>
                              <td align="right" style="color: ${brandColors.text}; font-size: 14px; font-weight: 600;">${data.statementFilename}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #3F3F46;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="color: ${brandColors.textMuted}; font-size: 14px;">Payment Date</td>
                              <td align="right" style="color: ${brandColors.text}; font-size: 14px; font-weight: 600;">${data.paymentDate}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #3F3F46;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="color: ${brandColors.textMuted}; font-size: 14px;">Gross Revenue</td>
                              <td align="right" style="color: ${brandColors.text}; font-size: 14px; font-weight: 600;">${formatCurrency(data.grossRevenue)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="color: ${brandColors.textMuted}; font-size: 14px;">Commission (${data.commissionRate}%)</td>
                              <td align="right" style="color: #EF4444; font-size: 14px; font-weight: 600;">-${formatCurrency(data.commissionAmount)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-top: 32px;">
                    <a href="${data.dashboardUrl}" class="btn-solid" style="display: inline-block; padding: 16px 32px; background: ${brandColors.primary}; border-radius: 50px; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 16px;">
                      View Full Statement &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: ${brandColors.dark}; padding: 32px 40px; border-radius: 0 0 24px 24px;" class="mobile-padding">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <img src="https://producertour.com/images/logo-white.png" alt="Producer Tour" width="100" style="display: block; max-width: 100px; height: auto; opacity: 0.6;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <p style="margin: 0; color: ${brandColors.textMuted}; font-size: 13px;">
                      Questions? Contact us at <a href="mailto:support@producertour.com" style="color: ${brandColors.primary};">support@producertour.com</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: ${brandColors.textMuted}; font-size: 12px;">
                      &copy; ${currentYear} Producer Tour. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
}

// ============================================================================
// TEMPLATE 3: WELCOME EMAIL (Dark Theme with Yellow Accent)
// ============================================================================

export interface WelcomeEmailData {
  recipientName: string;
  recipientEmail: string;
  setupPasswordUrl: string;
}

export function generateWelcomeEmailHTML(data: WelcomeEmailData): string {
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Welcome to Producer Tour</title>
  ${baseStyles}
</head>
<body style="margin: 0; padding: 0; background-color: ${brandColors.dark}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Wrapper -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${brandColors.dark};">
    <tr>
      <td align="center" style="padding: 0;">

        <!-- Email Container -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">

          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 40px 24px; text-align: center;">
              <img src="https://producertour.com/images/logo-white.png" alt="Producer Tour" width="180" style="display: block; margin: 0 auto; max-width: 180px; height: auto;" />
            </td>
          </tr>

          <!-- Hero Section with Yellow Accent -->
          <tr>
            <td style="background: ${brandColors.darkGray}; border-radius: 24px; padding: 48px 40px;" class="mobile-padding">

              <!-- Yellow Accent Bar -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <div style="width: 60px; height: 4px; background: ${brandColors.accent}; border-radius: 2px;"></div>
                  </td>
                </tr>
              </table>

              <!-- Welcome Text -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <img src="https://producertour.com/images/logo-white.png" alt="Producer Tour" width="160" style="display: block; max-width: 160px; height: auto;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <h1 class="headline" style="margin: 0; color: ${brandColors.text}; font-size: 42px; font-weight: 800; line-height: 1.1; text-transform: uppercase;">
                      WELCOME
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <p class="subheadline" style="margin: 0; color: ${brandColors.textMuted}; font-size: 18px; line-height: 1.5;">
                      Your account has been created. Let's get you set up.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Account Info Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #27272A; border-radius: 16px; overflow: hidden; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <p style="margin: 0; color: ${brandColors.textMuted}; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your Login Email</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin: 0; color: ${brandColors.text}; font-size: 18px; font-weight: 600;">${data.recipientEmail}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- What's Next -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-bottom: 24px;">
                    <p style="margin: 0; color: ${brandColors.text}; font-size: 16px; line-height: 1.6;">
                      Hi ${data.recipientName},<br/><br/>
                      Welcome aboard! Click the button below to set your password and access your dashboard. This link expires in 1 hour for security.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <a href="${data.setupPasswordUrl}" class="btn-yellow" style="display: inline-block; padding: 16px 32px; background: ${brandColors.accent}; border-radius: 50px; color: #000000; text-decoration: none; font-weight: 700; font-size: 16px;">
                      Set Your Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link Fallback -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: ${brandColors.textMuted}; font-size: 12px; line-height: 1.5;">
                      Button not working? Copy this link:<br/>
                      <a href="${data.setupPasswordUrl}" style="color: ${brandColors.primary}; word-break: break-all;">${data.setupPasswordUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Features Preview Section -->
          <tr>
            <td style="padding: 32px 40px 0;" class="mobile-padding">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <h2 style="margin: 0; color: ${brandColors.text}; font-size: 20px; font-weight: 700;">What You Can Do</h2>
                  </td>
                </tr>
              </table>

              <!-- Feature Cards -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #27272A; border-radius: 12px;">
                      <tr>
                        <td style="padding: 16px 20px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td width="40" style="vertical-align: top;">
                                <span style="font-size: 20px;">&#128200;</span>
                              </td>
                              <td>
                                <p style="margin: 0 0 4px; color: ${brandColors.text}; font-size: 15px; font-weight: 600;">Track Your Royalties</p>
                                <p style="margin: 0; color: ${brandColors.textMuted}; font-size: 13px;">See all your earnings in one place</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 12px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #27272A; border-radius: 12px;">
                      <tr>
                        <td style="padding: 16px 20px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td width="40" style="vertical-align: top;">
                                <span style="font-size: 20px;">&#127925;</span>
                              </td>
                              <td>
                                <p style="margin: 0 0 4px; color: ${brandColors.text}; font-size: 15px; font-weight: 600;">Manage Your Catalog</p>
                                <p style="margin: 0; color: ${brandColors.textMuted}; font-size: 13px;">View and track all your registered works</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #27272A; border-radius: 12px;">
                      <tr>
                        <td style="padding: 16px 20px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td width="40" style="vertical-align: top;">
                                <span style="font-size: 20px;">&#128172;</span>
                              </td>
                              <td>
                                <p style="margin: 0 0 4px; color: ${brandColors.text}; font-size: 15px; font-weight: 600;">Connect With Your Team</p>
                                <p style="margin: 0; color: ${brandColors.textMuted}; font-size: 13px;">Message and collaborate directly</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 40px;" class="mobile-padding">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <img src="https://producertour.com/images/logo-white.png" alt="Producer Tour" width="100" style="display: block; max-width: 100px; height: auto; opacity: 0.6;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <p style="margin: 0; color: ${brandColors.textMuted}; font-size: 13px;">
                      Need help? <a href="mailto:support@producertour.com" style="color: ${brandColors.primary};">support@producertour.com</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: ${brandColors.textMuted}; font-size: 12px;">
                      &copy; ${currentYear} Producer Tour. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
}

// ============================================================================
// TEMPLATE 4: PASSWORD RESET (Dark Theme)
// ============================================================================

export interface PasswordResetEmailData {
  recipientName: string;
  resetUrl: string;
}

export function generatePasswordResetEmailHTML(data: PasswordResetEmailData): string {
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reset Your Password</title>
  ${baseStyles}
</head>
<body style="margin: 0; padding: 0; background-color: ${brandColors.dark}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Wrapper -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${brandColors.dark};">
    <tr>
      <td align="center" style="padding: 0;">

        <!-- Email Container -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">

          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 40px 24px; text-align: center;">
              <img src="https://producertour.com/images/logo-white.png" alt="Producer Tour" width="180" style="display: block; margin: 0 auto; max-width: 180px; height: auto;" />
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background: ${brandColors.darkGray}; border-radius: 24px; padding: 48px 40px;" class="mobile-padding">

              <!-- Icon and Headline -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <div style="width: 64px; height: 64px; background: linear-gradient(135deg, ${brandColors.primary} 0%, #6366F1 100%); border-radius: 50%; line-height: 64px; font-size: 28px;">&#128274;</div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 24px 0 16px;">
                    <h1 style="margin: 0; color: ${brandColors.text}; font-size: 32px; font-weight: 800; text-transform: uppercase;">
                      RESET YOUR<br/>PASSWORD
                    </h1>
                  </td>
                </tr>
              </table>

              <!-- Message -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-bottom: 24px;">
                    <p style="margin: 0; color: ${brandColors.textMuted}; font-size: 16px; line-height: 1.6; text-align: center;">
                      Hi ${data.recipientName}, we received a request to reset your Producer Tour password. Click below to create a new one.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <a href="${data.resetUrl}" class="btn-solid" style="display: inline-block; padding: 16px 32px; background: ${brandColors.primary}; border-radius: 50px; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 16px;">
                      Reset Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Warning Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid ${brandColors.warning}; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; color: ${brandColors.warning}; font-size: 14px; font-weight: 600;">
                      &#9888; This link expires in 1 hour
                    </p>
                    <p style="margin: 8px 0 0; color: ${brandColors.textMuted}; font-size: 13px;">
                      For security, this password reset link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Link Fallback -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-top: 24px;">
                    <p style="margin: 0; color: ${brandColors.textMuted}; font-size: 12px; line-height: 1.5;">
                      Button not working? Copy this link:<br/>
                      <a href="${data.resetUrl}" style="color: ${brandColors.primary}; word-break: break-all;">${data.resetUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px;" class="mobile-padding">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <img src="https://producertour.com/images/logo-white.png" alt="Producer Tour" width="100" style="display: block; max-width: 100px; height: auto; opacity: 0.6;" />
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: ${brandColors.textMuted}; font-size: 12px;">
                      &copy; ${currentYear} Producer Tour. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
}

// ============================================================================
// TEMPLATE 5: NEW MESSAGE NOTIFICATION (Dark Theme)
// ============================================================================

export interface MessageNotificationEmailData {
  recipientName: string;
  senderName: string;
  messagePreview: string;
  conversationUrl: string;
  timestamp: string;
}

export function generateMessageNotificationEmailHTML(data: MessageNotificationEmailData): string {
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>New Message</title>
  ${baseStyles}
</head>
<body style="margin: 0; padding: 0; background-color: ${brandColors.dark}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Wrapper -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${brandColors.dark};">
    <tr>
      <td align="center" style="padding: 0;">

        <!-- Email Container -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">

          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 40px 24px; text-align: center;">
              <img src="https://producertour.com/images/logo-white.png" alt="Producer Tour" width="180" style="display: block; margin: 0 auto; max-width: 180px; height: auto;" />
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background: ${brandColors.darkGray}; border-radius: 24px; padding: 40px;" class="mobile-padding">

              <!-- Header -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <div style="width: 56px; height: 56px; background: linear-gradient(135deg, ${brandColors.primary} 0%, #6366F1 100%); border-radius: 50%; line-height: 56px; font-size: 24px;">&#128172;</div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <h1 style="margin: 0; color: ${brandColors.text}; font-size: 28px; font-weight: 700;">
                      New Message
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <p style="margin: 0; color: ${brandColors.textMuted}; font-size: 16px;">
                      You have an unread message from <strong style="color: ${brandColors.text};">${data.senderName}</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Message Preview Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #27272A; border-radius: 16px; border-left: 4px solid ${brandColors.primary}; overflow: hidden;">
                <tr>
                  <td style="padding: 20px 24px; border-bottom: 1px solid #3F3F46;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td>
                          <span style="color: ${brandColors.text}; font-size: 15px; font-weight: 600;">${data.senderName}</span>
                          <span style="color: ${brandColors.textMuted}; font-size: 13px; margin-left: 12px;">${data.timestamp}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0; color: ${brandColors.textMuted}; font-size: 15px; line-height: 1.6; font-style: italic;">
                      "${data.messagePreview}"
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-top: 32px;">
                    <a href="${data.conversationUrl}" class="btn-solid" style="display: inline-block; padding: 14px 28px; background: ${brandColors.primary}; border-radius: 50px; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 16px;">
                      View Conversation &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px;" class="mobile-padding">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <img src="https://producertour.com/images/logo-white.png" alt="Producer Tour" width="100" style="display: block; max-width: 100px; height: auto; opacity: 0.6;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <p style="margin: 0; color: ${brandColors.textMuted}; font-size: 12px;">
                      <a href="https://producertour.com/settings/notifications" style="color: ${brandColors.textMuted}; text-decoration: underline;">Manage notification settings</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: ${brandColors.textMuted}; font-size: 12px;">
                      &copy; ${currentYear} Producer Tour. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
}

// ============================================================================
// EXPORT ALL TEMPLATES
// ============================================================================

export const emailTemplates = {
  announcement: generateAnnouncementEmailHTML,
  paymentNotification: generatePaymentNotificationEmailHTML,
  welcome: generateWelcomeEmailHTML,
  passwordReset: generatePasswordResetEmailHTML,
  messageNotification: generateMessageNotificationEmailHTML,
};

export default emailTemplates;
