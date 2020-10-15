require("dotenv").config()
const JSBI = require('jsbi');
const Web3 = require('web3');
const Tx = require('ethereumjs-tx')
const abis = require('./abis');
const { mainnet: addresses } = require('./addresses');
const ethers = require('ethers');
const { ChainId, Fetcher, WETH, Route, Trade, TokenAmount, TradeType, Percent } = require('@uniswap/sdk');

const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.INFURA_URL)
);
const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);
const myAddress = process.env.WALLET_ADDRESS;

const chainId = ChainId.MAINNET;
const USDTAddress = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const YFIAddress = '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e';

function toHex(currencyAmount) {
    return `0x${currencyAmount.raw.toString(16)}`
}

const swapUSDTtoYFI = async (amount) => {

    const usdt = await Fetcher.fetchTokenData(chainId, USDTAddress, undefined, "USDT", "USDT Token");
    const yfi = await Fetcher.fetchTokenData(chainId, YFIAddress, undefined, "YFI", "YFI Token");

    const pair = await Fetcher.fetchPairData(usdt, yfi);
    const route = new Route([pair], usdt);

    const trade = new Trade(route, new TokenAmount(usdt, JSBI.BigInt(10000)), TradeType.EXACT_INPUT);
    console.log(pair.token0.symbol, "=>", pair.token1.symbol, route.midPrice.toSignificant(6));
    console.log(pair.token1.symbol, "=>", pair.token0.symbol, route.midPrice.invert().toSignificant(6));
    console.log(trade.executionPrice.toSignificant(6));
    console.log(trade.nextMidPrice.toSignificant(6));

    const slippageTolerance = new Percent('50', '10000'); // (0.05%) bips, 1 bip = 0.001

    const amountOutMin = toHex(trade.minimumAmountOut(slippageTolerance));
    const value = toHex(trade.inputAmount);
    const amountIn = trade.inputAmount.raw;
    const path = [usdt.address, yfi.address];
    const to = myAddress;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const provider = ethers.getDefaultProvider('mainnet', {
        infura: process.env.INFURA_URL
    });

    const signer = new ethers.Wallet(process.env.PRIVATE_KEY);
    const account = signer.connect(provider);

    const uniswap = new ethers.Contract(
        '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        ['function swapExactTokensForTokens(uint amountIn,uint amountOutMin,address[] calldata path,address to,uint deadline) external returns (uint[] memory amounts)'],
        account);

    console.log('Sending transaction...')

    const tx = await uniswap.swapExactTokensForTokens(

        amountIn,
        amountOutMin,
        path,
        to,
        deadline,
        { gasPrice: 60e9 }

    );
    console.log(`Transaction hash: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`Transaction was mined in block ${receipt.blockNumber}`);

}

const swapYFItoUSDT = async (amount) => {

    const usdt = await Fetcher.fetchTokenData(chainId, USDTAddress, undefined, "USDT", "USDT Token");
    const yfi = await Fetcher.fetchTokenData(chainId, YFIAddress, undefined, "YFI", "YFI Token");

    const pair = await Fetcher.fetchPairData(yfi, usdt);
    const route = new Route([pair], yfi);
    const trade = new Trade(route, new TokenAmount(yfi, web3.utils.toWei("0.0001", "ether")), TradeType.EXACT_INPUT);
    console.log(pair.token0.symbol, "=>", pair.token1.symbol, route.midPrice.toSignificant(6));
    console.log(pair.token1.symbol, "=>", pair.token0.symbol, route.midPrice.invert().toSignificant(6));
    console.log(trade.executionPrice.toSignificant(6));
    console.log(trade.nextMidPrice.toSignificant(6));

    function toHex(currencyAmount) {
        return `0x${currencyAmount.raw.toString(16)}`
    }

    const slippageTolerance = new Percent('50', '10000'); // (0.05%) bips, 1 bip = 0.001

    const amountOutMin = toHex(trade.minimumAmountOut(slippageTolerance));
    const value = toHex(trade.inputAmount);
    const amountIn = trade.inputAmount.raw;
    const path = [yfi.address, usdt.address];
    const to = myAddress;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const provider = ethers.getDefaultProvider('mainnet', {
        infura: process.env.INFURA_URL
    });

    const signer = new ethers.Wallet(process.env.PRIVATE_KEY);
    const account = signer.connect(provider);

    const uniswap = new ethers.Contract(
        '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        ['function swapExactTokensForTokens(uint amountIn,uint amountOutMin,address[] calldata path,address to,uint deadline) external returns (uint[] memory amounts)'],
        account);

    console.log('Sending transaction...')

    const tx = await uniswap.swapExactTokensForTokens(

        amountIn,
        amountOutMin,
        path,
        to,
        deadline,
        { gasPrice: 60e9 }

    );
    console.log(`Transaction hash: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`Transaction was mined in block ${receipt.blockNumber}`);

}

exports.swapUSDTtoYFI = swapUSDTtoYFI;
exports.swapYFItoUSDT = swapYFItoUSDT;

swapUSDTtoYFI();
