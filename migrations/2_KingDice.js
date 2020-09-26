const KingDice = artifacts.require("./KingDice.sol");

module.exports = function(deployer) {
  deployer.deploy(KingDice);
};