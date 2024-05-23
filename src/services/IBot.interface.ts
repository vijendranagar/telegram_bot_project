export interface IbotService {

    handleApiKey(chat_id,telegramId,parts)
    startBot(chatId,telegram_id)
    stopBot(chat_id,telegramId)
    checkBalance(chat_id,telegramId)
    sendMessageToUser (chatId, message) 
    getBal(chatId,response)
}