require("dotenv").config();
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
    1: 2.5,
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
            ((tick.close - lastTick.close) / lastTick.close) * 100;
          if (Math.abs(changePercent) >= listNoti[typeMin]) {
            console.log(
              `Bien dong bat thuong ${new Date().toLocaleString(
                "en-US"
              )} ${symbol} khung ${typeMin}m: ${changePercent.toFixed(2)}%`
            );
          }
        }
      },
      amountTick
    );
  });
})();
