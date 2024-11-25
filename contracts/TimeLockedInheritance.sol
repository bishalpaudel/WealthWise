// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;


contract TimeLockedInheritance {
    struct Account {
        uint256 balance;
        uint256 lastActivity;
        address[] beneficiaries;
    }

    mapping(address => Account) private accounts;

    event Deposit(address indexed depositor, uint256 amount);
    event Withdrawal(address indexed withdrawer, uint256 amount);
    event BeneficiaryAdded(address indexed depositor, address indexed beneficiary);

    uint256 constant INACTIVITY_PERIOD = 1825 days; // 5 years

    // Deposit funds to create or update an account
    function deposit() external payable {
        require(msg.value > 0, "Deposit must be greater than 0");

        Account storage account = accounts[msg.sender];
        account.balance += msg.value;
        account.lastActivity = block.timestamp;

        emit Deposit(msg.sender, msg.value);
    }

    // Add multiple beneficiaries to an account
    function addBeneficiaries(address[] calldata beneficiaries) external {
        require(beneficiaries.length > 0, "No addresses to add");

        Account storage account = accounts[msg.sender];

        for (uint256 i = 0; i < beneficiaries.length; i++) {
            address beneficiary = beneficiaries[i];
            require(beneficiary != address(0), "Invalid address");

            // Only add unique addresses
            if (!_isAddressInArray(account.beneficiaries, beneficiary)) {
                account.beneficiaries.push(beneficiary);
                emit BeneficiaryAdded(msg.sender, beneficiary);
            }
        }
    }

    // Withdraw funds as the depositor
    function withdraw(uint256 withdraw_amount) external {
        Account storage account = accounts[msg.sender];
        require(account.balance >= withdraw_amount, "Insufficient balance");

        account.balance -= withdraw_amount;
        account.lastActivity = block.timestamp;

        // Gas fee is the responsibility of the caller of this method
        payable(msg.sender).transfer(withdraw_amount);

        emit Withdrawal(msg.sender, withdraw_amount);
    }

    // Withdraw funds as an eligible address
    function withdrawAsBeneficiary(address benefactor) external {
        Account storage account = accounts[benefactor];
        require(account.balance > 0, "No balance to withdraw");
        require(
            block.timestamp >= account.lastActivity + INACTIVITY_PERIOD,
            "Benefactor is still active"
        );

        bool isEligible = false;
        for (uint256 i = 0; i < account.beneficiaries.length; i++) {
            if (account.beneficiaries[i] == msg.sender) {
                isEligible = true;
                break;
            }
        }
        require(isEligible, "Not an eligible address");

        uint256 amount = account.balance;
        account.balance = 0;

        payable(msg.sender).transfer(amount);

        emit Withdrawal(msg.sender, amount);
    }

    // Get account information
    function getAccountInfo(address depositor)
        external
        view
        returns (
            uint256 balance,
            uint256 lastActivity,
            address[] memory beneficiaries
        )
    {
        Account storage account = accounts[depositor];
        return (account.balance, account.lastActivity, account.beneficiaries);
    }


    // Check if an address exists in the array
    function _isAddressInArray(address[] storage array, address addr) private view returns (bool) {
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == addr) {
                return true;
            }
        }
        return false;
    }
}
