import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActiveSubscriptions } from '../entities/active_subscriptons.entities';
import { PaymentHistory } from '../entities/payments_history.entities';

@Module({
    imports: [
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        password: '239073',
        username: 'postgres',
        entities: [ActiveSubscriptions, PaymentHistory],
        database: 'postgres',
        synchronize: true,
        logging: true,
      }),
       TypeOrmModule.forFeature([ActiveSubscriptions]),
    ],
    })
    export class DbModule {}