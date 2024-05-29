import * as dotenv from 'dotenv'
dotenv.config();
const exchange = process.env.exchange;


export const RECEIVER_WALLET_ADDRESS = process.env.RECEIVER_WALLET_ADDRESS
export const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN
export const SUBSCRIPTION_DURATION = process.env.SUBSCRIPTION_DURATION
export const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
export const CRYPTO_KEY = process.env.CRYPTO_KEY
export const accessToken = process.env.BOT_ACCESS_TOKEN
export const refreshToken = process.env.BOT_REFRESH_TOKEN
export const AUTH_KEY = process.env.telegramAuthkey
export const bubbleAccessKey = process.env.bubbleAccessKey




//URLs------

export const URL_STARTBOT = (exchange === "KUCOIN" ? process.env.KUCOIN_URL_STARTBOT : exchange === "OKX" ? process.env.OKX_URL_STARTBOT : exchange === "BYBIT" ? process.env.BYBIT_URL_STARTBOT :'') || '';
export const URL_STOPBOT = (exchange === "KUCOIN" ? process.env.KUCOIN_URL_STOPBOT : exchange === "OKX" ? process.env.OKX_URL_STOPBOT: exchange === "BYBIT" ? process.env.BYBIT_URL_STOPBOT : '') || '';
export const URL_WALLET_INFO = (exchange === "KUCOIN" ? process.env.KUCOIN_URL_WALLET_INFO : exchange === "OKX" ? process.env.OKX_URL_WALLET_INFO: exchange === "BYBIT" ? process.env.BYBIT_URL_WALLET_INFO : '') || ''; 

//BUBBLE URLs----------

export const BUBBLE_URL_STARTBOT = process.env.BUBBLE_URL_STARTBOT
export const BUBBLE_URL_STOPBOT = process.env.BUBBLE_URL_STOPBOT
export const BUBBLE_URL_STOPBOT_TEST = process.env.BUBBLE_URL_STOPBOT_TEST

export const URL_PREFIX = (exchange === "KUCOIN"? 'volumebot-telegram-kucoin': exchange === "OKX" ? 'volumebot-telegram-okx' : exchange === "BYBIT" ? 'volumebot-telegram-bybit' :'') || '';