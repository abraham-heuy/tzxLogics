import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum ContactStatus {
  UNREAD = 'unread',           // New message, not yet read
  READ = 'read',                // Admin has read it
  REPLIED = 'replied',          // Admin has replied
  ARCHIVED = 'archived'         // Archived after resolution
}

@Entity('contact_messages')
export class ContactMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Unique reference for the message
  @Column({ unique: true, length: 50 })
  messageReference!: string; // Format: MSG-YYYY-XXXX

  // Sender details (from contact form)
  @Column({ length: 100 })
  fullName!: string;

  @Column({ length: 100 })
  email!: string; // For admin to reply

  @Column({ length: 20, nullable: true })
  phone!: string; // Optional, for admin to call if needed

  @Column({ length: 200 })
  subject!: string;

  @Column({ type: 'text' })
  message!: string; // The inquiry/question

  // Status tracking
  @Column({
    type: 'enum',
    enum: ContactStatus,
    default: ContactStatus.UNREAD
  })
  status!: ContactStatus;

  // Admin response
  @Column({ type: 'text', nullable: true })
  adminResponse!: string;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt!: Date;

  @Column({ nullable: true })
  respondedByUserId!: string; // Admin user ID who responded

  // Timestamps
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt!: Date; // When admin marked as read

  @Column({ type: 'timestamp', nullable: true })
  updatedAt!: Date;
}