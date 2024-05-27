import { Injectable } from '@nestjs/common';
import { BaseBotServices } from '../../baseBot.service';


@Injectable()
export class bybitBotService extends BaseBotServices{

    async handleApiKey(chatId:string, telegramId:number, parts): Promise<void> {
 
        if (parts.length === 3) {
          try {
            const apiKey = this.cryptoService.encrypt(parts[1]);
            const apiSecret = this.cryptoService.encrypt(parts[2]);
           
            try {
              const activeSubscription = await this.getUserSubscription(telegramId,this.exchange);
              if (!activeSubscription) {
                await this.subscriptionRepository.save({
                  telegram_id: telegramId,
                  api_key: apiKey,
                  api_secret: apiSecret,
               
                });
              } else {
                activeSubscription.api_key = (await apiKey).result;
                activeSubscription.api_secret = (await apiSecret).result;
         
                await this.subscriptionRepository.save(activeSubscription);
              }
              this.logger.info('API key and API secret  set successfully.');
              console.log('API keyand API secret set successfully.');
              await this.sendMessageToUser( chatId,'API key and API secret set successfully. Please set the trading pair using /setpair <pair> (e.g., /setpair SHIB-USDC)',
              );
            } 
            catch (error) {
              this.logger.error(`Database error: ${error.message}`, error.message);
            }
          }
           catch (error) {
            await this.sendMessageToUser(chatId, 'Invalid format. Please set your API key and API secret in the following format:\n/apikey <your_api_key> <your_api_secret> <your_api_passphrase>');
            this.logger.error(error)
            console.log(error)
          }
        } 
        else {
          await this.sendMessageToUser(chatId,'Invalid format. Please set your API key and API secret in the following format:\n/apikey <your_api_key> <your_api_secret> <your_api_passphrase>' );
        }
      }
}
