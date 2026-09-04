const nodemailer = require('nodemailer');

const createTransporter = (port) => {
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
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
};

const getTransporter = () => {
  const primaryPort = parseInt(process.env.EMAIL_PORT || '465', 10);
  return createTransporter(primaryPort);
};

const sendOTPEmail = async (toEmail, otpCode, purpose = 'Verification') => {
  const emailUser = (process.env.EMAIL_USER || '').trim();
  const emailPass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');

  let resendApiKey = (
    process.env.RESEND_API_KEY ||
    process.env.RESEND_KEY ||
    process.env.RESEND_TOKEN ||
    ''
  ).trim();

  if (!resendApiKey && emailPass.startsWith('re_')) {
    resendApiKey = emailPass;
  }

  const brevoApiKey = (
    process.env.BREVO_API_KEY ||
    process.env.BREVO_KEY ||
    ''
  ).trim();

  const senderEmail = (
    process.env.BREVO_SENDER_EMAIL ||
    process.env.EMAIL_USER ||
    '245ucs209@gbu.ac.in'
  ).trim();

  console.log(`[OTP DISPATCHED] OTP for ${toEmail}: ${otpCode} (Purpose: ${purpose})`);

  const htmlContent = `
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
  `;

  // 1. Try Resend HTTP API (Port 443 - Never blocked on Render)
  if (resendApiKey) {
    try {
      console.log(`[Email Transport] Sending OTP via Resend HTTPS API (Port 443)...`);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: 'CivicLens <onboarding@resend.dev>',
          to: [toEmail],
          subject: `[CivicLens] Your One-Time Password (OTP) for ${purpose}`,
          html: htmlContent,
        }),
      });

      const data = await response.json();
      if (response.ok && data.id) {
        console.log(`[Resend HTTP API SUCCESS] OTP email sent to ${toEmail}. MessageId: ${data.id}`);
        return { success: true, messageId: data.id };
      } else {
        const errorMsg = data.message || data.error || JSON.stringify(data);
        console.error(`[Resend API Error] ${errorMsg}`);
        throw new Error(`Resend API Error: ${errorMsg}`);
      }
    } catch (err) {
      console.error(`[Resend API Exception] ${err.message}`);
      if (process.env.RESEND_API_KEY || emailPass.startsWith('re_')) {
        throw new Error(`Resend Email Error: ${err.message}`);
      }
    }
  }

  // 2. Try Brevo HTTP API (Port 443 - Never blocked on Render)
  if (brevoApiKey) {
    try {
      console.log(`[Email Transport] Sending OTP via Brevo HTTPS API (Port 443) from ${senderEmail}...`);
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'CivicLens Portal', email: senderEmail },
          to: [{ email: toEmail }],
          subject: `[CivicLens] Your One-Time Password (OTP) for ${purpose}`,
          htmlContent: htmlContent,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        console.log(`[Brevo HTTP API SUCCESS] OTP email sent to ${toEmail}. MessageId: ${data.messageId}`);
        return { success: true, messageId: data.messageId };
      } else {
        const errorMsg = data.message || JSON.stringify(data);
        console.error(`[Brevo API Error] ${errorMsg}`);
        throw new Error(`Brevo API Error: ${errorMsg}`);
      }
    } catch (err) {
      console.error(`[Brevo API Exception] ${err.message}`);
      if (process.env.BREVO_API_KEY) {
        throw new Error(`Brevo Email Error: ${err.message}`);
      }
    }
  }

  const isConfigured = emailUser &&
                       emailPass &&
                       !emailUser.includes('your_') &&
                       !emailPass.includes('your_') &&
                       !emailPass.includes('xxxx');

  if (!isConfigured) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email credentials (RESEND_API_KEY or BREVO_API_KEY) are not configured in Render.');
    }
    console.log(`[DEV MODE - Google SMTP Simulation] OTP for ${toEmail}: ${otpCode}`);
    return { success: true, devMode: true, otpCode };
  }

  const mailOptions = {
    from: `"CivicLens Portal" <${emailUser}>`,
    to: toEmail,
    subject: `[CivicLens] Your One-Time Password (OTP) for ${purpose}`,
    html: htmlContent,
  };

  const primaryPort = parseInt(process.env.EMAIL_PORT || '465', 10);

  try {
    const primaryTransporter = createTransporter(primaryPort);
    const info = await primaryTransporter.sendMail(mailOptions);
    console.log(`[Google SMTP SUCCESS] OTP email sent to ${toEmail} via port ${primaryPort}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (primaryErr) {
    console.warn(`[Google SMTP Warning] Failed on port ${primaryPort} (${primaryErr.message}). Retrying on fallback port...`);
    const fallbackPort = primaryPort === 465 ? 587 : 465;
    try {
      const fallbackTransporter = createTransporter(fallbackPort);
      const info = await fallbackTransporter.sendMail(mailOptions);
      console.log(`[Google SMTP SUCCESS] OTP email sent to ${toEmail} via fallback port ${fallbackPort}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (fallbackErr) {
      console.error(`[Google SMTP Error] Failed on both ports ${primaryPort} & ${fallbackPort}: ${fallbackErr.message}`);
      throw new Error(`Google SMTP Error: Connection timeout on Render. Please use BREVO_API_KEY in Render.`);
    }
  }
};

const sendSubAdminWelcomeEmail = async (officer) => {
  const emailUser = (process.env.EMAIL_USER || '').trim();
  const emailPass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');
  let resendApiKey = (process.env.RESEND_API_KEY || process.env.RESEND_KEY || '').trim();
  if (!resendApiKey && emailPass.startsWith('re_')) resendApiKey = emailPass;
  const brevoApiKey = (process.env.BREVO_API_KEY || process.env.BREVO_KEY || '').trim();
  const senderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || '245ucs209@gbu.ac.in').trim();

  const loginUrl = process.env.CLIENT_URL
    ? `${process.env.CLIENT_URL}/admin/login`
    : 'https://civiclens-yeq3.vercel.app/admin/login';

  const htmlContent = `
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
        <h3 style="color: #1e293b; font-size: 15px; margin: 0 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Your Officer Credentials & Assigned Jurisdiction</h3>
        <table style="width: 100%; font-size: 14px; color: #334155;">
          <tr><td style="padding: 6px 0; font-weight: 600; width: 40%;">Officer Name:</td><td style="padding: 6px 0;">${officer.name}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: 600;">Officer ID:</td><td style="padding: 6px 0; font-family: monospace; font-weight: 700;">${officer.officialId}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: 600;">Official Email:</td><td style="padding: 6px 0;">${officer.email}</td></tr>
          ${officer.rawPassword ? `<tr><td style="padding: 6px 0; font-weight: 600;">Password:</td><td style="padding: 6px 0; font-family: monospace; background: #fff; padding: 4px 8px; border-radius: 4px; border: 1px dashed #cbd5e1; font-weight: 700;">${officer.rawPassword}</td></tr>` : ''}
          <tr><td style="padding: 6px 0; font-weight: 600;">Department:</td><td style="padding: 6px 0;">${officer.department}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: 600;">Assigned District:</td><td style="padding: 6px 0; font-weight: 700; color: #0284c7;">${officer.assignedDistrict}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: 600;">Assigned Pincodes:</td><td style="padding: 6px 0; font-family: monospace; font-weight: 700;">${(officer.assignedPincodes || []).join(', ')}</td></tr>
        </table>
      </div>

      <div style="text-align: center; margin-bottom: 20px;">
        <a href="${loginUrl}" style="display: inline-block; padding: 12px 32px; background-color: #0284c7; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 8px;">Login to Admin Dashboard</a>
        <p style="color: #94a3b8; font-size: 11px; margin-top: 8px;">Login Portal URL: <a href="${loginUrl}" style="color: #0284c7;">${loginUrl}</a></p>
      </div>

      <div style="background-color: #fffbeb; padding: 12px 16px; border-radius: 8px; border: 1px solid #fde68a; margin-bottom: 16px;">
        <p style="color: #92400e; font-size: 12px; margin: 0;"><strong>⚠ Security Notice:</strong> Please log in to the District Admin Portal and change your password after first login. Do not share these credentials with anyone.</p>
      </div>

      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
        This is an automated message from CivicLens State Governance System.
      </p>
    </div>
  `;

  // 1. Resend HTTP API
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
        body: JSON.stringify({
          from: 'CivicLens State Governance <onboarding@resend.dev>',
          to: [officer.email],
          subject: `[CivicLens] Your District Officer Credentials & Admin Portal Access`,
          html: htmlContent,
        }),
      });
      const data = await response.json();
      if (response.ok && data.id) {
        console.log(`[Resend Welcome Email SUCCESS] Email sent to officer ${officer.email}. Id: ${data.id}`);
        return { success: true, messageId: data.id };
      } else {
        const errorMsg = data.message || data.error || JSON.stringify(data);
        console.error(`[Resend Welcome Email Error]: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      console.error(`[Resend Welcome Email Exception] ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // 2. Brevo HTTP API
  if (brevoApiKey) {
    try {
      console.log(`[Brevo Email] Sending sub-admin welcome email to ${officer.email} from ${senderEmail}...`);
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'accept': 'application/json', 'api-key': brevoApiKey, 'content-type': 'application/json' },
        body: JSON.stringify({
          sender: { name: 'CivicLens State Governance', email: senderEmail },
          to: [{ email: officer.email }],
          subject: `[CivicLens] Your District Officer Credentials & Admin Portal Access`,
          htmlContent: htmlContent,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        console.log(`[Brevo Welcome Email SUCCESS] Email sent to officer ${officer.email}. MessageId: ${data.messageId}`);
        return { success: true, messageId: data.messageId };
      } else {
        const errorMsg = data.message || JSON.stringify(data);
        console.error(`[Brevo Welcome Email Error]: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      console.error(`[Brevo Welcome Email Exception] ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // 3. Nodemailer Fallback
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: `"CivicLens - State Governance" <${emailUser || 'noreply@civiclens.gov.in'}>`,
      to: officer.email,
      subject: `[CivicLens] Your District Officer Credentials & Admin Portal Access`,
      html: htmlContent,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Welcome Email Error]: ${error.message}`);
    return { success: false, error: error.message };
  }
};

module.exports = { getTransporter, createTransporter: getTransporter, sendOTPEmail, sendSubAdminWelcomeEmail };
