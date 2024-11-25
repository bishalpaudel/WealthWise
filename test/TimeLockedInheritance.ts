import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimeLockedInheritance", function () {
  let contract: any;
  let owner: any, beneficiary1: any, beneficiary2: any, other: any;

  beforeEach(async () => {
    const Contract = await ethers.getContractFactory("TimeLockedInheritance");
    contract = await Contract.deploy();
    await contract.waitForDeployment();

    [owner, beneficiary1, beneficiary2, other] = await ethers.getSigners();
  });

  describe("Deposit", function () {
    it("should allow a user to deposit funds", async function () {
      const depositAmount = ethers.parseEther("1");

      await expect(
        contract.connect(owner).deposit({ value: depositAmount })
      )
        .to.emit(contract, "Deposit")
        .withArgs(owner.address, depositAmount);

      const account = await contract.getAccountInfo(owner.address);
      expect(account.balance).to.equal(depositAmount);
    });

    it("should reject deposits of 0 ether", async function () {
      await expect(contract.connect(owner).deposit({ value: 0 })).to.be.revertedWith(
        "Deposit must be greater than 0"
      );
    });
  });

  describe("Add Beneficiaries", function () {
    it("should allow adding beneficiaries", async function () {
      await contract.connect(owner).deposit({ value: ethers.parseEther("1") });

      await expect(
        contract.connect(owner).addBeneficiaries([beneficiary1.address, beneficiary2.address])
      )
        .to.emit(contract, "BeneficiaryAdded")
        .withArgs(owner.address, beneficiary1.address)
        .and.to.emit(contract, "BeneficiaryAdded")
        .withArgs(owner.address, beneficiary2.address);

      const account = await contract.getAccountInfo(owner.address);
      expect(account.beneficiaries).to.include(beneficiary1.address);
      expect(account.beneficiaries).to.include(beneficiary2.address);
    });

    it("should reject adding no beneficiaries", async function () {
      await expect(
        contract.connect(owner).addBeneficiaries([])
      ).to.be.revertedWith("No addresses to add");
    });

    it("should reject adding invalid addresses", async function () {
      await expect(
        contract.connect(owner).addBeneficiaries([ethers.ZeroAddress])
      ).to.be.revertedWith("Invalid address");
    });

    it("should not add duplicate beneficiaries", async function () {
      await contract.connect(owner).addBeneficiaries([beneficiary1.address]);

      await contract.connect(owner).addBeneficiaries([beneficiary1.address]); // Re-adding same address
      const account = await contract.getAccountInfo(owner.address);
      expect(account.beneficiaries.length).to.equal(1);
    });
  });

  describe("Withdraw", function () {
    it("should allow a depositor to withdraw funds", async function () {
      const depositAmount = ethers.parseEther("2");
      const withdrawAmount = ethers.parseEther("0.1");

      await contract.connect(owner).deposit({ value: depositAmount });

      await expect(contract.connect(owner).withdraw(withdrawAmount))
        .to.emit(contract, "Withdrawal")
        .withArgs(owner.address, withdrawAmount);

      const account = await contract.getAccountInfo(owner.address);
      expect(account.balance).to.equal(ethers.parseEther("1.9"));
    });

    it("should reject withdrawals exceeding the balance", async function () {
      await contract.connect(owner).deposit({ value: ethers.parseEther("1") });

      await expect(
        contract.connect(owner).withdraw(ethers.parseEther("2"))
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Withdraw as Beneficiary", function () {
    it("should allow a beneficiary to withdraw after inactivity period", async function () {
      const depositAmount = ethers.parseEther("2");
      await contract.connect(owner).deposit({ value: depositAmount });

      await contract.connect(owner).addBeneficiaries([beneficiary1.address]);

      // Simulate inactivity period
      await ethers.provider.send("evm_increaseTime", [1825 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        contract.connect(beneficiary1).withdrawAsBeneficiary(owner.address)
      )
        .to.emit(contract, "Withdrawal")
        .withArgs(beneficiary1.address, depositAmount);

      const account = await contract.getAccountInfo(owner.address);
      expect(account.balance).to.equal(0);
    });

    it("should reject beneficiary withdrawal before inactivity period", async function () {
      const depositAmount = ethers.parseEther("1");
      await contract.connect(owner).deposit({ value: depositAmount });
      await contract.connect(owner).addBeneficiaries([beneficiary1.address]);

      await expect(
        contract.connect(beneficiary1).withdrawAsBeneficiary(owner.address)
      ).to.be.revertedWith("Benefactor is still active");
    });

    it("should reject non-beneficiary withdrawals", async function () {
      const depositAmount = ethers.parseEther("1");
      await contract.connect(owner).deposit({ value: depositAmount });

      await ethers.provider.send("evm_increaseTime", [1825 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        contract.connect(other).withdrawAsBeneficiary(owner.address)
      ).to.be.revertedWith("Not an eligible address");
    });
  });

  describe("Get Account Info", function () {
    it("should return correct account information", async function () {
      const depositAmount = ethers.parseEther("3");
      await contract.connect(owner).deposit({ value: depositAmount });
      await contract.connect(owner).addBeneficiaries([beneficiary1.address]);

      const account = await contract.getAccountInfo(owner.address);
      expect(account.balance).to.equal(depositAmount);
      expect(account.beneficiaries).to.include(beneficiary1.address);
    });
  });
});
