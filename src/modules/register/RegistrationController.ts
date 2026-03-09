import { Request, Response } from 'express';
import { AppDataSource } from '../../config/data-source';
import { User } from '../../entities/User';
import { Investment, InvestmentStatus } from '../../entities/Investment';
import { Role } from '../../entities/Role';
import bcrypt from 'bcryptjs';
import { generateReference } from '../../util/helpers/referenceGenerator';
import { sendMpesaSTK } from '../../services/mpesaService';
import asyncHandler from '../../middlewares/handlers/asyncHandler';

// Get repositories
const userRepository = AppDataSource.getRepository(User);
const investmentRepository = AppDataSource.getRepository(Investment);
const roleRepository = AppDataSource.getRepository(Role);

/**
 * Register a new user and investment
 * This handles the entire multi-step registration process
 */
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const {
    // Step 1: Basic Details
    fullName,
    email,
    phone,
    idNumber,
    password,
    
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

  // Start a transaction
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Check if user already exists
    const existingUser = await userRepository.findOne({
      where: [
        { email: email },
        { phone: phone },
        { idNumber: idNumber }
      ]
    });

    if (existingUser) {
      res.status(400);
      throw new Error('User with this email, phone or ID already exists');
    }

    // Get investor role (role name from env or default to 'investor')
    const investorRoleName = process.env.INVESTOR_ROLE_NAME || 'investor';
    const investorRole = await roleRepository.findOne({
      where: { name: investorRoleName }
    });

    if (!investorRole) {
      res.status(500);
      throw new Error('Investor role not configured');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user (NO reference number here - it's in investment)
    const user = new User();
    user.fullName = fullName;
    user.email = email;
    user.phone = phone;
    user.idNumber = idNumber;
    user.password = hashedPassword;
    user.roleId = investorRole.id;
    user.isApproved = false;
    user.emailVerified = false;

    const savedUser = await queryRunner.manager.save(user);

    // Calculate fees and total
    const fee = investmentAmount * (selectedPool.fee || 0.025);
    const totalAmount = investmentAmount + fee;

    // Create investment (WITH reference number)
    const investment = new Investment();
    investment.userId = savedUser.id;
    investment.investmentReference = generateReference('INV'); // Reference per investment
    investment.digitalSignature = digitalSignature;
    investment.agreementSignedAt = agreementSignedAt ? new Date(agreementSignedAt) : new Date();
    investment.poolName = selectedPool.name;
    investment.investmentAmount = investmentAmount;
    investment.fee = fee;
    investment.totalAmount = totalAmount;
    investment.mpesaPhoneNumber = mpesaPhone;
    investment.mpesaTransactionCode = mpesaTransactionCode;
    investment.mpesaPaidAt = new Date();
    investment.status = InvestmentStatus.PENDING; // ✅ Use enum value, not string literal

    const savedInvestment = await queryRunner.manager.save(investment);

    // Commit transaction
    await queryRunner.commitTransaction();

    // Send response
    res.status(201).json({
      success: true,
      message: 'Registration successful. Awaiting admin approval.',
      data: {
        user: {
          id: savedUser.id,
          fullName: savedUser.fullName,
          email: savedUser.email,
        },
        investment: {
          reference: savedInvestment.investmentReference,
          amount: savedInvestment.investmentAmount,
          status: savedInvestment.status,
        }
      }
    });

  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
});

/**
 * Step 3: Initiate M-Pesa Payment
 */
/**
 * Step 3: Initiate M-Pesa Payment
 */
export const initiateMpesaPayment = asyncHandler(async (req: Request, res: Response) => {
  const { phoneNumber, amount, reference } = req.body;

  // Validate amount is number and positive
  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error('Invalid amount');
  }

  try {
    // Ensure amount is whole number
    const wholeAmount = Math.floor(amount);
    
    console.log('💰 Initiating M-Pesa payment:', {
      phone: phoneNumber,
      amount: wholeAmount,
      reference
    });

    const mpesaResponse = await sendMpesaSTK({
      phoneNumber,
      amount: wholeAmount,
      accountReference: reference,
      transactionDesc: 'TZX Investment'
    });

    res.json({
      success: true,
      message: 'STK push sent to your phone',
      data: {
        merchantRequestID: mpesaResponse.MerchantRequestID,
        checkoutRequestID: mpesaResponse.CheckoutRequestID,
      }
    });
  } catch (error: any) {
    console.error('❌ M-Pesa initiation error:', error);
    res.status(500);
    throw new Error(error.message || 'Failed to initiate M-Pesa payment');
  }
});

/**
 * Step 4: Verify M-Pesa Payment (Callback from Safaricom)
 */
export const mpesaCallback = asyncHandler(async (req: Request, res: Response) => {
  const { Body } = req.body;
  
  // Safaricom callback structure
  const {
    MerchantRequestID,
    CheckoutRequestID,
    ResultCode,
    ResultDesc,
    MpesaReceiptNumber,
    PhoneNumber,
    Amount
  } = Body.stkCallback;

  // Accept response immediately (Safaricom requires 200)
  res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });

  if (ResultCode === 0) {
    // Payment successful - update investment
    await investmentRepository.update(
      { mpesaTransactionCode: MpesaReceiptNumber },
      { 
        mpesaPaidAt: new Date(),
        status: InvestmentStatus.PENDING //  Use enum value
      }
    );
  } else {
    // Payment failed - log for monitoring
    console.error('M-Pesa payment failed:', ResultDesc);
  }
});

/**
 * Get registration status by investment reference
 */
export const getRegistrationStatus = asyncHandler(async (req: Request, res: Response) => {
  const { reference } = req.params;

  // ✅ Fix: reference is a string, not string[]
  const investment = await investmentRepository.findOne({
    where: { investmentReference: reference as string }, // Type assertion
    relations: ['user']
  });

  if (!investment) {
    res.status(404);
    throw new Error('Investment not found');
  }

  res.json({
    success: true,
    data: {
      status: investment.status,
      investmentReference: investment.investmentReference,
      amount: investment.investmentAmount,
      createdAt: investment.createdAt,
      approvedAt: investment.approvedAt,
      user: {
        fullName: investment.user.fullName,
        email: investment.user.email,
      }
    }
  });
});