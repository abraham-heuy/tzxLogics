import { Response } from 'express';
import asyncHandler from '../../middlewares/handlers/asyncHandler';
import { UserRequest } from '../../util/types/authUser';
import { AppDataSource } from '../../config/data-source';
import { Investment, InvestmentStatus } from '../../entities/Investment';
import { User } from '../../entities/User';
import { generateReference } from '../../util/helpers/referenceGenerator';
import { sendInvestmentApprovalEmail, sendInvestmentRejectionEmail } from '../../services/approvalservice';

export const getTransactions = asyncHandler(async (req: UserRequest, res: Response) => {
  const investmentRepo = AppDataSource.getRepository(Investment);
  
  const {
    page = 1,
    limit = 10,
    status,
    search,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'DESC'
  } = req.query;

  const queryBuilder = investmentRepo.createQueryBuilder('investment')
    .leftJoinAndSelect('investment.user', 'user');

  // Apply filters
  if (status && status !== 'all') {
    queryBuilder.andWhere('investment.status = :status', { status });
  }

  if (search) {
    queryBuilder.andWhere(
      '(user.fullName ILIKE :search OR investment.investmentReference ILIKE :search OR investment.mpesaTransactionCode ILIKE :search)',
      { search: `%${search}%` }
    );
  }

  if (startDate) {
    queryBuilder.andWhere('investment.createdAt >= :startDate', { startDate: new Date(startDate as string) });
  }

  if (endDate) {
    queryBuilder.andWhere('investment.createdAt <= :endDate', { endDate: new Date(endDate as string) });
  }

  // Apply sorting
  queryBuilder.orderBy(`investment.${sortBy}`, sortOrder as 'ASC' | 'DESC');

  // Pagination
  const skip = (Number(page) - 1) * Number(limit);
  queryBuilder.skip(skip).take(Number(limit));

  const [transactions, total] = await queryBuilder.getManyAndCount();

  res.status(200).json({
    success: true,
    data: transactions,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
});

/**
 * Create a new transaction for a logged-in user
 * This skips basic details and uses the existing user profile
 */
export const createTransaction = asyncHandler(async (req: UserRequest, res: Response) => {
  const {
    // Step 2: Pool Selection
    selectedPool,
    investmentAmount,
    
    // Step 3 & 4: Payment
    mpesaPhone,
    mpesaTransactionCode,
    
    // Step 5: Signature
    digitalSignature,
    agreementSignedAt,
  } = req.body;

  // Validate required fields
  if (!selectedPool || !investmentAmount || !mpesaPhone || !mpesaTransactionCode || !digitalSignature) {
    return res.status(400).json({ 
      message: 'Missing required fields: pool, amount, payment details, and signature are required' 
    });
  }

  // Ensure user is authenticated
  if (!req.user?.id) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  const investmentRepo = AppDataSource.getRepository(Investment);
  const userRepo = AppDataSource.getRepository(User);

  // Verify user exists and is approved
  const user = await userRepo.findOne({
    where: { id: req.user.id }
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (!user.isApproved) {
    return res.status(403).json({ message: 'Account must be approved before making additional investments' });
  }

  // Calculate fees and total
  const fee = investmentAmount * (selectedPool.fee || 0.025);
  const totalAmount = investmentAmount + fee;

  // Create new investment
  const investment = new Investment();
  investment.userId = req.user.id;
  investment.investmentReference = generateReference('INV');
  investment.digitalSignature = digitalSignature;
  investment.agreementSignedAt = agreementSignedAt ? new Date(agreementSignedAt) : new Date();
  investment.poolName = selectedPool.name;
  investment.investmentAmount = investmentAmount;
  investment.fee = fee;
  investment.totalAmount = totalAmount;
  investment.mpesaPhoneNumber = mpesaPhone;
  investment.mpesaTransactionCode = mpesaTransactionCode;
  investment.mpesaPaidAt = new Date();
  investment.status = InvestmentStatus.PENDING;

  await investmentRepo.save(investment);

  res.status(201).json({
    success: true,
    message: 'Investment transaction created successfully',
    data: {
      id: investment.id,
      investmentReference: investment.investmentReference,
      amount: investment.investmentAmount,
      totalAmount: investment.totalAmount,
      status: investment.status,
      createdAt: investment.createdAt
    }
  });
});


// ... existing code ...

export const approveTransaction = asyncHandler(async (req: UserRequest, res: Response) => {
  const { id } = req.params;
  const { adminNotes } = req.body;

  // Fix: Ensure id is a string
  const transactionId = Array.isArray(id) ? id[0] : id;

  const investmentRepo = AppDataSource.getRepository(Investment);
  
  const investment = await investmentRepo.findOne({
    where: { id: transactionId },
    relations: ['user']
  });

  if (!investment) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  if (investment.status !== InvestmentStatus.PENDING) {
    return res.status(400).json({ message: 'Transaction is not pending' });
  }

  // Update investment
  investment.status = InvestmentStatus.APPROVED;
  investment.approvedAt = new Date();
  investment.approvedByUserId = req.user?.id!;
  if (adminNotes) {
    investment.adminNotes = adminNotes;
  }

  await investmentRepo.save(investment);

  // Update user approval status if this is their first investment
  if (investment.user && !investment.user.isApproved) {
    const userRepo = AppDataSource.getRepository(User);
    investment.user.isApproved = true;
    await userRepo.save(investment.user);
  }

  // Send approval email to user
  try {
    await sendInvestmentApprovalEmail(
      investment.user.email,
      investment.user.fullName,
      investment.investmentReference,
      investment.investmentAmount,
      investment.poolName,
      adminNotes
    );
  } catch (emailError) {
    console.error('Failed to send approval email:', emailError);
    // Don't fail the transaction if email fails
  }

  res.status(200).json({
    success: true,
    message: 'Transaction approved successfully',
    data: investment
  });
});

export const rejectTransaction = asyncHandler(async (req: UserRequest, res: Response) => {
  const { id } = req.params;
  const { adminNotes } = req.body;

  // Fix: Ensure id is a string
  const transactionId = Array.isArray(id) ? id[0] : id;

  const investmentRepo = AppDataSource.getRepository(Investment);
  
  const investment = await investmentRepo.findOne({
    where: { id: transactionId },
    relations: ['user']
  });

  if (!investment) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  if (investment.status !== InvestmentStatus.PENDING) {
    return res.status(400).json({ message: 'Transaction is not pending' });
  }

  investment.status = InvestmentStatus.REJECTED;
  investment.adminNotes = adminNotes || investment.adminNotes;
  await investmentRepo.save(investment);

  // Send rejection email to user
  try {
    await sendInvestmentRejectionEmail(
      investment.user.email,
      investment.user.fullName,
      investment.investmentReference,
      investment.investmentAmount,
      investment.poolName,
      adminNotes
    );
  } catch (emailError) {
    console.error('Failed to send rejection email:', emailError);
    // Don't fail the transaction if email fails
  }

  res.status(200).json({
    success: true,
    message: 'Transaction rejected',
    data: investment
  });
});

export const getTransactionDetails = asyncHandler(async (req: UserRequest, res: Response) => {
  const { id } = req.params;

  // Fix: Ensure id is a string
  const transactionId = Array.isArray(id) ? id[0] : id;

  const investmentRepo = AppDataSource.getRepository(Investment);
  
  const investment = await investmentRepo.findOne({
    where: { id: transactionId },
    relations: ['user']
  });

  if (!investment) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  res.status(200).json({
    success: true,
    data: investment
  });
});

/**
 * Get transactions for the currently logged-in user
 */
export const getMyTransactions = asyncHandler(async (req: UserRequest, res: Response) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  const investmentRepo = AppDataSource.getRepository(Investment);
  
  const {
    page = 1,
    limit = 10,
    status,
    sortBy = 'createdAt',
    sortOrder = 'DESC'
  } = req.query;

  const queryBuilder = investmentRepo.createQueryBuilder('investment')
    .where('investment.userId = :userId', { userId: req.user.id });

  // Apply status filter
  if (status && status !== 'all') {
    queryBuilder.andWhere('investment.status = :status', { status });
  }

  // Apply sorting
  queryBuilder.orderBy(`investment.${sortBy}`, sortOrder as 'ASC' | 'DESC');

  // Pagination
  const skip = (Number(page) - 1) * Number(limit);
  queryBuilder.skip(skip).take(Number(limit));

  const [transactions, total] = await queryBuilder.getManyAndCount();

  res.status(200).json({
    success: true,
    data: transactions,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
});

