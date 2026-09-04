const nodemailer = require('nodemailer');

const getTransporter = () => {
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

const sendOTPEmail = async (toEmail, otpCode, purpose = 'Verification') => {
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
    console.log(`[DEV MODE - Google SMTP Simulation] OTP for ${toEmail}: ${otpCode}`);
    return { success: true, devMode: true, otpCode };
  }

  const transporter = getTransporter();

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
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Google SMTP SUCCESS] OTP email sent to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Google SMTP Error] Failed to send email to ${toEmail}: ${error.message}`);
    throw new Error(`Google SMTP Error: ${error.message}`);
  }
};

const sendSubAdminWelcomeEmail = async (officer) => {
  const transporter = getTransporter();
  const loginUrl = process.env.CLIENT_URL
    ? `${process.env.CLIENT_URL}/admin/login`
    : 'https://civiclens-yeq3.vercel.app/admin/login';

  const mailOptions = {
    from: `"CivicLens - State Governance" <${process.env.EMAIL_USER || 'noreply@civiclens.gov.in'}>`,
    to: officer.email,
    subject: `[CivicLens] Your District Officer Account Has Been Created`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 24px;">CivicLens</h1>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Smart Civic Grievance Redressal System</p>
        </div>

        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #bae6fd;">
          <h2 style="color: #0c4a6e; font-size: 18px; margin: 0 0 8px 0;">Welcome, ${officer.name}!</h2>
          <p style="color: #334155; font-size: 14px; margin: 0;">You have been registered as a <strong>District Sub-Admin Officer</strong> on the CivicLens platform by the State Super Admin.</p>
        </div>

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #1e293b; font-size: 15px; margin: 0 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Your Login Credentials</h3>
          <table style="width: 100%; font-size: 14px; color: #334155;">
            <tr><td style="padding: 6px 0; font-weight: 600; width: 40%;">Officer ID:</td><td style="padding: 6px 0;">${officer.officialId}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: 600;">Email:</td><td style="padding: 6px 0;">${officer.email}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: 600;">Password:</td><td style="padding: 6px 0; font-family: monospace; background: #fff; padding: 4px 8px; border-radius: 4px; border: 1px dashed #cbd5e1;">${officer.rawPassword}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: 600;">Department:</td><td style="padding: 6px 0;">${officer.department}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: 600;">District:</td><td style="padding: 6px 0;">${officer.assignedDistrict}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: 600;">Assigned Pincodes:</td><td style="padding: 6px 0; font-family: monospace; font-weight: 700;">${officer.assignedPincodes.join(', ')}</td></tr>
          </table>
        </div>

        <div style="text-align: center; margin-bottom: 20px;">
          <a href="${loginUrl}" style="display: inline-block; padding: 12px 32px; background-color: #0284c7; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 8px;">Login to Admin Dashboard</a>
          <p style="color: #94a3b8; font-size: 11px; margin-top: 8px;">Login URL: ${loginUrl}</p>
        </div>

        <div style="background-color: #fffbeb; padding: 12px 16px; border-radius: 8px; border: 1px solid #fde68a; margin-bottom: 16px;">
          <p style="color: #92400e; font-size: 12px; margin: 0;"><strong>⚠ Security Notice:</strong> Please change your password after your first login. Do not share these credentials with anyone.</p>
        </div>

        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
          This is an automated message from CivicLens State Governance System.
        </p>
      </div>
    `,
  };

  try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[Google SMTP] Welcome email sent to officer ${officer.email}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } else {
      console.log(`[DEV MODE] Welcome email for ${officer.email} — credentials: ${officer.email} / ${officer.rawPassword}`);
      return { success: true, devMode: true };
    }
  } catch (error) {
    console.error(`[Google SMTP Error] Failed to send welcome email: ${error.message}`);
    return { success: false, error: error.message };
  }
};

module.exports = { getTransporter, createTransporter: getTransporter, sendOTPEmail, sendSubAdminWelcomeEmail };
