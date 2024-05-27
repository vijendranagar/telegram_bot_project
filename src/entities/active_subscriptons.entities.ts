import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
  } from 'typeorm';
  
  @Entity('all_subscriptions')
  @Index(['telegram_id','exchange'],{ unique: true })
  export class ActiveSubscriptions {
    @PrimaryGeneratedColumn()
    id: number;

   @Column({type: 'text', nullable:true} )
    exchange: string;

    @Column({ type: 'bigint'})
    telegram_id: number;
  
    
    @Column({ type: 'text',nullable:true })
    from_address: string;
     
    @Column({ type: 'boolean', default: true })
    is_active: boolean;
  
    @Column({ type: 'timestamp', nullable: true })
    subscription_end: Date;
  
    @Column({ type: 'text', nullable: true })
    payment_id: string;
  
    @Column({ type: 'text', nullable: true })
    api_key: any;

    @Column({ type: 'text', nullable: true })
    api_passphrase: any;

    @Column({ type: 'text', nullable: true })
    api_secret: any;
  
    @Column({ type: 'text', nullable: true })
    pair: string;
  
    @Column({ type: 'int', nullable: true })
    interval: number;

    @Column({ type: 'jsonb', nullable: true })
    token_range: any[];
  
    @Column({ type: 'jsonb', nullable: true })
    offset_range: any[];
  
    @Column({ type: 'text', nullable: true })
    bot_id: string;
  
    @Column({ type: 'text', nullable: true })
    unique_id: string;
  }
  