import * as dotenv from 'dotenv'
dotenv.config();
const exchange = process.env.exchange;


export const RECEIVER_WALLET_ADDRESS = process.env.RECEIVER_WALLET_ADDRESS
export const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN
export const SUBSCRIPTION_DURATION = process.env.SUBSCRIPTION_DURATION
export const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
export const CRYPTO_KEY = process.env.CRYPTO_KEY


//URLs------

export const URL_STARTBOT = (exchange === "KUCOIN" ? process.env.MEXC_URL_STARTBOT : exchange === "MEXC" ? process.env.MEXC_URL_STARTBOT : '') || ''; 
