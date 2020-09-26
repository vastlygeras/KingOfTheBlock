pragma solidity ^0.6.8;

import "./libraries/SafeMath.sol";
import "./libraries/ERC20.sol";

contract KETH is ERC20 {
    using SafeMath for uint;

    // Ownership and control-related
    
    address private owner;
    mapping(address => bool) private AuthorizedGames;

    constructor() ERC20("King Ether", "KETH") public {
        owner = msg.sender;
    }

    modifier onlyOwner {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyAuthorizedGame {
        require(AuthorizedGames[msg.sender] == true, "Only an authorized game can call this function");
        _;
    }
    
    function setOwner(address payable _owner) external onlyOwner {
        owner = _owner;
    }

    function authorizeGame(address payable _game) external onlyOwner {
        AuthorizedGames[_game] = !AuthorizedGames[_game];
    }

    // Game-related

        // Receive liquidity from games
    receive() external payable {}

        // Provide liquidity to games
    function payout(address payable winner, uint amount) external onlyAuthorizedGame {
        require(address(this).balance >= amount, "Insufficient Ether in KETH contract");
        winner.transfer(amount);
    }

    // ERC20-related
    function priceVariables() external view returns (uint ETH, uint kETH) {
        return (address(this).balance, totalSupply());
    }
    
    function buyTokens() external payable {
        require(msg.value > 0, "No Ether sent");
        if (totalSupply() == 0) {
            _mint(msg.sender, msg.value);
        } else {
            _mint(msg.sender, msg.value.mul(totalSupply()).div(address(this).balance.sub(msg.value)));
        }
    }
    
    function sellTokens(uint amount) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient King Ether balance");

        uint liquidityWithdrawable = amount.mul(address(this).balance).div(totalSupply());
        _burn(msg.sender, amount);

        msg.sender.transfer(liquidityWithdrawable);
    }
}
