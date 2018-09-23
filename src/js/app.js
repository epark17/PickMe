App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  hasVoted: false,

  init: () => {
    return App.initWeb3();
  },

  initWeb3: () => {
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }
    return App.initContract();
  },

  initContract: () => {
    $.getJSON("Election.json", function (election) {
      App.contracts.Election = TruffleContract(election);
      App.contracts.Election.setProvider(App.web3Provider);
      App.listenForEvents();
      return App.render();
    });
  },

  listenForEvents: () => {
    App.contracts.Election.deployed()
      .then((instance) => {
        instance.votedEvent({}, {
          fromBlock: 0,
          toBlock: 'latest'
        })
          .watch((error, event) => {
            console.log("event triggered", event)
            App.render();
          });
      });
  },

  render: () => {
    let electionInstance;
    let loader = $("#loader");
    let content = $("#content");

    loader.show();
    content.hide();

    web3.eth.getCoinbase((err, account) => {
      if (err === null) {
        App.account = account;
        $("#accountAddress").html("Current Account: " + account);
      }
    });

    App.contracts.Election.deployed()
      .then((instance) => {
        electionInstance = instance;
        return electionInstance.candidatesCount();
      })
      .then((candidatesCount) => {
        let candidatesResults = $("#candidatesResults");
        candidatesResults.empty();

        let candidatesSelect = $('#candidatesSelect');
        candidatesSelect.empty();

        for (let i = 1; i <= candidatesCount; i++) {
          electionInstance.candidates(i)
            .then((candidate) => {
              let id = candidate[0];
              let name = candidate[1];
              let voteCount = candidate[2];
              let candidateTemplate = "<tr><th>" + id + "</th><td>" + name + "</td><td>" + voteCount + "</td></tr>"
              candidatesResults.append(candidateTemplate);
              let candidateOption = "<option value='" + id + "' >" + name + "</ option>"
              candidatesSelect.append(candidateOption);
            });
        }
        return electionInstance.voters(App.account);
      })
      .then((hasVoted) => {
        if (hasVoted) {
          $('form').hide();
        }
        loader.hide();
        content.show();
      })
      .catch((error) => {
        console.error(error);
      });
  },

  castVote: () => {
    let candidateId = $('#candidatesSelect').val();
    App.contracts.Election.deployed()
      .then((instance) => {
        return instance.vote(candidateId, { from: App.account });
      })
      .then((result) => {
        $("#content").hide();
        $("#loader").show();
      })
      .catch((error) => {
        console.error(error);
      });
  }
};

$(() => {
  $(window).load(() => {
    App.init();
  });
});
