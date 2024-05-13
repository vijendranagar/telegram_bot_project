import { Controller, Post, Body,Inject } from '@nestjs/common';
import { IbotService } from 'src/services/IBot.interface';

@Controller('volumebot-telegram')
export class botController {
  constructor(@Inject('IbotService') private readonly IBotService:IbotService) {}

  @Post('orderInfo')
  async receiveData(@Body() data: any): Promise<string> {
    const orderObject = data.order_object;
    const message = data.message;
    const chatId = data.chat_id;
    await this.IBotService.sendMessageToUser(chatId, `Order Info : ${message}`);
    console.log(`SENT MESSAGE --> Order Info : ${message}`);
    return 'Recieved order info.';
  }

  @Post('botStopped')
  async stopBotMessage(@Body() data: any): Promise<string> {
    const chatId = data.chat_id;
    const botStopped = data.message;
    await this.IBotService.sendMessageToUser(chatId, `Bot Stopped : ${botStopped}`);
    console.log(`SENT MESSAGE --> Bot Stopped : ${botStopped}`);
    return 'Notification Recieved!';
  }
}
