# 🔥 BurnWalletFactory - CCTP v2 Smart Wallet Factory

A factory contract that creates multiple smart wallets with hardcoded CCTP v2 details for automated USDC burning across chains.

## 🎯 **What This System Does**

- **Creates multiple smart wallets** with different hardcoded destinations
- **Each wallet automatically burns USDC** to a specific chain via CCTP v2
- **No private key control** - completely autonomous operation
- **ERC-4337 compatible** - works with Account Abstraction
- **Hardcoded parameters** - cannot be changed after deployment

## 🏗️ **Architecture**

### **1. BurnWalletFactory (Main Contract)**
- **Owner-controlled** - only you can create wallets
- **Creates individual wallets** with specific destinations
- **Batch creation** - create multiple wallets at once
- **Emergency functions** - burn USDC from all wallets if needed

### **2. BurnOnlyWallet (Individual Wallets)**
- **No private key** - controlled by smart contract logic
- **Hardcoded destination** - always burns to same address/chain
- **Auto-burn on receive** - USDC gets burned immediately
- **CCTP v2 integration** - uses Circle's cross-chain protocol

## 🚀 **Quick Start**

### **1. Deploy the Factory**
```bash
npx hardhat run scripts/deploy-factory.js --network base-sepolia
```

### **2. Create Wallets for Different Chains**
```solidity
// Create wallet for Base Sepolia
factory.createBurnWallet(6, recipientAddress);

// Create wallet for Arbitrum Sepolia  
factory.createBurnWallet(3, recipientAddress);

// Create wallet for Linea Sepolia
factory.createBurnWallet(11, recipientAddress);
```

### **3. Fund the Wallets**
```solidity
// Send USDC to any wallet address
usdc.transfer(walletAddress, amount);
```

### **4. Automatic Burning**
- USDC arrives → automatically burned via CCTP v2
- Sent to hardcoded destination on target chain
- No manual intervention needed

## 🔧 **Configuration**

### **Chain Domain IDs (from 0xJuicy codebase)**
```solidity
const CHAIN_DOMAINS = {
    ETHEREUM_SEPOLIA: 0,    // Ethereum Sepolia
    AVALANCHE_FUJI: 1,      // Avalanche Fuji  
    ARBITRUM_SEPOLIA: 3,    // Arbitrum Sepolia
    BASE_SEPOLIA: 6,        // Base Sepolia
    LINEA_SEPOLIA: 11       // Linea Sepolia
}
```

### **Hardcoded CCTP Parameters**
```solidity
address public constant TOKEN_MESSENGER = 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA;
address public constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
uint256 public constant MAX_FEE = 500;
uint32 public constant MIN_FINALITY_THRESHOLD = 1000;
```

## 📱 **Usage Examples**

### **Create Individual Wallet**
```solidity
// Create wallet for Base Sepolia
address baseWallet = factory.createBurnWallet(
    6, // Base Sepolia domain
    bytes32(0x1234...) // Your wallet on Base (as bytes32)
);
```

### **Create Multiple Wallets**
```solidity
uint32[] memory domains = [6, 3, 11]; // Base, Arbitrum, Linea
bytes32[] memory recipients = [recipient1, recipient2, recipient3];

address[] memory wallets = factory.createMultipleWallets(domains, recipients);
```

### **Emergency Functions**
```solidity
// Burn all USDC from specific wallet
factory.emergencyBurnFromWallet(walletAddress);

// Burn all USDC from all wallets
factory.emergencyBurnFromAllWallets();
```

## 🔒 **Security Features**

### **Factory Security**
- ✅ **Owner-only creation** - only you can create wallets
- ✅ **Emergency controls** - can burn USDC from all wallets
- ✅ **Withdrawal functions** - recover stuck funds

### **Wallet Security**
- ✅ **No private key** - cannot be controlled by anyone
- ✅ **Immutable logic** - cannot be hacked or modified
- ✅ **Hardcoded destinations** - cannot be changed
- ✅ **Only burning allowed** - USDC can only move cross-chain

## 📊 **Monitoring & Management**

### **Get Factory Information**
```solidity
// Total wallets created
uint256 count = factory.getWalletCount();

// All wallet addresses
address[] memory wallets = factory.getAllDeployedWallets();

// Check if address is a wallet
bool isWallet = factory.isWallet(address);
```

### **Get Wallet Information**
```solidity
// Wallet configuration
(uint32 domain, bytes32 recipient, address factory) = wallet.getConfig();

// USDC balance
uint256 balance = wallet.getUSDCBalance();
```

## 🧪 **Testing**

### **Run Tests**
```bash
npx hardhat test
```

### **Test Coverage**
- ✅ Factory deployment and configuration
- ✅ Wallet creation (individual and batch)
- ✅ Emergency functions
- ✅ Access control
- ✅ Withdrawal functions

## 🚨 **Important Notes**

### **Before Deployment**
1. **Update recipient addresses** in deployment script
2. **Verify chain domain IDs** for your target networks
3. **Test on testnet first** before mainnet deployment

### **After Deployment**
1. **Fund wallets with USDC** to start burning
2. **Monitor cross-chain transfers** via CCTP v2
3. **Use emergency functions** only when necessary

### **Limitations**
- **USDC can only be burned** - no transfers to other addresses
- **Destinations are immutable** - cannot be changed after creation
- **Only factory owner** can create new wallets

## 🔗 **Integration with ERC-4337**

This system is designed to work with ERC-4337 Account Abstraction:

1. **Factory creates wallets** with specific CCTP destinations
2. **Wallets receive USDC** and auto-burn via CCTP v2
3. **Cross-chain transfers** happen automatically
4. **No private key management** needed

## 📞 **Support**

For questions or issues:
- Check the test files for usage examples
- Review the contract code for implementation details
- Test thoroughly on testnets before mainnet use

---

**🎉 This system gives you complete control over cross-chain USDC burning with maximum security and automation!**

