pragma solidity ^0.6.8;

import "./libraries/SafeMath.sol";
import "./libraries/VRFConsumerBase.sol";
import "./KETH.sol";

contract KingDice is VRFConsumerBase {

    // Ownership and control-related
    address private owner;
    KETH internal TokenInterface;
    
    bytes32 internal keyHash;
    uint internal fee;

    constructor() 
        VRFConsumerBase(
            0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9, // VRF Coordinator
            0xa36085F69e2889c224210F603D836748e7dC0088  // LINK Token
        ) public {
        owner = msg.sender;
        
        keyHash = 0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4;
        fee = 0.1 * 10 ** 18; // 0.1 LINK
    }

    modifier onlyOwner {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    function setTokenAddress(address payable _address) external onlyOwner {
        TokenInterface = KETH(_address);
    }

    // Game-related

    struct Details {
        address payable sender;
        uint choice;
        uint totalChoices;
        uint bid;
        uint randomNumber;
        bool success;
        bool fulfilled;
        bool cancelled;
    }

    mapping(bytes32 => Details) public requestDetails;

    event Request (
        address indexed sender,
        bytes32 requestId
    );

    function maxBid() public view returns (uint) {
        return address(TokenInterface).balance.mul(49).div(99);
    }

    function choices(uint bid) public view returns (uint numberOfChoices) {
        require(bid > 0, "No bid sent");
        require(maxBid() > bid, "Bid exceeds maximum");

        uint numerator = (address(TokenInterface).balance.add(bid.mul(49))).mul(2);
        uint denominator = address(TokenInterface).balance.sub(bid);

        return numerator.div(denominator);
    }

    function roll(uint choice) public payable {
        require(LINK.balanceOf(msg.sender) >= fee, "Not enough LINK funds");
        require(LINK.allowance(msg.sender, address(this)) >= fee, "Not enough LINK allowance");
        LINK.transferFrom(msg.sender, address(this), fee);

        uint totalChoices = choices(msg.value);
        require(0 <= choice && choice < totalChoices, "Invalid choice");

        bytes32 requestId = requestRandomness(keyHash, fee, block.number);

        requestDetails[requestId] = Details(
            msg.sender,
            choice,
            totalChoices,
            msg.value,
            0,
            false,
            false,
            false
        );

        emit Request(msg.sender, requestId);
    }

    function fulfillRandomness(bytes32 requestId, uint randomness) internal override {
        Details storage request = requestDetails[requestId]; 
        require(request.sender != address(0), "Request doesn't exist");
        require(request.fulfilled == false, "Request already fulfilled");
        require(request.cancelled == false, "Bid cancelled by player");
        
        request.randomNumber = randomness;
        request.fulfilled = true;
            
        if (request.choice == randomness.mod(request.totalChoices)) {
            request.success = true;
            TokenInterface.payout(request.sender, request.bid);
            request.sender.transfer(request.bid);
        } else {
            address(TokenInterface).transfer(request.bid);
        }
    }
    
    function cancelBid(bytes32 requestId) public {
        Details storage request = requestDetails[requestId]; 
        require(request.sender == msg.sender, "Only sender of existing roll can cancel a bid");
        require(request.fulfilled == false, "Bid already fulfilled");
        require(request.cancelled == false, "Bid already cancelled");
        
        request.cancelled = true;
        request.sender.transfer(request.bid);
    }
}
