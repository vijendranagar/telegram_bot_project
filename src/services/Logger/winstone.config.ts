import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

@Injectable()
export class WinstonConfig {
  constructor(private configService: ConfigService) {}

  createLogger() {
    return winston.createLogger({
      level: this.configService.get('LOG_LEVEL') || 'info',
      format: winston.format.json(),
      transports: [
        //new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new DailyRotateFile({
          filename: 'combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '2d' // Keep logs for 2 days
        }),
      ],
    });
  }
}
