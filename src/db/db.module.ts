import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActiveSubscriptions } from '../entities/active_subscriptons.entities';
import { PaymentHistory } from '../entities/payments_history.entities'; 
import * as dotenv from 'dotenv'
dotenv.config();


@Module({
    imports: [
      TypeOrmModule.forRoot({
        type: 'postgres',
        //host: 'localhost',
       // port: 5432,
       // password: '239073',
       // username: 'postgres',
         url : process.env.DATABASE_URL,
      // url : 'postgres://kdiqmfxgoqaczn:fe39cf1e53d68f07fb49ebe8a3029a612754e35f03f050f54d79980570befc5d@ec2-44-194-65-158.compute-1.amazonaws.com:5432/d37fv0so51kaab',
      // ssl: true,
   //   ssl: {
    //    rejectUnauthorized: false, // Set to true if the certificate is signed by a trusted CA
    //  },
        entities: [ActiveSubscriptions, PaymentHistory],
        database: 'postgres',
        synchronize: true,
        logging: true,
      }),
       TypeOrmModule.forFeature([ActiveSubscriptions,PaymentHistory]),
       
    ],
    })
    export class DbModule {}