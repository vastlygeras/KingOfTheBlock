import React, { Component } from "react";
import KingDiceContract from "./contracts/KingDice.json";
import ERC20Contract from "./contracts/ERC20.json";
import KETHContract from "./contracts/KETH.json";
import getWeb3 from "./getWeb3";
import blockchain from "./blockchain.js";
import Arrow from "./arrow.svg";

import { Heading, Loader, Flex, Box, Card, Input, Button, Pill } from "rimble-ui";

class App extends Component {
  state = { 
    error: false, 
    web3: null, 
    accounts: null, 
    LINK: null, 
    KETH: null,
    KingDice: null,
    maxBid: 0,
    bidColor: "",
    allowance: 0,
    choice: null,
    choicesComponents: [],
    loader: false,
    inputs: {
      from: {
        token: "Ether",
        val: ""
      },
      to: {
        token: "King Ether",
        val: ""
      }
    },
    roll: ""
  };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const LINK = new web3.eth.Contract(
        ERC20Contract.abi, blockchain.addresses.LINK
      );

      const KETH = new web3.eth.Contract(
        KETHContract.abi, blockchain.addresses.KETH
      );

      const KingDice = new web3.eth.Contract(
        KingDiceContract.abi, blockchain.addresses.KingDice
      );

      LINK.defaultChain = "kovan";
      KETH.defaultChain = "kovan";
      KingDice.defaultChain = "kovan";

      KETH.events.allEvents()
      .on("data", event => {
        console.log(event);
        this.setFrom("");
      })
      .on("error", event => {
        console.log(event);
      });

      LINK.events.Approval()
      .on("data", async event => {
        const rawAllowance = await LINK.methods.allowance(accounts[0], blockchain.addresses.KingDice).call();
        const allowance = await web3.utils.fromWei(rawAllowance, "ether");
        this.setState({ allowance, roll: "", loader: false });
      })
      .on("error", event => {
        console.log(event);
      });

      KingDice.events.Request()
      .on("data", async event => {
        this.setState({ choicesComponents: [], choice: null, loader: false, roll: "" });
      })
      .on("error", event => {
        console.log(event);
      });

      const rawAllowance = await LINK.methods.allowance(accounts[0], blockchain.addresses.KingDice).call();
      const allowance = await web3.utils.fromWei(rawAllowance, "ether");
      console.log(allowance);

      const rawMaxBid = await KingDice.methods.maxBid().call();
      const maxBid = await web3.utils.fromWei(rawMaxBid, "ether");

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, LINK, KETH, KingDice, maxBid, allowance });
    } catch (error) {
      // Catch any errors for any of the above operations.
      this.setState({ error: true });
    }
  }

  switchTokens = () => {
    let from = this.state.inputs.from;
    let to = this.state.inputs.to;

    this.setState({
      inputs: {
        from: to,
        to: from
      }
    })
  }

  setFrom = async value => {
    let to = "";

    const number = Number(value);
    if (!isNaN(number)) {
      const priceData = await this.state.KETH.methods.priceVariables().call();
      if (this.state.inputs.from.token === "Ether") {
        const denominator = Number(priceData.ETH);
        if (denominator === 0) {
          to = number;
        } else {
          const numerator = Number(priceData.kETH)*number;
          to = Number(numerator / denominator);
        }
      } else {
        const denominator = Number(priceData.kETH);
        if (denominator === 0) {
          to = number;
        } else {
          const numerator = Number(priceData.ETH)*number;
          to = Number(numerator / denominator);
        }
      }
      if (to === 0) {
        to = "";
      }
  
      this.setState({inputs: {
        from: {
          token: this.state.inputs.from.token,
          val: value
        },
        to: {
          token: this.state.inputs.to.token,
          val: to
        }
      }});
    }
  }

  swap = async () => {
    try {
      const value = await this.state.web3.utils.toWei(this.state.inputs.from.val, "ether");
      if (this.state.inputs.from.token === "Ether") {
        this.state.KETH.methods.buyTokens().send({from: this.state.accounts[0], value});
      } else {
        this.state.KETH.methods.sellTokens(value).send({from: this.state.accounts[0], value});
      }  
    } catch(error) {
      this.setFrom("");
    }
  }

  approveLink = async () => {
    if (!isNaN(Number(this.state.roll))) {
      const roll = this.state.web3.utils.toWei(this.state.roll, "ether");
      this.state.LINK.methods.approve(blockchain.addresses.KingDice, roll).send({from: this.state.accounts[0]});
      this.setState({ loader: true });
    }
  }

  handleRoll = async e => {
    const v = e.target.value;
    this.setState({ roll: v });
    if (this.state.allowance >= 0.1) {
      if (v === "") {
        this.setState({choicesComponents: [], choice: null, bidColor: ""})
      } else if (!isNaN(Number(v)) && Number(v) > 0) {
        const rawMaxBid = await this.state.KingDice.methods.maxBid().call();
        const maxBid = await this.state.web3.utils.fromWei(rawMaxBid, "ether");
        const wei = await this.state.web3.utils.toWei(v, "ether");
        if ((wei - rawMaxBid) < 0) {
          const choices = await this.state.KingDice.methods.choices(wei).call();
          const choicesComponents = [];

          for (var i = 0; i < choices; i++) {
            choicesComponents.push(
              <Box key={i} style={{float: "left"}}>
                <Button.Outline onClick={this.setChoice} id={i}>
                  {i}
                </Button.Outline>
              </Box>
            )
          };

          this.setState({choicesComponents, maxBid, bidColor: "", choice: null});
        } else {
          this.setState({choicesComponents: [], maxBid, choice: null, bidColor: "red"});
        }
      } else {
        this.setState({choicesComponents: [], choice: null, bidColor: ""});
      }
    }
  }

  setChoice = e => {
    e.preventDefault();
    this.setState({choice: e.target.id});
  }

  roll = async () => {
    if (this.state.choice !== null) {
      const value = await this.state.web3.utils.toWei(this.state.roll, "ether");
      this.state.KingDice.methods.roll(this.state.choice).send({from: this.state.accounts[0], value});
      this.setState({ loader: true });
    }
  }

  render() {
    const RollButton = (this.state.allowance >= 0.1) ? 
    <Button onClick={this.roll}>
      Roll
    </Button>
    : 
    <Button onClick={this.approveLink}>
      Approve LINK
    </Button>
    ;

    const infoDisplay = (this.state.allowance >= 0.1) ? 
    <div className="inputLine">
      <Pill color={this.state.bidColor}>
          Max bid: {this.state.maxBid}
      </Pill>
    </div>
    :
    <div className="inputLine">
      <Pill>
          Min LINK needed: 0.1
      </Pill>
    </div>
    ;

    const choicesDisplay = (this.state.choicesComponents.length > 0) ? 
    <Heading as={"h2"}>
      Choices
    </Heading>
    :
    <div></div>
    ;

    const choiceDisplay = (this.state.choice !== null) ? 
    <Pill color="red">
      {this.state.choice}
    </Pill>
    :
    <div></div>
    ;

    const loaderDisplay = (this.state.loader) ?
    <div>
      <Loader style={{margin: "auto"}} size="40px" />
    </div>
    :
    <div></div>
    ;

    if (this.state.error) {
      return (
        <div>
          <div className="centered">
            <Heading as={"h1"}>Boo...</Heading>
            <Heading as={"h4"}>Sorry, king. Something has gone wrong on our side. <span role="img" aria-label="disappointed">😞</span></Heading>
            <Heading as={"h4"}>This may be due to an internal error.</Heading>            
            <Heading as={"h4"}>Make sure that you are connecting on the Kovan testnet and that you are using <a href="https://metamask.io/">MetaMask</a>.</Heading>            
          </div>
        </div>
        );
    } else if (!this.state.web3) {
      return (
      <div>
        <div className="centered">
          <Heading as={"h1"}>King of the Block</Heading>
          <Heading as={"h4"}>Wait a minute, king. Connecting to your wallet. <span role="img" aria-label="crown">👑</span></Heading>
          <Loader color="red" size="80px"/>
        </div>
      </div>
      )
    }
    return (
      <div>
        <div className="blur">
        </div>
        <div className="App">
          <Heading as={"h1"}>King of the Block</Heading>
          <Flex className="normalText">
            <Box width={1/2}>
              <Card className="slightlyPadded" style={{minWidth: "360px"}}>
                <Heading as={"h2"}>
                  Trade King Ether
                </Heading>
                <div className="inputLine">
                  <Input
                    type="text"
                    placeholder="0.0"
                    value={this.state.inputs.from.val}
                    onChange={e => {
                      this.setFrom(e.target.value);
                    }}
                  />
                  &nbsp;&nbsp;
                  <Pill>
                    {this.state.inputs.from.token}
                  </Pill>
                </div>
                <div className="arrowContainer">
                  <img onClick={this.switchTokens} src={Arrow} alt="arrow" />
                </div>
                <div className="inputLine">
                  <Input
                    type="text"
                    placeholder="0.0"
                    value={this.state.inputs.to.val}
                    disabled
                  />
                  &nbsp;&nbsp;
                  <Pill>
                    {this.state.inputs.to.token}
                  </Pill>
                </div>
                <br />
                <Button onClick={this.swap}>
                  Swap
                </Button>
              </Card>
            </Box>
            <Box width={1/2}>
              <Card className="slightlyPadded" style={{minWidth: "450px"}}>
                <Heading as={"h2"}>
                  Bid
                </Heading>
                <div className="inputLine">
                  <Input
                    type="text"
                    placeholder="0.0"
                    value={this.state.roll}
                    onChange={this.handleRoll}
                  />
                  &nbsp;&nbsp;
                  {RollButton}
                  &nbsp;&nbsp;
                  {choiceDisplay}
                </div>
                <br />
                {infoDisplay}
                <br />
                {loaderDisplay}
              </Card>
            </Box>
          </Flex>
          {choicesDisplay}
          {this.state.choicesComponents}
        </div>
      </div>
    );
  }
}

export default App;
