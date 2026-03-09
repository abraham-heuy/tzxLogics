import express from 'express';
import { body } from 'express-validator';
import { validate } from '../../middlewares/handlers/validationMiddleware';
import { login, logout, forgotPassword, resetPassword, refreshToken, getCurrentUser, checkAuthStatus, changePassword } from '../auth/authController';
import { protect } from '../../middlewares/auth/auth';

const router = express.Router();

// Login validation
const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
];

// Forgot password validation
const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  validate
];

// Reset password validation
const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Token is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate
];

router.post('/login', loginValidation, login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);
router.post('/refresh-token', refreshToken);

router.get('/me', protect, getCurrentUser); // Get current user details
router.get('/status', protect, checkAuthStatus); // Check auth status
router.post('/change-password', protect, changePassword);


export default router;