import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
  } from 'typeorm';
  
  @Entity('all_payments')
  export class PaymentHistory {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ type: 'bigint', nullable: false })
    telegram_id: number;
  
    @Column({ type: 'text', nullable: false, unique: true })
    tx_hash: string;
  
    @Column({ type: 'text', nullable: false })
    from_address: string;
  
    // Optional: Add a column to track when the record was created
    @CreateDateColumn()
    createdAt?: Date;
  }