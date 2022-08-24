require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const token = process.env.BOT_TRADE;
const bot = new TelegramBot(token, { polling: true });

const Binance = require("node-binance-api");
const binance = new Binance().options({
  APIKEY: process.env.KEY,
  APISECRET: process.env.SECRET,
  useServerTime: true,
  recvWindow: 60000,
});

(async function main() {
  const tokenBuy = "USDT";
  const amountTick = 10;
  const intervalTime = 15;

  const balance = await getBalance(tokenBuy);

  const percentTp = 0.01;
  const percentSl = 0.001;
  const moneyPerOrder = 100;

  const pairs = [`BTC${tokenBuy}`];

  bot.sendMessage(
    process.env.GROUPID,
    `Start trade *${
      pairs[0]
    }* with balance *${balance} ${tokenBuy}*, volumn per order *${moneyPerOrder} ${tokenBuy}* at ${new Date().toLocaleString(
      "Vi-VN"
    )}`,
    { parse_mode: "Markdown" }
  );

  for (let index = 0; index < pairs.length; index++) {
    const pair = pairs[index];

    let boughtAmount = null;

    binance.websockets.chart(
      pair,
      `${intervalTime}m`,
      async (symbol, interval, chart) => {
        const listTickTime = Object.keys(chart);
        const lastTick = chart[listTickTime[listTickTime.length - 1]];

        const tickBefore = chart[listTickTime[listTickTime.length - 2]];

        // return neu chưa đến 1 nến mới
        if (lastTick.hasOwnProperty("isFinal")) return;
        if (boughtAmount !== null) {
          try {
            await binance.marketSell(symbol, boughtAmount);
          } catch (error) {}
          boughtAmount = null;
          const balance = await getBalance(tokenBuy);
          bot.sendMessage(
            process.env.GROUPID,
            `Sell market setup at ${new Date().toLocaleString(
              "Vi-VN"
            )}, balance *${balance} ${tokenBuy}*`,
            { parse_mode: "Markdown" }
          );
        }
        const lastClose = +lastTick.close;
        const lastOpen = +lastTick.open;
        if (lastClose > lastOpen && +tickBefore.close > +tickBefore.open) {
          boughtAmount = +(moneyPerOrder / lastClose).toFixed(5);

          await binance.marketBuy(symbol, boughtAmount);

          const tpPrice = +(lastClose * percentTp + lastClose).toFixed(2);
          const slPrice = +(lastClose - lastClose * percentSl).toFixed(2);

          await orderSell(symbol, boughtAmount, tpPrice, slPrice);
          bot.sendMessage(
            process.env.GROUPID,
            `Buy setup ${symbol}, amount: *${boughtAmount}*, price: *${lastTick.close} tp: *${tpPrice}* sl: *${slPrice}*`,
            { parse_mode: "Markdown" }
          );
        }
      },
      amountTick
    );
  }
})();

function getBalance(token) {
  return new Promise((resolve, reject) => {
    binance.balance((error, balances) => {
      if (error) reject(error);
      resolve(balances[token].available);
    });
  });
}

function orderSell(symbol, quantity, tp, sl) {
  return binance.order(
    "SELL",
    symbol,
    quantity,
    tp,
    (flags = {
      type: "OCO",
      stopPrice: sl,
      stopLimitPrice: sl,
    })
  );
}
