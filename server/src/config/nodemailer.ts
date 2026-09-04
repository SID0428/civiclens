import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOTPEmail = async (toEmail: string, otpCode: string, purpose: string = 'Verification'): Promise<boolean> => {
  console.log(`[OTP DISPATCHED] OTP for ${toEmail}: ${otpCode} (Purpose: ${purpose})`);

  const isConfigured = process.env.EMAIL_USER &&
                       process.env.EMAIL_PASS &&
                       !process.env.EMAIL_PASS.includes('your_') &&
                       !process.env.EMAIL_PASS.includes('xxxx');

  if (!isConfigured) {
    console.log(`[Google SMTP Dev Mode] OTP for ${toEmail}: ${otpCode} (Purpose: ${purpose})`);
    return true;
  }

  const mailOptions = {
    from: `"CivicLens Portal" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `CivicLens Verification Code: ${otpCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
        <h2 style="color: #0284c7; text-align: center;">CivicLens Portal</h2>
        <p>Hello,</p>
        <p>Your one-time verification code for <strong>${purpose}</strong> is:</p>
        <div style="text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; background-color: #f0f9ff; color: #0369a1; padding: 10px 20px; border-radius: 8px; border: 1px dashed #38bdf8;">
            ${otpCode}
          </span>
        </div>
        <p style="color: #64748b; font-size: 12px;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Google SMTP] Email sent successfully to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('[Google SMTP] Send Error:', error);
    return false;
  }
};
