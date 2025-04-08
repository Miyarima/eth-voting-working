const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VotingProgram", function () {
  let voting;
  let owner;
  let addr1;
  let addr2;

  before(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const Voting = await ethers.getContractFactory("Voting_program");
    voting = await Voting.deploy(["Alice", "Bob", "Charlie"]);
    await voting.waitForDeployment();
  });

  it("Should initialize with correct candidates", async function () {
    const candidates = await voting.getCandiates();
    expect(candidates.length).to.equal(3);
    expect(candidates[0].name).to.equal("Alice");
    expect(candidates[1].name).to.equal("Bob");
    expect(candidates[2].name).to.equal("Charlie");
  });

  it("Should allow voting and prevent double voting", async function () {
    await voting.connect(addr1).vote(0);
    const candidatesAfterVote = await voting.getCandiates();
    expect(candidatesAfterVote[0].voteCount).to.equal(1);
    
    await expect(voting.connect(addr1).vote(1))
      .to.be.revertedWith("You have already voted.");
  });

  it("Should reject invalid candidate index", async function () {
    await expect(voting.connect(addr2).vote(99))
      .to.be.revertedWith("Invalid candidate index.");
  });
});

describe("Mass Voting Simulation", function () {
  let voting;
  const VOTER_COUNT = 1000;
  const CANDIDATES = ["Socialdemokraterna", "Sverigedemokrater", "Vänsterpartiet", "Moderaterna", "Centerpartiet", "Kristdemokraterna", "Liberalerna"];
  const candidateVotes = new Array(CANDIDATES.length).fill(0);

  before(async function () {
    this.timeout(60000); // 60 second timeout
    
    const Voting = await ethers.getContractFactory("Voting_program");
    voting = await Voting.deploy(CANDIDATES);
    await voting.waitForDeployment();
  });

  it("Should handle 1000 voters", async function () {
    // Generate 1000 test wallets
    const wallets = [];
    for (let i = 0; i < VOTER_COUNT; i++) {
      wallets.push(ethers.Wallet.createRandom().connect(ethers.provider));
    }

    // Fund the wallets (each needs a small amount of ETH)
    const [owner] = await ethers.getSigners();
    for (const wallet of wallets) {
      await owner.sendTransaction({
        to: wallet.address,
        value: ethers.parseEther("0.01") // 0.01 ETH per voter
      });
    }

    // Simulate voting
    for (let i = 0; i < VOTER_COUNT; i++) {
      const candidateIndex = Math.floor(Math.random() * CANDIDATES.length);
      await voting.connect(wallets[i]).vote(candidateIndex);
      candidateVotes[candidateIndex]++;
    }

    // Verify results
    const finalCandidates = await voting.getCandiates();
    
    console.log("\nVoting Results:");
    finalCandidates.forEach((candidate, index) => {
      console.log(`${candidate.name}: ${candidate.voteCount} votes`);
      expect(candidate.voteCount).to.equal(candidateVotes[index]);
    });
  });
});
