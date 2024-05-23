import { Injectable } from '@nestjs/common';
import { BaseBotServices } from '../../baseBot.service';

@Injectable()
export class okxBotService extends BaseBotServices
{
    
  //  async handleStart(telegramId:number, chatId:string): Promise<void> {
  //      console.log(`Your telegram id is ${telegramId} and your chat Id is ${chatId}`)
  //      this.sendMessageToUser(chatId,"Your telegram id is ${telegramId} and your chat Id is ${chatId}")
  //  }

  async getBal(chatId,response):Promise <void>{
    try{
   
    const balances = response.data.data[0].details;
    console.log("🚀 ~ BaseBotServices ~ checkBalance ~ balances:", balances)

    if(balances){
   // this.logger.info('🚀 ~ checkBalance ~  balances:', balances);
    let message = 'Your Balances:\n';
    balances.forEach((item) => {
      message += `Currency: ${item.ccy}\nTotal Balance: ${item.cashBal}\navailable Balance: ${item.availBal}\nHolds: ${item.frozenBal}\n\n`;
    });
    //show balance to user
    this.sendMessageToUser(chatId, message);
 //   this.logger.info(`Balance info : ${JSON.stringify(balances)}`);
  }
 else{
    this.sendMessageToUser(chatId, response.data.message + ': Please set valid API key, API Secret and API passphrase to check balances');  
  }
  } catch(error){
      console.log(response.data.error)
      this.sendMessageToUser(chatId, ' Please set valid API key, API Secret and API passphrase to check balances')
  }
}
}