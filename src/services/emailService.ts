import nodemailer from 'nodemailer';

// Email configuration interface
interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: any[];
}

// Create transporter
const createTransporter = () => {
  // For development/testing with Ethereal (fake SMTP)
  if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_HOST) {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.ETHEREAL_USER || 'ethereal.user@ethereal.email',
        pass: process.env.ETHEREAL_PASS || 'ethereal_pass'
      }
    });
  }

  // Production with real SMTP
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });
};

// Send email
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"TZX Trading" <${process.env.EMAIL_FROM || 'noreply@tzxtrading.com'}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
      attachments: options.attachments || []
    };

    const info = await transporter.sendMail(mailOptions);
    
    // Log preview URL for development (Ethereal)
    if (process.env.NODE_ENV === 'development' && info.messageId) {
      console.log('📧 Email preview:', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return false;
  }
};

// Password reset email
export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  resetLink: string
): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #ff444f 0%, #d43b44 100%);
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .content {
          padding: 40px 30px;
          background: white;
        }
        .content h2 {
          color: #1e293b;
          margin-top: 0;
          font-size: 22px;
        }
        .content p {
          color: #64748b;
          margin-bottom: 25px;
        }
        .button {
          display: inline-block;
          background: #ff444f;
          color: white;
          text-decoration: none;
          padding: 14px 30px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          margin: 20px 0;
          box-shadow: 0 2px 4px rgba(255, 68, 79, 0.2);
        }
        .button:hover {
          background: #d43b44;
        }
        .footer {
          background: #f8fafc;
          padding: 25px 30px;
          text-align: center;
          border-top: 1px solid #e2e8f0;
        }
        .footer p {
          color: #94a3b8;
          font-size: 14px;
          margin: 5px 0;
        }
        .note {
          background: #fef9c3;
          border-left: 4px solid #facc15;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
          color: #854d0e;
          font-size: 14px;
        }
        .link {
          word-break: break-all;
          color: #ff444f;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TZX Trading</h1>
        </div>
        <div class="content">
          <h2>Password Reset Request</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>We received a request to reset your password for your TZX Trading account. Click the button below to create a new password:</p>
          
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
          </div>
          
          <div class="note">
            <strong>⚠️ This link will expire in 1 hour</strong>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p class="link">${resetLink}</p>
          
          <p>If you didn't request a password reset, you can safely ignore this email. Your account is still secure.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} TZX Trading. All rights reserved.</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'TZX Trading - Password Reset Request',
    html
  });
};

// Welcome email for new registration
export const sendWelcomeEmail = async (
  email: string,
  name: string,
  referenceNumber: string
): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #ff444f 0%, #d43b44 100%);
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .content {
          padding: 40px 30px;
          background: white;
        }
        .content h2 {
          color: #1e293b;
          margin-top: 0;
          font-size: 22px;
        }
        .content p {
          color: #64748b;
          margin-bottom: 25px;
        }
        .reference-box {
          background: #f1f5f9;
          border: 1px dashed #ff444f;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          margin: 25px 0;
        }
        .reference-box .label {
          color: #64748b;
          font-size: 14px;
          margin-bottom: 5px;
        }
        .reference-box .number {
          font-size: 24px;
          font-weight: 700;
          color: #ff444f;
          letter-spacing: 1px;
        }
        .footer {
          background: #f8fafc;
          padding: 25px 30px;
          text-align: center;
          border-top: 1px solid #e2e8f0;
        }
        .footer p {
          color: #94a3b8;
          font-size: 14px;
          margin: 5px 0;
        }
        .button {
          display: inline-block;
          background: #ff444f;
          color: white;
          text-decoration: none;
          padding: 12px 25px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TZX Trading</h1>
        </div>
        <div class="content">
          <h2>Welcome to TZX Trading!</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Thank you for registering with TZX Trading. Your account has been created successfully and is now pending admin approval.</p>
          
          <div class="reference-box">
            <div class="label">Your Reference Number</div>
            <div class="number">${referenceNumber}</div>
            <p style="font-size: 13px; margin-top: 10px; margin-bottom: 0;">Keep this number for future correspondence</p>
          </div>
          
          <p>What happens next?</p>
          <ul style="color: #64748b;">
            <li>Our team will review your registration within 24 hours</li>
            <li>You'll receive an email once your account is approved</li>
            <li>The trader will begin managing your investment</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/login" class="button">Login to Dashboard</a>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} TZX Trading. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to TZX Trading - Registration Received',
    html
  });
};

// Transaction approved email
export const sendTransactionApprovedEmail = async (
  email: string,
  name: string,
  investmentReference: string,
  amount: number
): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .content {
          padding: 40px 30px;
          background: white;
        }
        .success-icon {
          width: 60px;
          height: 60px;
          background: #d1fae5;
          border-radius: 50%;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
        }
        .footer {
          background: #f8fafc;
          padding: 25px 30px;
          text-align: center;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TZX Trading</h1>
        </div>
        <div class="content">
          <div class="success-icon">✅</div>
          <h2 style="text-align: center; color: #1e293b;">Investment Approved!</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Great news! Your investment has been approved and the trader has started managing your funds.</p>
          
          <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Investment Reference:</strong> ${investmentReference}</p>
            <p style="margin: 5px 0;"><strong>Amount:</strong> KES ${amount.toLocaleString()}</p>
          </div>
          
          <p>You can track your investment performance in your dashboard.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} TZX Trading</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'TZX Trading - Investment Approved',
    html
  });
};

// Support ticket response email
export const sendTicketResponseEmail = async (
  email: string,
  name: string,
  ticketNumber: string,
  response: string
): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          padding: 30px 20px;
          text-align: center;
        }
        .response-box {
          background: #f8fafc;
          border-left: 4px solid #3b82f6;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          background: #f8fafc;
          padding: 25px 30px;
          text-align: center;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TZX Trading Support</h1>
        </div>
        <div class="content">
          <h2>Support Ticket Update</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your support ticket <strong>${ticketNumber}</strong> has received a response:</p>
          
          <div class="response-box">
            ${response}
          </div>
          
          <p>Login to your dashboard to view the full conversation or reply.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} TZX Trading</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `TZX Trading - Ticket #${ticketNumber} Update`,
    html
  });
};