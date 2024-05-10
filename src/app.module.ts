import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActiveSubscriptions } from './entities/active_subscriptons.entities';
import { PaymentHistory } from './entities/payments_history.entities';
import { BaseBotServices} from './services/baseBot.service';
import {ConfigModule} from '@nestjs/config';
import { DbModule } from './db/db.module';
import { IbotService } from './services/IBot.interface';
import { kucoinBotService } from './services/exchange/kucoin/bot.service';

@Module({
  imports: [
    DbModule,
    TypeOrmModule.forFeature([ActiveSubscriptions]),

    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    })
  ],
  controllers: [AppController],
  providers: [AppService,
     { provide:'IbotService', useClass: process.env.excahnge === 'KUCOIN'
     ? kucoinBotService : kucoinBotService}]
})
export class AppModule {}
