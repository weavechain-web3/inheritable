// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "SafeMath.sol";
import "ERC20.sol";
import "Pausable.sol";
import "Ownable.sol";

contract Inheritance is Pausable, Ownable {

    using SafeMath for uint256;

    address constant TOKEN = 0xf26490E8bdFfa5EBE8625Bafa967560303D802E4;

    ERC20 public token;

    struct Oracle {
        address account;

        uint256 vote;

        string signature;
    }

    mapping(uint => Oracle) public Oracles;

    uint256 public OraclesCount;

    address public creator;

    uint256 public Unlocked = 0;

    event Transfer(address indexed from, address indexed to, uint256 value);

    struct Account {

        uint256 locked;

        uint256 paid;
    }

    mapping(address => Account) accounts;

    constructor() {
        creator = msg.sender;
        token = ERC20(TOKEN);
    }

    function getFeeToken() public view returns (address) {
        return TOKEN;
    }

    function setOracles(address[] calldata _oracles) public onlyOwner {
        require(msg.sender == creator, "not authorized");

        Unlocked = 0;
        OraclesCount = _oracles.length;

        for (uint256 i = 0; i < _oracles.length; i++){
            Oracles[i] = Oracle(_oracles[i], 1, "");
        }
    }

    function vote(string calldata _signature) whenNotPaused public returns (bool success) {
        //TODO: check Dilithium signature in contract?

        uint256 v = 0;
        bool found = false;
        for (uint256 i = 0; i < OraclesCount; i++){
            if (Oracles[i].account == msg.sender) {
                Oracles[i].signature = _signature;
                found = true;
            }
            if (bytes(Oracles[i].signature).length > 0) {
                v = v + 1;
            }
        }
        require(found, "Not allowed to vote");
        if (v >= 2 * OraclesCount / 3) { //configurable threshold
            Unlocked = 1;
        }

        return true;
    }

    function lock(address _receiver, uint256 _value) onlyOwner whenNotPaused public returns (bool success) {
        token.transferFrom(msg.sender, address(this), _value);

        accounts[_receiver].locked = accounts[_receiver].locked.add(_value);

        emit Transfer(msg.sender, address(this), _value);
        return true;
    }

    function withdraw() whenNotPaused public returns (bool success) {
        require(Unlocked > 0, "It's not the time yet");

        uint256 amount = accounts[msg.sender].locked;
        require(amount > 0, "No locked value");


        accounts[msg.sender].locked = accounts[msg.sender].locked.sub(amount);
        token.transferFrom(address(this), msg.sender, amount);
        accounts[msg.sender].paid = accounts[msg.sender].locked.add(amount);

        emit Transfer(address(this), msg.sender, amount);
        return true;
    }
}