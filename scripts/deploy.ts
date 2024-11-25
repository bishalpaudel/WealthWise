import hre from "hardhat";

async function main() {
      const TimeLockedInheritance = await hre.ethers.getContractFactory("TimeLockedInheritance");
      const timeLockedInheritance = await TimeLockedInheritance.deploy();
      await timeLockedInheritance.waitForDeployment();
}

// Run the main function and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
