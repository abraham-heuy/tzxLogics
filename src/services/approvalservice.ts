import { sendEmail } from "./emailService";

/**
 * Send investment approval email
 */
export const sendInvestmentApprovalEmail = async (
  email: string,
  name: string,
  investmentReference: string,
  amount: number,
  poolName: string,
  adminNotes?: string
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
        .content h2 {
          color: #1e293b;
          margin-top: 0;
          font-size: 22px;
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
        .details-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .details-box p {
          margin: 10px 0;
        }
        .details-box .label {
          color: #64748b;
          font-weight: 500;
        }
        .details-box .value {
          color: #0f172a;
          font-weight: 600;
        }
        .note-box {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .note-box p {
          color: #92400e;
          margin: 0;
        }
        .button {
          display: inline-block;
          background: #059669;
          color: white;
          text-decoration: none;
          padding: 12px 25px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          margin-top: 20px;
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
        .login-info {
          background: #e0f2fe;
          border-left: 4px solid #0284c7;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
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
          <h2 style="text-align: center;">Investment Approved!</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Great news! Your investment has been approved and is now active.</p>
          
          <div class="details-box">
            <p><span class="label">Investment Reference:</span> <span class="value">${investmentReference}</span></p>
            <p><span class="label">Amount:</span> <span class="value">KES ${amount.toLocaleString()}</span></p>
            <p><span class="label">Pool:</span> <span class="value">${poolName}</span></p>
          </div>

          <div class="login-info">
            <p><strong>🔐 Login Information</strong></p>
            <p>You can log in to your account using the password you created during registration.</p>
            <p>If you've forgotten your password, use the "Forgot Password" option on the login page to reset it.</p>
          </div>
          
          ${adminNotes ? `
          <div class="note-box">
            <p><strong>Admin Note:</strong> ${adminNotes}</p>
          </div>
          ` : ''}
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/login" class="button">Login to Your Account</a>
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
    subject: `✅ Investment Approved - ${investmentReference}`,
    html
  });
};

/**
 * Send investment rejection email
 */
export const sendInvestmentRejectionEmail = async (
  email: string,
  name: string,
  investmentReference: string,
  amount: number,
  poolName: string,
  adminNotes?: string
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
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
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
        .error-icon {
          width: 60px;
          height: 60px;
          background: #fee2e2;
          border-radius: 50%;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
        }
        .details-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .details-box p {
          margin: 10px 0;
        }
        .details-box .label {
          color: #64748b;
          font-weight: 500;
        }
        .details-box .value {
          color: #0f172a;
          font-weight: 600;
        }
        .rejection-box {
          background: #fee2e2;
          border-left: 4px solid #dc2626;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .rejection-box p {
          color: #7f1d1d;
          margin: 0;
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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TZX Trading</h1>
        </div>
        <div class="content">
          <div class="error-icon">❌</div>
          <h2 style="text-align: center;">Investment Update</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>We regret to inform you that your investment could not be approved at this time.</p>
          
          <div class="details-box">
            <p><span class="label">Investment Reference:</span> <span class="value">${investmentReference}</span></p>
            <p><span class="label">Amount:</span> <span class="value">KES ${amount.toLocaleString()}</span></p>
            <p><span class="label">Pool:</span> <span class="value">${poolName}</span></p>
          </div>
          
          ${adminNotes ? `
          <div class="rejection-box">
            <p><strong>Reason:</strong> ${adminNotes}</p>
          </div>
          ` : `
          <div class="rejection-box">
            <p><strong>Reason:</strong> Your investment did not meet our verification requirements. Please contact support for more information.</p>
          </div>
          `}
          
          <p>If you have any questions, please don't hesitate to contact our support team.</p>
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
    subject: `❌ Investment Update - ${investmentReference}`,
    html
  });
};


/**
 * Send account approval email
 */
export const sendAccountApprovalEmail = async (
  email: string,
  name: string,
  adminNotes?: string
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
        .content h2 {
          color: #1e293b;
          margin-top: 0;
          font-size: 22px;
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
        .note-box {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .note-box p {
          color: #92400e;
          margin: 0;
        }
        .button {
          display: inline-block;
          background: #059669;
          color: white;
          text-decoration: none;
          padding: 12px 25px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          margin-top: 20px;
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
        .login-info {
          background: #e0f2fe;
          border-left: 4px solid #0284c7;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
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
          <h2 style="text-align: center;">Account Approved!</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Great news! Your TZX Trading account has been approved. You can now log in and start investing.</p>

          <div class="login-info">
            <p><strong>🔐 Login Information</strong></p>
            <p>Use the email and password you created during registration to log in.</p>
            <p>If you've forgotten your password, use the "Forgot Password" option on the login page.</p>
          </div>
          
          ${adminNotes ? `
          <div class="note-box">
            <p><strong>Admin Note:</strong> ${adminNotes}</p>
          </div>
          ` : ''}
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/login" class="button">Login to Your Account</a>
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
    subject: `✅ Your TZX Trading Account Has Been Approved`,
    html
  });
};