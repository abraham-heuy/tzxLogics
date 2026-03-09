import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import {
  registerUser,
  initiateMpesaPayment,
  mpesaCallback,
  getRegistrationStatus
} from '../register/RegistrationController';

const router = express.Router();

// Validation middleware
const validate = (req: Request, res: Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Validation rules
const validateRegistration = [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').matches(/^\+?254\d{9}$/).withMessage('Valid Kenyan phone number required'),
  body('idNumber').matches(/^\d{5,8}$/).withMessage('Valid ID number required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('selectedPool').notEmpty().withMessage('Pool selection required'),
  body('investmentAmount').isNumeric().withMessage('Valid investment amount required'),
  body('mpesaPhone').matches(/^\+?254\d{9}$/).withMessage('Valid M-Pesa number required'),
  body('mpesaTransactionCode').matches(/^[A-Z0-9]{10,12}$/i).withMessage('Valid M-Pesa code required'),
  body('digitalSignature').notEmpty().withMessage('Digital signature required'),
  validate // Add validation middleware
];

// M-Pesa initiate validation
const validateMpesaInitiate = [
  body('phoneNumber').matches(/^\+?254\d{9}$/).withMessage('Valid phone number required'),
  body('amount').isNumeric().withMessage('Valid amount required'),
  body('reference').notEmpty().withMessage('Reference is required'),
  validate
];

// Routes
router.post('/register', validateRegistration, registerUser);

router.post('/mpesa/initiate', validateMpesaInitiate, initiateMpesaPayment);

router.post('/mpesa/callback', mpesaCallback);

router.get('/status/:reference', getRegistrationStatus);

export default router;