import { Injectable } from '@nestjs/common';
import { BaseBotServices } from '../../baseBot.service';
import { accessToken,refreshToken,URL_STARTBOT,BUBBLE_URL_STARTBOT,URL_STOPBOT,BUBBLE_URL_STOPBOT,URL_WALLET_INFO,bubbleAccessKey } from 'config/constants';


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
      async startBot(chatId:string ,telegramId:number): Promise<void> {
  
        const botId = telegramId.toString();
        const uniqueId = telegramId.toString();
       
        try {
          const activeSubscription = await this.getUserSubscription(telegramId,this.exchange);
          if (!activeSubscription) {
            this.logger.error( `No active subscription found for telegram_id: ${telegramId}`);
            return;
          }
          activeSubscription.unique_id = uniqueId;
          activeSubscription.bot_id = botId;
          await this.subscriptionRepository.save(activeSubscription);
    
          const {api_key,api_secret,api_passphrase,pair,interval,offset_range,token_range } = activeSubscription;
          const type = 'limit';
          const category = 'spot'
          const exchangeUrl = URL_STARTBOT;
         
          //headers for authentication on exchange url
          const headers = {
            accessToken: accessToken,
            refreshToken: refreshToken,
            'Content-Type': 'application/json',
          };
    
          const data = {
            apiKey: api_key,
            apiSecret: api_secret,
            category: category,
            type: type,
            pair: pair,
            interval: interval,
            offset_range: offset_range? [parseFloat(offset_range[0]),parseFloat(offset_range[1])] : [],
            token_range: token_range,
            bot_id: botId,
            unique_id: uniqueId,
            chat_id: chatId.toString(),
          };
            
          try{
            console.log("🚀 ~ bybitBotService ~ startBot ~ exchangeUrl:", exchangeUrl)
          const res = await this.httpService.axiosRef.post(exchangeUrl, data, { headers});
         
        //  console.log("🚀 ~ BaseBotServices ~ startBot ~ response:", response)
       
          const msg = 'Bot Started. . . ';
          if (res.status === 200) {  
            if (res.data.message === msg) {
              console.log("response data:",res.data)
              this.logger.info( `Bot started with bot id: ${botId} and unique id: ${uniqueId}. Generating volume...`);
              // Send messages to the user
              this.sendMessageToUser(chatId, 'Bot Started!! Generating volume..');
              this.sendMessageToUser(chatId, 'You can stop your bot with /stopbot command.' );
              this.sendMessageToUser(chatId, "For detailed trade information, please check your wallet's trading logs and history.");
    
              //send data to bubble
    
              try {
                const bubbleUrl = BUBBLE_URL_STARTBOT
                const {
                  api_key,
                  api_secret,
                  api_passphrase,
                  pair,
                  interval,
                  offset_range,
                  token_range,
                  exchange,
                } = activeSubscription;
            
          
                const accessKey = bubbleAccessKey;
                const headers = {
                  'Content-Type': 'application/json',
                };
                const bubbleData = {
                  apiKey: api_key,
                  apiSecret: api_secret,
                  pair: pair,
                  interval: interval,
                  offset: offset_range? offset_range.toString():"",
                  tradeRange: token_range?token_range.toString():"",
                  chatId: chatId.toString(),
                  telegramId: telegramId.toString(),
                  botId: botId.toString(),
                  uniqueId: uniqueId.toString(),
               //   apiPassphrase: api_passphrase,
                  exchangeType: exchange,
                  accessKey: accessKey,
                };
                console.log("🚀 ~ BaseBotServices ~ startBot ~ bubbleData:", bubbleData)
                this.logger.info("🚀 ~ BaseBotServices ~ startBot ~ bubbleUrl:",bubbleUrl)
                const bubbleResponse = await this.httpService.axiosRef.post( bubbleUrl, bubbleData, { headers } );
                if (bubbleResponse.status === 200) {
                  this.logger.info('Bot info is shared to bubble.',);
                  console.log('Bot info is shared to bubble.')
                } else {
                  this.logger.error(
                    `Unable to share data to bubble: ${bubbleResponse.statusText}`,
                  );
                }
                 
              } catch(error) {
                console.log("🚀 ~ BaseBotServices ~ startBot ~ error:", error)
                this.logger.error("handle the error",error.response)
              
              }
    
            } else {
              this.sendMessageToUser(chatId, res.data.message);
            }
          } else {
            this.sendMessageToUser(chatId,"Bot stopped:" + res.data.message);
            console.error(`Error in starting bot: ${res.statusText}`);
          }
    
        } catch(error){
            console.log("🚀 ~ BaseBotServices ~ startBot ~ error:", error)
            this.sendMessageToUser(chatId,"Please provide Valid inputs to start the bot"  );
    
        }
    
        } catch (error) {
          console.error("🚀 ~ BaseBotServices ~ startBot ~  :", error)
          this.logger.error(`Error in handleStartBot: ${error.response}`);
        }
      }
    
   
    
      //method to check wallet balance
      async checkBalance(chatId:string,telegramId:number): Promise<void> {
        
          const activeSubscription = await this.getUserSubscription(telegramId,this.exchange);
          if (!activeSubscription) {
             this.logger.error(`No active subscription found for telegram_id: ${telegramId}` );
            return;
          }
          const { api_key, api_secret } = activeSubscription;
          const url = URL_WALLET_INFO;
          const headers = {
            accessToken: accessToken,
            refreshToken: refreshToken,
            'Content-Type': 'application/json',
          };
          const data = {
            apiKey: api_key,
            apiSecret: api_secret,
        
          };
         try{
          const response = await this.httpService.axiosRef.post(url, data, {headers});
         
          if (response.status === 200) { 
         
             await this.getBal(chatId,response)
         //   const balances = response.data.data[0].details;
         //   console.log("🚀 ~ BaseBotServices ~ checkBalance ~ balances:", balances)
    //
         //   if(balances){
         //   this.logger.info('🚀 ~ checkBalance ~  balances:', balances);
         //   let message = 'Your Balances:\n';
         //   balances.forEach((item) => {
         //     message += `Currency: ${item.ccy}\nTotal Balance: ${item.cashBal}\navailable Balance: ${item.availBal}\nHolds: ${item.frozenBal}\n\n`;
         //   });
        //    //show balance to user
        //    this.sendMessageToUser(chatId, message);
       //     this.logger.info(`Balance info : ${JSON.stringify(balances)}`);
       //   } else{
       //     this.sendMessageToUser(chatId,response.data.message + ': Please set valid API key, API Secret and API passphrase to check balances');  
       //   }
          } 
          else {
            console.error(`Request failed with status code ${response.status}.`);
            this.bot.sendMessage( chatId,`Could not fetch balances, please try again.\n${response.data.message}` );
          }
        } catch(error){
          console.log("🚀 ~ BaseBotServices ~ checkBalance ~ error:", error.message)
          this.bot.sendMessage( chatId,`Could not fetch balances, please try again with valid inputs.\n` );
        }
      }
}

