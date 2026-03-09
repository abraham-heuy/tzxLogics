import { Response } from 'express';
import asyncHandler from '../../middlewares/handlers/asyncHandler';
import { UserRequest } from '../../util/types/authUser';
import { AppDataSource } from '../../config/data-source';
import { User } from '../../entities/User';
import { Investment } from '../../entities/Investment';
import { SupportTicket } from '../../entities/SupportTicket';
import { sendAccountApprovalEmail } from '../../services/approvalservice';

/**
 * Get all users with pagination and filters (for monitoring)
 */
export const getUsers = asyncHandler(async (req: UserRequest, res: Response) => {
  const userRepo = AppDataSource.getRepository(User);

  const {
    page = 1,
    limit = 10,
    search,
    role,
    status,
    sortBy = 'createdAt',
    sortOrder = 'DESC'
  } = req.query;

  const queryBuilder = userRepo.createQueryBuilder('user')
    .leftJoinAndSelect('user.role', 'role')
    .loadRelationCountAndMap('user.investmentCount', 'user.investments')
    .loadRelationCountAndMap('user.ticketCount', 'user.supportTickets');

  // Apply search filter
  if (search) {
    queryBuilder.andWhere(
      '(user.fullName ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)',
      { search: `%${search}%` }
    );
  }

  // Apply role filter
  if (role && role !== 'all') {
    queryBuilder.andWhere('role.name = :role', { role });
  }

  // Apply approval status filter
  if (status && status !== 'all') {
    const isApproved = status === 'approved';
    queryBuilder.andWhere('user.isApproved = :isApproved', { isApproved });
  }

  // Apply sorting
  queryBuilder.orderBy(`user.${sortBy}`, sortOrder as 'ASC' | 'DESC');

  // Pagination
  const skip = (Number(page) - 1) * Number(limit);
  queryBuilder.skip(skip).take(Number(limit));

  const [users, total] = await queryBuilder.getManyAndCount();

  // Remove sensitive data
  const sanitizedUsers = users.map(user => {
    const { password, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      totalInvestments: (user as any).investmentCount || 0,
      totalTickets: (user as any).ticketCount || 0
    };
  });

  // Get total investment amount for each user
  const usersWithInvestmentTotals = await Promise.all(
    sanitizedUsers.map(async (user) => {
      const investmentRepo = AppDataSource.getRepository(Investment);
      const totalInvested = await investmentRepo
        .createQueryBuilder('investment')
        .select('SUM(investment.investmentAmount)', 'total')
        .where('investment.userId = :userId', { userId: user.id })
        .getRawOne();

      return {
        ...user,
        totalInvested: Number(totalInvested?.total) || 0
      };
    })
  );

  res.status(200).json({
    success: true,
    data: usersWithInvestmentTotals,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
});

/**
 * Get user statistics for monitoring dashboard
 */
export const getUserStats = asyncHandler(async (req: UserRequest, res: Response) => {
  const userRepo = AppDataSource.getRepository(User);
  const investmentRepo = AppDataSource.getRepository(Investment);
  const ticketRepo = AppDataSource.getRepository(SupportTicket);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now.setDate(now.getDate() - 7));

  // User counts
  const totalUsers = await userRepo.count();
  const approvedUsers = await userRepo.count({ where: { isApproved: true } });
  const pendingUsers = await userRepo.count({ where: { isApproved: false } });

  // Role counts
  const investors = await userRepo
    .createQueryBuilder('user')
    .leftJoin('user.role', 'role')
    .where('role.name = :role', { role: 'investor' })
    .getCount();

  const admins = await userRepo
    .createQueryBuilder('user')
    .leftJoin('user.role', 'role')
    .where('role.name = :role', { role: 'bossy' })
    .getCount();

  // New users
  const newThisMonth = await userRepo
    .createQueryBuilder('user')
    .where('user.createdAt >= :startOfMonth', { startOfMonth })
    .getCount();

  const newThisWeek = await userRepo
    .createQueryBuilder('user')
    .where('user.createdAt >= :startOfWeek', { startOfWeek: new Date(now.setDate(now.getDate() - 7)) })
    .getCount();

  // Investment stats
  const totalInvestments = await investmentRepo.count();
  const totalInvestedAmount = await investmentRepo
    .createQueryBuilder('investment')
    .select('SUM(investment.investmentAmount)', 'total')
    .getRawOne();

  // Users with activity
  const usersWithInvestments = await userRepo
    .createQueryBuilder('user')
    .innerJoin('user.investments', 'investment')
    .select('COUNT(DISTINCT user.id)', 'count')
    .getRawOne();

  const usersWithTickets = await userRepo
    .createQueryBuilder('user')
    .innerJoin('user.supportTickets', 'ticket')
    .select('COUNT(DISTINCT user.id)', 'count')
    .getRawOne();

  // Recent signups
  const recentSignups = await userRepo
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.role', 'role')
    .orderBy('user.createdAt', 'DESC')
    .limit(5)
    .getMany();

  // Remove passwords from recent signups
  const sanitizedRecentSignups = recentSignups.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });

  res.status(200).json({
    success: true,
    data: {
      overview: {
        totalUsers,
        approvedUsers,
        pendingUsers,
        investors,
        admins,
        newThisMonth,
        newThisWeek
      },
      engagement: {
        usersWithInvestments: parseInt(usersWithInvestments?.count || '0'),
        usersWithTickets: parseInt(usersWithTickets?.count || '0'),
        totalInvestments,
        totalInvestedAmount: Number(totalInvestedAmount?.total) || 0
      },
      recentSignups: sanitizedRecentSignups
    }
  });
});

/**
 * Get a single user by ID with full monitoring details
 */
export const getUserDetails = asyncHandler(async (req: UserRequest, res: Response) => {
  const { id } = req.params;

  const userRepo = AppDataSource.getRepository(User);

  const user = await userRepo.findOne({
    where: { id: id as string },
    relations: ['role'],
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Get user's investments
  const investmentRepo = AppDataSource.getRepository(Investment);
  const investments = await investmentRepo.find({
    where: { userId: user.id },
    order: { createdAt: 'DESC' }
  });

  // Get investment summary
  const investmentSummary = await investmentRepo
    .createQueryBuilder('investment')
    .select('investment.status', 'status')
    .addSelect('COUNT(*)', 'count')
    .addSelect('SUM(investment.investmentAmount)', 'total')
    .where('investment.userId = :userId', { userId: user.id })
    .groupBy('investment.status')
    .getRawMany();

  // Get total invested
  const totalInvested = investments.reduce((sum, inv) => sum + inv.investmentAmount, 0);

  // Get user's support tickets
  const ticketRepo = AppDataSource.getRepository(SupportTicket);
  const tickets = await ticketRepo.find({
    where: { userId: user.id },
    order: { createdAt: 'DESC' }
  });

  // Get ticket summary
  const ticketSummary = await ticketRepo
    .createQueryBuilder('ticket')
    .select('ticket.status', 'status')
    .addSelect('COUNT(*)', 'count')
    .where('ticket.userId = :userId', { userId: user.id })
    .groupBy('ticket.status')
    .getRawMany();

  // Remove sensitive data
  const { password, ...userWithoutPassword } = user;

  res.status(200).json({
    success: true,
    data: {
      ...userWithoutPassword,
      summary: {
        totalInvested,
        totalInvestments: investments.length,
        totalTickets: tickets.length,
        investmentSummary,
        ticketSummary
      },
      recentInvestments: investments.slice(0, 5),
      recentTickets: tickets.slice(0, 5)
    }
  });
});

/**
 * Get users by role (for filtering)
 */
export const getUsersByRole = asyncHandler(async (req: UserRequest, res: Response) => {
  const { roleName } = req.params;

  const userRepo = AppDataSource.getRepository(User);

  const users = await userRepo
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.role', 'role')
    .where('role.name = :roleName', { roleName })
    .orderBy('user.createdAt', 'DESC')
    .getMany();

  // Remove passwords and add investment counts
  const usersWithCounts = await Promise.all(
    users.map(async (user) => {
      const { password, ...userWithoutPassword } = user;
      
      const investmentRepo = AppDataSource.getRepository(Investment);
      const investmentCount = await investmentRepo.count({
        where: { userId: user.id }
      });

      const ticketRepo = AppDataSource.getRepository(SupportTicket);
      const ticketCount = await ticketRepo.count({
        where: { userId: user.id }
      });

      return {
        ...userWithoutPassword,
        investmentCount,
        ticketCount
      };
    })
  );

  res.status(200).json({
    success: true,
    data: usersWithCounts
  });
});

/**
 * Delete a user (admin only)
 * Note: This will also delete related investments and tickets due to cascade
 */
export const deleteUser = asyncHandler(async (req: UserRequest, res: Response) => {
  const { id } = req.params;

  const userRepo = AppDataSource.getRepository(User);

  // Check if user exists
  const user = await userRepo.findOne({
    where: { id: id as string }
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Prevent deleting yourself
  if (req.user?.id === user.id) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }

  // Get counts for response message
  const investmentRepo = AppDataSource.getRepository(Investment);
  const investmentCount = await investmentRepo.count({
    where: { userId: user.id }
  });

  const ticketRepo = AppDataSource.getRepository(SupportTicket);
  const ticketCount = await ticketRepo.count({
    where: { userId: user.id }
  });

  // Delete the user (related investments and tickets will be deleted due to cascade)
  await userRepo.remove(user);

  res.status(200).json({
    success: true,
    message: `User deleted successfully. Removed ${investmentCount} investments and ${ticketCount} support tickets.`
  });
});

/**
 * Soft delete - Disable user instead of permanent delete
 */
export const disableUser = asyncHandler(async (req: UserRequest, res: Response) => {
  const { id } = req.params;

  const userRepo = AppDataSource.getRepository(User);

  const user = await userRepo.findOne({
    where: { id: id as string }
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Prevent disabling yourself
  if (req.user?.id === user.id) {
    return res.status(400).json({ message: 'You cannot disable your own account' });
  }

  // Toggle approval status (disable = set isApproved to false)
  user.isApproved = false;
  user.updatedAt = new Date();

  await userRepo.save(user);

  res.status(200).json({
    success: true,
    message: 'User disabled successfully',
    data: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      isApproved: user.isApproved
    }
  });
});


/**
 * Approve a user account
 */
export const approveUser = asyncHandler(async (req: UserRequest, res: Response) => {
  const { id } = req.params;
  const { adminNotes } = req.body;

  const userRepo = AppDataSource.getRepository(User);

  // Check if user exists
  const user = await userRepo.findOne({
    where: { id: id as string },
    relations: ['role']
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Prevent approving yourself (optional)
  if (req.user?.id === user.id) {
    return res.status(400).json({ message: 'You cannot approve your own account' });
  }

  // Check if already approved
  if (user.isApproved) {
    return res.status(400).json({ message: 'User is already approved' });
  }

  // Approve user
  user.isApproved = true;
  user.updatedAt = new Date();

  await userRepo.save(user);

  // Send approval email
  try {
    await sendAccountApprovalEmail(
      user.email,
      user.fullName,
      adminNotes
    );
  } catch (emailError) {
    console.error('Failed to send approval email:', emailError);
    // Don't fail the approval if email fails
  }

  res.status(200).json({
    success: true,
    message: 'User approved successfully',
    data: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      isApproved: user.isApproved,
      role: user.role?.name
    }
  });
});