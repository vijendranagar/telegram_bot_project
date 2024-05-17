import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ActiveSubscriptions } from '../entities/active_subscriptons.entities';
import { PaymentHistory } from 'src/entities/payments_history.entities';
import { InjectRepository } from '@nestjs/typeorm';
import { IbotService } from './IBot.interface';
import { v4 as uuidv4 } from 'uuid';
import { SUBSCRIPTION_DURATION,TG_BOT_TOKEN,RECEIVER_WALLET_ADDRESS,ETHERSCAN_API_KEY, accessToken, refreshToken} from 'config/constants';
import * as TelegramBot from 'node-telegram-bot-api';
import { HttpService } from '@nestjs/axios';
import { cryptoservice } from './encryp_decryp/crypto.service';
import { ConfigService } from '@nestjs/config';
import { WinstonConfig } from './Logger/winstone.config';
import * as dotenv from 'dotenv';
import * as moment from 'moment';
import { URL_STOPBOT,URL_WALLET_INFO,URL_STARTBOT,BUBBLE_URL_STARTBOT,BUBBLE_URL_STOPBOT} from 'config/constants';
import { alreadySubscMsg,starMessageTosend } from 'src/constants/constant';
dotenv.config();

@Injectable()
export abstract class BaseBotServices implements IbotService {

 // private logger = new Logger(BaseBotServices.name);
  private readonly bot: any;
  private readonly MINIMUM_WEI: number = 100000000000000000;
 
 
 private readonly logger = this.winstonConfig.createLogger()
  private myMap = new Map<any, any>();

  constructor(
    private readonly winstonConfig: WinstonConfig,
    private httpService: HttpService,
    private cryptoService: cryptoservice,
    @InjectRepository(ActiveSubscriptions)
    private readonly subscriptionRepository: Repository<ActiveSubscriptions>,
    @InjectRepository(PaymentHistory)
    private readonly paymentsHistoryRepository: Repository<PaymentHistory>,
  ) 
  {
    this.bot = new TelegramBot(TG_BOT_TOKEN, { polling: true });
    this.bot.on('message', this.onRecieveMessage);
  }

  //check if telegram_id exist or not
  async getUserSubscription(telegramId: number): Promise<ActiveSubscriptions | undefined> {
    try {
      return await this.subscriptionRepository.findOne({
        where: { telegram_id: telegramId },
      });
    } catch (error) {
      this.logger.error(`Error getting user subscription: ${error.message}`,error.message);
      console.error(`Error getting user subscription: ${error.message}`)
    }
  }

  //update the subscription status if the use is subscried
  async updateSubscriptionStatus( telegramId: number,paymentId: string, isActive: boolean, Exchange: any,): Promise<void> {
    try {
      let subscriptionEnd: Date | null = null;
      if (isActive) {
        const currentTime = new Date();
        currentTime.setSeconds( currentTime.getSeconds() + +SUBSCRIPTION_DURATION  );
        subscriptionEnd = currentTime;
      }

      const subscription = await this.getUserSubscription(telegramId);

      if (subscription) {
        subscription.payment_id = paymentId;
        subscription.is_active = isActive;
        subscription.exchange = Exchange;
        subscription.subscription_end = subscriptionEnd;
        await this.subscriptionRepository.save(subscription);
      } 
      else {
        const newSubscription = new ActiveSubscriptions();
        newSubscription.telegram_id = telegramId;
        newSubscription.payment_id = paymentId;
        newSubscription.is_active = isActive;
        newSubscription.exchange = Exchange;
        newSubscription.subscription_end = subscriptionEnd;
        await this.subscriptionRepository.save(newSubscription);
      }
    } catch (error) {
      this.logger.error(`Error updating subscription status: ${error.message}`,error.message);
      console.error(`Error updating subscription status: ${error.message}`,error.message)
      throw error;
    }
  }
 //get use address with the help of transaction id provide by user
  async getFromAddressByTxId(txId: string): Promise<string | false> {
    try {
      const url = `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${txId}&apikey=${ETHERSCAN_API_KEY}`;
      const response = await this.httpService.axiosRef.get(url);
      const transaction = response.data.result;

      if (transaction) {
        return transaction.from.toLowerCase();
      }
    } catch (error) {
      console.error(`Request to Etherscan failed: ${error}`);
      this.logger.error("Request to Etherscan failed",error.message)
    }
    return false;
  }

 //update subscription duration 
  async updateSubscription(telegram_id: number,is_active: boolean): Promise<boolean> {
    try {
      const subscriptionEnd = moment()
        .add(SUBSCRIPTION_DURATION, 'minutes')
        .format(); // Adjust SUBSCRIPTION_DURATION as needed
      const result = await this.subscriptionRepository.update(
        { telegram_id: telegram_id },
        { is_active: is_active, subscription_end: subscriptionEnd },
      );
      return result.affected > 0;
    } catch (error) {
      console.error('Database error:', error);
      return false;
    }
  }

  //check if transaction Id is already present in payment history table
  async checkTxIdInPayments(txId: string, chatId: number): Promise<boolean> {
    try {
      await this.bot.sendMessage(chatId, 'Transaction ID is being verified.');
      const txHash = await this.paymentsHistoryRepository.findOne({
        where: { tx_hash: txId },
      });
      return !!txHash;
    } catch (error) {
      console.error(`Database error: ${error}`);
      return false;
    }
  }

  //these function is invoked when user send input
  onRecieveMessage = async (msg) => {
    this.logger.debug("message",msg);
    const chatId = msg.chat.id;
    const telegram_id = msg.from.id;
    const command = msg.text ? msg.text.split(' ')[0] : null;
    console.log("🚀 ~ BaseBotServices ~ onRecieveMessage= ~ command:", command)
    const parts = msg.text.split(' ');

    if (command === '/start') {
      await this.handleStart(telegram_id,chatId);
      return;
      // Exit the function after handling /start command
    }
    if (command === '/setyouraddress') {
      await this.handleFromAddress(telegram_id,chatId,parts);
      return;
      // Exit the function after handling /setyouraddress command
    }

    if (command === '/confirm_payment') {
      const checkAddress = await this.getUserSubscription(telegram_id)
      if (!checkAddress.from_address) {
        await this.bot.sendMessage(chatId,'Please /setyouraddress <your_wallet_address> before /confirm_payment command' );
        return;
      }
      await this.bot.sendMessage( chatId, 'Please send the transaction ID of your payment.', );
      const response = await this.waitFortxid(chatId);
      this.myMap.set(chatId, response);
      await this.confirmPayment(chatId, response, telegram_id);
      this.myMap.delete(chatId);
      return;
      // Exit the function after handling /confirm_payment command
    }

    const subscription = await this.getUserSubscription(telegram_id);
    //if the user have active subscription
    if (subscription && subscription.is_active) {
      switch (command) {
        case '/apikey':
          this.handleApiKey(chatId,telegram_id,parts);
          break;
        case '/setpair':
          this.handleSetPair(chatId,telegram_id,parts);
          break;
        case '/setinterval':
          this.handleSetInterval(chatId,telegram_id,parts);
          break;
        case '/setoffsetrange':
          this.handleSetOffset(chatId,telegram_id,parts);
          break;
        case '/settokenrange':
          this.handleSetTokenRange(chatId,telegram_id,parts);
          break;
        case '/startbot':
          this.startBot(chatId,telegram_id,command);
          break;
        case '/stopbot':
          this.stopBot(chatId,telegram_id,command);
          break;
        case '/balances':
          this.checkBalance(chatId,telegram_id);
          break;
        default:
          // Handle unrecognized commands or other messages...
          const check = this.myMap.has(chatId);
          if (check) {
            this.sendMessageToUser(chatId, 'Transaction ID received');
          } else {
            this.sendMessageToUser(chatId, 'Unrecognized command. Please try again.'  );
          }
          break;
      }
    } 
     //if user type any command other than above commands
     else {
      if (this.myMap.has(chatId)) {
        this.sendMessageToUser(chatId, 'Transaction ID received');
      } else
        this.sendMessageToUser(
          chatId,
          'You need an active subscription to access this feature. Please subscribe to continue.',
        );
    }
  };
  //method to handle start command
  async handleStart(telegramId:number, chatId:string): Promise<void> {
 try{
    const subscription = await this.getUserSubscription(telegramId);
    if (subscription && subscription.is_active) {
      const messageToSend = alreadySubscMsg;
    
      this.sendMessageToUser(chatId, messageToSend);
    }
     else {
      const exchange = process.env.exchange;
      const myUUID = uuidv4(); //generate payment id
      const paymentId = myUUID;
      const paymentMessage =
        'Welcome to the VoluMint MM Bot! Please send account address using /setyouraddress command with which you will be paying subscription fees of 0.3 ETH. For example /setyouraddress <your_wallet_address>';
      this.sendMessageToUser(chatId, paymentMessage);
      this.updateSubscriptionStatus( telegramId, paymentId, false, exchange ); // Use chat_id from the message and set subscription status to False
    }
  }catch(error){
    this.logger.error("error",error)
  }
  }

  //method to set users wallet address to database
  async handleFromAddress(telegram_id:number , chat_id:string, parts): Promise<void> {
    if (parts.length === 2) {
      try {
        const subscription = await this.getUserSubscription(telegram_id);
        if (!subscription) {
          await this.subscriptionRepository.save({
            telegram_id,
            from_address: parts[1],
          });
        } else {
          subscription.from_address = parts[1];
          await this.subscriptionRepository.save(subscription);
        }
        await this.bot.sendMessage(
          chat_id,
          `We have got your address. To use this service pay a subscription fee of 0.3ETH to ${RECEIVER_WALLET_ADDRESS} and send transaction hash using /confirm_payment.`,
        );
      } catch (error) {
        console.error(`Database error: ${error}`);
        this.logger.error("database error:", error.message)
        await this.bot.sendMessage( chat_id,
           'An error occurred while setting your address. Please try again.',
        );
      }
    } else {
      await this.bot.sendMessage(
        chat_id,
        'Please send a valid from address. For example /setyouraddress <your_address>',
      );
    }
  }

  //get the transaction id as input from user
  async waitFortxid(chatId: number): Promise<string> {

    return new Promise((resolve) => {
      // Listen for the user's message
      this.bot.once('message', async (message: any) => {
        if (message.chat.id === chatId) {
          resolve(message.text);
        }
      });
    });
  }

  //method to verify transaction with the help of etherscan api
  async verifyTransaction(telegramId: number, tx_id: string): Promise<boolean> {
    try {
      const url = `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${tx_id}&apikey=${ETHERSCAN_API_KEY}`;
      const response = await this.httpService.axiosRef.get(url);
      const transaction = response.data.result;
      let fromAddress = null;

      const subscription = await this.getUserSubscription(telegramId)
      if (subscription.from_address) {
        fromAddress = subscription.from_address;
      }

      if (transaction) {

        const correctAddress = transaction.to.toLowerCase() ===  RECEIVER_WALLET_ADDRESS.toLowerCase();

        const correctValue = parseInt(transaction.value, 16) >= this.MINIMUM_WEI;
    
        const correctFromAddress =  transaction.from === fromAddress.toLowerCase();
  
        return correctAddress && correctValue && correctFromAddress;
      }
    } catch (error) {
      console.error(`Request to Etherscan failed: ${error}`);
    }
    return false;
  }

  //method to update transaction id in payment history table
  async updatePaymentByTxId(telegramId: number, txId: string, fromAddress: string): Promise<boolean> {
    const paymentHistory = new PaymentHistory();
    paymentHistory.telegram_id = telegramId;
    paymentHistory.tx_hash = txId;
    paymentHistory.from_address = fromAddress;

    try {
      await this.paymentsHistoryRepository.save(paymentHistory);
      return true;
    } catch (error) {
      console.error(`Database error: ${error}`);
      return false;
    }
  }

  //method to handle confirm_payment command
  async confirmPayment(chat_id: number, txID: string, telegram_id: number) {
    if (!txID) {
      await this.bot.sendMessage(chat_id, 'You did not provide a transaction ID. Please send the transaction ID after /confirm_payment command.' );
      return;
    }
    let fromAddress: string;
    try {
      const subscription = await this.getUserSubscription(telegram_id);
      fromAddress = subscription.from_address;
    } 
    catch (error) {
      this.logger.error(`Database error: ${error}`,error);
      console.log(error)
      return;
    }
    const alreadyUsed = await this.checkTxIdInPayments(txID, chat_id);
    if (alreadyUsed) {
      await this.bot.sendMessage(chat_id, 'This Tx_hash is already used.');
      return;
    } else {
      const verified = await this.verifyTransaction(telegram_id, txID);

      if (verified) {
        await this.updatePaymentByTxId(telegram_id, txID, fromAddress);
        const subscriptionUpdated = await this.updateSubscription(telegram_id, true );
        if (subscriptionUpdated) {
          const messageToSend = starMessageTosend;
          await this.bot.sendMessage(chat_id, messageToSend);
          this.logger.info('Verified transaction hash and updated subscription status.' );
          console.log('Verified transaction hash and updated subscription status.')
        }
      } 

      else {
        this.updateSubscription(telegram_id, false);
        await this.bot.sendMessage(chat_id, 'Transaction hash validation failed. Please share valid tx_hash. from_address not matched!', );
      }
    }
  }

//method to parse api keys to database
  async handleApiKey(chatId:string, telegramId:number, parts): Promise<void> {
    if (parts.length === 4) {
      try {
        const apiKey = this.cryptoService.encrypt(parts[1]);
        const apiSecret = this.cryptoService.encrypt(parts[2]);
        const apiPassphrase = parts[3];
        try {
          const activeSubscription = await this.getUserSubscription(telegramId);
          if (!activeSubscription) {
            await this.subscriptionRepository.save({
              telegram_id: telegramId,
              api_key: apiKey,
              api_secret: apiSecret,
              api_passphrase: apiPassphrase,
            });
          } else {
            activeSubscription.api_key = (await apiKey).result;
            activeSubscription.api_secret = (await apiSecret).result;
            activeSubscription.api_passphrase = apiPassphrase;
            await this.subscriptionRepository.save(activeSubscription);
          }
          this.logger.info('API key, secret and passphrase set successfully.');
          console.log('API key, secret and passphrase set successfully.');
          await this.bot.sendMessage( chatId,'API key secret and passphrase set successfully. Please set the trading pair using /setpair <pair> (e.g., /setpair BTCUSDT)',
          );
        } 
        catch (error) {
          this.logger.error(`Database error: ${error.message}`, error.message);
        }
      }
       catch (error) {
        await this.bot.sendMessage(chatId, 'Invalid format. Please set your API key ,secret and passphrase in the following format:\n/apikey <your_api_key> <your_api_secret> <your_api_passphrase>');
        this.logger.error(error)
        console.log(error)
      }
    } 
    else {
      await this.bot.sendMessage(chatId,'Invalid format. Please set your API key, secret and passphrase in the following format:\n/apikey <your_api_key> <your_api_secret> <your_api_passphrase>' );
    }
  }

  //method to setpair to database
  async handleSetPair(chatId:string,telegramId:number,parts): Promise<void> {
   
    if (parts.length === 2) {
      const pair = parts[1].toUpperCase();
      try {
        const activeSubscription = await this.getUserSubscription(telegramId);
        if (!activeSubscription) {
          await this.subscriptionRepository.save({
            telegram_id: telegramId,
            pair,
          });
        } else {
          activeSubscription.pair = pair;
          await this.subscriptionRepository.save(activeSubscription);
        }
        this.logger.info(`Trading pair set to: ${pair}`);
        console.log(`Trading pair set to: ${pair}`)
        await this.bot.sendMessage(chatId, `Trading pair set to: ${pair}`);
        await this.bot.sendMessage(chatId, 'Please set the interval in seconds using /setinterval <seconds> (e.g., /setinterval 60)');
      }
       catch (error) {
        this.logger.error(`Database error: ${error.message}`, error);
      }
    } 
    else {
      await this.bot.sendMessage( chatId,"Please use setpair command with format Example : '/setpair DGHUSDT'");
    }
  }

  //method to set interval to database
  async handleSetInterval(chatId:string ,telegramId:number,parts): Promise<void> {

    if (parts.length === 2) {
      try {
        const interval = parseInt(parts[1], 10);
        // Check if the interval is at least 35
        if (interval < 35) {
          await this.bot.sendMessage(
            chatId,
            'The interval must be at least 35 seconds (e.g., /setinterval 60)',
          );
          return; // Exit the function to prevent further execution
        }
        try {
          const activeSubscription = await this.getUserSubscription(telegramId);
          if (!activeSubscription) {
            await this.subscriptionRepository.save({
              telegram_id: telegramId,
              interval,
            });
          } else {
            activeSubscription.interval = interval;
            await this.subscriptionRepository.save(activeSubscription);
          }
          this.logger.info(`Interval set to: ${interval} seconds`);
          console.log(`Interval set to: ${interval} seconds`)
          await this.bot.sendMessage(
            chatId,
            `Interval set to: ${interval} seconds`,
          );
          await this.bot.sendMessage(
            chatId,
            'Please set the offset range using /setoffsetrange <min_range> <max_range> (e.g., /setoffsetrange -0.000004 0.0000003)',
          );
        } catch (error) {
          this.logger.error(`Database error: ${error.message}`, error);
        }
      }
       catch (error) {
        await this.bot.sendMessage(  chatId,  'Invalid format. Please enter an integer value for the interval.' );
      }
    } else {
      await this.bot.sendMessage( chatId, "Please use setinterval command with format Example : '/setinterval 60'");
    }
  }

  //method to setoffsetrange to database
  async handleSetOffset(chatId:string,telegramId:number,parts): Promise<void> {
    if (parts.length === 3) {
      try {
        const minOffsetRange = parseFloat(parts[1]);
        const maxOffsetRange = parseFloat(parts[2]);
        if (minOffsetRange >= maxOffsetRange) {
          await this.bot.sendMessage(chatId, 'Invalid offset range. Ensure the minimum volume is less than the maximum volume.',);
          return;
        }
        try {
          const activeSubscription = await this.getUserSubscription(telegramId);
          if (!activeSubscription) {
            await this.subscriptionRepository.save({
              telegram_id: telegramId,
              offset_range: [minOffsetRange, maxOffsetRange].toString(),
            });
          } else {
            const offsetRange = [minOffsetRange, maxOffsetRange];
            activeSubscription.offset_range = offsetRange.toString();
            await this.subscriptionRepository.save(activeSubscription);
          }
          this.logger.info( `Offset range set to: ${minOffsetRange}- ${parts[2]}`);
          console.log(`Offset range set to: ${minOffsetRange}- ${parts[2]}`)
          await this.bot.sendMessage( chatId, `Offset range set to: ${minOffsetRange}- ${parts[2]}`);
          await this.bot.sendMessage( chatId, 'Please set the token range using /settokenrange <min_range> <max_range> (e.g., /settokenrange 1500 2000)',);
        } 
        catch (error) {
          this.logger.error(`Database error: ${error.message}`, error);
          console.log(`Database error: ${error.message}`, error)
        }
      } 
      catch (error) {
        await this.bot.sendMessage( chatId, 'Invalid format. Please enter numeric values for offset range.' );
      }
    } else {
      await this.bot.sendMessage( chatId, 'Invalid command format. Use: /setoffsetrange <min_offset_range> <max_offset_range>');
    }
  }

  //method to settokenrange to database
  async handleSetTokenRange(chatId:string, telegramId:number, parts): Promise<void> {

    if (parts.length === 3) {
      try {
        const minTokenRange = parseFloat(parts[1]);
        const maxTokenRange = parseFloat(parts[2]);
        const arrayValues = [minTokenRange, maxTokenRange];

        if (minTokenRange >= maxTokenRange) {
          await this.bot.sendMessage(chatId,'Invalid token range. Ensure the minimum volume is less than the maximum volume.');
          return;
        }
        try {
          const activeSubscription = await this.getUserSubscription(telegramId);
          if (!activeSubscription) {
            await this.subscriptionRepository.save({
              telegram_id: telegramId,
              token_range: arrayValues.toString(),
            });
          } else {
            activeSubscription.token_range = arrayValues.toString();
            await this.subscriptionRepository.save(activeSubscription);
          }
          this.logger.info( `Token range set to: ${minTokenRange}-${maxTokenRange}` );
          console.log(`Token range set to: ${minTokenRange}-${maxTokenRange}`)
          await this.bot.sendMessage(  chatId, `Token range set to: ${minTokenRange}-${maxTokenRange}`,);
          await this.bot.sendMessage(chatId,'You may now start your bot with /startbot.');
        } 
        catch (error) {
          this.logger.error(`Database error: ${error.message}`, 'error');
        }
      } 
      catch (error) {
        await this.bot.sendMessage( chatId, 'Invalid format. Please enter numeric values for token range.');
      }
    } else {
      await this.bot.sendMessage( chatId,'Invalid command format. Use: /settokenrange <min_token_range> <max_token_range>' );
    }
  }

  //method to handle startbot command
  async startBot(chatId:string ,telegramId:number,command:string): Promise<void> {
    const botId = telegramId.toString();
    const uniqueId = telegramId.toString();
   
    try {
      const activeSubscription = await this.getUserSubscription(telegramId);
      if (!activeSubscription) {
        this.logger.error( `No active subscription found for telegram_id: ${telegramId}`);
        return;
      }
      activeSubscription.unique_id = uniqueId;
      activeSubscription.bot_id = botId;

      await this.subscriptionRepository.save(activeSubscription);
      const {api_key,api_secret,api_passphrase,pair,interval,offset_range,token_range } = activeSubscription;
      const type = 'limit';
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
        apiPassphrase: api_passphrase,
        type: type,
        pair: pair,
        interval: interval,
        offset_range: offset_range,
        token_range: token_range,
        bot_id: botId,
        unique_id: uniqueId,
      };

      const response = await this.httpService.axiosRef.post(exchangeUrl, data, { headers});
      const msg = 'Bot Started. . . ';
      if (response.status === 200) {
        console.log('🚀 ~ startBot ~ response:', response.data);
        if (response.data.message === msg) {
          this.logger.info( `Bot started with bot id: ${botId} and unique id: ${uniqueId}. Generating volume...`);
          // Send messages to the user
          this.sendMessageToUser(chatId, 'Bot Started!! Generating volume..');
          this.sendMessageToUser(chatId, 'You can stop your bot with /stopbot command.' );
          this.sendMessageToUser(chatId, "For detailed trade information, please check your wallet's trading logs and history.");
        } else {
          this.sendMessageToUser(chatId, response.data.message);
        }
      } else {
        this.logger.error(`Error in starting bot: ${response.statusText}`);
      }
      // Share bot info with Bubble
     
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
  

      const accessKey = 'f7gFzvVfI9';
      const headers = {
        'Content-Type': 'application/json',
      };
      const bubbleData = {
        apiKey: api_key,
        apiSecret: api_secret,
        pair: pair,
        interval: interval,
        offset: offset_range,
        tradeRange: token_range,
        chatId: chatId.toString(),
        telegramId: telegramId.toString(),
        botId: botId.toString(),
        uniqueId: uniqueId.toString(),
        apiPassphrase: api_passphrase,
        exchangeType: exchange,
        accessKey: accessKey,
      };

    
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
        console.log("🚀 ~ BaseBotServices ~ sendDatatoBubble ~ bubbleResponse.data:", bubbleResponse.data)
    } catch(error) {
      console.log("🚀 ~ BaseBotServices ~ startBot ~ error:", error)
      this.logger.error("handle the error",error.response)
    
    }
      
  //    this.sendDatatoBubble(chatId,telegramId,command);
    } catch (error) {
      this.logger.error(`Error in handleStartBot: ${error.response.data}`);
    }
  }

//method to handle stopbot command
  async stopBot(chatId:string ,telegramId:number,command:string): Promise<void> {
   
    const botId = telegramId.toString();
    const uniqueId = telegramId.toString();
    const exchangeUrl = URL_STOPBOT;
  
    const headers = {
      accessToken: accessToken,
      refreshToken: refreshToken,
      'Content-Type': 'application/json',
    };

    const data = {
      bot_id: botId,
      unique_id: uniqueId,
    };
    //send data to exchange
    try {
      const response = await this.httpService.axiosRef.post(exchangeUrl, data, {headers});
      console.log('🚀 ~ BaseBotServices ~ stopBot ~ response:', response.data);
      if (response.status === 200) {
        if (response.data.response === 'Success') {
          this.logger.info(`Bot stopped for bot id: ${botId} and unique id: ${uniqueId}.`);
          //send messagge to user
          this.sendMessageToUser(chatId, 'Stop initiated.');
          this.sendMessageToUser(chatId, 'Bot Stopped');
        } 
        else {
          this.sendMessageToUser(chatId, response.data.message);
        }
      } 
      else {
        this.logger.error(`Error in stopping bot: ${response.statusText}`);
      }

//send data to bubble
     const  bubbleUrl = BUBBLE_URL_STOPBOT;
    
  try{
        const accessKey = 'f7gFzvVfI9';
        const headers = {
          'Content-Type': 'application/json',
        };
        const bubbleData = {
          botId: botId.toString(),
          accessKey: accessKey,
        };
       
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
        this.logger.error("handle the error",error.response.data)
        console.log(error.response.data);
      }
    } catch (error) {
      this.logger.error(`Error in handleStopBot: ${error.response.data}`);
    }
  }


  //method to check wallet balance
  async checkBalance(chatId:string,telegramId:number): Promise<void> {
   
    try {
      const activeSubscription = await this.getUserSubscription(telegramId);
      if (!activeSubscription) {
         this.logger.error(`No active subscription found for telegram_id: ${telegramId}` );
        return;
      }
      const { api_key, api_secret, api_passphrase } = activeSubscription;
      const url = URL_WALLET_INFO;
      const headers = {
        accessToken: accessToken,
        refreshToken: refreshToken,
        'Content-Type': 'application/json',
      };
      const data = {
        apiKey: api_key,
        apiSecret: api_secret,
        apiPassphrase: api_passphrase,
      };

      const response = await this.httpService.axiosRef.post(url, data, {headers});
      if (response.status === 200) {
        const balances = response.data.data;
        this.logger.info('🚀 ~ checkBalance ~  balances:', balances);
        let message = 'Your Balances:\n';
        balances.forEach((item) => {
          message += `Currency: ${item.currency}\nType: ${item.type}\nBalance: ${item.balance}\nAvailable: ${item.available}\nHolds: ${item.holds}\n\n`;
        });
        //show balance to user
        this.bot.sendMessage(chatId, message);
        this.logger.info(`Balance info : ${JSON.stringify(balances)}`);
      } else {
        console.error(`Request failed with status code ${response.status}.`);
        this.bot.sendMessage( chatId,`Could not fetch balances, please try again.\n${response.data.message}` );
      }
    } catch (error) {
      console.error(`${error}`);
      throw error;
    }
  }

 //method to send the data to bubble 
  sendMessageToUser = (chatId: string, message: string) => {
    this.bot.sendMessage(chatId, message);
  };
}
