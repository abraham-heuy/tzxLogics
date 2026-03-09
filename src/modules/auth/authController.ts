import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import asyncHandler from '../../middlewares/handlers/asyncHandler';
import { AppDataSource } from '../../config/data-source';
import { User } from '../../entities/User';
import { generateToken } from '../../util/helpers/generateToken';
import { sendPasswordResetEmail } from '../../services/emailService';
import Jwt  from 'jsonwebtoken';
import { UserRequest } from '../../util/types/authUser';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  // Find user with role
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({
    where: { email },
    relations: ['role']
  });

  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  // Update last login
  user.lastLoginAt = new Date();
  await userRepo.save(user);

  // Generate tokens
  const tokens = generateToken(res, user.id, user.role?.name || 'investor');

  // Send response (without sensitive data)
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role?.name,
        isApproved: user.isApproved
      },
      tokens: {
        accessToken: tokens.accessToken,
        expiresIn: '30m'
      }
    }
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
    // Clear cookies
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
  
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  });

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { email } });

  if (!user) {
    // Don't reveal that user doesn't exist for security
    return res.status(200).json({ 
      success: true, 
      message: 'If your email is registered, you will receive a password reset link' 
    });
  }

  // Generate reset token (expires in 1 hour)
  const resetToken = Jwt.sign(
    { userId: user.id, type: 'password-reset' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  // Save reset token to user (optional - you might want to store in a separate table)
  // For now, we'll just send email

  // Send reset email
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  await sendPasswordResetEmail(user.email, user.fullName, resetLink);

  res.status(200).json({ 
    success: true, 
    message: 'If your email is registered, you will receive a password reset link' 
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  try {
    // Verify token
    const decoded = Jwt.verify(token, process.env.JWT_SECRET!) as { userId: string, type: string };
    
    if (decoded.type !== 'password-reset') {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: decoded.userId } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await userRepo.save(user);

    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    return res.status(400).json({ message: 'Invalid or expired reset token' });
  }
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }

  try {
    const decoded = Jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as { userId: string };
    
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: decoded.userId },
      relations: ['role']
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Generate new tokens
    const tokens = generateToken(res, user.id, user.role?.name || 'investor');

    res.status(200).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        expiresIn: '30m'
      }
    });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
});

/**
 * Get current logged-in user details
 * Uses the UserRequest type which has the user property from the protect middleware
 */
export const getCurrentUser = asyncHandler(async (req: UserRequest, res: Response) => {
  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authenticated' 
    });
  }

  // Fetch fresh user data from database with role
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({
    where: { id: req.user.id },
    relations: ['role']
  });

  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: 'User not found' 
    });
  }

  // Return user data
  res.status(200).json({
    success: true,
    data: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role?.name || 'investor',
      isApproved: user.isApproved,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    }
  });
});

/**
 * Check authentication status
 * Simple endpoint to verify if token is still valid
 */
/**
 * Check authentication status
 * Simple endpoint to verify if token is still valid
 */
export const checkAuthStatus = asyncHandler(async (req: UserRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      authenticated: false,
      message: 'Not authenticated' 
    });
  }

  // Fetch fresh user data from database with role to get isApproved status
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({
    where: { id: req.user.id },
    relations: ['role']
  });

  if (!user) {
    return res.status(404).json({ 
      success: false, 
      authenticated: false,
      message: 'User not found' 
    });
  }

  res.status(200).json({
    success: true,
    authenticated: true,
    data: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role?.name || 'investor',
      isApproved: user.isApproved 
    }
  });
});

/**
 * Change password for logged-in user
 */
export const changePassword = asyncHandler(async (req: UserRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  // Validate input
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ 
      success: false, 
      message: 'Current password and new password are required' 
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ 
      success: false, 
      message: 'New password must be at least 8 characters' 
    });
  }

  if (!req.user?.id) {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authenticated' 
    });
  }

  const userRepo = AppDataSource.getRepository(User);
  
  // Get user with password (since it's normally excluded)
  const user = await userRepo
    .createQueryBuilder('user')
    .addSelect('user.password')
    .where('user.id = :id', { id: req.user.id })
    .getOne();

  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: 'User not found' 
    });
  }

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ 
      success: false, 
      message: 'Current password is incorrect' 
    });
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // Update password
  user.password = hashedPassword;
  await userRepo.save(user);

  res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
});