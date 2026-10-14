const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment of Attendance smart contract...");

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying from account: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.formatEther(balance)} ETH`);

  const Attendance = await ethers.getContractFactory("Attendance");
  const attendance = await Attendance.deploy();
  await attendance.waitForDeployment();

  const contractAddress = await attendance.getAddress();
  console.log("==================================================");
  console.log("Attendance contract deployed successfully!");
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Deployer Address: ${deployer.address}`);
  console.log("==================================================");
  console.log("Update your .env file with:");
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);
  console.log("==================================================");

  return { attendance, contractAddress };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Deployment failed:", error);
      process.exit(1);
    });
}

module.exports = main;
