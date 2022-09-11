require("dotenv").config();
const Binance = require("node-binance-api");
const binance = new Binance().options({
  APIKEY: process.env.KEY,
  APISECRET: process.env.SECRET,
  useServerTime: true,
  recvWindow: 60000,
});

const initBalance = 1000;

(async function () {
  const monthFrom = 2;
  const monthTo = 2;

  const dayFrom = 1;
  const dayTo = 30;

  const interval = 15;

  const groupByPecent = {};
  for (let month = monthFrom; month <= monthTo; month++) {
    for (let day = dayFrom; day <= dayTo; day++) {
      const from = new Date(`2022-${month}-${day} 00:00:00`).getTime();
      const to = new Date(`2022-${month}-${day + 1} 00:00:00`).getTime();
      const res = await main(interval, from, to);
      console.log(day, month, res);
      if (!groupByPecent[res.percent]) groupByPecent[res.percent] = +res.tp;
      else groupByPecent[res.percent] += +res.tp;
    }
  }
  console.log(groupByPecent);
})();

function main(interval, from, to) {
  return new Promise((resolve, reject) => {
    const sumBalance = {};
    binance.candlesticks(
      "BTCUSDT",
      `${interval}m`,
      (error, ticks) => {
        for (let i = 0.006; i < 0.02; i = i + 0.001) {
          for (let j = 0.001; j < 0.005; j = j + 0.001) {
            const percentTp = +parseFloat(i).toFixed(3);
            const percentSl = +parseFloat(j).toFixed(3);
            const balance = calculateBalance(percentTp, percentSl, ticks);
            const profit = balance - initBalance;
            if (!sumBalance[`${percentTp}${percentSl}`])
              sumBalance[`${percentTp}${percentSl}`] = +profit;
            else sumBalance[`${percentTp}${percentSl}`] += +profit;
          }
        }
        const keysSorted = Object.keys(sumBalance).sort(function (a, b) {
          return sumBalance[b] - sumBalance[a];
        });
        resolve({
          percent: keysSorted[0],
          tp: sumBalance[keysSorted[0]].toFixed(2),
        });
      },
      { limit: (24 * 60) / interval, startTime: from, endTime: to }
    );
  });
}

function calculateBalance(percentTp, percentSl, ticks) {
  const volOrder = 1000;

  let flagBuyCount = 0;
  let balance = initBalance;
  ticks.forEach((stick) => {
    const [time, open, high, low, close, volume] = stick;
    if (flagBuyCount >= 3) {
      const tpPrice = +open * percentTp + +open;
      const slPrice = +open - +open * percentSl;

      if (+low <= slPrice) {
        balance -= volOrder * percentSl;
      } else if (+high > +tpPrice) {
        balance += volOrder * percentTp;
      } else {
        const percentClose = (+close - +open) / +open;
        balance += volOrder * percentClose;
      }
    }
    if (close > open) {
      flagBuyCount++;
    } else {
      flagBuyCount = 0;
    }
  });
  return balance;
}
