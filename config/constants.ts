import * as dotenv from 'dotenv'
dotenv.config();
const exchange = process.env.exchange;


export const RECEIVER_WALLET_ADDRESS = process.env.RECEIVER_WALLET_ADDRESS
export const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN
export const SUBSCRIPTION_DURATION = process.env.SUBSCRIPTION_DURATION
export const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
export const CRYPTO_KEY = process.env.CRYPTO_KEY
export const accessToken = process.env.KUCOIN_ACCESS_TOKEN
export const refreshToken = process.env.KUCOIN_REFRESH_TOKEN
export const TGBOT_SECRET = process.env.TGBOT_SECRET




//URLs------

export const URL_STARTBOT = (exchange === "KUCOIN" ? process.env.KUCOIN_URL_STARTBOT : exchange === "MEXC" ? process.env.MEXC_URL_STARTBOT : '') || '';
export const URL_STOPBOT = (exchange === "KUCOIN" ? process.env.KUCOIN_URL_STOPBOT : exchange === "MEXC" ? process.env.MEXC_URL_STOPBOT: '') || '';
export const URL_WALLET_INFO = (exchange === "KUCOIN" ? process.env.KUCOIN_URL_WALLET_INFO : exchange === "MEXC" ? process.env.MEXC_URL_WALLET_INFO: '') || ''; 

//BUBBLE URLs----------

export const BUBBLE_URL_STARTBOT = process.env.BUBBLE_URL_STARTBOT
export const BUBBLE_URL_STOPBOT = process.env.BUBBLE_URL_STOPBOT