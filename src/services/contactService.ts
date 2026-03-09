import { sendEmail } from "./emailService";

/**
 * Send response email for contact form inquiry
 */
export const sendContactResponseEmail = async (
    email: string,
    name: string,
    reference: string,
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
            font-size: 18px;
            font-weight: 700;
            color: #ff444f;
            letter-spacing: 1px;
          }
          .response-box {
            background: #f8fafc;
            border-left: 4px solid #ff444f;
            padding: 20px;
            margin: 25px 0;
            border-radius: 4px;
          }
          .response-box p {
            margin: 0;
            color: #1e293b;
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
            <h1>TZX Trading Support</h1>
          </div>
          <div class="content">
            <h2>Thank you for contacting us</h2>
            <p>Hello <strong>${name}</strong>,</p>
            
            <div class="reference-box">
              <div class="label">Your Reference Number</div>
              <div class="number">${reference}</div>
            </div>
            
            <p>We have received your inquiry and our team has responded:</p>
            
            <div class="response-box">
              <p>${response}</p>
            </div>
            
            <p>If you have any further questions, please don't hesitate to reach out again.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} TZX Trading. All rights reserved.</p>
            <p>This is a response to your inquiry.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  
    return sendEmail({
      to: email,
      subject: `TZX Trading - Response to Your Inquiry (Ref: ${reference})`,
      html
    });
  };