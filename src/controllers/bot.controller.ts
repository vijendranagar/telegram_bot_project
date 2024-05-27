import { Controller, Post, Body,Inject,Req,UseGuards } from '@nestjs/common';
import { IbotService } from 'src/services/IBot.interface';
import { authGuard } from 'src/auth/auth.gaurd';
import { WinstonConfig } from 'src/services/Logger/winstone.config';
import { URL_PREFIX } from '../../config/constants'
import { HttpService } from '@nestjs/axios';
import { BUBBLE_URL_STOPBOT_TEST } from '../../config/constants';
@Controller(URL_PREFIX)
export class botController {
  private readonly logger = this.winstonConfig.createLogger();
  constructor(
    private readonly winstonConfig: WinstonConfig,
    public httpService: HttpService,
    @Inject('IbotService') private readonly IBotService:IbotService) {}
  
  @UseGuards(authGuard)
  @Post('orderInfo')
  async receiveData(@Body() data): Promise<string> {
  // console.log("🚀 ~ botController ~ receiveData ~ req.headers:", req.headers)
   
    try {
      const orderObject = data.order_object;
      const message = data.message;
      const chatId = data.chat_id;
      await this.IBotService.sendMessageToUser(chatId, `Order Info : ${message}`);
      this.logger.info(`SENT MESSAGE --> Order Info : ${message}`);
      console.log(`SENT MESSAGE --> Order Info : ${message} invoked by :${chatId}`)
      return 'Received order info.';
    } catch (error) {
      this.logger.error(error);
      console.log("🚀 ~ botController ~ receiveData ~ error:", error)
      return 'An error occurred while processing your request.';
    }

  }

  @UseGuards(authGuard)
  @Post('botStopped')
  async stopBotMessage(@Body() data): Promise<string> {

    try {
      const chatId = data.chat_id;
      const message = data.message;
      const bubbleUrl = BUBBLE_URL_STOPBOT_TEST;
    
      try{
            //const accessKey = 'f7gFzvVfI9';
            const headers = {
              'Content-Type': 'application/json',
            };
            const bubbleData = {
              botId: chatId,
              uniqueId: chatId,
              message: message,
              error: message
          }
           
            const bubbleResponse = await this.httpService.axiosRef.post( bubbleUrl, bubbleData, { headers } );
            if (bubbleResponse.status === 200) {
              this.logger.info('Bot info is shared to bubble.');
              console.log("Bot info is shared to bubble")
            } else {
              this.logger.error(
                `Unable to share data to bubble: ${bubbleResponse.statusText}`,
              );
            }
          } catch (error) {
            console.log("Unable to share data to bubble" + error.message);
          }
      await this.IBotService.sendMessageToUser(chatId, `Bot Stopped : ${message}`);
      this.logger.info(`SENT MESSAGE --> Bot Stopped : ${message}`);
      console.log(`SENT MESSAGE --> Order Info : ${message} invoked by :${chatId}`)
      return 'Notification Received!';
    } catch (error) {
      console.log("🚀 ~ botController ~ stopBotMessage ~ error:", error)
      this.logger.error(error);
      return 'An error occurred while processing your request.';
    }
  }
}
