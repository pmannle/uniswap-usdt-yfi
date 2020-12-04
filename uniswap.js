require("dotenv").config()
const JSBI = require('jsbi');
const Web3 = require('web3');
const abis = require('./abis');
const { mainnet: addresses } = require('./addresses');
const unlimitedApproval = require('./utils').unlimitedApproval;
const { ChainId, Fetcher, WETH, Route, Trade, TokenAmount, TradeType, Percent } = require('@uniswap/sdk');
const moment = require('moment');

const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.INFURA_URL)
);

const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);
const walletAddress = process.env.WALLET_ADDRESS;

const ERC20ABI = abis.ERC20ABI;
const UniAbi = abis.IUniswapV2Router02;
const UniRouter = addresses.uniswap.router;
const UniContract = new web3.eth.Contract(UniAbi, UniRouter);

const chainId = ChainId.MAINNET;
const usdtToken = addresses.tokens.usdt;
const yfiToken = addresses.tokens.yfi;
const weth = WETH[chainId];

/**
 * Swaps USDT for YFI.
 * @param amount in USDT, should be in 1e6 for USDT, so 10000000 = $10 USDT
 */

const swapUSDTtoYFI = async (amount, approvedForUnlimitedSpend, callback) => {

    if(!approvedForUnlimitedSpend) {

        // Approve the token contract
        const usdtTokenContract = new web3.eth.Contract(ERC20ABI, usdtToken)
        await usdtTokenContract.methods
            .approve(UniContract, unlimitedApproval);

    }

    const usdt = await Fetcher.fetchTokenData(chainId, usdtToken, undefined, "USDT", "USDT Token");
    const yfi = await Fetcher.fetchTokenData(chainId, yfiToken, undefined, "YFI", "YFI Token");
    const pair0 = await Fetcher.fetchPairData(usdt, weth);
    const pair1 = await Fetcher.fetchPairData(weth, yfi);

    const route = new Route([pair0, pair1], usdt, yfi);

    const trade = new Trade(route, new TokenAmount(usdt, JSBI.BigInt(amount)), TradeType.EXACT_INPUT);

    const slippageTolerance = new Percent('50', '10000'); // (0.05%) bips, 1 bip = 0.001

    const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw.toString();
    const amountIn = trade.inputAmount.raw.toString();
    const path = [usdt.address, weth.address, yfi.address];
    const to = walletAddress;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    console.log('Sending transaction...')

    const tx = await UniContract.methods.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        to,
        deadline
    ).send({from: walletAddress, gas: 976677})
        .on('transactionHash', function(hash){
            console.log(`${moment().format()} Transaction hash:  ${hash}`);
        })
        .on('receipt', function(receipt){
            console.log(`${moment().format()} Transaction was mined in block ${receipt.blockNumber}`);
            callback(receipt);
        })
        .on('error', console.error);

}

/**
 * Swaps YFI for USDT.
 * @param amount in YFI, should be in 1e18 for Wei of YFI
 */

const swapYFItoUSDT = async (amount, approvedForUnlimitedSpend, callback) => {

    if(!approvedForUnlimitedSpend) {

        // Approve the token contract
        const yfiTokenContract = new web3.eth.Contract(ERC20ABI, yfiToken)
        await yfiTokenContract.methods
            .approve(UniContract, unlimitedApproval);

    }

    const usdt = await Fetcher.fetchTokenData(chainId, usdtToken, undefined, "USDT", "USDT Token");
    const yfi = await Fetcher.fetchTokenData(chainId, yfiToken, undefined, "YFI", "YFI Token");
    const pair0 = await Fetcher.fetchPairData(yfi, weth);
    const pair1 = await Fetcher.fetchPairData(weth, usdt);

    const route = new Route([pair0, pair1], yfi, usdt);

    const trade = new Trade(route, new TokenAmount(yfi, JSBI.BigInt(amount)), TradeType.EXACT_INPUT);

    const slippageTolerance = new Percent('50', '10000'); // (0.05%) bips, 1 bip = 0.001

    const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw.toString();
    const amountIn = trade.inputAmount.raw.toString();
    const path = [yfi.address, weth.address, usdt.address];
    const to = walletAddress;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    console.log('Sending transaction...')

    const tx = await UniContract.methods.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        to,
        deadline
    ).send({from: walletAddress, gas: 976677})
        .on('transactionHash', function(hash){
            console.log(`${moment().format()} Transaction hash: ${hash}`);
        })
        .on('receipt', function(receipt){
            console.log(`${moment().format()} Transaction was mined in block ${receipt.blockNumber}`);
            callback(receipt);
        })
        .on('error', console.error);

}

exports.swapUSDTtoYFI = swapUSDTtoYFI;
exports.swapYFItoUSDT = swapYFItoUSDT;



// // 10000000; // $10 USDT
// swapUSDTtoYFI(10000000, true, (receipt) => {
//     console.log(receipt);
// });

// 733760773442556 // ~$10 of YFI @ $13,628/YFI
// 714854008000000
swapYFItoUSDT(714854008000000, true, (receipt) => {
    console.log(receipt);
});
