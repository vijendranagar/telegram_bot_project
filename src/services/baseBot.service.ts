import {Inject, Injectable,Scope } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ActiveSubscriptions } from '../entities/active_subscriptons.entities';
import { InjectRepository } from '@nestjs/typeorm';
import { IbotService } from './IBot.interface';
import { v4 as uuidv4 } from 'uuid';
import { YOUR_WALLET_ADDRESS } from 'config/constants';
import { TELEGRAM_TOKEN } from 'config/constants';
import * as dotenv from 'dotenv'
dotenv.config();


const TelegramBot = require('node-telegram-bot-api');
const SUBSCRIPTION_DURATION = 30 * 24 * 60 * 60;
//const TELEGRAM_TOKEN = "7154834262:AAFbOv_W6xl1niPgRfN0o6uZKgin1qcc6xk";



@Injectable()
export abstract class BaseBotServices implements IbotService  {
  
  private logger = new Logger(BaseBotServices.name);
  private readonly bot: any;

  constructor( 
  
  // @Inject('IbotService') private readonly IbotService: IbotService,
    @InjectRepository(ActiveSubscriptions)
    private readonly subscriptionRepository: Repository<ActiveSubscriptions>,
) 
{
    this.bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true }); 
    //this.bot.on("message", this.handleStart)
    this.bot.on("message", this.onRecieveMessage);
    
    // this.bot.on("polling_error", (msg) => console.log(msg));
  //  this.sendMessageToUser("1488997973", `Server started at ${new Date}`);
  
}
  
  async get_user_subscription(telegramId: any): Promise<ActiveSubscriptions | undefined> {
    try {
      return await this.subscriptionRepository.findOne({ where: { telegram_id: telegramId } });
    } catch (error) {
      this.logger.error(`Error getting user subscription: ${error.message}`);
      throw error;
    }
  }

  async update_subscription_status( userId:string, telegramId: number, paymentId: string, isActive: boolean,Exchange:string): Promise<void> {
    try {
      let subscriptionEnd: Date | null = null;
      if (isActive) {
        const currentTime = new Date();
        currentTime.setSeconds(currentTime.getSeconds() + SUBSCRIPTION_DURATION);
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
        //subscription.exchange = Exchange;
        newSubscription.subscription_end = subscriptionEnd;
        await this.subscriptionRepository.save(newSubscription);
      }
    } catch (error) {
      this.logger.error(`Error updating subscription status: ${error.message}`);
      throw error;
    }
  }
  async handle_from_address(message: any): Promise<void> {
    const telegramId = message.from.id;
    const chatId = message.chat.id;
    const parts = message.text.split(' ');

    if (parts.length === 2) {
      try {
        const subscription = await this.subscriptionRepository.findOne({ where: { telegram_id: telegramId } });
        if (subscription) {
          subscription.from_address = parts[1];
          await this.subscriptionRepository.save(subscription);
          this.logger.log("setyouraddress command completed.");
          this.bot.sendMessage(chatId, `We have got your address. To use this service pay a subscription fee of 0.1ETH to ${YOUR_WALLET_ADDRESS} and send transaction hash using /confirm_payment.`);
        } else {
          this.bot.sendMessage(chatId, "You need to subscribe before setting your address. Please subscribe first.");
        }
      } catch (error) {
        this.logger.error(`Database error: ${error.message}`);
        throw error;
      }
    } else {
      this.bot.sendMessage(chatId, 'Please send a valid from address. For example /setfromaddress <your_address>');
    }
  }
  async verify_transaction(tx_id,telegram_id){}
    
  async get_from_address_by_tx_id(tx_id){}

  async update_payments_by_tx_id(tx_id,telegram_id,from_address){}

  async update_subscription(telegram_id,is_active){}
  
  async get_tx_id_in_payments(tx_id, chat_id){}

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
    await this.handle_from_address(msg);
  
    return;
  }

    const subscription = await this.get_user_subscription(telegram_id);
    if (subscription && subscription.is_active) {
        switch (command) {
            case '/apikey':
                this.handleApiKeyCommand(chatId);
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
                this.sendMessageToUser(chatId, "Unrecognized command. Please try again.");
                break;
        }
    } else {
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



 async requestTransactionId(message: any) {
  const chatId = message.chat.id;
  await this.bot.sendMessage(chatId, 'Please send the transaction ID of your payment.');

  this.bot.registerUpdateHandler(update => {
    // Check if the received update is a message
    if (update.message) {
      const transactionId = update.message.text;
      // Call the function to handle the transaction ID
    //  this.confirmPayment(update, transactionId);
    }
  });
}
handleConfirmPayment() {
  this.bot.on('text', { command: 'confirm_payment' }, async (message) => {
    const chatId = message.chat.id;
    await this.bot.sendMessage(chatId, 'Please send the transaction ID of your payment.');
  });
}
  handleConfirmPaymentCommand(chatId: string) {
    // Handle the /confirmpayment command...
    this.sendMessageToUser(chatId, "Processing /confirmpayment command...");
  }
  

  handleApiKeyCommand = (chatId: string) => {
    // Handle the /apikey command...
    this.sendMessageToUser(chatId, "Processing /apikey command...");
  }

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
