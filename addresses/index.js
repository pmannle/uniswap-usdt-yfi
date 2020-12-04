const uniswapMainnet = require('./uniswap-mainnet.json');
const tokensMainnet = require('./tokens-mainnet.json');
const aaveMainnet = require('./aave-mainnet.json');

module.exports = {
  mainnet: {
    uniswap: uniswapMainnet,
    tokens: tokensMainnet,
    aave: aaveMainnet
  }
};
