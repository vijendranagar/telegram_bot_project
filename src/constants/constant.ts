import * as dotenv from 'dotenv'
dotenv.config();
const exchange = process.env.exchange;
import { ETHERSCAN_API_KEY } from 'config/constants';


//export const ETHERSCAN_API = `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${tx_id}&apikey=${ETHERSCAN_API_KEY}`

export const starMessageTosend = ((exchange === "KUCOIN" || exchange === "OKX")?
`Here's a full list of commands...\n\n` +
'/apikey <api_key> <api_secret> <api_passphrase>\n' +
`The above command can help you set up your ${exchange} API keys.\n\n` +
'/setpair <pair>\n' +
`The above command can help you set up your ${exchange} pair (e.g., /setpair BTC-USDT).\n\n` +
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
`The above command can help you check your ${exchange} account balance.` : 
exchange=== "BYBIT"? 
`Here's a full list of commands...\n\n` +
'/apikey <api_key> <api_secret> \n' +
`The above command can help you set up your ${exchange} API keys.\n\n` +
'/setpair <pair>\n' +
`The above command can help you set up your ${exchange} pair (e.g., /setpair BTC-USDT).\n\n` +
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
`The above command can help you check your ${exchange} account balance.` :'')||'';






