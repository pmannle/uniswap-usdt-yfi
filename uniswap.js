require("dotenv").config()
const JSBI = require('jsbi');
const Web3 = require('web3');
const Tx = require('ethereumjs-tx')
const ethers = require('ethers');
const { ChainId, Fetcher, WETH, Route, Trade, TokenAmount, TradeType, Percent } = require('@uniswap/sdk');

const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.INFURA_URL)
);
const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);
const myAddress = process.env.WALLET_ADDRESS;

const provider = ethers.getDefaultProvider('mainnet', {
    infura: process.env.INFURA_URL
});

const IUniswapV2Router02 = require('./abis/uniswapV2.json');
const  swapExactTokensForTokensContract = new web3.eth.Contract(IUniswapV2Router02, "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");

const chainId = ChainId.MAINNET;
const USDTAddress = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const YFIAddress = '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e';


const swapUSDTtoYFI = async (amount) => {

    var USDTAmountinWei = web3.utils.toWei("1000", "ether").toString()
    const ERC20ABI = require('./abis/ERC20.json');

    // Approve the LendingPoolCore address with the YFI contract
    const USDTContract = new web3.eth.Contract(ERC20ABI, USDTAddress)
    await USDTContract.methods
        .approve(swapExactTokensForTokensContract, USDTAmountinWei)


    const usdt = await Fetcher.fetchTokenData(chainId, USDTAddress, undefined, "USDT", "USDT Token");
    const yfi = await Fetcher.fetchTokenData(chainId, YFIAddress, undefined, "YFI", "YFI Token");

    const pair = await Fetcher.fetchPairData(usdt, yfi);
    const route = new Route([pair], usdt);

    const trade = new Trade(route, new TokenAmount(usdt, JSBI.BigInt(amount)), TradeType.EXACT_INPUT);
    console.log(pair.token0.symbol, "=>", pair.token1.symbol, route.midPrice.toSignificant(6));
    console.log(pair.token1.symbol, "=>", pair.token0.symbol, route.midPrice.invert().toSignificant(6));
    console.log(trade.executionPrice.toSignificant(6));
    console.log(trade.nextMidPrice.toSignificant(6));

    const slippageTolerance = new Percent('50', '10000'); // (0.05%) bips, 1 bip = 0.001

    const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw.toString();
    const amountIn = trade.inputAmount.raw.toString();
    const path = [usdt.address, yfi.address];
    const to = myAddress;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const signer = new ethers.Wallet(process.env.PRIVATE_KEY);
    const account = signer.connect(provider);

    const uniswap = new ethers.Contract(
        '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        ['function swapExactTokensForTokens(uint amountIn,uint amountOutMin,address[] calldata path,address to,uint deadline) external returns (uint[] memory amounts)'],
        account)


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
    const trade = new Trade(route, new TokenAmount(yfi, JSBI.BigInt(amount)), TradeType.EXACT_INPUT);
    console.log(pair.token0.symbol, "=>", pair.token1.symbol, route.midPrice.toSignificant(6));
    console.log(pair.token1.symbol, "=>", pair.token0.symbol, route.midPrice.invert().toSignificant(6));
    console.log(trade.executionPrice.toSignificant(6));
    console.log(trade.nextMidPrice.toSignificant(6));

    const slippageTolerance = new Percent('50', '10000'); // (0.05%) bips, 1 bip = 0.001

    const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw.toString();
    const amountIn = trade.inputAmount.raw.toString();
    const path = [yfi.address, usdt.address];
    const to = myAddress;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

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

// let ten_dollarsUSDT = 10000000; // $10 USDT
// swapUSDTtoYFI(ten_dollarsUSDT);

let ten_dollarsYFI = 733760773442556 // ~$10 of YFI @ $13,628/YFI
swapYFItoUSDT(ten_dollarsYFI);
