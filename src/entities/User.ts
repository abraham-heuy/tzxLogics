import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Role } from './Role';
import { SupportTicket } from './SupportTicket';
import { Investment } from './Investment';


@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Basic Details ONLY (from registration step 1)
  @Column({ length: 100 })
  fullName!: string;

  @Column({ unique: true, length: 100 })
  email!: string;

  @Column({ length: 20 })
  phone!: string;

  @Column({ length: 20 })
  idNumber!: string;

  @Column()
  password!: string;

  // Role relationship
  @ManyToOne(() => Role)
  @JoinColumn({ name: 'roleId' })
  role!: Role;

  @Column()
  roleId!: number;

  // Account status
  @Column({ default: false })
  isApproved!: boolean; // Admin approval for the user account

  @Column({ default: false })
  emailVerified!: boolean;

  // Timestamps
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt!: Date;

  // Relationships
  @OneToMany(() => Investment, investment => investment.user)
  investments!: Investment[];

  @OneToMany(() => SupportTicket, ticket => ticket.user)
  supportTickets!: SupportTicket[];
}