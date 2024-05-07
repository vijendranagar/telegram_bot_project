import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';


@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}


  @Post('post')
    async createDraft(
    ): Promise<any> {
      // const { title, content, authorEmail } = postData;
      this.appService.sendMessageToUser("7006150190",`Notified from API call`);
      
      return "Notifcation Sent"
    }

}
