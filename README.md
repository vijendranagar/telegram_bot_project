# Telegram Bot Project with NestJS

This project is a Telegram bot built using NestJS, designed to interact with users through various commands. 

## Table of Contents

- [Getting Started](#getting-started)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)


## Getting Started

To get a local copy up and running, follow these steps.

### Prerequisites

- Node.js (>=14.0.0)
- npm (>=6.0.0)
- NestJS CLI (>=8.0.0)
- A Telegram bot token from BotFather

### Installation

1. Clone the repository: 


2. Navigate to the project directory:


3. Install the dependencies: 'using npm i command'


4. Set up environment variables (e.g., `TELEGRAM_BOT_TOKEN`, `DB_CONNECTION_STRING`):


Edit `.env` to include your actual values.

5. Run the application: using nest start command


## Usage

- Start the bot by sending `/start` to your bot on Telegram.
- Set your wallet address using `/setyouraddress <your_address>` command.
- Confirm payment using `/confirm_payment` command and enter your transacrion Id so that we can verify it. 
- Use `/setapikey <your_api_key> <your_api_secret> <your_api_passphrase>` to set your API key and secret.
- Use `/settokenrange <min_range> <max_range>` to set the token range.
- Use `/setpair <pair>` to set the trading pair.
- and so on....

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request




