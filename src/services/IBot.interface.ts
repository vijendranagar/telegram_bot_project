export interface IbotService {
    get_user_subscription(telegram_id)

    update_subscription_status(user_id,telegram_id, payment_id, is_active, exchange)
      
    verify_transaction(tx_id,telegram_id)
    
    get_from_address_by_tx_id(tx_id)

    update_payments_by_tx_id(tx_id,telegram_id,from_address)

    update_subscription(telegram_id,is_active)
    
    get_tx_id_in_payments(tx_id, chat_id)
}