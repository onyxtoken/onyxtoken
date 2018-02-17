'use strict';
var assert_throw = require('./helpers/utils').assert_throw;
	
var OnyxToken = artifacts.require("./OnyxToken.sol");	
var OnyxTokenSale = artifacts.require("./OnyxTokenSale.sol");	

const promisify = (inner) =>
	new Promise((resolve, reject) =>
		inner((err, res) => {
			if (err) { reject(err) }
			resolve(res);
		})
);

const getBalance = (account, at) => promisify(cb => web3.eth.getBalance(account, at, cb));
const makeNumber = (number) => {return parseInt(number * 10 ** -18)}; 		
const toTimestamp = (strDate) => { var datum = Date.parse(strDate); return datum/1000; }
const getTokenBalance = async (account) => { var balance = await tokenInstance.balanceOf.call(account); return balance; };

const approxEqual = (num1 , num2) => {
	// console.log('approxEqual ' , num1 , num2);
	// console.log(toFixed(num1) , toFixed(num2));
	if(num1 == num2) {
		return true;
	}
	
    var change = ((num1 - num2) / num1) * 100;
    if(change <= 1) {
    	return true;
    } else {
    	return false;
    }
}

function toFixed(x) {
	if (Math.abs(x) < 1.0) {
		var e = parseInt(x.toString().split('e-')[1]);
		if (e) {
				x *= Math.pow(10,e-1);
				x = '0.' + (new Array(e)).join('0') + x.toString().substring(2);
		}
	} else {
		var e = parseInt(x.toString().split('+')[1]);
		if (e > 20) {
				e -= 20;
				x /= Math.pow(10,e);
				x += (new Array(e+1)).join('0');
		}
	}
	return x;
}

var tokenInstance;
var saleInstance;

var owner, wallet, teamWallet, marketWallet;

var day = 60 * 60 * 24;
var month = day * 30;
var year = day * 365;

var buffer = day * 0;

var sale = {};
sale.ethToUsd = 1000;
sale.usdToWei = 1E18 / sale.ethToUsd;
sale.maxTokenForSale = 720000000;
sale.pricePerToken = 1 * sale.usdToWei / 100;
sale.softcap = 400000000; 
sale.hardcap = 720000000; 
sale.phase1StartAt = 1519344000 - buffer; // Friday, 23 February 2018 00:00:00
sale.phase1BetweenAt = sale.phase1StartAt + day;
sale.phase1EndAt = sale.phase1StartAt + day * 7 - 1 ; // Sunday, 25 February 2018 23:59:59
sale.phase1Bonus = 20;
sale.phase1TokenSold = 0;
sale.phase1EtherRaised = 0;
sale.phase2StartAt = sale.phase1EndAt + 1; // Monday, 26 February 2018 00:00:00
sale.phase2BetweenAt = sale.phase2StartAt + day;
sale.phase2EndAt = sale.phase2StartAt + day * 7 - 1; // Sunday, 4 March 2018 23:59:59
sale.phase2Bonus = 15;
sale.phase2TokenSold = 0;
sale.phase2EtherRaised = 0;
sale.phase3StartAt = sale.phase2EndAt + 1; // Monday, 4 March 2018 00:00:00
sale.phase3BetweenAt = sale.phase3StartAt + day;
sale.phase3EndAt = sale.phase3StartAt + day * 7 - 1; // Sunday, 11 March 2018 23:59:59
sale.phase3Bonus = 10;
sale.phase3TokenSold = 0;
sale.phase3EtherRaised = 0;
sale.phase4StartAt = sale.phase3EndAt + 1; // Monday, 12 March 2018 00:00:00
sale.phase4BetweenAt = sale.phase4StartAt + day;
sale.phase4EndAt = sale.phase4StartAt + day * 7 - 1; // Sunday, 19 March 2018 23:59:59
sale.phase4Bonus = 0;
sale.phase4TokenSold = 0;
sale.phase4EtherRaised = 0;

console.log(sale);

contract('OnyxToken' , (accounts) => {
	owner = accounts[0];
	wallet = accounts[1];
	teamWallet = accounts[2];
	marketWallet = accounts[3];

	var numTeamTokens = 100000000;
	var numMarketTokens = 180000000;
	
	beforeEach(async () => {
		// deploy token contracts
		tokenInstance = await OnyxToken.new({from: owner});
		
		// deploy sale instance	
		saleInstance = await OnyxTokenSale.new(tokenInstance.address , wallet , teamWallet , marketWallet , {from: owner});

		// get goal	
		var maxTokenForSale = await saleInstance.maxTokenForSale.call();
		await tokenInstance.transfer(saleInstance.address , maxTokenForSale);

		// // send team tokens
		// var teamTokens = await saleInstance.teamTokens.call();
		// await tokenInstance.transfer(saleInstance.address , teamTokens);
		
		// // send market tokens
		// var marketTokens = await saleInstance.marketTokens.call();
		// await tokenInstance.transfer(saleInstance.address , marketTokens);

		// transfer wallet tokens
		await tokenInstance.transfer(teamWallet , numTeamTokens , {from: owner});
		await tokenInstance.transfer(marketWallet , numMarketTokens , {from: owner});

		// set eth to usd 
		await saleInstance.setEthToUsd(1000 , {from: owner});
	});

	/* TIMESTAMPED METHODS */

	it('timestamped : should set timestamp' , async () => {
		await saleInstance.setBlockTime(123 , {from: owner});
		var timestamp = await saleInstance.getBlockTime.call();
		var ts = await saleInstance.ts.call();
		assert.equal(timestamp.toNumber() , 123 , 'timestamp should be set');
	});

	it('timestamped : should get timestamp' , async () => {
		var timestamp = await saleInstance.getBlockTime.call();
		assert.isTrue(timestamp.toNumber() > 0 , 'timestamp should be get');	
	});

	it('timestamped : should reset timestamp' , async () => {
		await saleInstance.setBlockTime(123 , {from: owner});
		var timestamp = await saleInstance.getBlockTime.call();
		assert.equal(timestamp.toNumber() , 123 , 'timestamp should be set');

		await saleInstance.setBlockTime(0);
		var timestamp = await saleInstance.getBlockTime.call();	
		assert.isTrue(timestamp > 0 , 'timestamp should be reset');
	});

	/* TOKEN CONTRACT */

	it('token : should match name' , async () => {
		var name = await tokenInstance.name.call();
		assert.equal(name , 'OnyxFutures' , 'name does not match');		
	});

	it('token : should match symbol' , async () => {
		var symbol = await tokenInstance.symbol.call();
		assert.equal(symbol , 'ONYX' , 'symbol does not match');		
	});

	it('token : should match decimals' , async () => {
		var decimals = await tokenInstance.decimals.call();
		assert.equal(decimals , 0 , 'decimals does not match');		
	});

	it('token : should have tokens minted' , async () => {
		var balance = await tokenInstance.balanceOf.call(owner);
		assert.equal(balance.toNumber() , 0 , 'owner balance should be zero');		

		var maxTokenForSale = await saleInstance.maxTokenForSale.call();
		var teamTokens = await saleInstance.teamTokens.call();
		var marketTokens = await saleInstance.marketTokens.call();

		var balance = await getTokenBalance(saleInstance.address);
		assert.equal(balance.toNumber() , maxTokenForSale.toNumber() + teamTokens.toNumber() + marketTokens.toNumber() , 'balance of sale instance should match hardcap');
	});

	/* SALE CONTRACT */

	it('sale : should match token property' , async () => {
		var token = await saleInstance.token.call();
		assert.equal(token , tokenInstance.address , 'token should match');
	});

	it('sale : should match wallet property' , async () => {
		var wallet = await saleInstance.wallet.call();
		assert.equal(wallet , accounts[1] , 'wallet should match');
	});

	it('sale : should match teamWallet property' , async () => {
		var teamWallet = await saleInstance.teamWallet.call();
		assert.equal(teamWallet , accounts[2] , 'teamWallet should match');
	});

	it('sale : should match marketWallet property' , async () => {
		var marketWallet = await saleInstance.marketWallet.call();
		assert.equal(marketWallet , accounts[3] , 'marketWallet should match');
	});

	it('sale : should match ethToUsd property' , async () => {
		var ethToUsd = await saleInstance.ethToUsd.call();
		assert.equal(ethToUsd , sale.ethToUsd , 'ethToUsd should match');
	});

	it('sale : should match usdToWei property' , async () => {
		var usdToWei = await saleInstance.usdToWei.call();
		assert.equal(usdToWei , sale.usdToWei , 'usdToWei should match');
	});

	it('sale : should match maxTokenForSale property' , async () => {
		var maxTokenForSale = await saleInstance.maxTokenForSale.call();
		assert.equal(maxTokenForSale , sale.maxTokenForSale , 'maxTokenForSale should match');
	});

	it('sale : should match pricePerToken property' , async () => {
		var pricePerToken = await saleInstance.pricePerToken.call();
		assert.equal(pricePerToken , sale.pricePerToken , 'pricePerToken should match');
	});

	it('sale : should match softcap property' , async () => {
		var softcap = await saleInstance.softcap.call();
		assert.equal(softcap , sale.softcap , 'softcap should match');
	});

	it('sale : should match hardcap property' , async () => {
		var hardcap = await saleInstance.hardcap.call();
		assert.equal(hardcap , sale.hardcap , 'hardcap should match');
	});

	it('sale : should match phase1StartAt property' , async () => {
		var phase1StartAt = await saleInstance.phase1StartAt.call();
		assert.equal(phase1StartAt.toNumber() , sale.phase1StartAt , 'phase1StartAt should match');
	});

	it('sale : should match phase1EndAt property' , async () => {
		var phase1EndAt = await saleInstance.phase1EndAt.call();
		assert.equal(phase1EndAt.toNumber() , sale.phase1EndAt , 'phase1EndAt should match');
	});

	it('sale : should match phase1Bonus property' , async () => {
		var phase1Bonus = await saleInstance.phase1Bonus.call();
		assert.equal(phase1Bonus , sale.phase1Bonus , 'phase1Bonus should match');
	});

	it('sale : should match phase1TokenSold property' , async () => {
		var phase1TokenSold = await saleInstance.phase1TokenSold.call();
		assert.equal(phase1TokenSold , sale.phase1TokenSold , 'phase1TokenSold should match');
	});

	it('sale : should match phase2StartAt property' , async () => {
		var phase2StartAt = await saleInstance.phase2StartAt.call();
		assert.equal(phase2StartAt.toNumber() , sale.phase2StartAt , 'phase2StartAt should match');
	});

	it('sale : should match phase2EndAt property' , async () => {
		var phase2EndAt = await saleInstance.phase2EndAt.call();
		assert.equal(phase2EndAt.toNumber() , sale.phase2EndAt , 'phase2EndAt should match');
	});

	it('sale : should match phase2Bonus property' , async () => {
		var phase2Bonus = await saleInstance.phase2Bonus.call();
		assert.equal(phase2Bonus , sale.phase2Bonus , 'phase2Bonus should match');
	});

	it('sale : should match phase2TokenSold property' , async () => {
		var phase2TokenSold = await saleInstance.phase2TokenSold.call();
		assert.equal(phase2TokenSold , sale.phase2TokenSold , 'phase2TokenSold should match');
	});

	it('sale : should match phase3StartAt property' , async () => {
		var phase3StartAt = await saleInstance.phase3StartAt.call();
		assert.equal(phase3StartAt.toNumber() , sale.phase3StartAt , 'phase3StartAt should match');
	});

	it('sale : should match phase3EndAt property' , async () => {
		var phase3EndAt = await saleInstance.phase3EndAt.call();
		assert.equal(phase3EndAt.toNumber() , sale.phase3EndAt , 'phase3EndAt should match');
	});

	it('sale : should match phase3Bonus property' , async () => {
		var phase3Bonus = await saleInstance.phase3Bonus.call();
		assert.equal(phase3Bonus , sale.phase3Bonus , 'phase3Bonus should match');
	});

	it('sale : should match phase3TokenSold property' , async () => {
		var phase3TokenSold = await saleInstance.phase3TokenSold.call();
		assert.equal(phase3TokenSold , sale.phase3TokenSold , 'phase3TokenSold should match');
	});

	it('sale : should match phase4StartAt property' , async () => {
		var phase4StartAt = await saleInstance.phase4StartAt.call();
		assert.equal(phase4StartAt.toNumber() , sale.phase4StartAt , 'phase4StartAt should match');
	});

	it('sale : should match phase4EndAt property' , async () => {
		var phase4EndAt = await saleInstance.phase4EndAt.call();
		assert.equal(phase4EndAt.toNumber() , sale.phase4EndAt , 'phase4EndAt should match');
	});

	it('sale : should match phase4Bonus property' , async () => {
		var phase4Bonus = await saleInstance.phase4Bonus.call();
		assert.equal(phase4Bonus , sale.phase4Bonus , 'phase4Bonus should match');
	});

	it('sale : should match phase4TokenSold property' , async () => {
		var phase4TokenSold = await saleInstance.phase4TokenSold.call();
		assert.equal(phase4TokenSold , sale.phase4TokenSold , 'phase4TokenSold should match');
	});

	it('sale : should have enough balance' , async () => {
		var maxTokenForSale = await saleInstance.maxTokenForSale.call();
		var teamTokens = await saleInstance.teamTokens.call();
		var marketTokens = await saleInstance.marketTokens.call();

		var balance = await getTokenBalance(saleInstance.address);
		assert.equal(balance.toNumber() , maxTokenForSale.toNumber() + teamTokens.toNumber() + marketTokens.toNumber() , 'balance should match');
	});

	it('sale : should allow owner to buy token' , async () => {
		var account = owner;

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase1BetweenAt);
		await saleInstance.buy(account , {from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);

		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + 1200 , 'balance should be increased');
	});

	it('sale : should call eth to usd method' , async () => {
		await saleInstance.setEthToUsd(2000 , {from: owner});
		var ethToUsd = await saleInstance.ethToUsd.call();
		assert.equal(ethToUsd.toNumber() , 2000 , 'decimals does not match');		

		var account = owner;

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase1BetweenAt);
		await saleInstance.buy(account , {from: account, value: 1E18});
		var balanceAfter = await tokenInstance.balanceOf.call(account);

		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + 240000 , 'balance should be increased');
	});

	it('sale : should allow owner to buy token and transfer those tokens' , async () => {
		var account1 = owner;
		var account2 = accounts[1];

		var account1BalanceBefore = await tokenInstance.balanceOf.call(account1);
		await saleInstance.setBlockTime(sale.phase1BetweenAt);
		await saleInstance.buy(account1 , {from: account1, value: sale.pricePerToken * 1000});
		var account1BalanceAfter = await tokenInstance.balanceOf.call(account1);
		
		assert.equal(account1BalanceAfter.toNumber(), account1BalanceBefore.toNumber() + 1200 , 'balance should be increased');

		var account1BalanceBefore = await tokenInstance.balanceOf.call(account1);
		var account2BalanceBefore = await tokenInstance.balanceOf.call(account2);

		await tokenInstance.transfer(account2 , 1200 , {from: account1});
		
		var account1BalanceAfter = await tokenInstance.balanceOf.call(account1);
		var account2BalanceAfter = await tokenInstance.balanceOf.call(account2);

		assert.equal(account1BalanceAfter.toNumber() , account1BalanceBefore.toNumber() - 1200 , 'balance should be reduced');
		assert.equal(account2BalanceAfter.toNumber() , account2BalanceBefore.toNumber() + 1200 , 'balance should be increased');
	});

	it('sale : should allow owner to buy token and transfer those tokens and return back those tokens' , async () => {
		var account1 = owner;
		var account2 = accounts[1];

		var account1BalanceBefore = await tokenInstance.balanceOf.call(account1);
		await saleInstance.setBlockTime(sale.phase1BetweenAt);
		await saleInstance.buy(account1 , {from: account1, value: sale.pricePerToken * 1000});
		var account1BalanceAfter = await tokenInstance.balanceOf.call(account1);
		
		assert.equal(account1BalanceAfter.toNumber(), account1BalanceBefore.toNumber() + 1200 , 'balance should be increased');

		var account1BalanceBefore = await tokenInstance.balanceOf.call(account1);
		var account2BalanceBefore = await tokenInstance.balanceOf.call(account2);

		await tokenInstance.transfer(account2 , 1200 , {from: account1});
		
		var account1BalanceAfter = await tokenInstance.balanceOf.call(account1);
		var account2BalanceAfter = await tokenInstance.balanceOf.call(account2);

		assert.equal(account1BalanceAfter.toNumber() , account1BalanceBefore.toNumber() - 1200 , 'balance should be reduced');
		assert.equal(account2BalanceAfter.toNumber() , account2BalanceBefore.toNumber() + 1200 , 'balance should be increased');

		var account1BalanceBefore = await tokenInstance.balanceOf.call(account1);
		var account2BalanceBefore = await tokenInstance.balanceOf.call(account2);

		await tokenInstance.transfer(account1 , 1200 , {from: account2});
		
		var account1BalanceAfter = await tokenInstance.balanceOf.call(account1);
		var account2BalanceAfter = await tokenInstance.balanceOf.call(account2);

		assert.equal(account1BalanceAfter.toNumber() , account1BalanceBefore.toNumber() + 1200 , 'balance should be reduced');
		assert.equal(account2BalanceAfter.toNumber() , account2BalanceBefore.toNumber() - 1200 , 'balance should be increased');
	});

	it('sale : should allow owner to transfer tokens manually' , async () => {
		var account = owner;
		var units = 1200;

		var balanceStart = await tokenInstance.balanceOf.call(account);

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase1BetweenAt);
		await saleInstance.transferManual(account , units , "" , {from: account});
		var balanceAfter = await tokenInstance.balanceOf.call(account);

		var phase1TokenSold = await saleInstance.phase1TokenSold.call();
		assert.equal(phase1TokenSold.toNumber(), units , 'sold should be increased');
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + units , 'balance should be increased');

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase2BetweenAt);
		await saleInstance.transferManual(account , units * 2 , "" , {from: account});
		var balanceAfter = await tokenInstance.balanceOf.call(account);

		var phase2TokenSold = await saleInstance.phase2TokenSold.call();
		assert.equal(phase2TokenSold.toNumber(), units * 2 , 'sold should be increased');

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase3BetweenAt);
		await saleInstance.transferManual(account , units * 3 , "" , {from: account});
		var balanceAfter = await tokenInstance.balanceOf.call(account);

		var phase3TokenSold = await saleInstance.phase3TokenSold.call();
		assert.equal(phase3TokenSold.toNumber(), units * 3 , 'sold should be increased');

		var totalTokenSold = await saleInstance.totalTokenSold.call();
		assert.equal(totalTokenSold.toNumber(), units * 6 , 'sold should be increased');

		var balanceEnd = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceEnd.toNumber(), balanceStart.toNumber() + (units * 6) , 'balance should be increased');
	});

	it('sale : should allow user to buy token' , async () => {
		var account = accounts[3];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase1BetweenAt);
		await saleInstance.buy(account , {from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + 1200 , 'balance should be increased');		
	});

	it('sale : should allow user to buy token from fallback address' , async () => {
		var account = accounts[3];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase1BetweenAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + 1200 , 'balance should be increased');		
	});

	it('sale : should not allow user to buy token before start of phase 0' , async () => {
		var account = accounts[3];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase1StartAt - day);
		assert_throw(saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000}));
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() , 'balance should not be increased');		
	});

	it('sale : should allow user to buy token in phase 1 in start' , async () => {
		var account = accounts[3];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase1StartAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + 1200 , 'balance should be increased');		
	});

	it('sale : should allow user to buy token in phase 1 in between' , async () => {
		var account = accounts[3];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase1BetweenAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + 1200 , 'balance should be increased');		
	});

	it('sale : should allow user to buy token in phase 1 in end' , async () => {
		var account = accounts[3];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase1EndAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + 1200 , 'balance should be increased');		
	});

	it('sale : should allow user to buy token in phase 2 in start' , async () => {
		var account = accounts[3];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase2StartAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + 1150 , 'balance should be increased');		
	});

	it('sale : should allow user to buy token in phase 2 in between' , async () => {
		var account = accounts[3];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase2BetweenAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + 1150 , 'balance should be increased');		
	});

	it('sale : should allow user to buy token in phase 2 in end' , async () => {
		var account = accounts[3];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase2EndAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + 1150 , 'balance should be increased');		
	});

	it('sale : should allow user to buy token in phase 3 in start' , async () => {
		var account = accounts[3];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase3StartAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + 1100 , 'balance should be increased');		
	});

	it('sale : should allow user to buy token in phase 3 in between' , async () => {
		var account = accounts[3];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase3BetweenAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + 1100 , 'balance should be increased');		
	});

	it('sale : should allow user to buy token in phase 3 in end' , async () => {
		var account = accounts[3];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase3EndAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + 1100 , 'balance should be increased');		
	});

	it('sale : should allow user to buy token in phase 4 in start' , async () => {
		var account = accounts[3];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase4StartAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + 1000 , 'balance should be increased');		
	});

	it('sale : should allow user to buy token in phase 4 in between' , async () => {
		var account = accounts[3];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase4BetweenAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + 1000 , 'balance should be increased');		
	});

	it('sale : should allow user to buy token in phase 4 in end' , async () => {
		var account = accounts[3];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase4EndAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + 1000 , 'balance should be increased');		
	});

	it('sale : should not allow user to buy token after end of phase 4' , async () => {
		var account = accounts[3];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase4EndAt + 1);
		assert_throw(saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000}));
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() , 'balance should not be increased');		
	});

	it('sale : should track token sold for phase 1' , async () => {
		var account = accounts[3];
		var units = 1200;

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase1StartAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + units , 'balance should be increased');		

		var phase1TokenSold = await saleInstance.phase1TokenSold.call();
		assert.equal(phase1TokenSold.toNumber(), units , 'sold should be increased');


		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase1StartAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + units , 'balance should be increased');		

		var phase1TokenSold = await saleInstance.phase1TokenSold.call();
		assert.equal(phase1TokenSold.toNumber(), units * 2 , 'sold should be increased');

		var totalTokenSold = await saleInstance.totalTokenSold.call();
		assert.equal(totalTokenSold.toNumber(), units * 2 , 'total sold should be increased');
	});

	it('sale : should track ether raised for phase 1' , async () => {
		var account = accounts[3];	
		var units = 1200;

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase1StartAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + units , 'balance should be increased');		

		var phase1EtherRaised = await saleInstance.phase1EtherRaised.call();
		assert.equal(phase1EtherRaised.toNumber(), sale.pricePerToken * 1000 , 'raised should be increased');


		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase1StartAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + units , 'balance should be increased');		

		var phase1EtherRaised = await saleInstance.phase1EtherRaised.call();
		assert.equal(phase1EtherRaised.toNumber(), sale.pricePerToken * 1000 * 2 , 'raised should be increased');

		var totalEtherRaised = await saleInstance.totalEtherRaised.call();
		assert.equal(totalEtherRaised.toNumber(), sale.pricePerToken * 1000 * 2 , 'total raised should be increased');
	});

	it('sale : should track token sold for phase 2' , async () => {
		var account = accounts[3];
		var units = 1150;

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase2StartAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + units , 'balance should be increased');		

		var phase2TokenSold = await saleInstance.phase2TokenSold.call();
		assert.equal(phase2TokenSold.toNumber(), units , 'sold should be increased');


		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase2StartAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + units , 'balance should be increased');		

		var phase2TokenSold = await saleInstance.phase2TokenSold.call();
		assert.equal(phase2TokenSold.toNumber(), units * 2 , 'sold should be increased');

		var totalTokenSold = await saleInstance.totalTokenSold.call();
		assert.equal(totalTokenSold.toNumber(), units * 2 , 'total sold should be increased');
	});

	it('sale : should track ether raised for phase 2' , async () => {
		var account = accounts[3];	
		var units = 1150;

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase2StartAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + units , 'balance should be increased');		

		var phase2EtherRaised = await saleInstance.phase2EtherRaised.call();
		assert.equal(phase2EtherRaised.toNumber(), sale.pricePerToken * 1000 , 'raised should be increased');


		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase2StartAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + units , 'balance should be increased');		

		var phase2EtherRaised = await saleInstance.phase2EtherRaised.call();
		assert.equal(phase2EtherRaised.toNumber(), sale.pricePerToken * 1000 * 2 , 'raised should be increased');

		var totalEtherRaised = await saleInstance.totalEtherRaised.call();
		assert.equal(totalEtherRaised.toNumber(), sale.pricePerToken * 1000 * 2 , 'total raised should be increased');
	});

	it('sale : should track token sold for phase 3' , async () => {
		var account = accounts[3];
		var units = 1100;

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase3StartAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + units , 'balance should be increased');		

		var phase3TokenSold = await saleInstance.phase3TokenSold.call();
		assert.equal(phase3TokenSold.toNumber(), units , 'sold should be increased');


		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase3StartAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + units , 'balance should be increased');		

		var phase3TokenSold = await saleInstance.phase3TokenSold.call();
		assert.equal(phase3TokenSold.toNumber(), units * 2 , 'sold should be increased');

		var totalTokenSold = await saleInstance.totalTokenSold.call();
		assert.equal(totalTokenSold.toNumber(), units * 2 , 'total sold should be increased');
	});

	it('sale : should track ether raised for phase 3' , async () => {
		var account = accounts[3];	
		var units = 1100;

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase3StartAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + units , 'balance should be increased');		

		var phase3EtherRaised = await saleInstance.phase3EtherRaised.call();
		assert.equal(phase3EtherRaised.toNumber(), sale.pricePerToken * 1000 , 'raised should be increased');


		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase3StartAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + units , 'balance should be increased');		

		var phase3EtherRaised = await saleInstance.phase3EtherRaised.call();
		assert.equal(phase3EtherRaised.toNumber(), sale.pricePerToken * 1000 * 2 , 'raised should be increased');

		var totalEtherRaised = await saleInstance.totalEtherRaised.call();
		assert.equal(totalEtherRaised.toNumber(), sale.pricePerToken * 1000 * 2 , 'total raised should be increased');
	});

	it('sale : should track token sold for phase 4' , async () => {
		var account = accounts[3];
		var units = 1000;

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase4StartAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + units , 'balance should be increased');		

		var phase4TokenSold = await saleInstance.phase4TokenSold.call();
		assert.equal(phase4TokenSold.toNumber(), units , 'sold should be increased');


		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase4StartAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + units , 'balance should be increased');		

		var phase4TokenSold = await saleInstance.phase4TokenSold.call();
		assert.equal(phase4TokenSold.toNumber(), units * 2 , 'sold should be increased');

		var totalTokenSold = await saleInstance.totalTokenSold.call();
		assert.equal(totalTokenSold.toNumber(), units * 2 , 'total sold should be increased');
	});

	it('sale : should track ether raised for phase 4' , async () => {
		var account = accounts[3];	
		var units = 1000;

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase4StartAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + units , 'balance should be increased');		

		var phase4EtherRaised = await saleInstance.phase4EtherRaised.call();
		assert.equal(phase4EtherRaised.toNumber(), sale.pricePerToken * 1000 , 'raised should be increased');


		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase4StartAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + units , 'balance should be increased');		

		var phase4EtherRaised = await saleInstance.phase4EtherRaised.call();
		assert.equal(phase4EtherRaised.toNumber(), sale.pricePerToken * 1000 * 2 , 'raised should be increased');

		var totalEtherRaised = await saleInstance.totalEtherRaised.call();
		assert.equal(totalEtherRaised.toNumber(), sale.pricePerToken * 1000 * 2 , 'total raised should be increased');
	});

	it('sale : should not allow user to buy more than allocated token in phase 1' , async () => {
		var account = accounts[19];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase1EndAt);
		
		var maxTokenForSale = await saleInstance.maxTokenForSale.call();
		var hardcap = await saleInstance.hardcap.call();
		var phase1Batch = 20000000;
		var phase1Amount = phase1Batch * sale.pricePerToken;

		for(var i = 0 ; true ; i ++) {
			var balance = await getTokenBalance(account);
			var totalEtherRaised = await saleInstance.totalEtherRaised.call();
			var totalTokenSold = await saleInstance.totalTokenSold.call();
			// console.log('Balance ONYX' , i , toFixed(balance) , toFixed(maxTokenForSale) , phase1Batch , toFixed(balance.toNumber() + phase1Batch) , toFixed(totalEtherRaised));

			if((balance.toNumber() + phase1Batch) > maxTokenForSale.toNumber() || (totalTokenSold.toNumber() + phase1Batch) > hardcap.toNumber()) {
				assert_throw(saleInstance.sendTransaction({from: account, value: phase1Amount}));
				break;
			} else {
				await saleInstance.sendTransaction({from: account, value: phase1Amount});
			}
		}
	});

	it('sale : should not allow user to buy more than allocated token in phase 2' , async () => {
		var account = accounts[19];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase2EndAt);
		
		var maxTokenForSale = await saleInstance.maxTokenForSale.call();
		var hardcap = await saleInstance.hardcap.call();
		var phase2Batch = 20000000;
		var phase2Amount = phase2Batch * sale.pricePerToken;

		for(var i = 0 ; true ; i ++) {
			var balance = await getTokenBalance(account);
			var totalEtherRaised = await saleInstance.totalEtherRaised.call();
			var totalTokenSold = await saleInstance.totalTokenSold.call();
			// console.log('Balance ONYX' , i , toFixed(balance) , toFixed(maxTokenForSale) , phase2Batch , toFixed(balance.toNumber() + phase2Batch) , toFixed(totalEtherRaised));

			if((balance.toNumber() + phase2Batch) > maxTokenForSale.toNumber() || (totalTokenSold.toNumber() + phase2Batch) > hardcap.toNumber()) {
				assert_throw(saleInstance.sendTransaction({from: account, value: phase2Amount}));
				break;
			} else {
				await saleInstance.sendTransaction({from: account, value: phase2Amount});
			}
		}
	});

	it('sale : should not allow user to buy more than allocated token in phase 3' , async () => {
		var account = accounts[19];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase3EndAt);
		
		var maxTokenForSale = await saleInstance.maxTokenForSale.call();
		var hardcap = await saleInstance.hardcap.call();
		var phase3Batch = 20000000;
		var phase3Amount = phase3Batch * sale.pricePerToken;

		for(var i = 0 ; true ; i ++) {
			var balance = await getTokenBalance(account);
			var totalEtherRaised = await saleInstance.totalEtherRaised.call();
			var totalTokenSold = await saleInstance.totalTokenSold.call();
			// console.log('Balance ONYX' , i , toFixed(balance) , toFixed(maxTokenForSale) , phase3Batch , toFixed(balance.toNumber() + phase3Batch) , toFixed(totalEtherRaised));

			if((balance.toNumber() + phase3Batch) > maxTokenForSale.toNumber() || (totalTokenSold.toNumber() + phase3Batch) > hardcap.toNumber()) {
				assert_throw(saleInstance.sendTransaction({from: account, value: phase3Amount}));
				break;
			} else {
				await saleInstance.sendTransaction({from: account, value: phase3Amount});
			}
		}
	});

	it('sale : should not allow user to buy more than allocated token in phase 4' , async () => {
		var account = accounts[19];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase4EndAt);
		
		var maxTokenForSale = await saleInstance.maxTokenForSale.call();
		var hardcap = await saleInstance.hardcap.call();
		var phase4Batch = 20000000;
		var phase4Amount = phase4Batch * sale.pricePerToken;

		for(var i = 0 ; true ; i ++) {
			var balance = await getTokenBalance(account);
			var totalEtherRaised = await saleInstance.totalEtherRaised.call();
			var totalTokenSold = await saleInstance.totalTokenSold.call();
			// console.log('Balance ONYX' , i , toFixed(balance) , toFixed(maxTokenForSale) , phase4Batch , toFixed(balance.toNumber() + phase4Batch) , toFixed(totalEtherRaised));

			if((balance.toNumber() + phase4Batch) > maxTokenForSale.toNumber() || (totalTokenSold.toNumber() + phase4Batch) > hardcap.toNumber()) {
				assert_throw(saleInstance.sendTransaction({from: account, value: phase4Amount}));
				break;
			} else {
				await saleInstance.sendTransaction({from: account, value: phase4Amount});
			}
		}
	});

	it('sale : should validate if soft cap is reached' , async () => {
		var account = accounts[3];	
		await saleInstance.setBlockTime(sale.phase3BetweenAt);

		var softcapReachedBefore = await saleInstance.isSoftcapReached.call();
		assert.equal(softcapReachedBefore , false , 'softcap reached should be false');	

		var totalTokenSold = await saleInstance.totalTokenSold.call();
		var softcap = await saleInstance.softcap.call();
		
		var phase3Batch = 20000000;
		var phase3Amount = phase3Batch * sale.pricePerToken;

		for(var i = 0 ; true ; i ++) {
			var balance = await getTokenBalance(account);
			var totalEtherRaised = await saleInstance.totalEtherRaised.call();
			var totalTokenSold = await saleInstance.totalTokenSold.call();

			if((totalTokenSold.toNumber() + phase3Batch) > softcap.toNumber()) {
				await saleInstance.sendTransaction({from: account, value: phase3Amount});
				break;
			} else {
				await saleInstance.sendTransaction({from: account, value: phase3Amount});
			}
		}

		var softcapReachedAfter = await saleInstance.isSoftcapReached.call();
		assert.equal(softcapReachedAfter , true , 'softcap reached should be true');	
	});

	it('sale : should validate if hard cap is reached' , async () => {
		var account = accounts[3];	
		await saleInstance.setBlockTime(sale.phase4BetweenAt);

		var hardcapReachedBefore = await saleInstance.isHardcapReached.call();
		assert.equal(hardcapReachedBefore , false , 'hardcap reached should be false');	

		var totalTokenSold = await saleInstance.totalTokenSold.call();
		var hardcap = await saleInstance.hardcap.call();
		
		var phase4Batch = 20000000;
		var phase4Amount = phase4Batch * sale.pricePerToken;

		for(var i = 0 ; true ; i ++) {
			var balance = await getTokenBalance(account);
			var totalEtherRaised = await saleInstance.totalEtherRaised.call();
			var totalTokenSold = await saleInstance.totalTokenSold.call();

			if((totalTokenSold.toNumber() + phase4Batch) > hardcap.toNumber()) {
				var hardcapBatch = hardcap.toNumber() - totalTokenSold.toNumber();
				if(hardcapBatch) {
					await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * hardcapBatch});
				}	
				break;
			} else {
				await saleInstance.sendTransaction({from: account, value: phase4Amount});
			}
		}

		var hardcapReachedAfter = await saleInstance.isHardcapReached.call();
		assert.equal(hardcapReachedAfter , true , 'hardcap reached should be true');	
	});

	it('sale : should allow owner to change wallet' , async () => {
		var walletBefore = await saleInstance.wallet.call();
		assert.equal(walletBefore , wallet , 'wallet should be set');

		await saleInstance.setWallet(accounts[15]);
		
		var walletAfter = await saleInstance.wallet.call();
		assert.equal(walletAfter , accounts[15] , 'wallet should be updated');
	});

	it('sale : should allow owner to change teamWallet' , async () => {
		var teamWalletBefore = await saleInstance.teamWallet.call();
		assert.equal(teamWalletBefore , teamWallet , 'teamWallet should be set');

		await saleInstance.setTeamWallet(accounts[15]);
		
		var teamWalletAfter = await saleInstance.teamWallet.call();
		assert.equal(teamWalletAfter , accounts[15] , 'teamWallet should be updated');
	});

	it('sale : should allow owner to change marketWallet' , async () => {
		var marketWalletBefore = await saleInstance.marketWallet.call();
		assert.equal(marketWalletBefore , marketWallet , 'marketWallet should be set');

		await saleInstance.setMarketWallet(accounts[15]);
		
		var marketWalletAfter = await saleInstance.marketWallet.call();
		assert.equal(marketWalletAfter , accounts[15] , 'marketWallet should be updated');
	});

	it('sale : should allow owner to withdraw ether' , async () => {
		var account = accounts[15];
		await saleInstance.setBlockTime(sale.phase4BetweenAt);	
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 10000000});

		var wallet = await saleInstance.wallet.call();
		
		var walletBalanceBefore = await getBalance(wallet);
		var saleBalanceBefore = await getBalance(saleInstance.address);

		await saleInstance.withdrawEther({from: owner});
		
		var walletBalanceAfter = await getBalance(wallet);
		var saleBalanceAfter = await getBalance(saleInstance.address);

		assert.equal(walletBalanceAfter.toNumber() , walletBalanceBefore.toNumber() + saleBalanceBefore.toNumber() , 'balance should be updated');
		assert.equal(saleBalanceAfter.toNumber() , 0 , 'balance should be updated');
	});

	it('sale : should allow owner to withdraw tokens after sale end' , async () => {
		var account = accounts[15];
		await saleInstance.setBlockTime(sale.phase4BetweenAt);	
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 10000000});
		await saleInstance.setBlockTime(sale.phase4EndAt + 1);	

		var wallet = await saleInstance.wallet.call();
		var teamWallet = await saleInstance.teamWallet.call();
		var marketWallet = await saleInstance.marketWallet.call();

		var teamTokens = await saleInstance.teamTokens.call();
		var marketTokens = await saleInstance.marketTokens.call();
		
		var walletBalanceBefore = await getTokenBalance(wallet);
		var teamWalletBalanceBefore = await getTokenBalance(teamWallet);
		var marketWalletBalanceBefore = await getTokenBalance(marketWallet);
		var saleBalanceBefore = await getTokenBalance(saleInstance.address);

		await saleInstance.withdrawToken({from: owner});
		
		var walletBalanceAfter = await getTokenBalance(wallet);
		var teamWalletBalanceAfter = await getTokenBalance(teamWallet);
		var marketWalletBalanceAfter = await getTokenBalance(marketWallet);
		var saleBalanceAfter = await getTokenBalance(saleInstance.address);

		var maxTokenForSale = await saleInstance.maxTokenForSale.call();
		var totalTokenSold = await saleInstance.totalTokenSold.call();

		assert.equal(saleBalanceAfter.toNumber() , 0 , 'balance should be updated');
		assert.equal(teamWalletBalanceAfter.toNumber() , teamWalletBalanceBefore.toNumber() + teamTokens.toNumber() , 'team wallet balance should be updated');
		assert.equal(marketWalletBalanceAfter.toNumber() , marketWalletBalanceBefore.toNumber() + marketTokens.toNumber() , 'market wallet balance should be updated');
		assert.equal(walletBalanceAfter.toNumber() , walletBalanceBefore.toNumber() + saleBalanceBefore.toNumber() - marketTokens.toNumber() - teamTokens.toNumber() , 'market wallet balance should be updated');
		assert.equal(walletBalanceAfter.toNumber() , walletBalanceBefore.toNumber() + maxTokenForSale.toNumber() - totalTokenSold.toNumber() , 'market wallet balance should be updated');
	});

	it('sale : should not allow owner to withdraw tokens before sale end' , async () => {
		var account = accounts[15];
		await saleInstance.setBlockTime(sale.phase4BetweenAt);	
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 10000000});

		var wallet = await saleInstance.wallet.call();
		var teamWallet = await saleInstance.teamWallet.call();
		var marketWallet = await saleInstance.marketWallet.call();

		var teamTokens = await saleInstance.teamTokens.call();
		var marketTokens = await saleInstance.marketTokens.call();
		
		var walletBalanceBefore = await getTokenBalance(wallet);
		var teamWalletBalanceBefore = await getTokenBalance(teamWallet);
		var marketWalletBalanceBefore = await getTokenBalance(marketWallet);
		var saleBalanceBefore = await getTokenBalance(saleInstance.address);

		assert_throw(saleInstance.withdrawToken({from: owner}));
		
		var walletBalanceAfter = await getTokenBalance(wallet);
		var teamWalletBalanceAfter = await getTokenBalance(teamWallet);
		var marketWalletBalanceAfter = await getTokenBalance(marketWallet);
		var saleBalanceAfter = await getTokenBalance(saleInstance.address);
		var totalTokenSold = await saleInstance.totalTokenSold.call();

		assert.equal(saleBalanceAfter.toNumber() , saleBalanceBefore.toNumber() , 'balance should not be updated');
		assert.equal(teamWalletBalanceAfter.toNumber() , teamWalletBalanceBefore.toNumber() , 'balance should not be updated');
		assert.equal(marketWalletBalanceAfter.toNumber() , marketWalletBalanceBefore.toNumber() , 'balance should not be updated');
		assert.equal(walletBalanceAfter.toNumber() , walletBalanceBefore.toNumber() , 'balance should not be updated');
	});

	it('sale : should not allow user to change wallet' , async () => {
		var account = accounts[10];
		
		var walletBefore = await saleInstance.wallet.call();
		assert.equal(walletBefore , wallet , 'wallet should be set');

		assert_throw(saleInstance.setWallet(accounts[15] , {from: account}));
		
		var walletAfter = await saleInstance.wallet.call();
		assert.equal(walletAfter , walletAfter , 'wallet should not be updated');
	});

	it('sale : should not allow user to change teamWallet' , async () => {
		var account = accounts[10];
		
		var teamWalletBefore = await saleInstance.teamWallet.call();
		assert.equal(teamWalletBefore , teamWallet , 'teamWallet should be set');

		assert_throw(saleInstance.setTeamWallet(accounts[15] , {from: account}));
		
		var teamWalletAfter = await saleInstance.teamWallet.call();
		assert.equal(teamWalletAfter , teamWalletAfter , 'teamWallet should not be updated');
	});

	it('sale : should not allow user to change marketWallet' , async () => {
		var account = accounts[10];

		var marketWalletBefore = await saleInstance.marketWallet.call();
		assert.equal(marketWalletBefore , marketWallet , 'marketWallet should be set');

		assert_throw(saleInstance.setMarketWallet(accounts[15] , {from: account}));
		
		var marketWalletAfter = await saleInstance.marketWallet.call();
		assert.equal(marketWalletAfter , marketWalletAfter , 'marketWallet should not be updated');
	});

	it('sale : should not allow user to withdraw ether' , async () => {
		var account = accounts[15];
		
		await saleInstance.setBlockTime(sale.phase4BetweenAt);	
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 10000000});

		var wallet = await saleInstance.wallet.call();
		
		var walletBalanceBefore = await getBalance(wallet);
		var saleBalanceBefore = await getBalance(saleInstance.address);

		assert_throw(saleInstance.withdrawEther({from: account}));
		
		var walletBalanceAfter = await getBalance(wallet);
		var saleBalanceAfter = await getBalance(saleInstance.address);

		assert.equal(walletBalanceAfter.toNumber() , walletBalanceBefore.toNumber() , 'balance should not be updated');
		assert.equal(saleBalanceAfter.toNumber() , saleBalanceBefore.toNumber() , 'balance should not be updated');
	});

	it('sale : should close the sale contract' , async () => {
		var closeBefore = await saleInstance.isClose.call();
		assert.equal(closeBefore , false , 'should not be closed');

		await saleInstance.close({from: owner});	

		var closeAfter = await saleInstance.isClose.call();
		assert.equal(closeAfter , true , 'should be closed');
	});

	it('sale : should not allow to buy when closed' , async () => {
		await saleInstance.close({from: owner});	
		var account = accounts[3];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase1StartAt);
		assert_throw(saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000}));
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() , 'balance should not be increased');		
	});

	it('sale : should pause the sale contract' , async () => {
		var pauseBefore = await saleInstance.isPaused.call();
		assert.equal(pauseBefore , false , 'should not be paused');
		
		await saleInstance.pause({from: owner});	

		var pauseAfter = await saleInstance.isPaused.call();
		assert.equal(pauseAfter , true , 'should be paused');
	});

	it('sale : should resume the sale contract' , async () => {
		var pauseBefore = await saleInstance.isPaused.call();
		assert.equal(pauseBefore , false , 'should not be paused');
		
		await saleInstance.pause({from: owner});	

		var pauseAfter = await saleInstance.isPaused.call();
		assert.equal(pauseAfter , true , 'should be paused');		

		var pauseBefore = await saleInstance.isPaused.call();
		assert.equal(pauseBefore , true , 'should not be paused');
		
		await saleInstance.resume({from: owner});	

		var pauseAfter = await saleInstance.isPaused.call();
		assert.equal(pauseAfter , false , 'should be paused');		
	});

	it('sale : should not allow to buy when paused' , async () => {
		await saleInstance.pause({from: owner});	
		var account = accounts[3];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase1StartAt);
		assert_throw(saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000}));
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() , 'balance should not be increased');		
	});

	it('sale : should not allow to buy when resumed' , async () => {
		await saleInstance.pause({from: owner});	
		await saleInstance.resume({from: owner});
		var account = accounts[3];

		var balanceBefore = await tokenInstance.balanceOf.call(account);
		await saleInstance.setBlockTime(sale.phase1StartAt);
		await saleInstance.sendTransaction({from: account, value: sale.pricePerToken * 1000});
		var balanceAfter = await tokenInstance.balanceOf.call(account);
		
		assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + 1200 , 'balance should be increased');		
	});
});
