pragma solidity ^0.4.18;

import "./../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./../node_modules/zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

/**
 * @title OnyxToken
 * @dev ERC20 Token example, where all tokens are pre-assigned to the creator.
 * Note they can later distribute these tokens as they wish using `transfer` and other
 * `StandardToken` functions.
 */
contract OnyxToken is Ownable, StandardToken {

	string public constant name = "OnyxFutures";
	string public constant symbol = "ONYX";
	uint8 public constant decimals = 0;

	uint256 public constant INITIAL_SUPPLY = 1000000000 * (10 ** uint256(decimals));

	/**
	 * @dev Constructor that gives msg.sender all of existing tokens.
	 */
	function OnyxToken() public {
		totalSupply_ = INITIAL_SUPPLY;
		balances[msg.sender] = INITIAL_SUPPLY;
		Transfer(0x0, msg.sender, INITIAL_SUPPLY);
	}
}
