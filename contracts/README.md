


## 🔥 BurnWalletFactory - CCTP v2 Smart Wallet Factory

### What Does This Contract System Do?

- **BurnWalletFactory** is a factory contract that lets the owner deploy multiple autonomous smart wallets.
- Each wallet is programmed to **burn USDC tokens across chains** using **Circle’s Cross-Chain Transfer Protocol v2 (CCTP v2)**.
- **No private keys:** These wallets operate fully on smart contract logic, removing all manual control and risk of key compromise.
- **Hardcoded destinations:** Each wallet is permanently tied to a specific chain and recipient address.
- **ERC-4337 compatible:** Designed to work with account abstraction for smart wallet automation.

---

### Architecture & Components

#### 1. BurnWalletFactory (Main Contract)
- **Owner-only controls:** Only the contract owner can create new wallets.
- **Batch creation:** Supports creating multiple wallets in a single transaction.
- **Emergency functions:** Allows burning USDC from one or all wallets if needed.

#### 2. BurnOnlyWallet (Deployed Wallets)
- **No private key:** No external control; wallets cannot be hijacked.
- **Hardcoded logic:** Each wallet is configured at creation for a specific chain and recipient.
- **Auto-burn:** Whenever USDC is received, it’s burned immediately via CCTP v2 to the designated chain and address.
- **Circle CCTP v2 integration:** The burn and cross-chain transfer leverages Circle’s protocol for secure, fast finality.

---

### How It Works — Step by Step

1. **Deploy Factory:**  
   The owner deploys BurnWalletFactory to the desired network.

2. **Create Wallets:**  
   Use the factory to deploy BurnOnlyWallet contracts, specifying:
   - **Domain ID** (chain identifier per CCTP v2)
   - **Recipient address** (as bytes32, for cross-chain delivery)

3. **Fund Wallets:**  
   Transfer USDC to any deployed wallet address.

4. **Automatic Burning:**  
   - Upon receiving USDC, the wallet triggers a burn via CCTP v2.
   - USDC is destroyed and a cross-chain transfer is initiated to the hardcoded recipient on the target chain.
   - No manual steps; process is trustless and automated.

5. **Emergency & Admin Functions:**  
   - Owner can trigger emergency burns from any wallet or all wallets.
   - Admin withdrawal functions let the owner recover stuck funds.

---

### Key CCTP v2 Integration Details

- **CCTP v2** (Circle Cross-Chain Transfer Protocol v2) is used for burning USDC and initiating cross-chain transfers.
- Each wallet hardcodes the CCTP v2 `TOKEN_MESSENGER` contract address and the USDC token address.
- **Domain IDs** specify the target chain per CCTP v2 docs:
  - Example: Base Sepolia = 6, Arbitrum Sepolia = 3, etc.
- **Burn process:** The wallet calls CCTP v2’s burn/messaging method, which destroys USDC and sends a message for the recipient to claim on the target chain.

---

### Code Snippets (Solidity Interface)

```solidity
// Create wallet for Base Sepolia
factory.createBurnWallet(6, recipientAddress);

// Fund wallet
usdc.transfer(walletAddress, amount);

// Emergency burn
factory.emergencyBurnFromWallet(walletAddress);

// Get wallet config
(domain, recipient, factory) = wallet.getConfig();
```

---

### Security Model

- **Owner-only wallet creation and emergency controls.**
- **No private keys, no external control** over wallets.
- **Immutable logic:** Destinations and burn rules cannot be changed after deployment.
- **Only burning allowed:** USDC can only move cross-chain; cannot be sent to arbitrary addresses.

---

### Monitoring & Usage

- **Query wallet count:** `factory.getWalletCount()`
- **List all wallet addresses:** `factory.getAllDeployedWallets()`
- **Check USDC balance of wallet:** `wallet.getUSDCBalance()`

---

### ERC-4337 Integration

- Fully compatible with account abstraction (smart wallet meta-transactions).
- Enables automated, programmable cross-chain USDC burning with no key management.

---

### Limitations & Best Practices

- **USDC can only be burned** (not transferred to arbitrary addresses).
- **Destinations are immutable** after wallet creation.
- **Always test on testnets** with your recipient addresses and domain IDs before using on mainnet.

---

## Summary

This contract system provides a fully autonomous, owner-controlled factory for deploying smart wallets that burn USDC using CCTP v2, enabling seamless, secure cross-chain transfers with no manual intervention or private key management. All destinations, logic, and parameters are hardcoded for maximum safety.
