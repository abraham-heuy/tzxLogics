import axios from 'axios';
import { getAccessToken } from '../util/helpers/mpesaAuth';

interface STKPushParams {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

export const sendMpesaSTK = async ({ phoneNumber, amount, accountReference, transactionDesc }: STKPushParams) => {
  try {
    const token = await getAccessToken();
    
    // Format phone number (remove 0 or +254, ensure 254XXXXXXXXX)
    const formattedPhone = phoneNumber.replace(/^0+/, '254').replace(/^\+/, '');
    
    // Get current timestamp in format YYYYMMDDHHmmss
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
    
    const businessShortCode = process.env.MPESA_BUSINESS_SHORTCODE || '174379';
    const passkey = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    
    // Generate password
    const password = Buffer.from(`${businessShortCode}${passkey}${timestamp}`).toString('base64');

    // Ensure amount is whole number (M-Pesa doesn't accept decimals)
    const wholeAmount = Math.floor(amount);

    console.log('📤 M-Pesa Request:', {
      phone: formattedPhone,
      amount: wholeAmount,
      reference: accountReference,
      timestamp
    });

    const response = await axios.post(
      process.env.MPESA_STK_PUSH_URL || 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: wholeAmount, // Use whole number
        PartyA: formattedPhone,
        PartyB: businessShortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: `${process.env.BACKEND_URL}/api/register/mpesa/callback`,
        AccountReference: accountReference.substring(0, 12),
        TransactionDesc: transactionDesc.substring(0, 13)
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    console.log('📥 M-Pesa Response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ M-Pesa STK push error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw new Error(`M-Pesa payment failed: ${error.response?.data?.errorMessage || error.message}`);
  }
};