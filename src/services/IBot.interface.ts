export interface IbotService {

    handleApiKey(chat_id,telegramId,parts)
    startBot(chatId,telegram_id,command)
    stopBot(chat_id,telegramId,command)
    checkBalance(chat_id,telegramId)
    sendMessageToUser (chatId, message) 
    //getBal(chatId,response)
}