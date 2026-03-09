import { AppDataSource } from '../../config/data-source';
import asyncHandler from '../../middlewares/handlers/asyncHandler';
import { Request, Response } from 'express';
import { ContactMessage, ContactStatus } from '../../entities/ContactMessage';
import { generateReference } from '../../util/helpers/referenceGenerator';
import { UserRequest } from '../../util/types/authUser';
import { sendContactResponseEmail } from '../../services/contactService';

/**
 * Create a new contact message (from guests/any user)
 * This is for the contact form on the website
 */
export const createContactMessage = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, email, phone, subject, message } = req.body;

  // Validate required fields
  if (!fullName || !email || !subject || !message) {
    return res.status(400).json({ 
      message: 'Full name, email, subject, and message are required' 
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Valid email is required' });
  }

  const contactRepo = AppDataSource.getRepository(ContactMessage);

  // Generate unique reference
  const messageReference = generateReference('MSG');

  // Create contact message
  const contactMessage = new ContactMessage();
  contactMessage.messageReference = messageReference;
  contactMessage.fullName = fullName;
  contactMessage.email = email;
  contactMessage.phone = phone || null;
  contactMessage.subject = subject;
  contactMessage.message = message;
  contactMessage.status = ContactStatus.UNREAD;

  await contactRepo.save(contactMessage);

  // Send auto-reply email (optional)
  // You can implement this if you want to send an acknowledgement

  res.status(201).json({
    success: true,
    message: 'Your message has been sent successfully. We will get back to you soon.',
    data: {
      reference: messageReference,
      fullName,
      email,
      subject
    }
  });
});

/**
 * Get all contact messages (admin only)
 */
export const getContactMessages = asyncHandler(async (req: UserRequest, res: Response) => {
  const contactRepo = AppDataSource.getRepository(ContactMessage);

  const {
    page = 1,
    limit = 10,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'DESC'
  } = req.query;

  const queryBuilder = contactRepo.createQueryBuilder('contact');

  // Apply filters
  if (status && status !== 'all') {
    queryBuilder.andWhere('contact.status = :status', { status });
  }

  if (search) {
    queryBuilder.andWhere(
      '(contact.fullName ILIKE :search OR contact.email ILIKE :search OR contact.subject ILIKE :search OR contact.message ILIKE :search)',
      { search: `%${search}%` }
    );
  }

  // Apply sorting
  queryBuilder.orderBy(`contact.${sortBy}`, sortOrder as 'ASC' | 'DESC');

  // Pagination
  const skip = (Number(page) - 1) * Number(limit);
  queryBuilder.skip(skip).take(Number(limit));

  const [messages, total] = await queryBuilder.getManyAndCount();

  res.status(200).json({
    success: true,
    data: messages,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
});

/**
 * Get a single contact message (admin only)
 */
export const getContactMessage = asyncHandler(async (req: UserRequest, res: Response) => {
  const { id } = req.params;

  const contactRepo = AppDataSource.getRepository(ContactMessage);

  const message = await contactRepo.findOne({
    where: { id: id as string }
  });

  if (!message) {
    return res.status(404).json({ message: 'Message not found' });
  }

  // Mark as read if it was unread
  if (message.status === ContactStatus.UNREAD) {
    message.status = ContactStatus.READ;
    message.readAt = new Date();
    await contactRepo.save(message);
  }

  res.status(200).json({
    success: true,
    data: message
  });
});

/**
 * Reply to a contact message (admin only)
 * Sends email to the user
 */
export const replyToContactMessage = asyncHandler(async (req: UserRequest, res: Response) => {
  const { id } = req.params;
  const { response } = req.body;

  if (!response) {
    return res.status(400).json({ message: 'Response message is required' });
  }

  const contactRepo = AppDataSource.getRepository(ContactMessage);

  const message = await contactRepo.findOne({
    where: { id: id as string }
  });

  if (!message) {
    return res.status(404).json({ message: 'Message not found' });
  }

  // Update message with admin response
  message.adminResponse = response;
  message.status = ContactStatus.REPLIED;
  message.respondedAt = new Date();
  message.respondedByUserId = req.user?.id!;

  await contactRepo.save(message);

  // Send email response to the user
  try {
    await sendContactResponseEmail(
      message.email,
      message.fullName,
      message.messageReference,
      response
    );
  } catch (error) {
    console.error('Failed to send response email:', error);
    // Don't fail the request if email fails, just log it
  }

  res.status(200).json({
    success: true,
    message: 'Response sent successfully',
    data: message
  });
});

/**
 * Archive a contact message (admin only)
 */
export const archiveContactMessage = asyncHandler(async (req: UserRequest, res: Response) => {
  const { id } = req.params;

  const contactRepo = AppDataSource.getRepository(ContactMessage);

  const message = await contactRepo.findOne({
    where: { id: id as string }
  });

  if (!message) {
    return res.status(404).json({ message: 'Message not found' });
  }

  message.status = ContactStatus.ARCHIVED;
  message.updatedAt = new Date();

  await contactRepo.save(message);

  res.status(200).json({
    success: true,
    message: 'Message archived successfully'
  });
});

/**
 * Mark message as read (admin only)
 */
export const markAsRead = asyncHandler(async (req: UserRequest, res: Response) => {
  const { id } = req.params;

  const contactRepo = AppDataSource.getRepository(ContactMessage);

  const message = await contactRepo.findOne({
    where: { id: id as string }
  });

  if (!message) {
    return res.status(404).json({ message: 'Message not found' });
  }

  message.status = ContactStatus.READ;
  message.readAt = new Date();

  await contactRepo.save(message);

  res.status(200).json({
    success: true,
    message: 'Message marked as read'
  });
});

/**
 * Delete a contact message (admin only)
 */
export const deleteContactMessage = asyncHandler(async (req: UserRequest, res: Response) => {
  const { id } = req.params;

  const contactRepo = AppDataSource.getRepository(ContactMessage);

  const result = await contactRepo.delete(id as string);

  if (result.affected === 0) {
    return res.status(404).json({ message: 'Message not found' });
  }

  res.status(200).json({
    success: true,
    message: 'Message deleted successfully'
  });
});

/**
 * Get statistics for contact messages (admin only)
 */
export const getContactStats = asyncHandler(async (req: UserRequest, res: Response) => {
  const contactRepo = AppDataSource.getRepository(ContactMessage);

  const total = await contactRepo.count();
  const unread = await contactRepo.count({ where: { status: ContactStatus.UNREAD } });
  const read = await contactRepo.count({ where: { status: ContactStatus.READ } });
  const replied = await contactRepo.count({ where: { status: ContactStatus.REPLIED } });
  const archived = await contactRepo.count({ where: { status: ContactStatus.ARCHIVED } });

  res.status(200).json({
    success: true,
    data: {
      total,
      unread,
      read,
      replied,
      archived
    }
  });
});