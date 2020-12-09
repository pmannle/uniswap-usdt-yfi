require("dotenv").config()
const JSBI = require('jsbi');
const Web3 = require('web3');
const abis = require('./abis');
const { mainnet: addresses } = require('./addresses');
// const unlimitedApproval = require('./utils').unlimitedApproval;
const { ChainId, Fetcher, Token, WETH, Route, Trade, TokenAmount, TradeType, Percent, CurrencyAmount, ETHER, Pair } = require('@uniswap/sdk');
const moment = require('moment');
const BigNumber = require('bignumber.js');

/* mainnet
const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.INFURA_URL)
);
const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);
const walletAddress = process.env.WALLET_ADDRESS;

*/


/* ganache */
const ganache = require("ganache-core");
const web3 = new Web3('http://localhost:8545');


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

const swapETHtoUSDT = async (amount) => {

    return new Promise (async (response, reject) => {

        amount = amount.toString();

        let availableBalanceETH = await web3.eth.getBalance(walletAddress);

        console.log('Available ETH in Wallet', availableBalanceETH); // plenty of ETH here!

        const usdt = await Fetcher.fetchTokenData(chainId, usdtToken, undefined, "USDT", "USDT Token");

        const pair1 = await Fetcher.fetchPairData(weth, usdt);
        const route = await new Route([pair1], weth, usdt);

        const trade = new Trade(
            route,
            new TokenAmount(weth, amount),
            TradeType.EXACT_INPUT
        );

        const slippageTolerance = new Percent('50', '10000'); // (0.05%) bips, 1 bip = 0.001

        const amountOut = trade.minimumAmountOut(slippageTolerance).raw.toString()
        const path = [weth.address, usdt.address];
        const to = walletAddress;
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

        return await UniContract.methods.swapExactETHForTokens(
            amountOut,
            path,
            to,
            deadline
        ).send({from: walletAddress, gas: 975000, gasPrice: 50000000000, value: amount})
            .on('transactionHash', function (hash) {
                console.log(hash)
            })
            .on('receipt', async function (receipt) {
                console.log(receipt);
                return response(receipt);
            })
            .on('error', (error) => {
                let message = error.message;
                return reject(new Error('ERROR swapping ETH to USDT: ' + message));
            });

    })

}


const swapETHtoYFI = async (amount) => {

    return new Promise (async (resolve, reject) => {

        amount = amount.toString()

        let availableBalanceETH = await web3.eth.getBalance(walletAddress);

        console.log('Available ETH in Wallet', availableBalanceETH); // plenty of ETH here!

        const yfi = await Fetcher.fetchTokenData(chainId, yfiToken, undefined, "YFI", "YFI Token");

        const pair1 = await Fetcher.fetchPairData(weth, yfi);
        const route = await new Route([pair1], weth, yfi);

        const trade = new Trade(
            route,
            new TokenAmount(weth, amount),
            TradeType.EXACT_INPUT
        );

        const slippageTolerance = new Percent('50', '10000'); // (0.05%) bips, 1 bip = 0.001

        const amountOut = trade.minimumAmountOut(slippageTolerance).raw.toString()
        const path = [weth.address, yfi.address];
        const to = walletAddress;
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

        return await UniContract.methods.swapExactETHForTokens(
            amountOut,
            path,
            to,
            deadline
        ).send({from: walletAddress, gas: 975000, gasPrice: 50000000000, value: amount})
            .on('transactionHash', function (hash) {
                console.log(hash)
            })
            .on('receipt', async function (receipt) {
                console.log(receipt);
                return resolve(receipt);
            })
            .on('error', (error) => {
                let message = error.message;
                return reject(new Error('ERROR swapping ETH to USDT: ' + message));
            });

    })

}


/**
 * Swaps USDT for YFI.
 * @param amount in USDT, should be in 1e6 for USDT, so 10000000 = $10 USDT
 */

const swapUSDTtoYFI = async (amount, approvedForUnlimitedSpend, callback) => {
    let approvalTx = await approveRouter(usdtToken, amount);
    console.log(approvalTx);

    const usdt = await Fetcher.fetchTokenData(
        chainId,
        usdtToken,
        undefined,
        "USDT",
        "USDT Token"
    );
    const yfi = await Fetcher.fetchTokenData(
        chainId,
        yfiToken,
        undefined,
        "YFI",
        "YFI Token"
    );
    const pair0 = await Fetcher.fetchPairData(usdt, weth);
    const pair1 = await Fetcher.fetchPairData(weth, yfi);

    const route = new Route([pair0, pair1], usdt, yfi);

    const trade = new Trade(
        route,
        new TokenAmount(usdt, JSBI.BigInt(amount)),
        TradeType.EXACT_INPUT
    );

    const slippageTolerance = new Percent("90", "10000"); // (0.05%) bips, 1 bip = 0.001

    const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw.toString();
    const amountIn = trade.inputAmount.raw.toString();
    const path = [usdt.address, weth.address, yfi.address];
    const to = walletAddress;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    console.log("Sending transaction...");

    const tx = await UniContract.methods
        .swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline)
        .send({ from: walletAddress, gas: 975000, gasPrice: 50000000000 })
        .on("transactionHash", function (hash) {
            console.log(`${moment().format()} Transaction hash: ${hash}`);
        })
        .on("receipt", function (receipt) {
            console.log(
                `${moment().format()} Transaction was mined in block ${
                    receipt.blockNumber
                    }`
            );
            callback(receipt);
        })
        .on("error", console.error);
};

/**
 * Swaps YFI for USDT.
 * @param amount in YFI, should be in 1e18 for Wei of YFI
 */

const swapYFItoUSDT = async (amount, approvedForUnlimitedSpend) => {
    const accounts = await web3.eth.getAccounts();

// Approve the token contract
    let approvalTx = await approveRouter(yfiToken, amount);
    console.log(approvalTx);

    const usdt = await Fetcher.fetchTokenData(
        chainId,
        usdtToken,
        undefined,
        "USDT",
        "USDT Token"
    );
    const yfi = await Fetcher.fetchTokenData(
        chainId,
        yfiToken,
        undefined,
        "YFI",
        "YFI Token"
    );
    const pair0 = await Fetcher.fetchPairData(yfi, weth);
    const pair1 = await Fetcher.fetchPairData(weth, usdt);
    const route = new Route([pair0, pair1], yfi, usdt);
    const uniTrade = new Trade(
        route,
        new TokenAmount(yfi, JSBI.BigInt(amount)),
        TradeType.EXACT_INPUT
    );
    const slippageTolerance = new Percent("50", "10000"); // (0.05%) bips, 1 bip = 0.001

    const amountOutMin = uniTrade
        .minimumAmountOut(slippageTolerance)
        .raw.toString();
    const amountIn = uniTrade.inputAmount.raw.toString();

// make sure we have enough in wallet to do the swap
// let availableBalanceYFI = await utils.check_token_balance(addresses.tokens.yfi);

// if (new BigNumber(availableBalanceYFI).isLessThan(new BigNumber(amountIn))) {
// let message = 'ERROR: Not enough money in wallet!';
// return new Error(message );
// }

    const path = [yfi.address, weth.address, usdt.address];
    const to = walletAddress;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    let transactionHash;

    return await UniContract.methods
        .swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline)
        .send({ from: walletAddress, gas: 975000, gasPrice: process.env.GAS_PRICE })
        .on("transactionHash", function (hash) {
            transactionHash = hash;
        })
        .on("receipt", async function (receipt) {
            return receipt;
        })
        .on("error", (error) => {
            return new Error("ERROR swapping YFI to USD: " + error);
        });
};

function approveRouter(tokenAddress, amount) {
    const tokenContract = new web3.eth.Contract(ERC20ABI, tokenAddress);

    return tokenContract.methods
        .approve(UniRouter, amount)
        .send({ from: walletAddress, gas: 975000, gasPrice: process.env.GAS_PRICE })
        .catch((error) => {
            console.log(error);
        });
}

exports.swapUSDTtoYFI = swapUSDTtoYFI;
exports.swapYFItoUSDT = swapYFItoUSDT;

// swapETHtoUSDT(20000000000000000000, true);
// swapETHtoYFI(48521803976069016000, true);

// swapYFItoUSDT(web3.utils.toWei("0.0001"), false);
swapUSDTtoYFI(web3.utils.toWei("0.0001"), false);

