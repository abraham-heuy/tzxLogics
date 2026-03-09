import express from 'express';
import { protect } from '../../middlewares/auth/auth';
import { adminGuard } from '../../middlewares/auth/role';
import {
  getUsers,
  getUserDetails,
  getUserStats,
  getUsersByRole,
  deleteUser,
  disableUser,
  approveUser
} from './userController';

const router = express.Router();

// All routes require authentication and admin role
router.use(protect, adminGuard);

// User statistics
router.get('/stats', getUserStats);

// Get users by role
router.get('/role/:roleName', getUsersByRole);

// User monitoring (view only)
router.get('/', getUsers);
router.get('/:id', getUserDetails);

// User management actions
router.delete('/:id', deleteUser);
router.patch('/:id/disable', disableUser);
router.patch('/:id/approve', protect, adminGuard, approveUser);

export default router;