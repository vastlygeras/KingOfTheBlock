const KETH = artifacts.require("./KETH.sol");

module.exports = function(deployer) {
  deployer.deploy(KETH);
}