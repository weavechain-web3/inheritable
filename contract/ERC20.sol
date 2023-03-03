// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

abstract contract ERC20Basic {
    function totalSupply() virtual public view returns (uint256);
    function balanceOf(address who) virtual public view returns (uint256);
    function transfer(address to, uint256 value) virtual public returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
}

abstract contract ERC20 is ERC20Basic {
    function allowance(address owner, address spender) virtual public view returns (uint256);
    function transferFrom(address from, address to, uint256 value) virtual public returns (bool);
    function approve(address spender, uint256 value) virtual public returns (bool);
	event Approval(
	    address indexed owner,
	    address indexed spender,
	    uint256 value
    );
}
