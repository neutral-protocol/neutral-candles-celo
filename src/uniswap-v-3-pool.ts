import { BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts";
import { concat } from "@graphprotocol/graph-ts/helper-functions";
import { Swap } from "../generated/UniswapV3Pool/UniswapV3Pool";
import { Candle } from "../generated/schema";

const ZERO_BI = BigInt.fromI32(0);
const ZERO_BD = BigDecimal.fromString("0");
const Q192 = BigInt.fromI32(2).pow(192);

function safeDiv(amount0: BigDecimal, amount1: BigDecimal): BigDecimal {
  if (amount1.equals(ZERO_BD)) {
    return ZERO_BD;
  } else {
    return amount0.div(amount1);
  }
}

function exponentToBigDecimal(decimals: number): BigDecimal {
  return BigInt.fromI32(10)
    .pow(decimals as u8)
    .toBigDecimal();
}

function convertTokenToDecimal(
  tokenAmount: BigInt,
  exchangeDecimals: number
): BigDecimal {
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals));
}

function sqrtPriceX96ToTokenPrices(
  sqrtPriceX96: BigInt,
  token0Decimals: number,
  token1Decimals: number
): BigDecimal[] {
  let num = sqrtPriceX96.times(sqrtPriceX96).toBigDecimal();
  let denom = BigDecimal.fromString(Q192.toString());
  let price1 = num
    .div(denom)
    .times(exponentToBigDecimal(token0Decimals))
    .div(exponentToBigDecimal(token1Decimals));

  let price0 = safeDiv(BigDecimal.fromString("1"), price1);
  return [price0, price1];
}

export function handleSwap(event: Swap): void {
  const decimals = 18;

  let amount0 = convertTokenToDecimal(event.params.amount0, decimals);
  let amount1 = convertTokenToDecimal(event.params.amount1, decimals);

  // need absolute amounts for volume
  let token0Amount = amount0;
  if (amount0.lt(ZERO_BD)) {
    token0Amount = amount0.times(BigDecimal.fromString("-1"));
  }
  let token1Amount = amount1;
  if (amount1.lt(ZERO_BD)) {
    token1Amount = amount1.times(BigDecimal.fromString("-1"));
  }

  let prices = sqrtPriceX96ToTokenPrices(
    event.params.sqrtPriceX96,
    decimals,
    decimals
  );
  let price = prices[1];

  let timestamp = event.block.timestamp.toI32();

  let periods: i32[] = [5 * 60, 15 * 60, 60 * 60, 4 * 60 * 60, 24 * 60 * 60];
  for (let i = 0; i < periods.length; i++) {
    let time_id = timestamp / periods[i];
    let candle_id = concat(
      concat(Bytes.fromI32(time_id), Bytes.fromI32(periods[i])),
      event.address
    ).toHex();
    let candle = Candle.load(candle_id);
    if (candle === null) {
      candle = new Candle(candle_id);
      candle.t = timestamp;
      candle.period = periods[i];
      candle.pair = event.address;
      candle.o = price;
      candle.l = price;
      candle.h = price;
      candle.v0 = BigDecimal.fromString("0");
      candle.v1 = BigDecimal.fromString("0");
    } else {
      if (price < candle.l) {
        candle.l = price;
      }
      if (price > candle.h) {
        candle.h = price;
      }
    }

    candle.c = price;
    candle.v0 = candle.v0.plus(token0Amount);
    candle.v1 = candle.v1.plus(token1Amount);
    candle.save();
  }
}
