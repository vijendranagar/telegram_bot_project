import { Inject, Injectable, Scope } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ActiveSubscriptions } from '../entities/active_subscriptons.entities';
import { PaymentHistory } from 'src/entities/payments_history.entities';
import { InjectRepository } from '@nestjs/typeorm';
import { IbotService } from './IBot.interface';
import { v4 as uuidv4 } from 'uuid';
import { RECEIVER_WALLET_ADDRESS } from 'config/constants';
import { TG_BOT_TOKEN } from 'config/constants';
import { SUBSCRIPTION_DURATION } from 'config/constants';
import * as TelegramBot from 'node-telegram-bot-api';
import { ETHERSCAN_API_KEY } from 'config/constants';
import { HttpService } from '@nestjs/axios';
import * as crypto from 'crypto';
import { cryptoservice } from './encryp_decryp/crypto.service';
import { URL_STARTBOT } from 'config/constants';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
const MOMENT = require('@ccmos/nestjs-moment');
import * as moment from 'moment';
//import {TelegramBot} from 'node-telegram-bot-api'
dotenv.config();

//const TelegramBot = require('node-telegram-bot-api');

@Injectable()
export abstract class BaseBotServices implements IbotService {
  private logger = new Logger(BaseBotServices.name);
  private readonly bot: any;
  private readonly MINIMUM_WEI: number = 100000000000000000;
  private readonly config: ConfigService;
  private myMap = new Map<any, any>();
  constructor(
    private httpService: HttpService,
    private cryptoService: cryptoservice,
    @InjectRepository(ActiveSubscriptions)
    private readonly subscriptionRepository: Repository<ActiveSubscriptions>,
    @InjectRepository(PaymentHistory)
    private readonly paymentsHistoryRepository: Repository<PaymentHistory>,
  ) {
    this.bot = new TelegramBot(TG_BOT_TOKEN, { polling: true });
    this.bot.on('message', this.onRecieveMessage);
  }

  async get_user_subscription(
    telegramId: any,
  ): Promise<ActiveSubscriptions | undefined> {
    try {
      return await this.subscriptionRepository.findOne({
        where: { telegram_id: telegramId },
      });
    } catch (error) {
      this.logger.error(`Error getting user subscription: ${error.message}`);
      throw error;
    }
  }

  async update_subscription_status(
    userId: string,
    telegramId: number,
    paymentId: string,
    isActive: boolean,
    Exchange: any,
  ): Promise<void> {
    try {
      let subscriptionEnd: Date | null = null;
      if (isActive) {
        const currentTime = new Date();
        currentTime.setSeconds(
          currentTime.getSeconds() + +SUBSCRIPTION_DURATION,
        );
        subscriptionEnd = currentTime;
      }

      const subscription = await this.subscriptionRepository.findOne({
        where: { telegram_id: telegramId },
      });

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

  async updateSubscription(
    telegram_id: number,
    is_active: boolean,
  ): Promise<boolean> {
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

  onRecieveMessage = async (msg: any) => {
    this.logger.debug(msg);
    const chatId = msg.chat.id;
    const telegram_id = msg.from.id;
    const command = msg.text ? msg.text.split(' ')[0] : null;

    if (command === '/start') {
      await this.handleStart(msg);
      return;
      // Exit the function after handling /start command
    }
    if (command === '/setyouraddress') {
      await this.handleFromAddress(msg);
      return;
    }

    if (command === '/confirm_payment') {
      await this.bot.sendMessage(
        chatId,
        'Please send the transaction ID of your payment.',
      );
      
      const response = await this.waitFortxid(chatId);
      this.myMap.set(chatId,response);
      await this.confirm_payment(chatId, response, telegram_id);
      this.myMap.delete(chatId);
      return;
    }
    
    const subscription = await this.get_user_subscription(telegram_id);
    if (subscription && subscription.is_active) {
      switch (command) {
        case '/apikey':
          this.handleApiKey(msg);
          break;
        case '/setpair':
          this.handleSetPair(msg);
          break;
        case '/setinterval':
          this.handleSetInterval(msg);
          break;

        case '/setoffsetrange':
          this.handleSetOffset(msg);
          break;
        case '/settokenrange':
          this.handleSetTokenRange(msg);
          break;
        case '/startbot':
          this.startBot(msg);
          break;
        case '/stopbot':
          this.stopBot(msg);
          break;
        case '/balances':
          this.checkBalance(msg);
          break;
        default:
          // Handle unrecognized commands or other messages...
          const check = this.myMap.has(chatId)
          console.log("🚀 ~ BaseBotServices ~ onRecieveMessage= ~ check:", check)
          if(this.myMap.has(chatId)){
           
            this.sendMessageToUser(chatId,"Transaction ID recieved")
          }else{
          this.sendMessageToUser(
            chatId,
            'Unrecognized command. Please try again.',
          );
        }
          break;
      }
    } else {
      const check = this.myMap.has(chatId)
      console.log("🚀 ~ BaseBotServices ~ onRecieveMessage= ~ check:", check)
        if(this.myMap.has(chatId)){
          this.sendMessageToUser(chatId,"Transaction ID recieved")
        }
        else
           
        this.sendMessageToUser(chatId, "You need an active subscription to access this feature. Please subscribe to continue.");
    }
  };

  async handleStart(message): Promise<void> {
    const chatId = message.chat.id;
    const telegramId = message.from.id;
    const subscription = await this.get_user_subscription(telegramId);

    if (subscription && subscription.is_active) {
      const messageToSend =
        `You are already subscribed and can use the bot.\n` +
        `Here's a full list of commands...\n\n` +
        '/apikey <api_key> <api_secret>\n' +
        `The above command can help you set up your ${process.env.exchange} API keys.\n\n` +
        '/setpair <pair>\n' +
        `The above command can help you set up your ${process.env.exchange} pair (e.g., /setpair BTCUSDT).\n\n` +
        '/setinterval <seconds>\n' +
        'The above command can help you set up your interval in seconds (e.g., /setinterval 60).\n\n' +
        '/setoffsetrange <min_range> <max_range>\n' +
        'The above command can help you set up your offset range (e.g., /setoffsetrange -0.000004 0.0000003).\n\n' +
        '/settokenrange <min_range> <max_range>\n' +
        'The above command can help you set up your token trade range (e.g., /settokenrange 1500 2000).\n\n' +
        '/startbot\n' +
        "The above command can help you start a bot after you've finished the previous commands.\n\n" +
        '/stopbot\n' +
        "The above command can help you stop a bot after you've started one.\n\n" +
        '/balances\n' +
        `The above command can help you check your ${process.env.exchange} account balance.`;
      this.sendMessageToUser(chatId, messageToSend);
    } else {
      const exchange = process.env.exchange;
      const myUUID = uuidv4();
      const paymentId = myUUID;
      //this.generateUuid(); // Assuming you have a method to generate UUID
      const paymentMessage =
        'Welcome to the VoluMint MM Bot! Please send account address using /setyouraddress command with which you will be paying subscription fees of 0.3 ETH. For example /setyouraddress <your_wallet_address>';
      this.sendMessageToUser(chatId, paymentMessage);
      this.update_subscription_status(
        null,
        telegramId,
        paymentId,
        false,
        exchange,
      ); // Use chat_id from the message and set subscription status to False
    }
  }

  async handleFromAddress(message: any): Promise<void> {
    const telegram_id = message.from.id;
    const chat_id = message.chat.id;
    const parts = message.text.split(' ');

    if (parts.length === 2) {
      try {
        const subscription = await this.subscriptionRepository.findOne({
          where: { telegram_id: telegram_id },
        });
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
        await this.bot.sendMessage(
          chat_id,
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

  async verifyTransaction(telegramId: number, tx_id: string): Promise<boolean> {
    try {
      //const url = `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${tx_id}&apikey=${ETHERSCAN_API_KEY}`;

      const response = await this.httpService.axiosRef.get(
        `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${tx_id}&apikey=${ETHERSCAN_API_KEY}`,
      );

      const transaction = response.data.result;

      let fromAddress = null;

      const dbFromAddress = await this.subscriptionRepository.findOne({
        where: { telegram_id: telegramId },
      });
     
      if (dbFromAddress.from_address) {
        fromAddress = dbFromAddress.from_address;
      }

      if (transaction) {
        const correctAddress =
          transaction.to.toLowerCase() ===
          RECEIVER_WALLET_ADDRESS.toLowerCase();
      
        const correctValue =
          parseInt(transaction.value, 16) >= this.MINIMUM_WEI;
        console.log(
          '🚀 ~ BaseBotServices ~ verifyTransaction ~ correctValue:',
          correctValue,
        );
        const correctFromAddress =
          transaction.from === fromAddress.toLowerCase();
        console.log(
          '🚀 ~ BaseBotServices ~ verifyTransaction ~ transaction.from:',
          transaction.from,
        );
        console.log(
          '🚀 ~ BaseBotServices ~ verifyTransaction ~ correctFromAddress:',
          correctFromAddress,
        );
        return correctAddress && correctValue && correctFromAddress;
      }
    } catch (error) {
      console.error(`Request to Etherscan failed: ${error}`);
    }
    return false;
  }
  async update_payments_by_tx_id(
    telegramId: number,
    txId: string,
    fromAddress: string,
  ): Promise<boolean> {
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
  async confirm_payment(chat_id, txID, telegram_id) {
    console.log(
      '🚀 ~ BaseBotServices ~ confirm_payment ~ Transaction_id:',
      txID,
    );

    if (!txID) {
      await this.bot.sendMessage(
        chat_id,
        'You did not provide a transaction ID. Please send the transaction ID after /confirm_payment command.',
      );
      return;
    }

    let fromAddress: string;
    try {
      const value = await this.subscriptionRepository.findOne({
        where: { telegram_id: telegram_id },
      });

      fromAddress = value.from_address;
      console.log(
        '🚀 ~ BaseBotServices ~ confirm_payment ~ fromAddress:',
        fromAddress,
      );
    } catch (error) {
      this.logger.error(`Database error: ${error}`);
      return;
    }

    const alreadyUsed = await this.checkTxIdInPayments(txID, chat_id);
    if (alreadyUsed) {
      await this.bot.sendMessage(chat_id, 'This Tx_hash is already used.');
      return;
    } else {
      const verified = await this.verifyTransaction(telegram_id, txID);

      if (verified) {
        await this.update_payments_by_tx_id(telegram_id, txID, fromAddress);
        const subscriptionUpdated = await this.updateSubscription(
          telegram_id,
          true,
        );
        if (subscriptionUpdated) {
          const messageToSend =
            'Your subscription is now active. You may initialise your service with /apikey command. For example: /apikey <api_key> <api_secret> <api_phrase>\n\n' +
            "Here's a full list of commands you can run:\n\n" +
            `Here's a full list of commands...\n\n` +
            '/apikey <api_key> <api_secret> <api_passphrase>\n' +
            `The above command can help you set up your ${process.env.exchange} API keys.\n\n` +
            '/setpair <pair>\n' +
            `The above command can help you set up your ${process.env.exchange} pair (e.g., /setpair BTCUSDT).\n\n` +
            '/setinterval <seconds>\n' +
            'The above command can help you set up your interval in seconds (e.g., /setinterval 60).\n\n' +
            '/setoffsetrange <min_range> <max_range>\n' +
            'The above command can help you set up your offset range (e.g., /setoffsetrange -0.000004 0.0000003).\n\n' +
            '/settokenrange <min_range> <max_range>\n' +
            'The above command can help you set up your token trade range (e.g., /settokenrange 1500 2000).\n\n' +
            '/startbot\n' +
            "The above command can help you start a bot after you've finished the previous commands.\n\n" +
            '/stopbot\n' +
            "The above command can help you stop a bot after you've started one.\n\n" +
            '/balances\n' +
            `The above command can help you check your ${process.env.exchange} account balance.`;
          await this.bot.sendMessage(chat_id, messageToSend);
          this.logger.log(
            'Verified transaction hash and updated subscription status.',
          );
        }
      } else {
        this.updateSubscription(telegram_id, false);
        await this.bot.sendMessage(
          chat_id,
          'Transaction hash validation failed. Please share valid tx_hash. from_address not matched!',
        );
      }
    }
  }

  async handleApiKey(message: any): Promise<void> {
    const chatId = message.chat.id;
    const parts = message.text.split(' ');
    const telegramId = message.from.id;


    if (parts.length === 4) {
      try {
        const apiKey = this.cryptoService.encrypt(parts[1]); 
        console.log('🚀 ~ BaseBotServices ~ handleApiKey ~ apiKey:', apiKey);

        const apiSecret = this.cryptoService.encrypt(parts[2]); 
        console.log(
          '🚀 ~ BaseBotServices ~ handleApiKey ~ apiSecret:',
          apiSecret,
        );
        const apiPassphrase = this.cryptoService.encrypt(parts[3]);
        try {
          const activeSubscription = await this.subscriptionRepository.findOne({
            where: { telegram_id: telegramId },
          });
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
            activeSubscription.api_passphrase = (await apiPassphrase).result;
            await this.subscriptionRepository.save(activeSubscription);
          }
          this.logger.debug('API key, secret and passphrase set successfully.');
          await this.bot.sendMessage(
            chatId,
            'API key secret and passphrase set successfully. Please set the trading pair using /setpair <pair> (e.g., /setpair BTCUSDT)',
          );
        } catch (error) {
          this.logger.error(`Database error: ${error.message}`, 'error');
        }
      } catch (error) {
        await this.bot.sendMessage(
          chatId,
          'Invalid format. Please set your API key ,secret and passphrase in the following format:\n/apikey <your_api_key> <your_api_secret> <your_api_passphrase>',
        );
      }
    } else {
      await this.bot.sendMessage(
        chatId,
        'Invalid format. Please set your API key, secret and passphrase in the following format:\n/apikey <your_api_key> <your_api_secret> <your_api_passphrase',

      );
    }
  }
  async handleSetPair(message: any): Promise<void> {
    const chatId = message.chat.id;
    const command = message.text.split(' ');
    console.log(
      '🚀 ~ BaseBotServices ~ handleSetPair ~  command:',
      command,
      command.length,
    );
    const telegramId = message.from.id;

    if (command.length === 2) {
      const pair = command[1].toUpperCase();
      try {
        const activeSubscription = await this.subscriptionRepository.findOne({
          where: { telegram_id: telegramId },
        });
        if (!activeSubscription) {
          await this.subscriptionRepository.save({
            telegram_id: telegramId,
            pair,
          });
        } else {
          activeSubscription.pair = pair;
          await this.subscriptionRepository.save(activeSubscription);
        }
        this.logger.debug(`Trading pair set to: ${pair}`);
        await this.bot.sendMessage(chatId, `Trading pair set to: ${pair}`);
        await this.bot.sendMessage(
          chatId,
          'Please set the interval in seconds using /setinterval <seconds> (e.g., /setinterval 60)',
        );
      } catch (error) {
        this.logger.error(`Database error: ${error.message}`, 'error');
      }
    } else {
      await this.bot.sendMessage(
        chatId,
        "Please use setpair command with format Example : '/setpair DGHUSDT'",
      );
    }
  }
  async handleSetInterval(message: any): Promise<void> {
    const chatId = message.chat.id;
    const command = message.text.split(' ');
    const telegramId = message.from.id;

    if (command.length === 2) {
      try {
        const interval = parseInt(command[1], 10);
        // Check if the interval is at least 35
        if (interval < 35) {
          await this.bot.sendMessage(
            chatId,
            'The interval must be at least 35 seconds (e.g., /setinterval 60)',
          );
          return; // Exit the function to prevent further execution
        }
        try {
          const activeSubscription = await this.subscriptionRepository.findOne({
            where: { telegram_id: telegramId },
          });
          if (!activeSubscription) {
            await this.subscriptionRepository.save({
              telegram_id: telegramId,
              interval,
            });
          } else {
            activeSubscription.interval = interval;
            await this.subscriptionRepository.save(activeSubscription);
          }
          this.logger.debug(`Interval set to: ${interval} seconds`);
          await this.bot.sendMessage(
            chatId,
            `Interval set to: ${interval} seconds`,
          );
          await this.bot.sendMessage(
            chatId,
            'Please set the offset range using /setoffsetrange <min_range> <max_range> (e.g., /setoffsetrange -0.000004 0.0000003)',
          );
        } catch (error) {
          this.logger.error(`Database error: ${error.message}`, 'error');
        }
      } catch (error) {
        await this.bot.sendMessage(
          chatId,
          'Invalid format. Please enter an integer value for the interval.',
        );
      }
    } else {
      await this.bot.sendMessage(
        chatId,
        "Please use setinterval command with format Example : '/setinterval 60'",
      );
    }
  }

  async handleSetOffset(message: any): Promise<void> {
    const chatId = message.chat.id;
    const parts = message.text.split(' ');
    const telegramId = message.from.id;

    if (parts.length === 3) {
      try {
        const minOffsetRange = parseFloat(parts[1]);
        const maxOffsetRange = parseFloat(parts[2]);
        if (minOffsetRange >= maxOffsetRange) {
          await this.bot.sendMessage(
            chatId,
            'Invalid offset range. Ensure the minimum volume is less than the maximum volume.',
          );
          return;
        }
        try {
          const activeSubscription = await this.subscriptionRepository.findOne({
            where: { telegram_id: telegramId },
          });
          if (!activeSubscription) {
            await this.subscriptionRepository.save({
              telegram_id: telegramId,
              offset_range: [minOffsetRange, maxOffsetRange],
            });
          } else {
            activeSubscription.offset_range = [minOffsetRange, maxOffsetRange];
            await this.subscriptionRepository.save(activeSubscription);
          }
          this.logger.debug(
            `Offset range set to: ${minOffsetRange}-${maxOffsetRange}`,
          );
          await this.bot.sendMessage(
            chatId,
            `Offset range set to: ${minOffsetRange}-${maxOffsetRange}`,
          );
          await this.bot.sendMessage(
            chatId,
            'Please set the token range using /settokenrange <min_range> <max_range> (e.g., /settokenrange 1500 2000)',
          );
        } catch (error) {
          this.logger.error(`Database error: ${error.message}`, 'error');
        }
      } catch (error) {
        await this.bot.sendMessage(
          chatId,
          'Invalid format. Please enter numeric values for offset range.',
        );
      }
    } else {
      await this.bot.sendMessage(
        chatId,
        'Invalid command format. Use: /setoffsetrange <min_offset_range> <max_offset_range>',
      );
    }
  }

  async handleSetTokenRange(message: any): Promise<void> {
    const chatId = message.chat.id;
    const parts = message.text.split(' ');
    const telegramId = message.from.id;

    if (parts.length === 3) {
      try {
        const minTokenRange = parseFloat(parts[1]);
        const maxTokenRange = parseFloat(parts[2]);
        const arrayValues = [minTokenRange, maxTokenRange];
        if (minTokenRange < 1500) {
          await this.bot.sendMessage(
            chatId,
            'Invalid token range, minTokenRange should be greater that 1500',
          );
          return;
        }
        if (minTokenRange >= maxTokenRange) {
          await this.bot.sendMessage(
            chatId,
            'Invalid token range. Ensure the minimum volume is less than the maximum volume.',
          );
          return;
        }
        try {
          const activeSubscription = await this.subscriptionRepository.findOne({
            where: { telegram_id: telegramId },
          });
          if (!activeSubscription) {
            await this.subscriptionRepository.save({
              telegram_id: telegramId,
              token_range: arrayValues,
            });
          } else {
            activeSubscription.token_range = arrayValues;
            await this.subscriptionRepository.save(activeSubscription);
          }
          this.logger.debug(
            `Token range set to: ${minTokenRange}-${maxTokenRange}`,
          );
          await this.bot.sendMessage(
            chatId,
            `Token range set to: ${minTokenRange}-${maxTokenRange}`,
          );
          await this.bot.sendMessage(
            chatId,
            'You may now start your bot with /startbot.',
          );
        } catch (error) {
          this.logger.error(`Database error: ${error.message}`, 'error');
        }
      } catch (error) {
        await this.bot.sendMessage(
          chatId,
          'Invalid format. Please enter numeric values for token range.',
        );
      }
    } else {
      await this.bot.sendMessage(
        chatId,
        'Invalid command format. Use: /settokenrange <min_token_range> <max_token_range>',
      );
    }
  }

 StartBot = (msg: any) => {
    // Handle the /startbot command...
    const chatId = msg.chat.id;
    this.sendMessageToUser(chatId, 'Processing /startbot command...');
  };

  async startBot(message: any): Promise<void> {
    const chatId = message.chat.id;
    const telegramId = message.from.id;
    const botId = telegramId;
    const uniqueId = telegramId;
    console.log("🚀 ~ BaseBotServices ~ startBot ~ uniqueId:", uniqueId)
    
    try {
      const activeSubscription = await this.subscriptionRepository.findOne({where:{ telegram_id: telegramId }});

      if (!activeSubscription) {
        this.logger.error(`No active subscription found for telegram_id: ${telegramId}`);
        return;
      }

      const { api_key, api_secret,api_passphrase, pair, interval, offset_range, token_range } = activeSubscription;

      // Encrypting api_key and api_secret for the external service
      const encryptedApiKey = this.cryptoService.encrypt(api_key);
      const encryptedApiSecret = this.cryptoService.encrypt(api_secret);
      const encryptedApiPassphrase = this.cryptoService.encrypt(api_passphrase);
      console.log("🚀 ~ BaseBotServices ~ startBot ~ encryptedApiPassphrase :", encryptedApiPassphrase )

      const exchangeUrl = URL_STARTBOT
      console.log("🚀 ~ BaseBotServices ~ startBot ~ exchangeUrl:", exchangeUrl)
      // const bubbleUrl = this.config.get('BUBBLE_URL_STARTBOT');

      const headers = {
        'Authorization': 'asjdhajsdh29139uasdh1239',
        'Content-Type': 'application/json',
      };

      const data = {
        api_key: (await encryptedApiKey).result,
        api_secret: (await encryptedApiSecret).result,
       // api_passphrase:encryptedApiPassphrase,
        pair,
        interval,
        offset_range,
        token_range,
        bot_id: botId,
        unique_id: uniqueId,
        chat_id: chatId,
      };

      const mexcResponse = await this.httpService.axiosRef.post(exchangeUrl, data, { headers });
      if (mexcResponse.status === 200) {
        this.logger.debug(`Bot started with bot id: ${botId} and unique id: ${uniqueId}. Generating volume...`);
        // Send messages to the user
        // Implement the logic to send messages to the user
        this.sendMessageToUser(chatId,"Bot Started!! Generating volume..")
        this.sendMessageToUser(chatId,"You can stop your bot with /stopbot command.")
        this.sendMessageToUser(chatId,"For detailed trade information, please check your KUCOIN wallet's trading logs and history.")
      } else {
        this.logger.error(`Error in starting bot: ${mexcResponse.statusText}`);
      }

      // Share bot info with Bubble
   //   const bubbleResponse = await this.httpService.axiosRef.post(bubbleUrl, data, { headers });
   //   if (bubbleResponse.status === 200) {
   //     this.logger.debug("Bot info is shared to bubble.");
   //   } else {
   //     this.logger.error(`Unable to share data to bubble: ${bubbleResponse.statusText}`);
    //  }
   } catch (error) {
     this.logger.error(`Error in handleStartBot: ${error.message}`);
   }
  }
  stopBot = (msg: any) => {
    const chatId = msg.chat.id;
    this.sendMessageToUser(chatId, 'Processing /stopbot command...');
  };
  async handleStopBot(message: any): Promise<void> {
    const chatId = message.chat.id;
    const telegramId = message.from_user.id;
    const botId = telegramId;
    const uniqueId = telegramId;

    const mexcUrlStopBot = this.config.get('MEXC_URL_STOPBOT');
    const bubbleUrlStopBot = this.config.get('BUBBLE_URL_STOPBOT');

    const headers = {
      'Authorization': 'asjdhajsdh29139uasdh1239',
      'Content-Type': 'application/json',
    };

    const data = {
      bot_id: botId.toString(),
      unique_id: uniqueId.toString(),
    };

    try {
      const response = await this.httpService.axiosRef.post(mexcUrlStopBot, data, { headers });
      if (response.status === 200) {
        this.logger.debug(`Bot stopped for bot id: ${botId} and unique id: ${uniqueId}.`);
        // Send messages to the user
        // Implement the logic to send messages to the user
      } else {
        this.logger.error(`Error in stopping bot: ${response.statusText}`);
      }

      const responseBubble = await this.httpService.axiosRef.post(bubbleUrlStopBot, data, { headers });
      if (responseBubble.status === 200) {
        this.logger.debug(`Data shared to bubble after stopping bot for bot_id: ${botId}`);
      } else {
        this.logger.error(`Unable to share data to bubble.`);
      }
    } catch (error) {
      this.logger.error(`Error in handleStopBot: ${error.message}`);
    }
  }

  checkBalance = (msg: any) => {
    // Handle the /balances command...
    const chatId = msg.chat.id;
    this.sendMessageToUser(chatId, 'Processing /balances command...');
  };

  sendMessageToUser = (chatId: string, message: string) => {
    this.bot.sendMessage(chatId, message);
  };
}
