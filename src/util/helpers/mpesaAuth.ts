import axios from 'axios';

let accessToken: string | null = null;
let tokenExpiry: Date | null = null;

export const getAccessToken = async (): Promise<string> => {
  // Check if token is still valid
  if (accessToken && tokenExpiry && tokenExpiry > new Date()) {
    return accessToken; // TypeScript knows accessToken is string here because of the if condition
  }

  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  try {
    const response = await axios.get(
      process.env.MPESA_OAUTH_URL!,
      {
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    );

    const newToken = response.data.access_token;
    accessToken = newToken;
    tokenExpiry = new Date(Date.now() + 50 * 60 * 1000);

    return newToken; // Return the new token directly
  } catch (error) {
    console.error('Failed to get M-Pesa access token:', error);
    throw new Error('M-Pesa authentication failed');
  }
};