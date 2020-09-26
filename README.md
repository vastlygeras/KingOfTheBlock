# KingOfTheBlock
King of the Block is an online casino with its own ERC20 token called King Ether. 

Liquidity providers exchange their Ether for King Ether. The value of King Ether grows proportionally to the growth of the casino's funds. Liquidity providers may sell their King Ether back to the casino at any time.

The casino employs a simple system to add/remove new blockchain games via a call to the smart contract made by the casino owner. The ownership of the casino is currently centralized, but can be entrusted to a DAO as the development of the casino continues.

This showcase project includes a simple game connected to the casino to demonstrate its capabilities, alongside the project.

To view it, create a folder on your own machine and run

`git clone https://github.com/vastlygeras/KingOfTheBlock/`

`cd client`

`npm install`

`npm run start`

Go to `localhost:3000` to view the working React application.

1. A player approves the use of LINK.

2. The player places a bid in Ether in order to double it. 

3. The dApp displays a list of integers to choose from. 

4. The game is designed using mathematical formula to ensure it never runs out of liquidity. So, as the size of the bid increases, the number of integers also increases, until maxing out at 100.

5. When the player rolls the dice, the success or failure of the roll is decided by the Chainlink VRF.

---

The frontend application currently only exists for demonstrative purposes, and is not fit to be used in production.
