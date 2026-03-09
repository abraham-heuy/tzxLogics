import { sendEmail } from "./emailService";

/**
 * Send password change verification code email
 */
export const sendPasswordChangeCodeEmail = async (
    email: string,
    name: string,
    code: string
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
          .code-box {
            background: #f1f5f9;
            border: 2px dashed #ff444f;
            padding: 20px;
            text-align: center;
            border-radius: 8px;
            margin: 25px 0;
          }
          .code-box .label {
            color: #64748b;
            font-size: 14px;
            margin-bottom: 10px;
          }
          .code-box .code {
            font-size: 36px;
            font-weight: 700;
            color: #ff444f;
            letter-spacing: 8px;
            font-family: monospace;
          }
          .warning {
            background: #fef9c3;
            border-left: 4px solid #facc15;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            color: #854d0e;
            font-size: 14px;
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
            <h2>Password Change Verification</h2>
            <p>Hello <strong>${name}</strong>,</p>
            <p>You requested to change your password. Use the verification code below to complete the process:</p>
            
            <div class="code-box">
              <div class="label">Verification Code</div>
              <div class="code">${code}</div>
            </div>
            
            <div class="warning">
              <strong>⏰ This code will expire in 15 minutes</strong>
            </div>
            
            <p>If you didn't request this change, please ignore this email or contact support immediately.</p>
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
      subject: 'TZX Trading - Password Change Verification Code',
      html
    });
  };