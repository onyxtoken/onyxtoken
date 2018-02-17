var OnyxToken = artifacts.require("./OnyxToken.sol");
var OnyxTokenSale = artifacts.require("./OnyxTokenSale.sol");

module.exports = function(deployer , network , accounts) {

	var owner = accounts[0];
	// var wallet = accounts[1];

	// var marketWallet = accounts[2];
	// var teamWallet = accounts[3];

	var wallet = '0xAe39aCA59Ca325279f505dFe348b4E9F391Af170';
	var marketWallet = '0x3dD49972fb532e1208d7e201A74009FE63576ebd';
	var teamWallet = '0x8b9226bA9725D6873F4B3e741f722377cf327E8F';

	var numTeamTokens = 100000000;
	var numMarketTokens = 180000000;

	deployer.deploy(OnyxToken).then(function(){
		OnyxToken.deployed().then(function(tokenInstance) {
			console.log('----------------------------------');
			console.log('Token Instance' , tokenInstance.address);
			console.log('----------------------------------');
			
			deployer.deploy(OnyxTokenSale , tokenInstance.address , wallet, teamWallet , marketWallet).then(function(){
				OnyxTokenSale.deployed().then(async function(saleInstance) {
					
					console.log('----------------------------------');
					console.log('Sale Instance' , saleInstance.address);
					console.log('----------------------------------');
					
					/* transfer tokens to sale contract */
					console.log('--------------------------------------------------------------');
					// get goal	
					var maxTokenForSale = await saleInstance.maxTokenForSale.call();
					console.log('maxTokenForSale: ' + maxTokenForSale.toNumber());
						
					console.log('Transferring to :' +  saleInstance.address , maxTokenForSale.toNumber());	
					var transaction = await tokenInstance.transfer(saleInstance.address , maxTokenForSale);
					console.log('Transfer Txn :' +  transaction.tx);

					// check balance of address to be null
					var balanceOf = await tokenInstance.balanceOf.call(saleInstance.address);
					console.log('Balance of Sale ' + balanceOf.toNumber());
					console.log('--------------------------------------------------------------');

					// /* transfer tokens to saleInstance.address contract */
					// console.log('--------------------------------------------------------------');
					// var teamTokens = await saleInstance.teamTokens.call();
					// console.log('teamTokens: ' + teamTokens.toNumber());

					// console.log('Transferring to :' +  saleInstance.address , teamTokens);	
					// var transaction = await tokenInstance.transfer(saleInstance.address , teamTokens);
					// console.log('Transfer Txn :' +  transaction.tx);
					// console.log('--------------------------------------------------------------');

					// /* transfer tokens to saleInstance.address contract */
					// console.log('--------------------------------------------------------------');
					// var marketTokens = await saleInstance.marketTokens.call();
					// console.log('marketTokens: ' + marketTokens.toNumber());

					// console.log('Transferring to :' +  saleInstance.address , marketTokens);	
					// var transaction = await tokenInstance.transfer(saleInstance.address , marketTokens);
					// console.log('Transfer Txn :' +  transaction.tx);
					// console.log('--------------------------------------------------------------');

					// check balance of address to be null
					var balanceOf = await tokenInstance.balanceOf.call(owner);
					console.log('Balance of Owner ' + balanceOf.toNumber());
					console.log('--------------------------------------------------------------');

					/* transfer tokens to saleInstance.address contract */
					console.log('--------------------------------------------------------------');
					console.log('Transferring to :' +  teamWallet , numTeamTokens);	
					var transaction = await tokenInstance.transfer(teamWallet , numTeamTokens);
					console.log('Transfer Txn :' +  transaction.tx);
					console.log('--------------------------------------------------------------');

					var balanceOf = await tokenInstance.balanceOf.call(teamWallet);
					console.log('Balance of Team Wallet ' + balanceOf.toNumber());
					console.log('--------------------------------------------------------------');

					/* transfer tokens to saleInstance.address contract */
					console.log('--------------------------------------------------------------');
					console.log('Transferring to :' +  marketWallet , numMarketTokens);	
					var transaction = await tokenInstance.transfer(marketWallet , numMarketTokens);
					console.log('Transfer Txn :' +  transaction.tx);
					console.log('--------------------------------------------------------------');

					var balanceOf = await tokenInstance.balanceOf.call(marketWallet);
					console.log('Balance of Market Wallet ' + balanceOf.toNumber());
					console.log('--------------------------------------------------------------');

					// check balance of address to be null
					var balanceOf = await tokenInstance.balanceOf.call(owner);
					console.log('Balance of Owner ' + balanceOf.toNumber());
					console.log('--------------------------------------------------------------');

				});
			});
		});	
	});
};
