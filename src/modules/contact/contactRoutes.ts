import express from 'express';
import { body } from 'express-validator';
import { validate } from '../../middlewares/handlers/validationMiddleware';
import { protect } from '../../middlewares/auth/auth';
import { adminGuard } from '../../middlewares/auth/role';
import {
  createContactMessage,
  getContactMessages,
  getContactMessage,
  replyToContactMessage,
  archiveContactMessage,
  markAsRead,
  deleteContactMessage,
  getContactStats
} from '../contact/contactController';

const router = express.Router();

// Public route - anyone can submit contact form
const contactValidation = [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('message').notEmpty().withMessage('Message is required'),
  validate
];

router.post('/', contactValidation, createContactMessage);

// Protected routes - admin only
router.use(protect, adminGuard);

router.get('/', getContactMessages);
router.get('/stats', getContactStats);
router.get('/:id', getContactMessage);
router.post('/:id/reply', [
  body('response').notEmpty().withMessage('Response is required'),
  validate
], replyToContactMessage);
router.patch('/:id/read', markAsRead);
router.patch('/:id/archive', archiveContactMessage);
router.delete('/:id', deleteContactMessage);

export default router;