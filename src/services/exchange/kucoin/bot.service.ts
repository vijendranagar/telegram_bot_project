import { Injectable } from '@nestjs/common';
import { BaseBotServices } from '../../baseBot.service';

@Injectable()
export class kucoinBotService extends BaseBotServices
{
    async getBal(chatId,response){
      try{

        const balances = response.data.data;
        if(balances){
        //  this.logger.info('🚀 ~ checkBalance ~  balances:', balances);
          let message = 'Your Balances:\n';
          balances.forEach((item) => {
            message += `Currency: ${item.currency}\nType: ${item.type}\nBalance: ${item.balance}\nAvailable: ${item.available}\nHolds: ${item.holds}\n\n`;
          });
          //show balance to user
          this.sendMessageToUser(chatId, message);
      //    this.logger.info(`Balance info : ${JSON.stringify(balances)}`);
        } else {
          const message =  " Please set valid API key, API secret and API passphrase to get balances."
          this.sendMessageToUser(chatId,message)
        }
    }
  catch(error){
         console.log("🚀 ~ getBal ~ error:", error)
         this.sendMessageToUser(chatId,  " Please set valid API key, API secret and API passphrase to get balances")
}
}
}