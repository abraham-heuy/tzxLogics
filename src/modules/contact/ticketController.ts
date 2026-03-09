import { Response } from 'express';
import asyncHandler from '../../middlewares/handlers/asyncHandler';
import { UserRequest } from '../../util/types/authUser';
import { AppDataSource } from '../../config/data-source';
import { SupportTicket, TicketStatus, TicketPriority } from '../../entities/SupportTicket';
import { User } from '../../entities/User';
import { Investment } from '../../entities/Investment';
import { sendTicketResponseEmail } from '../../services/emailService';

export const getTickets = asyncHandler(async (req: UserRequest, res: Response) => {
    const ticketRepo = AppDataSource.getRepository(SupportTicket);

    const {
        page = 1,
        limit = 10,
        status,
        priority,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
    } = req.query;

    const queryBuilder = ticketRepo.createQueryBuilder('ticket')
        .leftJoinAndSelect('ticket.user', 'user')
        .leftJoinAndSelect('ticket.investment', 'investment');

    // Apply filters
    if (status && status !== 'all') {
        const statuses = Array.isArray(status) ? status : [status];
        queryBuilder.andWhere('ticket.status IN (:...statuses)', { statuses });
    }

    if (priority && priority !== 'all') {
        const priorities = Array.isArray(priority) ? priority : [priority];
        queryBuilder.andWhere('ticket.priority IN (:...priorities)', { priorities });
    }

    if (search) {
        queryBuilder.andWhere(
            '(user.fullName ILIKE :search OR ticket.guestName ILIKE :search OR ticket.guestEmail ILIKE :search OR ticket.ticketNumber ILIKE :search OR ticket.subject ILIKE :search OR ticket.message ILIKE :search)',
            { search: `%${search}%` }
        );
    }

    // Apply sorting
    queryBuilder.orderBy(`ticket.${sortBy}`, sortOrder as 'ASC' | 'DESC');

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(skip).take(Number(limit));

    const [tickets, total] = await queryBuilder.getManyAndCount();

    // Resolve lazy loading for user and investment if needed
    const ticketsWithDetails = await Promise.all(
        tickets.map(async (ticket) => {
            const user = await ticket.user;
            const investment = ticket.investmentId ? await ticket.investment : null;
            return {
                ...ticket,
                user,
                investment
            };
        })
    );

    res.status(200).json({
        success: true,
        data: ticketsWithDetails,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        }
    });
});

/**
 * Create a new support ticket - Works for both authenticated users and guests
 */
export const createTicket = asyncHandler(async (req: UserRequest, res: Response) => {
    const {
        subject,
        message,
        priority = TicketPriority.MEDIUM,
        investmentId,
        investmentReference,
        // Guest fields
        guestName,
        guestEmail,
        guestPhone
    } = req.body;

    if (!subject || !message) {
        return res.status(400).json({ message: 'Subject and message are required' });
    }

    // Validate guest info if user is not authenticated
    if (!req.user && (!guestName || !guestEmail)) {
        return res.status(400).json({
            message: 'Guest users must provide name and email'
        });
    }

    const ticketRepo = AppDataSource.getRepository(SupportTicket);

    // Generate unique ticket number
    const ticketNumber = `TKT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    // Create new ticket
    const ticket = new SupportTicket();
    ticket.ticketNumber = ticketNumber;

    // Set user ID if authenticated, otherwise null
    ticket.userId = req.user?.id || null;

    // Set guest info if provided
    ticket.guestName = guestName || null;
    ticket.guestEmail = guestEmail || null;
    ticket.guestPhone = guestPhone || null;

    ticket.subject = subject;
    ticket.message = message;
    ticket.priority = priority as TicketPriority;
    ticket.status = TicketStatus.OPEN;

    if (investmentId) {
        ticket.investmentId = investmentId;
    }

    if (investmentReference) {
        ticket.investmentReference = investmentReference;
    }

    await ticketRepo.save(ticket);

    let userData = null;

    // Resolve user for response if authenticated
    if (req.user?.id) {
        const userRepo = AppDataSource.getRepository(User);
        userData = await userRepo.findOne({ where: { id: req.user.id } });
    }

    res.status(201).json({
        success: true,
        message: 'Support ticket created successfully',
        data: {
            ...ticket,
            user: userData, // This replaces the Promise with actual user data
            investment: undefined // Remove the investment Promise
        }
    });
});

export const respondToTicket = asyncHandler(async (req: UserRequest, res: Response) => {
    const { id } = req.params;
    const { response } = req.body;

    if (!response) {
        return res.status(400).json({ message: 'Response message is required' });
    }

    const ticketRepo = AppDataSource.getRepository(SupportTicket);

    const ticket = await ticketRepo.findOne({
        where: { id: id as string }
    });

    if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.adminResponse = response;
    ticket.status = TicketStatus.IN_PROGRESS;
    ticket.assignedToUserId = req.user?.id!;

    await ticketRepo.save(ticket);

    // Resolve user for response (could be null for guests)
    const user = await ticket.user;

    // Send email notification if we have email (either from user or guest)
    const recipientEmail = user?.email || ticket.guestEmail;
    const recipientName = user?.fullName || ticket.guestName || 'Valued Customer';

    if (recipientEmail) {
        // Send email notification (you'll need to implement this)
        await sendTicketResponseEmail(recipientEmail, recipientName, ticket.ticketNumber, response);
    }

    res.status(200).json({
        success: true,
        message: 'Response sent successfully',
        data: {
            ...ticket,
            user,
            investment: ticket.investmentId ? await ticket.investment : null
        }
    });
});

export const resolveTicket = asyncHandler(async (req: UserRequest, res: Response) => {
    const { id } = req.params;

    const ticketRepo = AppDataSource.getRepository(SupportTicket);

    const ticket = await ticketRepo.findOne({
        where: { id: id as string }
    });

    if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.status = TicketStatus.RESOLVED;
    ticket.resolvedAt = new Date();

    await ticketRepo.save(ticket);

    const user = await ticket.user;

    res.status(200).json({
        success: true,
        message: 'Ticket marked as resolved',
        data: {
            ...ticket,
            user,
            investment: ticket.investmentId ? await ticket.investment : null
        }
    });
});

export const closeTicket = asyncHandler(async (req: UserRequest, res: Response) => {
    const { id } = req.params;

    const ticketRepo = AppDataSource.getRepository(SupportTicket);

    const ticket = await ticketRepo.findOne({
        where: { id: id as string }
    });

    if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.status = TicketStatus.CLOSED;

    await ticketRepo.save(ticket);

    const user = await ticket.user;

    res.status(200).json({
        success: true,
        message: 'Ticket closed',
        data: {
            ...ticket,
            user,
            investment: ticket.investmentId ? await ticket.investment : null
        }
    });
});

export const getTicketDetails = asyncHandler(async (req: UserRequest, res: Response) => {
    const { id } = req.params;

    const ticketRepo = AppDataSource.getRepository(SupportTicket);

    const ticket = await ticketRepo.findOne({
        where: { id: id as string }
    });

    if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
    }

    // Resolve lazy loading
    const user = await ticket.user;
    const investment = ticket.investmentId ? await ticket.investment : null;

    res.status(200).json({
        success: true,
        data: {
            ...ticket,
            user,
            investment
        }
    });
});

/**
 * Get tickets by guest email (for guests to check their tickets)
 */
/**
 * Get tickets by guest email (for guests to check their tickets)
 */
export const getTicketsByEmail = asyncHandler(async (req: UserRequest, res: Response) => {
    const { email } = req.params;

    // Ensure email is a string, not an array
    const emailString = Array.isArray(email) ? email[0] : email;

    if (!emailString) {
        return res.status(400).json({ message: 'Email is required' });
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailString)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }

    const ticketRepo = AppDataSource.getRepository(SupportTicket);

    const tickets = await ticketRepo.find({
        where: { guestEmail: emailString }, // Use the string, not the array
        order: { createdAt: 'DESC' }
    });

    res.status(200).json({
        success: true,
        data: tickets
    });
});

/**
 * Get current user's tickets (for investor dashboard)
 */
export const getMyTickets = asyncHandler(async (req: UserRequest, res: Response) => {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
  
    const ticketRepo = AppDataSource.getRepository(SupportTicket);
    
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;
  
    const queryBuilder = ticketRepo.createQueryBuilder('ticket')
      .where('ticket.userId = :userId', { userId: req.user.id });
  
    // Apply status filter
    if (status && status !== 'all') {
      queryBuilder.andWhere('ticket.status = :status', { status });
    }
  
    // Apply sorting
    queryBuilder.orderBy(`ticket.${sortBy}`, sortOrder as 'ASC' | 'DESC');
  
    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(skip).take(Number(limit));
  
    const [tickets, total] = await queryBuilder.getManyAndCount();
  
    // Resolve user for each ticket (optional - might not be needed for user view)
    const ticketsWithUser = await Promise.all(
      tickets.map(async (ticket) => {
        const user = await ticket.user;
        return {
          ...ticket,
          user
        };
      })
    );
  
    res.status(200).json({
      success: true,
      data: ticketsWithUser,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  });
  
  /**
   * Create a ticket for logged-in user (protected version)
   */
  export const createUserTicket = asyncHandler(async (req: UserRequest, res: Response) => {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
  
    const { subject, message, priority = TicketPriority.MEDIUM, investmentId, investmentReference } = req.body;
  
    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' });
    }
  
    const ticketRepo = AppDataSource.getRepository(SupportTicket);
    
    // Generate unique ticket number
    const ticketNumber = `TKT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  
    const ticket = new SupportTicket();
    ticket.ticketNumber = ticketNumber;
    ticket.userId = req.user.id;
    ticket.subject = subject;
    ticket.message = message;
    ticket.priority = priority;
    ticket.status = TicketStatus.OPEN;
    
    if (investmentId) {
      ticket.investmentId = investmentId;
    }
    
    if (investmentReference) {
      ticket.investmentReference = investmentReference;
    }
  
    await ticketRepo.save(ticket);
  
    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: ticket
    });
  });
  
  /**
   * Get a single ticket (user can only view their own)
   */
  export const getMyTicketDetails = asyncHandler(async (req: UserRequest, res: Response) => {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
  
    const { id } = req.params;
    const ticketRepo = AppDataSource.getRepository(SupportTicket);
  
    const ticket = await ticketRepo.findOne({
      where: { 
        id: id as string,
        userId: req.user.id // Ensure user can only access their own tickets
      }
    });
  
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
  
    const user = await ticket.user;
  
    res.status(200).json({
      success: true,
      data: {
        ...ticket,
        user
      }
    });
  });