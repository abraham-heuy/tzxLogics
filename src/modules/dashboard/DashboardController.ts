import { Response } from 'express';
import asyncHandler from '../../middlewares/handlers/asyncHandler';
import { UserRequest } from '../../util/types/authUser';
import { AppDataSource } from '../../config/data-source';
import { User } from '../../entities/User';
import { Investment } from '../../entities/Investment';
import { SupportTicket } from '../../entities/SupportTicket';
import { Between } from 'typeorm';

export const getDashboardStats = asyncHandler(async (req: UserRequest, res: Response) => {
  const investmentRepo = AppDataSource.getRepository(Investment);
  const userRepo = AppDataSource.getRepository(User);
  const ticketRepo = AppDataSource.getRepository(SupportTicket);

  // Get date range for this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Total investments value
  const totalInvestmentsResult = await investmentRepo
    .createQueryBuilder('investment')
    .select('SUM(investment.investmentAmount)', 'total')
    .getRawOne();
  const totalInvestments = Number(totalInvestmentsResult?.total) || 0;

  // This month's investments
  const monthlyInvestmentsResult = await investmentRepo
    .createQueryBuilder('investment')
    .select('SUM(investment.investmentAmount)', 'total')
    .where('investment.createdAt BETWEEN :start AND :end', {
      start: startOfMonth,
      end: endOfMonth
    })
    .getRawOne();
  const monthlyInvestments = Number(monthlyInvestmentsResult?.total) || 0;

  // Investment count by status
  const investmentsByStatus = await investmentRepo
    .createQueryBuilder('investment')
    .select('investment.status', 'status')
    .addSelect('COUNT(*)', 'count')
    .groupBy('investment.status')
    .getRawMany();

  const pendingInvestments = investmentsByStatus.find(s => s.status === 'pending')?.count || 0;
  const approvedInvestments = investmentsByStatus.find(s => s.status === 'approved')?.count || 0;
  const rejectedInvestments = investmentsByStatus.find(s => s.status === 'rejected')?.count || 0;

  // User stats
  const totalUsers = await userRepo.count();
  const newUsersThisMonth = await userRepo.count({
    where: {
      createdAt: Between(startOfMonth, endOfMonth)
    }
  });

  // Ticket stats
  const ticketsByStatus = await ticketRepo
    .createQueryBuilder('ticket')
    .select('ticket.status', 'status')
    .addSelect('COUNT(*)', 'count')
    .groupBy('ticket.status')
    .getRawMany();

  const openTickets = ticketsByStatus.find(s => s.status === 'open')?.count || 0;
  const inProgressTickets = ticketsByStatus.find(s => s.status === 'in_progress')?.count || 0;
  const resolvedTickets = ticketsByStatus.find(s => s.status === 'resolved')?.count || 0;

  res.status(200).json({
    success: true,
    data: {
      investments: {
        total: totalInvestments,
        monthly: monthlyInvestments,
        count: {
          pending: pendingInvestments,
          approved: approvedInvestments,
          rejected: rejectedInvestments,
          total: pendingInvestments + approvedInvestments + rejectedInvestments
        }
      },
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth
      },
      tickets: {
        open: openTickets,
        inProgress: inProgressTickets,
        resolved: resolvedTickets,
        total: openTickets + inProgressTickets + resolvedTickets
      }
    }
  });
});

export const getRecentActivity = asyncHandler(async (req: UserRequest, res: Response) => {
    const investmentRepo = AppDataSource.getRepository(Investment);
    const ticketRepo = AppDataSource.getRepository(SupportTicket);
    const userRepo = AppDataSource.getRepository(User);
  
    // Get recent investments with users resolved
    const recentInvestments = await investmentRepo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 5
    });
  
    // Get recent tickets - need to resolve the user Promise
    const recentTicketsRaw = await ticketRepo.find({
      order: { createdAt: 'DESC' },
      take: 5
    });
  
    // Resolve the user Promise for each ticket
    const recentTickets = await Promise.all(
      recentTicketsRaw.map(async (ticket) => {
        const user = await ticket.user; // Resolve the Promise
        return {
          ...ticket,
          user // Add resolved user
        };
      })
    );
  
    // Get recent users
    const recentUsers = await userRepo.find({
      order: { createdAt: 'DESC' },
      take: 5
    });
  
    // Combine and sort activities
    const activities = [
      ...recentInvestments.map(inv => ({
        id: inv.id,
        type: 'investment',
        action: 'New investment',
        reference: inv.investmentReference,
        status: inv.status,
        user: inv.user?.fullName || 'Unknown',
        time: inv.createdAt,
        amount: inv.investmentAmount
      })),
      ...recentTickets.map(ticket => ({
        id: ticket.id,
        type: 'ticket',
        action: ticket.subject,
        reference: ticket.ticketNumber,
        status: ticket.status,
        user: ticket.user?.fullName || 'Unknown', // Now user is resolved
        time: ticket.createdAt
      })),
      ...recentUsers.map(user => ({
        id: user.id,
        type: 'user',
        action: 'New user registered',
        reference: user.id.substring(0, 8),
        status: user.isApproved ? 'approved' : 'pending',
        user: user.fullName,
        time: user.createdAt
      }))
    ];
  
    // Sort by time descending
    activities.sort((a, b) => b.time.getTime() - a.time.getTime());
  
    res.status(200).json({
      success: true,
      data: activities.slice(0, 10)
    });
  });

/**
 * Get dashboard stats for a specific user (for investor dashboard)
 */
export const getUserDashboardStats = asyncHandler(async (req: UserRequest, res: Response) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  const investmentRepo = AppDataSource.getRepository(Investment);
  const userRepo = AppDataSource.getRepository(User);

  // Get user details
  const user = await userRepo.findOne({
    where: { id: req.user.id }
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Get user's investments
  const userInvestments = await investmentRepo.find({
    where: { userId: req.user.id },
    order: { createdAt: 'DESC' }
  });

  // Calculate stats
  const totalInvested = userInvestments.reduce((sum, inv) => sum + inv.investmentAmount, 0);
  const pendingInvestments = userInvestments.filter(inv => inv.status === 'pending').length;
  const approvedInvestments = userInvestments.filter(inv => inv.status === 'approved').length;
  const activeInvestments = userInvestments.filter(inv => inv.status === 'approved').length; // You might want a separate 'active' status

  res.status(200).json({
    success: true,
    data: {
      user: {
        fullName: user.fullName,
        email: user.email,
        isApproved: user.isApproved,
        memberSince: user.createdAt
      },
      investments: {
        total: userInvestments.length,
        totalAmount: totalInvested,
        pending: pendingInvestments,
        approved: approvedInvestments,
        active: activeInvestments
      },
      recentInvestments: userInvestments.slice(0, 5)
    }
  });
});