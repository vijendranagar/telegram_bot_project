export interface IbotService {

    handleApiKey(message)
    startBot(message)
    stopBot(message)
    checkBalance(message)
    sendMessageToUser (chatId, message) 
}