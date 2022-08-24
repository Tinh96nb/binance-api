require("dotenv").config();
const Binance = require("node-binance-api");
const binance = new Binance().options({
  APIKEY: process.env.KEY,
  APISECRET: process.env.SECRET,
  useServerTime: true,
  recvWindow: 60000,
});

const initBalance = 1000;

(async function main() {
  const sumBalance = {};
  const month = "08";
  for (let date = 23; date < 24; date++) {
    const from = new Date(`2022-${month}-${date} 00:00:00`).getTime();
    const to = new Date(`2022-${month}-${date + 1} 00:00:00`).getTime();
    binance.candlesticks(
      "BTCUSDT",
      "15m",
      (error, ticks) => {
        for (let i = 0.01; i < 0.011; i = i + 0.001) {
          for (let j = 0.001; j < 0.002; j = j + 0.001) {
            const percentTp = +parseFloat(i).toFixed(3);
            const percentSl = +parseFloat(j).toFixed(3);
            const balance = calculateBalance(percentTp, percentSl, ticks);
            const profit = balance - initBalance;
            if (!sumBalance[`${percentTp}${percentSl}`])
              sumBalance[`${percentTp}${percentSl}`] = +profit;
            sumBalance[`${percentTp}${percentSl}`] += +profit;
          }
        }
        const keysSorted = Object.keys(sumBalance).sort(function (a, b) {
          return sumBalance[b] - sumBalance[a];
        });
        console.log(keysSorted[0], sumBalance[keysSorted[0]]);
      },
      { limit: 500, startTime: from, endTime: to }
    );
  }
})();

function calculateBalance(percentTp, percentSl, ticks) {
  const volOrder = 1000;

  let flagBuyCount = 0;
  let balance = initBalance;
  ticks.forEach((stick) => {
    const [time, open, high, low, close, volume] = stick;
    if (close > open) {
      flagBuyCount++;
    } else {
      flagBuyCount = 0;
      return;
    }
    // set buy tai nen xanh thu 2 lien tiep
    if (flagBuyCount < 2) return;
    const tpPrice = +open * percentTp + +open;
    const slPrice = +open - +open * percentSl;

    // sl
    if (+low > slPrice) {
      balance -= volOrder * percentSl;
      return;
    }
    // tp
    if (+high > +tpPrice) {
      balance += volOrder * percentTp;
      return;
    }
    const percentClose = (+close - +open) / +open;
    balance += volOrder * percentClose;
  });
  return balance;
}
