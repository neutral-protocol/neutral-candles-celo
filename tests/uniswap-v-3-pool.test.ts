import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll,
} from "matchstick-as/assembly/index";
import { Address, BigInt, ByteArray } from "@graphprotocol/graph-ts";
import { handleSwap } from "../src/uniswap-v-3-pool";
import { createSwapEvent } from "./uniswap-v-3-pool-utils";

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let owner = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    );
    let amount0 = BigInt.fromByteArray(
      ByteArray.fromHexString(
        "000000000000000000000000000000000000000000000004cfe7c2504952bc01"
      )
    );
    let amount1 = BigInt.fromByteArray(
      ByteArray.fromHexString(
        "fffffffffffffffffffffffffffffffffffffffffffffff827e5d765fafdabd7"
      )
    );
    let price = BigInt.fromByteArray(
      ByteArray.fromHexString(
        "0000000000000000000000000000000000000001473f1cf1eac6039cfb1d7180"
      )
    );
    let newSwapEvent = createSwapEvent(
      owner,
      owner,
      amount0,
      amount1,
      price,
      BigInt.fromI32(0),
      0
    );
    handleSwap(newSwapEvent);
  });

  afterAll(() => {
    clearStore();
  });

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("ExampleEntity created and stored", () => {
    assert.entityCount("Candle", 5);
  });
});
