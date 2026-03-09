import express from 'express';
import { protect } from '../../middlewares/auth/auth';
import { adminGuard, investorGuard} from '../../middlewares/auth/role';

// Dashboard
import { getDashboardStats, getRecentActivity } from '../dashboard/DashboardController';

// Transactions
import {
  getTransactions,
  approveTransaction,
  rejectTransaction,
  getTransactionDetails,
  createTransaction,
  getMyTransactions
} from '../references/transactionController';

// Tickets
import {
  getTickets,
  respondToTicket,
  resolveTicket,
  closeTicket,
  getTicketDetails,
  createTicket,
  getMyTickets,
  createUserTicket,
  getMyTicketDetails
} from '../contact/ticketController';

const router = express.Router();



// Dashboard routes
router.get('/dashboard/stats',protect,adminGuard,getDashboardStats);
router.get('/dashboard/activity',protect,adminGuard,getRecentActivity);

// User ticket routes (protected with investorGuard)
router.get('/tickets/my', protect,investorGuard, getMyTickets); // Get user's own tickets
router.post('/tickets/user', protect, investorGuard, createUserTicket); // Create ticket (protected version)
router.get('/tickets/my/:id', protect, investorGuard, getMyTicketDetails); // Get specific ticket


// Ticket routes
router.post('/', createTicket)
router.get('/tickets',protect,adminGuard,getTickets);
router.get('/tickets/:id',protect,adminGuard,getTicketDetails);
router.post('/tickets/:id/respond',protect,adminGuard,respondToTicket);
router.patch('/tickets/:id/resolve',protect,adminGuard,resolveTicket);
router.patch('/tickets/:id/close',protect,adminGuard,closeTicket);



// In your routes file (e.g., routes/transactionRoutes.ts or routes/adminRoutes.ts)

// Protected routes for users
router.post('/transactions', protect,investorGuard,createTransaction); // Create new transaction
router.get('/transactions/my', protect,investorGuard,getMyTransactions); // Get user's own transactions

// Admin routes (already protected with requireAdmin)
router.get('/transactions', protect,adminGuard,getTransactions);
router.get('/transactions/:id', protect,getTransactionDetails);
router.patch('/transactions/:id/approve',protect,adminGuard, approveTransaction);
router.patch('/transactions/:id/reject', protect,adminGuard,rejectTransaction);

export default router;