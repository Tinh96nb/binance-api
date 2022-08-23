require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const token = process.env.BOT_KEY;
const bot = new TelegramBot(token, { polling: true });

const Binance = require("node-binance-api");
const binance = new Binance().options({
  APIKEY: process.env.KEY,
  APISECRET: process.env.SECRET,
  useServerTime: true,
  recvWindow: 60000,
});
const pairs = require("./pairs.json");

(async function main() {
  const miliSecondOneMin = 60000;
  const interval = "1m";
  const amountTick = 10;
  const listNoti = {
    1: 2.2,
    3: 5,
    5: 7,
  };
  console.log("Start service notification");
  pairs.forEach((pair) => {
    binance.websockets.chart(
      pair,
      interval,
      (symbol, interval, chart) => {
        const tickLength = Object.keys(chart).length;
        const lastTimeTick = Object.keys(chart)[tickLength - 1];
        const lastTick = chart[lastTimeTick];
        if (lastTick.hasOwnProperty("isFinal")) return;
        for (const typeMin in listNoti) {
          // get tick before
          const tick = chart[lastTimeTick - typeMin * miliSecondOneMin];
          if (!tick) return;
          // cal change percent
          const changePercent =
            ((lastTick.close - tick.close) / tick.close) * 100;
          if (Math.abs(changePercent) >= listNoti[typeMin]) {
            bot.sendMessage(
              process.env.GROUPID,
              `${
                changePercent > 0 ? "🟢" : "🔴"
              } *${symbol}* change *${changePercent.toFixed(
                2
              )}%* in *${typeMin}m* from ${tick.close} to ${lastTick.close}`,
              { parse_mode: "Markdown" }
            );
          }
        }
      },
      amountTick
    );
  });
})();
