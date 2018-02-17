pragma solidity ^0.4.18;

import "./../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Timestamped.sol";
import "./OnyxToken.sol";

/**
* @title OnyxTokenSale
* @dev This is ICO Contract. 
* This class accepts the token address as argument to talk with contract.
* Once contract is deployed, funds are transferred to ICO smart contract address and then distributed with investor.
* Sending funds to this ensures that no more than desired tokens are sold.
*/
contract OnyxTokenSale is Ownable, Timestamped {
	using SafeMath for uint256;

	// The token being sold, this holds reference to main token contract
	OnyxToken public token;

	// ether to usd price 
	uint256 public ethToUsd = 900;

	// usd to wei price
	uint256 public usdToWei = 1 ether / ethToUsd;

	// amount of token to be sold on sale
	uint256 public maxTokenForSale = 720000000;

	// price per token in ether
	uint256 public pricePerToken = 1 * usdToWei / 100;

	// soft cap in wei 
	uint256 public softcap = 400000000; 

	// hard cap in wei 
	uint256 public hardcap = 720000000; 

	// phase variables
	uint256 public phase1StartAt = 1519344000; // Monday, 23 February 2018 00:00:00
	uint256 public phase1EndAt = phase1StartAt + 7 days - 1; // Sunday, 1 March 2018 23:59:59
	uint256 public phase1Bonus = 20;
	uint256 public phase1TokenSold = 0;
	uint256 public phase1EtherRaised = 0;

	uint256 public phase2StartAt = phase1EndAt + 1; // Monday, 2 March 2018 00:00:00
	uint256 public phase2EndAt = phase2StartAt + 7 days - 1; // Sunday, 7 March 2018 23:59:59
	uint256 public phase2Bonus = 15;
	uint256 public phase2TokenSold = 0;
	uint256 public phase2EtherRaised = 0;

	uint256 public phase3StartAt = phase2EndAt + 1; // Monday, 8 March 2018 00:00:00
	uint256 public phase3EndAt = phase3StartAt + 7 days - 1; // Sunday, 15 March 2018 23:59:59
	uint256 public phase3Bonus = 10;
	uint256 public phase3TokenSold = 0;
	uint256 public phase3EtherRaised = 0;

	uint256 public phase4StartAt = phase3EndAt + 1; // Monday, 16 March 2018 00:00:00
	uint256 public phase4EndAt = phase4StartAt + 7 days - 1; // Sunday, 23 March 2018 23:59:59
	uint256 public phase4Bonus = 0;
	uint256 public phase4TokenSold = 0;
	uint256 public phase4EtherRaised = 0;

	// amount of token sold so far
	uint256 public totalTokenSold;

	// amount of ether raised in sale
	uint256 public totalEtherRaised;

	// ether raised per wallet
	mapping(address => uint256) public etherRaisedPerWallet;

	// is contract close and ended
	bool public isClose = false;

	// is contract paused
	bool public isPaused = false;

	// withdrawal wallet
	address public wallet;

	// team wallet 
	address public teamWallet;
	uint256 public teamTokens = 0; // 100000000

	// market wallet
	address public marketWallet;
	uint256 public marketTokens = 0; // 180000000

	// token purchsae event
	event TokenPurchase(address indexed _purchaser, address indexed _beneficiary, uint256 _value, uint256 _amount, uint256 _timestamp);

	// manual transfer by admin for external purchase
	event TransferManual(address indexed _from, address indexed _to, uint256 _value, string _message);

	// ether withdraw event
	event EtherWithdraw(address indexed _wallet, uint256 _value);

	// token withdraw event
	event TokenWithdraw(address indexed _wallet, uint256 _value);

	/**
	* @dev Constructor that initializes token contract with token address in parameter
	*/
	function OnyxTokenSale(address _token, address _wallet, address _teamWallet, address _marketWallet) public {
		// set token
		token = OnyxToken(_token);

		// set wallet
		wallet = _wallet;
		teamWallet = _teamWallet;
		marketWallet = _marketWallet;
	}

	/**
	 * @dev Function that set eth to usd price
	 *
	 * @param _ethToUsd eth to usd price
	 */
	function setEthToUsd(uint256 _ethToUsd) onlyOwner public {
		// ether to usd price
		ethToUsd = _ethToUsd;

		// usd to wei factor
		usdToWei = 1 ether / ethToUsd;

		// set price per token
		pricePerToken = 1 * usdToWei / 100;
	}

	/**
	 * @dev Function that validates if the purchase is valid by verifying the parameters
	 *
	 * @param value Amount of ethers sent
	 * @param amount Total number of tokens user is trying to buy.
	 *
	 * @return checks various conditions and returns the bool result indicating validity.
	 */
	function validate(uint256 value, uint256 amount) internal constant returns (bool) {
		// check if timestamp and amount is falling in the range
		bool validTimestamp = false;
		bool validAmount = false;

		// check if phase 1 is running	
		if(phase1StartAt <= getBlockTime() && getBlockTime() <= phase1EndAt) {
			// check if tokens is falling in timerange
			validTimestamp = true;

			// check if token amount is falling in limit
			validAmount = maxTokenForSale.sub(totalTokenSold) >= amount;
		}

		// check if phase 2 is running	
		else if(phase2StartAt <= getBlockTime() && getBlockTime() <= phase2EndAt) {
			// check if tokens is falling in timerange
			validTimestamp = true;

			// check if token amount is falling in limit
			validAmount = maxTokenForSale.sub(totalTokenSold) >= amount;
		}

		// check if phase 3 is running	
		else if(phase3StartAt <= getBlockTime() && getBlockTime() <= phase3EndAt) {
			// check if tokens is falling in timerange
			validTimestamp = true;

			// check if token amount is falling in limit
			validAmount = maxTokenForSale.sub(totalTokenSold) >= amount;
		}

		// check if phase 4 is running	
		else if(phase4StartAt <= getBlockTime() && getBlockTime() <= phase4EndAt) {
			// check if tokens is falling in timerange
			validTimestamp = true;

			// check if token amount is falling in limit
			validAmount = maxTokenForSale.sub(totalTokenSold) >= amount;
		}

		// check if value of the ether is valid
		bool validValue = value != 0;

		// check if the tokens available in contract for sale
		bool validToken = amount != 0;

		// check if hardcap reached
		bool validCap = hardcap.sub(totalTokenSold) >= amount;

		// validate if all conditions are met
		return validTimestamp && validAmount && validValue && validToken && validCap && !isClose && !isPaused;
	}

	function calculate(uint256 value) internal constant returns (uint256) {
		uint256 amount = 0;
			
		// check if phase 1 is running	
		if(phase1StartAt <= getBlockTime() && getBlockTime() <= phase1EndAt) {
			// calculate the amount of tokens
			amount = value.div(pricePerToken);
			amount = amount.add(amount.mul(phase1Bonus).div(100));
		}

		// check if phase 2 is running	
		else if(phase2StartAt <= getBlockTime() && getBlockTime() <= phase2EndAt) {
			// calculate the amount of tokens
			amount = value.div(pricePerToken);
			amount = amount.add(amount.mul(phase2Bonus).div(100));
		}

		// check if phase 3 is running	
		else if(phase3StartAt <= getBlockTime() && getBlockTime() <= phase3EndAt) {
			// calculate the amount of tokens
			amount = value.div(pricePerToken);
			amount = amount.add(amount.mul(phase3Bonus).div(100));
		}

		// check if phase 4 is running	
		else if(phase4StartAt <= getBlockTime() && getBlockTime() <= phase4EndAt) {
			// calculate the amount of tokens
			amount = value.div(pricePerToken);
			amount = amount.add(amount.mul(phase4Bonus).div(100));
		}

		return amount;
	}

	function update(uint256 value, uint256 amount) internal returns (bool) {

		// update the state to log the sold tokens and raised ethers.
		totalTokenSold = totalTokenSold.add(amount);
		totalEtherRaised = totalEtherRaised.add(value);
		etherRaisedPerWallet[msg.sender] = etherRaisedPerWallet[msg.sender].add(value);

		// check if phase 1 is running	
		if(phase1StartAt <= getBlockTime() && getBlockTime() <= phase1EndAt) {
			// add tokens to phase1 counts
			phase1TokenSold = phase1TokenSold.add(amount);
			phase1EtherRaised = phase1EtherRaised.add(value);
		}

		// check if phase 2 is running	
		else if(phase2StartAt <= getBlockTime() && getBlockTime() <= phase2EndAt) {
			// add tokens to phase2 counts
			phase2TokenSold = phase2TokenSold.add(amount);
			phase2EtherRaised = phase2EtherRaised.add(value);
		}

		// check if phase 3 is running	
		else if(phase3StartAt <= getBlockTime() && getBlockTime() <= phase3EndAt) {
			// add tokens to phase3 counts
			phase3TokenSold = phase3TokenSold.add(amount);
			phase3EtherRaised = phase3EtherRaised.add(value);
		}

		// check if phase 4 is running	
		else if(phase4StartAt <= getBlockTime() && getBlockTime() <= phase4EndAt) {
			// add tokens to phase4 counts
			phase4TokenSold = phase4TokenSold.add(amount);
			phase4EtherRaised = phase4EtherRaised.add(value);
		}
	}

	/**
	 * @dev Default fallback method which will be called when any ethers are sent to contract
	 */
	function() public payable {
		buy(msg.sender);
	}

	/**
	 * @dev Function that is called either externally or by default payable method
	 *
	 * @param beneficiary who should receive tokens
	 */
	function buy(address beneficiary) public payable {
		require(beneficiary != address(0));

		// amount of ethers sent
		uint256 value = msg.value;

		// calculate tokens
		uint256 tokens = calculate(value);

		// validate the purchase
		require(validate(value , tokens));

		// update current state 
		update(value , tokens);
		
		// transfer tokens from contract balance to beneficiary account. calling ERC20 method
		token.transfer(beneficiary, tokens);
		
		// log event for token purchase
		TokenPurchase(msg.sender, beneficiary, value, tokens, now);
	}

	/**
	* @dev transmit token for a specified address. 
	* This is owner only method and should be called using web3.js if someone is trying to buy token using bitcoin or any other altcoin.
	* 
	* @param _to The address to transmit to.
	* @param _value The amount to be transferred.
	* @param _message message to log after transfer.
	*/
	function transferManual(address _to, uint256 _value, string _message) onlyOwner public returns (bool) {
		require(_to != address(0));

		// transfer tokens manually from contract balance
		token.transfer(_to , _value);


		// update the state to log the sold tokens and raised ethers.
		totalTokenSold = totalTokenSold.add(_value);

		// check if phase 1 is running	
		if(phase1StartAt <= getBlockTime() && getBlockTime() <= phase1EndAt) {
			// add tokens to phase1 counts
			phase1TokenSold = phase1TokenSold.add(_value);
		}

		// check if phase 2 is running	
		else if(phase2StartAt <= getBlockTime() && getBlockTime() <= phase2EndAt) {
			// add tokens to phase2 counts
			phase2TokenSold = phase2TokenSold.add(_value);
		}

		// check if phase 3 is running	
		else if(phase3StartAt <= getBlockTime() && getBlockTime() <= phase3EndAt) {
			// add tokens to phase3 counts
			phase3TokenSold = phase3TokenSold.add(_value);
		}

		// check if phase 4 is running	
		else if(phase4StartAt <= getBlockTime() && getBlockTime() <= phase4EndAt) {
			// add tokens to phase4 counts
			phase4TokenSold = phase4TokenSold.add(_value);
		}

		// log events for manual transfer
		TransferManual(msg.sender, _to, _value, _message);
		
		return true;
	}

	/**
	 * @dev Function that checks if softcap is reached
	 *
	 * @return boolean indicating if softcap reached
	 */
	function isSoftcapReached() public view returns (bool) {
		return totalTokenSold >= softcap ? true : false;
	}

	/**
	 * @dev Function that checks if hardcap is reached
	 *
	 * @return boolean indicating if hardcap reached
	 */
	function isHardcapReached() public view returns (bool) {
		return totalTokenSold >= hardcap ? true : false;
	}

	/**
	* @dev set withdrawal wallet
	* this will set wallet address
	*/	
	function setWallet(address _wallet) onlyOwner public {
		// save wallet address
		wallet = _wallet;
	}

	/**
	* @dev set team wallet
	* this will set wallet address
	*/	
	function setTeamWallet(address _teamWallet) onlyOwner public {
		// save teamWallet address
		teamWallet = _teamWallet;
	}

	/**
	* @dev set market wallet
	* this will set wallet address
	*/	
	function setMarketWallet(address _marketWallet) onlyOwner public {
		// save marketWallet address
		marketWallet = _marketWallet;
	}

	/**
	* @dev withdraw ethers 
	* This will send ether to wallet
	*/	
	function withdrawEther() onlyOwner public {
		// send balance to wallet
		uint256 balance = this.balance; 
		wallet.transfer(balance);

		// log event for ether withdraw
		EtherWithdraw(wallet , balance);
	}

	/**
	* @dev withdraw tokens 
	* This will send token to wallet
	*/	
	function withdrawToken() onlyOwner public {
		require(phase4EndAt < getBlockTime());

		// send balance to team wallet
		token.transfer(teamWallet, teamTokens);
		TokenWithdraw(teamWallet, teamTokens);

		// send balance to market wallet
		token.transfer(marketWallet, marketTokens);
		TokenWithdraw(marketWallet, marketTokens);

		// send remaining balance to wallet
		uint256 balance = token.balanceOf(this); 
		token.transfer(wallet, balance);
		TokenWithdraw(wallet, balance);
	}

	/**
	* @dev close contract 
	* This will mark contract as closed
	*/	
	function close() onlyOwner public {
		// mark the flag to indicate closure of the contract
		isClose = true;
	}

	/**
	* @dev pause contract 
	* This will mark contract as paused
	*/	
	function pause() onlyOwner public {
		// mark the flag to indicate pause of the contract
		isPaused = true;
	}

	/**
	* @dev resume contract 
	* This will mark contract as resumed
	*/	
	function resume() onlyOwner public {
		// mark the flag to indicate resume of the contract
		isPaused = false;
	}
}