import {Inject, Injectable,Scope } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ActiveSubscriptions } from '../entities/active_subscriptons.entities';
import { PaymentHistory } from 'src/entities/payments_history.entities';
import { InjectRepository } from '@nestjs/typeorm';
import { IbotService } from './IBot.interface';
import { v4 as uuidv4 } from 'uuid';
import { RECEIVER_WALLET_ADDRESS } from 'config/constants';
import { TELEGRAM_TOKEN } from 'config/constants';
import { SUBSCRIPTION_DURATION } from 'config/constants';
import * as TelegramBot from 'node-telegram-bot-api';
import { ETHERSCAN_API_KEY } from 'config/constants';
import { HttpService } from "@nestjs/axios";

import {CIPHER_SUITE} from '../crypto'



import * as dotenv from 'dotenv'
const  MOMENT = require("@ccmos/nestjs-moment")
import * as moment from 'moment';
//import {TelegramBot} from 'node-telegram-bot-api'
dotenv.config();


//const TelegramBot = require('node-telegram-bot-api');



@Injectable()
export abstract class BaseBotServices implements IbotService  {

  
  private currentConversation: Map<number, string> = new Map();
  private logger = new Logger(BaseBotServices.name);
  private readonly bot: any;
  private readonly MINIMUM_WEI: number = 100000000000000000;
  constructor( 
  
  // @Inject('IbotService') private readonly IbotService: IbotService,
     private httpService: HttpService,
    @InjectRepository(ActiveSubscriptions)
    private readonly subscriptionRepository: Repository<ActiveSubscriptions>,
    @InjectRepository(PaymentHistory)
   // private readonly subscriptionRepository: Repository<ActiveSubscriptions>,
    private readonly paymentsHistoryRepository: Repository<PaymentHistory>,
) 
{
    this.bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true }); 
    //this.bot.on("message", this.handleStart)
    this.bot.on("message", this.onRecieveMessage);

  
}

  async get_user_subscription(telegramId: any): Promise<ActiveSubscriptions | undefined> {
    try {
      return await this.subscriptionRepository.findOne({ where: { telegram_id: telegramId } });
    } catch (error) {
      this.logger.error(`Error getting user subscription: ${error.message}`);
      throw error;
    }
  }

  async update_subscription_status( userId:string, telegramId: number, paymentId: string, isActive: boolean,Exchange:any): Promise<void> {
    try {
      let subscriptionEnd: Date | null = null;
      if (isActive) {
        const currentTime = new Date();
        currentTime.setSeconds(currentTime.getSeconds() + +SUBSCRIPTION_DURATION);
        subscriptionEnd = currentTime;
      }
      
      const subscription = await this.subscriptionRepository.findOne( { where: { telegram_id: telegramId } });

      if (subscription) {
        subscription.payment_id = paymentId;
        subscription.is_active = isActive;
        subscription.exchange = Exchange;
        
        subscription.subscription_end = subscriptionEnd;
        await this.subscriptionRepository.save(subscription);
      } else {
        const newSubscription = new ActiveSubscriptions();
        newSubscription.telegram_id = telegramId;
        newSubscription.payment_id = paymentId;
        newSubscription.is_active = isActive;
        newSubscription.exchange = Exchange;
        newSubscription.subscription_end = subscriptionEnd;
        await this.subscriptionRepository.save(newSubscription);
      }
    } catch (error) {
      this.logger.error(`Error updating subscription status: ${error.message}`);
      throw error;
    }
  }
  
  async verify_transaction(tx_id,telegram_id){}
    
  async get_from_address_by_tx_id(tx_id){}
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
    }
    return false;
  }


  async update_subscription(telegram_id,is_active){}
  async updateSubscription(telegram_id: number, is_active: boolean): Promise<boolean> {
    try {
      const subscriptionEnd = moment().add(SUBSCRIPTION_DURATION, 'minutes').format(); // Adjust SUBSCRIPTION_DURATION as needed
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
  
  async get_tx_id_in_payments(tx_id, chat_id){}
  async checkTxIdInPayments(txId: string, chatId: number): Promise<boolean> {
    try {
      await this.bot.sendMessage(chatId, 'Transaction ID is being verified.');

      const txHash = await this.paymentsHistoryRepository.findOne({ where: { tx_hash: txId } });
      return !!txHash;
    } catch (error) {
      console.error(`Database error: ${error}`);
      return false;
    }
  }

  onRecieveMessage = async (msg: any) => {
    this.logger.debug(msg);
    const chatId = msg.chat.id;
    const telegram_id = msg.from.id;
    const command = msg.text ? msg.text.split(' ')[0] : null;
    let lastCommandProcessed = null;
 
    if (command === '/start') {
      await this.handleStart(msg);
      lastCommandProcessed ='/start'
      return;
      // Exit the function after handling /start command
  }
  if (command === '/setyouraddress') {
    await this.handleFromAddress(msg);
    return;
  }

  if (command === '/confirm_payment') {
    await this.bot.sendMessage(chatId, 'Please send the transaction ID of your payment.');
   
     const response = await this.waitFortxid(chatId);
      // Process the received transaction ID
    this.currentConversation.set(chatId,"waiting-for-transaction-id");
      await this.confirm_payment(chatId, response,telegram_id);
      // Remove the conversation state for this chat ID
      this.currentConversation.delete(chatId);
  }
   
 const subscription = await this.get_user_subscription(telegram_id);
    if (subscription && subscription.is_active) {
        switch (command) {
            case '/apikey':
                // this.handleApiKeyCommand(msg);
                break;
            case '/setpair':
                this.handleSetPairCommand(chatId);
                break;
            case '/setinterval':
                this.handleSetIntervalCommand(chatId);
                break;
            case '/setvolume':
                this.handleSetVolumeCommand(chatId);
                break;
            case '/setoffsetrange':
                this.handleSetOffsetRangeCommand(chatId);
                break;
            case '/settokenrange':
                this.handleSetTokenRangeCommand(chatId);
                break;
            case '/startbot':
                this.handleStartBotCommand(chatId);
                break;
            case '/balances':
                this.handleBalancesCommand(chatId);
                break;
            default:
                // Handle unrecognized commands or other messages...
               // this.sendMessageToUser(chatId, "Unrecognized command. Please try again.");
                break;
        }
    } 
    else {
      if (this.currentConversation.hasOwnProperty(chatId) && this.currentConversation[chatId] === "waiting-for-transaction-id") {
        // Code to execute if the property exists and matches the expected value
        this.sendMessageToUser(chatId,"transaction id recieved")
      }else
        this.sendMessageToUser(chatId, "You need an active subscription to access this feature. Please subscribe to continue.");
    }

   
}


async handleStart(message) {
 
    const chatId = message.chat.id;
    const telegramId = message.from.id;
    const subscription = await this.get_user_subscription(telegramId);

    if (subscription && subscription.is_active) {
      const messageToSend = (
      `You are already subscribed and can use the bot.\n`+

      `Here's a full list of commands...\n\n`+  
      "/apikey <api_key> <api_secret>\n" +
      `The above command can help you set up your ${process.env.exchange} API keys.\n\n` +
      "/setpair <pair>\n" +
      `The above command can help you set up your ${process.env.exchange} pair (e.g., /setpair BTCUSDT).\n\n`+
      "/setinterval <seconds>\n" +
      "The above command can help you set up your interval in seconds (e.g., /setinterval 60).\n\n" +
      "/setoffsetrange <min_range> <max_range>\n" +
      "The above command can help you set up your offset range (e.g., /setoffsetrange -0.000004 0.0000003).\n\n" +
      "/settokenrange <min_range> <max_range>\n" +
      "The above command can help you set up your token trade range (e.g., /settokenrange 1500 2000).\n\n" +
      "/startbot\n" +
      "The above command can help you start a bot after you've finished the previous commands.\n\n" +
      "/stopbot\n" +
      "The above command can help you stop a bot after you've started one.\n\n" +
      "/balances\n" +
      `The above command can help you check your ${process.env.exchange} account balance.`);
      this.sendMessageToUser(chatId, messageToSend);
    } else {
      const exchange = process.env.exchange
      const myUUID = uuidv4();
      const paymentId = myUUID;
      //this.generateUuid(); // Assuming you have a method to generate UUID
      const paymentMessage = "Welcome to the VoluMint MM Bot! Please send account address using /setyouraddress command with which you will be paying subscription fees of 0.3 ETH. For example /setyouraddress <your_wallet_address>";
      this.sendMessageToUser(chatId, paymentMessage);
      this.update_subscription_status(null, telegramId, paymentId, false, exchange); // Use chat_id from the message and set subscription status to False
    }
  
}
 
async handleFromAddress(message: any) {
  const telegram_id = message.from.id;
  const chat_id = message.chat.id;
  const parts = message.text.split(' ');

  if (parts.length === 2) {
    try {
      const subscription = await this.subscriptionRepository.findOne({where: { telegram_id:telegram_id }});
      if (!subscription) {
        await this.subscriptionRepository.save({ telegram_id , from_address: parts[1] });
      } else {
        subscription.from_address = parts[1];
        await this.subscriptionRepository.save(subscription);
      }
      await this.bot.sendMessage(chat_id, `We have got your address. To use this service pay a subscription fee of 0.3ETH to ${RECEIVER_WALLET_ADDRESS} and send transaction hash using /confirm_payment.`);
    } catch (error) {
      console.error(`Database error: ${error}`);
      await this.bot.sendMessage(chat_id, 'An error occurred while setting your address. Please try again.');
    }
  } else {
    await this.bot.sendMessage(chat_id, 'Please send a valid from address. For example /setyouraddress <your_address>');
  }
}
async handle_from_address(message: any): Promise<void> {
  const telegramId = message.from.id;
  const chatId = message.chat.id;
  const parts = message.text.split(' ');

  if (parts.length === 2) {
    try {
       const subscription = await this.subscriptionRepository.findOne({ where: { telegram_id: telegramId } });

       subscription.from_address = parts[1];
        await this.subscriptionRepository.save(subscription);
        this.logger.log("setyouraddress command completed.");
        this.bot.sendMessage(chatId, `We have got your address. To use this service pay a subscription fee of 0.3ETH to ${RECEIVER_WALLET_ADDRESS} and send transaction hash using /confirm_payment.`);

        // this.bot.sendMessage(chatId, "You need to subscribe before setting your address. Please subscribe first.");

    } catch (error) {
      this.logger.error(`Database error: ${error.message}`);
      throw error;
    }
  } else {
    this.bot.sendMessage(chatId, 'Please send a valid from address. For example /setfromaddress <your_address>');
  }
}

 //async requestTransactionId(message: any) {
 // const chatId = message.chat.id;
 // await this.bot.sendMessage(chatId, 'Please send the transaction ID of your payment.');

 // this.currentConversation.set(chatId, 'waiting_for_transaction_id');
//}

async waitFortxid(chatId: number): Promise<string> {
  return new Promise((resolve) => {
    // Listen for the user's message
    this.bot.once('message', async (message: any) => {
      if (message.chat.id === chatId) {
        // Resolve the promise with the user's message
        this.currentConversation.set(chatId,"waiting-for-transaction-id");
        resolve(message.text);
      }
    });
  });
}
 
async verifyTransaction( telegramId: number, tx_id:string): Promise<boolean> {
  try {
   
   // const txid = "0x32886fe4421621469734033dbb97170056d4d2e287ee9354579ece26a914db4a"
  //const url = `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${tx_id}&apikey=${ETHERSCAN_API_KEY}`;
   
  const response = await this.httpService.axiosRef.get(`https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${tx_id}&apikey=${ETHERSCAN_API_KEY}`);
 //const response = await this.httpService.axiosRef.get(url);
 
  
 const transaction =  response.data.result;
 
 let fromAddress = null;

   const dbFromAddress = await this.subscriptionRepository.findOne({ where: { telegram_id: telegramId } });
  //  console.log("🚀 ~ BaseBotServices ~ verifyTransaction ~ dbFromAddress:", dbFromAddress.from_address)
   if (dbFromAddress.from_address){
     fromAddress = dbFromAddress.from_address;
     console.log("🚀 ~ BaseBotServices ~ verifyTransaction ~ fromAddress:", fromAddress)
  }

    if (transaction) {
    const correctAddress = transaction.to.toLowerCase() === RECEIVER_WALLET_ADDRESS.toLowerCase();
     console.log("🚀 ~ BaseBotServices ~ verifyTransaction ~ correctAddress:", correctAddress)
     const correctValue = parseInt(transaction.value, 16) >= this.MINIMUM_WEI;
      console.log("🚀 ~ BaseBotServices ~ verifyTransaction ~ correctValue:", correctValue)
      const correctFromAddress = transaction.from === fromAddress.toLowerCase();
      console.log("🚀 ~ BaseBotServices ~ verifyTransaction ~ transaction.from:", transaction.from)
      console.log("🚀 ~ BaseBotServices ~ verifyTransaction ~ correctFromAddress:", correctFromAddress)
      return correctAddress && correctValue && correctFromAddress;
   }
 } catch (error) {
   console.error(`Request to Etherscan failed: ${error}`);
 }
  return false;
}
async update_payments_by_tx_id(telegramId: number, txId: string, fromAddress: string): Promise<boolean> {
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
async confirm_payment(chat_id, txID ,telegram_id) {
  console.log("🚀 ~ BaseBotServices ~ confirm_payment ~ Transaction_id:",  txID)
  

  if (!txID) {
   await this.bot.sendMessage(chat_id, "You did not provide a transaction ID. Please send the transaction ID after /confirm_payment command.");
    return;
  }

  let fromAddress: string;
  try {
   const value =  await this.subscriptionRepository.findOne({ where: { telegram_id: telegram_id } });
    
    fromAddress = value.from_address;
    console.log("🚀 ~ BaseBotServices ~ confirm_payment ~ fromAddress:", fromAddress)
    
  } catch (error) {
    this.logger.error(`Database error: ${error}`);
   return;
  }

  const alreadyUsed = await this.checkTxIdInPayments(txID, chat_id);
  if (alreadyUsed) {
   await this.bot.sendMessage(chat_id, "This Tx_hash is already used.");
   return;
  }
  else{

  const verified = await this.verifyTransaction(telegram_id,txID);
  
  if (verified) {
    await this.update_payments_by_tx_id(telegram_id, txID, fromAddress);
    const subscriptionUpdated = await this.updateSubscription(telegram_id, true);
    if (subscriptionUpdated) {
      const messageToSend = (
        "Your subscription is now active. You may initialise your service with /apikey command. For example: /apikey <api_key> <api_secret> <api_phrase>\n\n" +
        "Here's a full list of commands you can run:\n\n" +
        `Here's a full list of commands...\n\n`+  
      "/apikey <api_key> <api_secret> <api_passphrase>\n" +
      `The above command can help you set up your ${process.env.exchange} API keys.\n\n` +
      "/setpair <pair>\n" +
      `The above command can help you set up your ${process.env.exchange} pair (e.g., /setpair BTCUSDT).\n\n`+
      "/setinterval <seconds>\n" +
      "The above command can help you set up your interval in seconds (e.g., /setinterval 60).\n\n" +
      "/setoffsetrange <min_range> <max_range>\n" +
      "The above command can help you set up your offset range (e.g., /setoffsetrange -0.000004 0.0000003).\n\n" +
      "/settokenrange <min_range> <max_range>\n" +
      "The above command can help you set up your token trade range (e.g., /settokenrange 1500 2000).\n\n" +
      "/startbot\n" +
      "The above command can help you start a bot after you've finished the previous commands.\n\n" +
      "/stopbot\n" +
      "The above command can help you stop a bot after you've started one.\n\n" +
      "/balances\n" +
      `The above command can help you check your ${process.env.exchange} account balance.`
     );
      await this.bot.sendMessage(chat_id, messageToSend);
      this.logger.log("Verified transaction hash and updated subscription status.");
   }
  } else {
    this.updateSubscription(telegram_id, false)
    await this.bot.sendMessage(chat_id, "Transaction hash validation failed. Please share valid tx_hash. from_address not matched!");
  }
}
    
  
}

  

//  async handleApiKeyCommand(message: any): Promise<void>{
//     // Handle the /apikey command...
    
//     const telegramId = message.from.id;
//     const chatId = message.chat.id;
//     const parts = message.text.split(' ')
//       let api_key = '';
//       let api_secret = '';

//       if (parts.length === 3) {
//         api_key = CIPHER_SUITE.encrypt(parts[1]);
//         api_secret = CIPHER_SUITE.encrypt(parts[2]);
//       }
  
//       try {
//         const subscription = await this.subscriptionRepository.findOne({where:{ telegram_id: telegramId }});
//         if (!subscription) {
//           await this.subscriptionRepository.save({ telegramId, api_key, api_secret });
//         } else {
//           subscription.api_key = api_key;
//           subscription.api_secret = api_secret;
//           await this.subscriptionRepository.save(subscription);
//         }
//         await this.bot.sendMessage(chatId, "API key and secret set successfully. Please set the trading pair using /setpair <pair> (e.g., /setpair BTCUSDT)");
//       } catch (error) {
//         console.error(`Database error: ${error}`);
//         await this.bot.sendMessage(chatId, "An error occurred while setting your API key and secret. Please try again.");
//       }
//     }



  handleSetPairCommand = (chatId: string) => {
    // Handle the /setpair command...
    this.sendMessageToUser(chatId, "Processing /setpair command...");
  }

  handleSetIntervalCommand = (chatId: string) => {
    // Handle the /setinterval command...
    this.sendMessageToUser(chatId, "Processing /setinterval command...");
  }

  handleSetVolumeCommand = (chatId: string) => {
    // Handle the /setvolume command...
    this.sendMessageToUser(chatId, "Processing /setvolume command...");
  }

  handleSetOffsetRangeCommand = (chatId: string) => {
    // Handle the /setoffsetrange command...
    this.sendMessageToUser(chatId, "Processing /setoffsetrange command...");
  }

  handleSetTokenRangeCommand = (chatId: string) => {
    // Handle the /settokenrange command...
    this.sendMessageToUser(chatId, "Processing /settokenrange command...");
  }

  handleStartBotCommand = (chatId: string) => {
    // Handle the /startbot command...
    this.sendMessageToUser(chatId, "Processing /startbot command...");
  }

  handleBalancesCommand = (chatId: string) => {
    // Handle the /balances command...
    this.sendMessageToUser(chatId, "Processing /balances command...");
  }

  sendMessageToUser = (chatId: string, message: string) => {
    this.bot.sendMessage(chatId, message);
  }
}
