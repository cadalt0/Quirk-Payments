# 🔄 Quirk - Cross-Chain USDC Payment Platform

> **Automated cross-chain USDC transfers powered by Circle's CCTP v2 protocol**

## 🎯 **Vision**

**Quirk** automatically transfers USDC to users' preferred blockchain network when they receive payments. Users create smart wallets on multiple chains and choose their settlement chain - when someone pays them, the USDC automatically goes to their preferred network through CCTP v2's secure cross-chain messaging.

## 🏗️ **Complete System Architecture**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USER ONBOARDING FLOW                              │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────────┐    ┌──────────────────┐    ┌─────────────┐
│   Google    │───▶│  Authentication │───▶│  Smart Wallet    │───▶│ Destination │
│   OAuth     │    │  & User Setup   │    │  Creation        │    │  Address    │
│   Login     │    │                 │    │  (Multi-Chain)   │    │  & Domain   │
└─────────────┘    └─────────────────┘    └──────────────────┘    └─────────────┘
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SMART WALLET CONFIGURATION                        │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────────┐    ┌──────────────────┐    ┌─────────────┐
│ Ethereum    │    │     Base        │    │   Arbitrum       │    │  Avalanche  │
│ (Domain 0)  │    │   (Domain 6)    │    │  (Domain 3)     │    │ (Domain 1)  │
│             │    │                 │    │                 │    │             │
│ • USDC Only │    │ • USDC Only     │    │ • USDC Only      │    │ • USDC Only │
│ • CCTP v2   │    │ • CCTP v2       │    │ • CCTP v2        │    │ • CCTP v2   │
│ • Auto-Burn │    │ • Auto-Burn     │    │ • Auto-Burn      │    │ • Auto-Burn │
│ • Dest Addr │    │ • Dest Addr     │    │ • Dest Addr      │    │ • Dest Addr │
└─────────────┘    └─────────────────┘    └──────────────────┘    └─────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PAYMENT FLOW (CCTP v2)                           │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────────┐    ┌──────────────────┐    ┌─────────────┐
│ Payment     │───▶│  Smart Wallet   │───▶│  CCTP v2 Burn    │───▶│  Burn       │
│ Request     │    │  Receives USDC  │    │  (Automatic)     │    │  Attestation│
│ (6-digit)   │    │                 │    │                 │    │  Fetching   │
└─────────────┘    └─────────────────┘    └──────────────────┘    └─────────────┘
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              OFFLINE SERVER PROCESSING                         │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────────┐    ┌──────────────────┐    ┌─────────────┐
│ CCTP v2     │───▶│  Offchain       │───▶│  Cross-Chain     │───▶│  CCTP v2    │
│ Attestation │    │  Server         │    │  Coordination    │    │  Mint       │
│ Processing  │    │  Monitoring     │    │  & Routing       │    │  (Dest)     │
└─────────────┘    └─────────────────┘    └──────────────────┘    └─────────────┘
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USER RECEIVES FUNDS                               │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────────┐    ┌──────────────────┐    ┌─────────────┐
│ USDC        │───▶│  User's         │───▶│  Transaction     │───▶│  Success    │
│ Minted      │    │  Preferred      │    │  Confirmation    │    │  & Funds   │
│ via CCTP v2 │    │  Address        │    │  (Blockchain)    │    │  Available  │
└─────────────┘    └─────────────────┘    └──────────────────┘    └─────────────┘
```

## 🔧 **Technical Components**

### **1. Smart Contract Layer (CCTP v2 Integration)**
- **Restrictive Functions**: Only accept USDC tokens
- **CCTP v2 Auto-Burn Logic**: Immediate burn on USDC receipt using Circle's protocol
- **Event Emission**: Burn events for offchain monitoring
- **Domain Mapping**: Chain-specific identifiers (Ethereum: 0, Avalanche: 1, Arbitrum: 3, Base: 6)
- **Destination Address**: Pre-configured recipient address

### **2. CCTP v2 Cross-Chain Process**
- **Burn Attestation**: Smart contract burns USDC and generates CCTP v2 burn attestation
- **Attestation Fetching**: Offchain server fetches burn attestation from CCTP v2
- **Cross-Chain Minting**: Server uses attestation to mint USDC on destination chain
- **Secure Messaging**: All cross-chain communication secured by Circle's CCTP v2 infrastructure

### **3. Offchain Server Architecture**
- **CCTP v2 Event Listeners**: Monitor all chain burn events and attestations
- **Attestation Processing**: Fetch and validate CCTP v2 burn attestations
- **Cross-Chain Router**: Determine destination chain based on user preferences
- **Minting Service**: Trigger USDC mint on destination via CCTP v2
- **User Preference Store**: Maintain destination mappings and chain preferences

## 🚀 **Deployed Contracts (Testnet)**

### **Smart Wallet Factory Addresses**

| Chain | Network | Factory Address | Explorer |
|-------|---------|-----------------|----------|
| **Ethereum** | Sepolia | `0xb80c3ed5c3b5a863838080243ee0148b911ff19d` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0xb80c3ed5c3b5a863838080243ee0148b911ff19d) |
| **Arbitrum** | Sepolia | `0xbb3bfc5a694b08c7854311c6242b2d95de4f66d8` | [View on Sepolia Arbiscan](https://sepolia.arbiscan.io/address/0xbb3bfc5a694b08c7854311c6242b2d95de4f66d8) |
| **Base** | Sepolia | `0x0ec0d75e8d1baadf7b893a94185cbf279bdd4ad7` | [View on Base Sepolia Explorer](https://sepolia.basescan.org/address/0x0ec0d75e8d1baadf7b893a94185cbf279bdd4ad7) |
| **Avalanche** | Fuji | `0x0ec0d75e8d1baadf7b893a94185cbf279bdd4ad7` | [View on Fuji Snowtrace](https://testnet.snowtrace.io/address/0x0ec0d75e8d1baadf7b893a94185cbf279bdd4ad7) |

### **CCTP v2 Integration**
- **Burn Attestation**: Smart contracts automatically burn USDC and generate CCTP v2 attestations
- **Cross-Chain Minting**: Offchain server processes attestations to mint on destination chains
- **Secure Infrastructure**: Leverages Circle's battle-tested CCTP v2 protocol for all cross-chain operations

## 📱 **User Experience Flow**

1. **Login** → Google OAuth authentication
2. **Create Wallets** → Multi-chain smart wallet setup with CCTP v2 integration
3. **Set Destination** → Choose preferred settlement chain and address
4. **Share Payment Code** → Generate 6-digit payment ID
5. **Receive Payment** → USDC sent to smart wallet address
6. **CCTP v2 Auto-Burn** → Smart contract burns USDC and generates attestation
7. **Cross-Chain Mint** → Server processes attestation and mints on destination
8. **Funds Available** → USDC received on preferred chain

## 🎯 **Key Benefits**

- **🔄 Seamless Cross-Chain**: No manual bridging required, powered by CCTP v2
- **⚡ Automatic Execution**: Smart contracts handle everything automatically
- **🎯 User Control**: Choose preferred destination chain and address
- **💎 USDC Focus**: Stable value across all operations
- **📱 Simple UX**: Generate payment codes like phone numbers
- **🔒 Secure**: CCTP v2 infrastructure ensures reliable cross-chain transfers
- **🏗️ Enterprise-Grade**: Built on Circle's production-ready CCTP v2 protocol

## 🚀 **Workflow Summary**

**Setup Phase**: User creates multi-chain smart wallets with CCTP v2 auto-burn configuration
**Payment Phase**: Recipients pay USDC to smart wallet addresses
**Processing Phase**: Smart contracts burn USDC via CCTP v2, offchain server processes attestations
**Completion Phase**: Server mints USDC on user's preferred destination chain through CCTP v2

This creates a **"set it and forget it"** cross-chain payment system where complexity is hidden behind simple user interactions, powered by Circle's secure CCTP v2 infrastructure.

## 🔗 **Links**


- **CCTP v2**: [Circle's Cross-Chain Transfer Protocol](https://developers.circle.com/developer-docs/cctp)

---

*Built with ❤️ using Next.js, React Three Fiber, and Circle's CCTP v2 protocol*
