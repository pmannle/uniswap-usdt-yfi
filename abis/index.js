
const ERC20ABI = require('./ERC20.json');
// Aave
const LendingPoolAddressProviderABI = require('./AddressProvider.json');
const LendingPoolABI = require('./LendingPool.json');
const IPriceOracleABI = require('./PriceOracle.json');
// Uniswap
const IUniswapV2Router02 = require('./uniswapV2.json');

module.exports = {
  LendingPoolAddressProviderABI,
  LendingPoolABI,
  IPriceOracleABI,
  ERC20ABI,
  IUniswapV2Router02
};
