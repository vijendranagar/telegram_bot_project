import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
  } from 'typeorm';
  
  @Entity('active_subscriptions')
  export class ActiveSubscription {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ type: 'bigint', unique: true })
    telegram_id: number;
  
    @Column({ type: 'text' })
    from_address: string;
  
    @Column({ type: 'boolean', default: true })
    is_active: boolean;
  
    @Column({ type: 'timestamp', nullable: true })
    subscription_end: Date;
  
    @Column({ type: 'text', nullable: true })
    payment_id: string;
  
    @Column({ type: 'text', nullable: true })
    api_key: string;
  
    @Column({ type: 'text', nullable: true })
    api_secret: string;
  
    @Column({ type: 'text', nullable: true })
    pair: string;
  
    @Column({ type: 'int', nullable: true })
    interval: number;
  
    // Assuming you want to store arrays as JSON strings for simplicity
    // Adjust according to your actual data storage strategy
    @Column({ type: 'jsonb', nullable: true })
    token_range: any[];
  
    @Column({ type: 'jsonb', nullable: true })
    offset_range: any[];
  
    @Column({ type: 'text', nullable: true })
    bot_id: string;
  
    @Column({ type: 'text', nullable: true })
    unique_id: string;
  }
  