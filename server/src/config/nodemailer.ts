import nodemailer from 'nodemailer';

const createTransporter = (port: number) => {
  const emailUser = (process.env.EMAIL_USER || '').trim();
  const emailPass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');
  const emailHost = (process.env.EMAIL_HOST || 'smtp.gmail.com').trim();
  const isSecure = port === 465;

  return nodemailer.createTransport({
    host: emailHost,
    port: port,
    secure: isSecure,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 8000, // 8 sec connection timeout
    greetingTimeout: 8000,   // 8 sec greeting timeout
    socketTimeout: 10000,    // 10 sec socket timeout
  });
};

export const getTransporter = () => {
  const primaryPort = parseInt(process.env.EMAIL_PORT || '465', 10);
  return createTransporter(primaryPort);
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

  const primaryPort = parseInt(process.env.EMAIL_PORT || '465', 10);

  try {
    const primaryTransporter = createTransporter(primaryPort);
    const info = await primaryTransporter.sendMail(mailOptions);
    console.log(`[Google SMTP SUCCESS] OTP email sent to ${toEmail} via port ${primaryPort}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (primaryErr: any) {
    console.warn(`[Google SMTP Warning] Failed on port ${primaryPort} (${primaryErr.message}). Retrying on fallback port...`);
    const fallbackPort = primaryPort === 465 ? 587 : 465;
    try {
      const fallbackTransporter = createTransporter(fallbackPort);
      const info = await fallbackTransporter.sendMail(mailOptions);
      console.log(`[Google SMTP SUCCESS] OTP email sent to ${toEmail} via fallback port ${fallbackPort}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (fallbackErr: any) {
      console.error(`[Google SMTP Error] Failed on both ports ${primaryPort} & ${fallbackPort}: ${fallbackErr.message}`);
      throw new Error(`Google SMTP Error: ${primaryErr.message || fallbackErr.message}`);
    }
  }
};
