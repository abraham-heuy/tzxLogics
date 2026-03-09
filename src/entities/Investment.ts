import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

export enum InvestmentStatus {
  PENDING = 'pending',      // Waiting for admin approval
  APPROVED = 'approved',     // Admin approved
  REJECTED = 'rejected'      // Admin rejected
}

@Entity('investments')
export class Investment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Link to user
  @ManyToOne(() => User, user => user.investments)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: string;

  // Reference number (unique per investment)
  @Column({ unique: true, length: 50 })
  investmentReference!: string; // Format: INV-YYYY-XXXX

  // Digital signature (signed per investment)
  @Column({ length: 100 })
  digitalSignature!: string;

  @Column({ type: 'timestamp' })
  agreementSignedAt!: Date;

  // Pool details
  @Column({ length: 50 })
  poolName!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  investmentAmount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  fee!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalAmount!: number;

  // M-Pesa details
  @Column({ length: 20 })
  mpesaPhoneNumber!: string;

  @Column({ length: 50 })
  mpesaTransactionCode!: string;

  @Column({ type: 'timestamp' })
  mpesaPaidAt!: Date;

  // Status - just pending/approved/rejected
  @Column({
    type: 'enum',
    enum: InvestmentStatus,
    default: InvestmentStatus.PENDING
  })
  status!: InvestmentStatus;

  // Admin notes (optional)
  @Column({ type: 'text', nullable: true })
  adminNotes!: string;

  // Timestamps
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt!: Date;

  @Column({ nullable: true })
  approvedByUserId!: string; // Admin user ID
}