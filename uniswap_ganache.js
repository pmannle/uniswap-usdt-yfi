require("dotenv").config()
const JSBI = require('jsbi');
const Web3 = require('web3');
const abis = require('./abis');
const { mainnet: addresses } = require('./addresses');
// const unlimitedApproval = require('./utils').unlimitedApproval;
const { ChainId, Fetcher, Token, WETH, Route, Trade, TokenAmount, TradeType, Percent, CurrencyAmount, ETHER, Pair } = require('@uniswap/sdk');
const moment = require('moment');
const BigNumber = require('bignumber.js');

/* mainnet */
const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.INFURA_URL)
);
const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);
const walletAddress = process.env.WALLET_ADDRESS;


/* ganache
const ganache = require("ganache-core");
const web3 = new Web3('http://localhost:8545');


const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);
const walletAddress = process.env.WALLET_ADDRESS;

*/

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

    // Approve the token contract
    const usdtTokenContract = new web3.eth.Contract(ERC20ABI, usdtToken)
    await usdtTokenContract.methods
        .approve(UniContract, new BigNumber(2).pow(256).minus(1));

    await usdtTokenContract.methods
        .approve(walletAddress, new BigNumber(2).pow(256).minus(1));

    let availableBalanceETH = await web3.eth.getBalance(walletAddress);

    console.log('Available ETH in Wallet', availableBalanceETH); // plenty of ETH here!

    let accounts = await web3.eth.getAccounts();

    const usdt = await Fetcher.fetchTokenData(chainId, usdtToken, undefined, "USDT", "USDT Token");

    // const pair_weth_usdt = new Pair(
    //     new TokenAmount(WETH[ChainId.MAINNET], JSBI.BigInt(amount)),
    //     new TokenAmount(usdt, JSBI.BigInt(amount))
    // );

    const pair1 = await Fetcher.fetchPairData(weth, usdt);
    const route = await new Route([pair1], weth, usdt);

    const trade = new Trade(
        route,
        // new CurrencyAmount.ether(JSBI.BigInt(amount)),
        new TokenAmount(weth, JSBI.BigInt(amount)),
        TradeType.EXACT_INPUT
    );


    const slippageTolerance = new Percent('90', '10000'); // (0.05%) bips, 1 bip = 0.001

    const amountInMax = trade.maximumAmountIn(slippageTolerance).raw.toString();
    const amountOut = trade.outputAmount.raw.toString();
    const path = [weth.address, usdt.address];
    const to = walletAddress;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    let transactionHash;

    const amountOutMin = new BigNumber(3000000);

    return await UniContract.methods.swapExactETHForTokens(
        amountOutMin,
        path,
        to,
        deadline
    ).send({from: walletAddress, gas: 975000, gasPrice: 50000000000})
        .on('transactionHash', function (hash) {
            console.log(hash)
        })
        .on('receipt', async function (receipt) {
            console.log(receipt);
            return receipt;
        })
        .on('error', (error) => {
            let message = error.message;
            return new Error('ERROR swapping USD to YFI: ' + message);
        });

}

/**
 * Swaps USDT for YFI.
 * @param amount in USDT, should be in 1e6 for USDT, so 10000000 = $10 USDT
 */

const swapUSDTtoYFI = async (amount, approvedForUnlimitedSpend) => {

        if (!approvedForUnlimitedSpend) {

            // Approve the token contract
            const usdtTokenContract = new web3.eth.Contract(ERC20ABI, usdtToken)
            await usdtTokenContract.methods
                .approve(UniContract, new BigNumber(2).pow(256).minus(1));

        }

        const usdt = await Fetcher.fetchTokenData(chainId, usdtToken, undefined, "USDT", "USDT Token");
        const yfi = await Fetcher.fetchTokenData(chainId, yfiToken, undefined, "YFI", "YFI Token");
        const pair0 = await Fetcher.fetchPairData(usdt, weth);
        const pair1 = await Fetcher.fetchPairData(weth, yfi);

        const route = new Route([pair0, pair1], usdt, yfi);

        // trade USDT for exact amount of YFI needed to payback the loan
        const uniTrade = new Trade(route, new TokenAmount(yfi, JSBI.BigInt(amount)), TradeType.EXACT_OUTPUT);
        const slippageTolerance = new Percent('50', '10000'); // (0.05%) bips, 1 bip = 0.001

        const amountInMax = uniTrade.maximumAmountIn(slippageTolerance).raw.toString();
        const amountOut = uniTrade.outputAmount.raw.toString();


        let tokenContract = new web3.eth.Contract(ERC20ABI, addresses.tokens.usdt);
        let availableBalanceUSDT = await tokenContract.methods.balanceOf(walletAddress).call().catch((error) => {
            console.log(error);
        });

        if (new BigNumber(availableBalanceUSDT).isLessThan(new BigNumber(amountOut))) {
            let message = 'ERROR: Not enough money in wallet!';
            return new Error(message );
        }

        const path = [usdt.address, weth.address, yfi.address];
        const to = walletAddress;
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes


        let transactionHash;

        return await UniContract.methods.swapTokensForExactTokens(
            amountOut,
            amountInMax,
            path,
            to,
            deadline
        ).send({from: walletAddress, gas: 975000, gasPrice: process.env.GAS_PRICE})
            .on('transactionHash', function (hash) {
                transactionHash = hash;
            })
            .on('receipt', async function (receipt) {
                return receipt;
            })
            .on('error', (error) => {
                let message = error.message;
                return new Error('ERROR swapping USD to YFI: ' + message);
            });


}

/**
 * Swaps YFI for USDT.
 * @param amount in YFI, should be in 1e18 for Wei of YFI
 */

const swapYFItoUSDT = async (amount, approvedForUnlimitedSpend) => {

    let tryToSwapYFItoUSDT = async () => {

        if (!approvedForUnlimitedSpend) {

            // Approve the token contract
            const yfiTokenContract = new web3.eth.Contract(ERC20ABI, yfiToken);
            await yfiTokenContract.methods
                .approve(UniContract, new BigNumber(2).pow(256).minus(1));

        }

        const usdt = await Fetcher.fetchTokenData(chainId, usdtToken, undefined, "USDT", "USDT Token");
        const yfi = await Fetcher.fetchTokenData(chainId, yfiToken, undefined, "YFI", "YFI Token");
        const pair0 = await Fetcher.fetchPairData(yfi, weth);
        const pair1 = await Fetcher.fetchPairData(weth, usdt);
        const route = new Route([pair0, pair1], yfi, usdt);
        const uniTrade = new Trade(route, new TokenAmount(yfi, JSBI.BigInt(amount)), TradeType.EXACT_INPUT);
        const slippageTolerance = new Percent('50', '10000'); // (0.05%) bips, 1 bip = 0.001

        const amountOutMin = uniTrade.minimumAmountOut(slippageTolerance).raw.toString();
        const amountIn = uniTrade.inputAmount.raw.toString();

        // make sure we have enough in wallet to do the swap
        let availableBalanceYFI = await utils.check_token_balance(addresses.tokens.yfi);

        if (new BigNumber(availableBalanceYFI).isLessThan(new BigNumber(amountIn))) {
            let message = 'ERROR: Not enough money in wallet!';
            return new Error(message );
        }

        const path = [yfi.address, weth.address, usdt.address];
        const to = walletAddress;
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

        let transactionHash;

        return await UniContract.methods.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            to,
            deadline
        ).send({from: walletAddress, gas: 975000, gasPrice: process.env.GAS_PRICE})
            .on('transactionHash', function (hash) {
                transactionHash = hash;
            })
            .on('receipt', async function (receipt) {
                return receipt;
            })
            .on('error', (error) => {
                return new Error('ERROR swapping YFI to USD: ' + error);
            });

    };


    return await utils.retryOnError(tryToSwapYFItoUSDT, 3);

}

exports.swapUSDTtoYFI = swapUSDTtoYFI;
exports.swapYFItoUSDT = swapYFItoUSDT;



// 10000000; // $10 USDT
// swapUSDTtoYFI(null, 10000000, true);


swapETHtoUSDT(10000000000000000, true);




// 733760773442556 // ~$10 of YFI @ $13,628/YFI
// swapYFItoUSDT(null, 714854008000000, true);



