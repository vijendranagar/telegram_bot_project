import { Controller, Post, Body,Inject,Req,UseGuards } from '@nestjs/common';
import { IbotService } from 'src/services/IBot.interface';
import { authGuard } from 'src/auth/auth.gaurd';


@Controller('volumebot-telegram')
export class botController {

  constructor(@Inject('IbotService') private readonly IBotService:IbotService) {}
  
  @Post('orderInfo')
  @UseGuards(authGuard)
  async receiveData(@Body() data): Promise<string> {

    try {
      const orderObject = data.order_object;
      const message = data.message;
      const chatId = data.chat_id;
      await this.IBotService.sendMessageToUser(chatId, `Order Info : ${message}`);
      console.log(`SENT MESSAGE --> Order Info : ${message}`);
      return 'Received order info.';
    } catch (error) {
      console.error(error);
      return 'An error occurred while processing your request.';
    }

  }

  @Post('botStopped')
  @UseGuards(authGuard)
  async stopBotMessage(@Body() data): Promise<string> {

    try {
      
      const chatId = data.chat_id;
      const botStopped = data.message;
      await this.IBotService.sendMessageToUser(chatId, `Bot Stopped : ${botStopped}`);
      console.log(`SENT MESSAGE --> Bot Stopped : ${botStopped}`);
      return 'Notification Received!';
    } catch (error) {
      console.error(error);
      return 'An error occurred while processing your request.';
    }
  }
}
