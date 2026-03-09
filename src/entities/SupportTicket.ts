import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { Investment } from './Investment';

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

@Entity('support_tickets')
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 50 })
  ticketNumber!: string;

  // User relationship - now optional (nullable) for guests
  @ManyToOne(() => User, user => user.supportTickets, { 
    lazy: true,
    nullable: true // Allow null for guest users
  })
  @JoinColumn({ name: 'userId' })
  user!: Promise<User | null>;

  @Column({ nullable: true, type: 'uuid' }) // Specify type as uuid
  userId!: string | null;

  // Guest information (for users without accounts) - Fix: Use proper PostgreSQL types
  @Column({ length: 100, nullable: true, type: 'varchar' })
  guestName!: string | null;

  @Column({ length: 100, nullable: true, type: 'varchar' })
  guestEmail!: string | null;

  @Column({ length: 20, nullable: true, type: 'varchar' })
  guestPhone!: string | null;

  @ManyToOne(() => Investment, { nullable: true, lazy: true })
  @JoinColumn({ name: 'investmentId' })
  investment!: Promise<Investment | null>;

  @Column({ nullable: true, type: 'uuid' })
  investmentId!: string | null;

  @Column({ length: 50, nullable: true, type: 'varchar' })
  investmentReference!: string | null;

  @Column({ length: 200, type: 'varchar' })
  subject!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.OPEN
  })
  status!: TicketStatus;

  @Column({
    type: 'enum',
    enum: TicketPriority,
    default: TicketPriority.MEDIUM
  })
  priority!: TicketPriority;

  @Column({ type: 'text', nullable: true })
  adminResponse!: string | null;

  @Column({ nullable: true, type: 'uuid' })
  assignedToUserId!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt!: Date | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}  