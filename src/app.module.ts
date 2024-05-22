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
import { botController } from './controllers/bot.controller';
import { HttpModule, HttpService } from '@nestjs/axios';
import { cryptoservice } from './services/encryp_decryp/crypto.service';
import { WinstonConfig } from './services/Logger/winstone.config';
import {okxBotService} from './services/exchange/okx/bot.service'


@Module({
  imports: [
    DbModule,
    TypeOrmModule.forFeature([ActiveSubscriptions,PaymentHistory]),
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    HttpModule,
  ],
  controllers: [AppController,botController],
  providers: [AppService,cryptoservice,WinstonConfig,
     { provide:'IbotService', 
     useClass: 
     process.env.exchange ==='KUCOIN'? kucoinBotService:
    process.env.exchange ==='OKX'? okxBotService : kucoinBotService}],
     exports: [WinstonConfig]
})
export class AppModule {}
