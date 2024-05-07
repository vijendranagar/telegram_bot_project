import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';

const TelegramBot = require('node-telegram-bot-api');

//const TELEGRAM_TOKEN = "7010668825:AAHuDXsJCyq6Wn3cCWXQrsLSIW3VePveoQ0"
const TELEGRAM_TOKEN = "7154834262:AAFbOv_W6xl1niPgRfN0o6uZKgin1qcc6xk"

@Injectable()
export class AppService {
  private logger = new Logger(AppService.name)
  private readonly bot:any
  constructor(){
    this.bot = new TelegramBot(TELEGRAM_TOKEN, {polling: true});
    this.bot.on("message",this.onRecieveMessage)
    this.sendMessageToUser("1488997973",`Server started at ${new Date}`);
  }

  onRecieveMessage = (msg:any) => {
    this.logger.debug(msg)
    const chatId = msg.chat.id
    if (msg.text && msg.text.startsWith("/update")) {
      // Perform actions specific to the /update command
      this.handleUpdateCommand(chatId);
    }
    // else {
      // Process other types of messages...
     // this.sendMessageToUser("1488997973",`not able to update`);
   // }
   if (msg.text && msg.text.startsWith("/restart")) {
    // Perform actions specific to the /update command
    this.handleRestartCommand(chatId);
  }
    //this.sendMessageToUser("1488997973",`Server started at ${new Date}`);
  }

  handleUpdateCommand = (chatId: string) => {
    // Send a response to the user indicating that the message has been updated
    this.sendMessageToUser(chatId, "Message updated successfully!");
  }
  handleRestartCommand = (chatId: string) => {
    // Send a response to the user indicating that the message has been updated
    this.sendMessageToUser(chatId, "Server is already started!");
  }
  sendMessageToUser = (chatId:string,message:string) => {
    this.bot.sendMessage(chatId,message);
  }
}
