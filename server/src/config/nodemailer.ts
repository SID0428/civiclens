import nodemailer from 'nodemailer';

export const getTransporter = () => {
  const emailUser = (process.env.EMAIL_USER || '').trim();
  const emailPass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');
  const emailHost = (process.env.EMAIL_HOST || 'smtp.gmail.com').trim();
  const emailPort = parseInt(process.env.EMAIL_PORT || '465', 10);
  const isSecure = emailPort === 465;

  if (!emailUser || !emailPass) {
    console.warn('[Google SMTP] EMAIL_USER and EMAIL_PASS are not configured.');
  }

  return nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: isSecure,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

export const transporter = getTransporter();

export const sendOTPEmail = async (
  toEmail: string,
  otpCode: string,
  purpose: string = 'Verification'
): Promise<{ success: boolean; devMode?: boolean; otpCode?: string; messageId?: string }> => {
  const emailUser = (process.env.EMAIL_USER || '').trim();
  const emailPass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');

  console.log(`[OTP DISPATCHED] OTP for ${toEmail}: ${otpCode} (Purpose: ${purpose})`);

  const isConfigured = emailUser &&
                       emailPass &&
                       !emailUser.includes('your_') &&
                       !emailPass.includes('your_') &&
                       !emailPass.includes('xxxx');

  if (!isConfigured) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email credentials (EMAIL_USER & EMAIL_PASS) are not configured on the production server.');
    }
    console.log(`[Google SMTP Dev Mode] OTP for ${toEmail}: ${otpCode} (Purpose: ${purpose})`);
    return { success: true, devMode: true, otpCode };
  }

  const activeTransporter = getTransporter();

  const mailOptions = {
    from: `"CivicLens Portal" <${emailUser}>`,
    to: toEmail,
    subject: `[CivicLens] Your One-Time Password (OTP) for ${purpose}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 24px;">CivicLens</h1>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Smart Civic Grievance Redressal System</p>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <p style="color: #334155; font-size: 14px; margin-bottom: 12px;">Use the OTP below to complete your ${purpose.toLowerCase()}:</p>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1e293b; background: #ffffff; padding: 12px; border-radius: 6px; display: inline-block; border: 1px dashed #cbd5e1;">
            ${otpCode}
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 12px;">Valid for 10 minutes. Please do not share this OTP with anyone.</p>
        </div>
        <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
          If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `,
  };

  try {
    const info = await activeTransporter.sendMail(mailOptions);
    console.log(`[Google SMTP SUCCESS] OTP email sent to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[Google SMTP Error] Failed to send email to ${toEmail}: ${error?.message || error}`);
    throw new Error(`Google SMTP Error: ${error?.message || error}`);
  }
};
