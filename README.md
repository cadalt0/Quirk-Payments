# 🚀 Quirk-Payments: Cross-Chain Payment Infrastructure

A revolutionary cross-chain payment system that enables seamless USDC transfers across multiple blockchain networks through smart wallet automation and offchain coordination.

## 🌟 **Project Overview**

Quirk-Payments is a comprehensive cross-chain payment infrastructure that combines:
- **Multi-chain smart wallet factories** for automated USDC handling
- **Next.js web application** with Google OAuth integration
- **Hardhat-based smart contracts** with comprehensive testing
- **Cross-chain coordination system** for seamless fund routing

## 🏗️ **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────┐
│                        QUIRK ECOSYSTEM                         │
├─────────────────────────────────────────────────────────────────┤
│  • Smart Contracts (Hardhat + Solidity)                       │
│  • Web Application (Next.js + React + TypeScript)             │
│  • Cross-Chain Coordination Server                            │
│  • Multi-Chain Wallet Management                              │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 **Repository Structure**

```
quirk-payments/
├── contracts/                 # Smart Contract Layer
│   ├── contracts/            # Solidity smart contracts
│   │   ├── BaseWalletFactory.sol
│   │   ├── ArbitrumSepoliaWalletFactory.sol
│   │   ├── AvalancheFujiWalletFactory.sol
│   │   ├── BaseSepoliaWalletFactory.sol
│   │   ├── EthereumSepoliaWalletFactory.sol
│   │   ├── LineaSepoliaWalletFactory.sol
│   │   ├── OPSepoliaWalletFactory.sol
│   │   ├── PolygonPoSAmoyWalletFactory.sol
│   │   ├── SeiTestnetWalletFactory.sol
│   │   ├── SonicTestnetWalletFactory.sol
│   │   ├── UnichainSepoliaWalletFactory.sol
│   │   └── WorldChainSepoliaWalletFactory.sol
│   ├── test/                 # Contract tests
│   ├── scripts/              # Deployment scripts
│   ├── hardhat.config.ts     # Hardhat configuration
│   └── package.json          # Contract dependencies
├── website/                   # Web Application Layer
│   ├── app/                  # Next.js app directory
│   ├── components/           # React components
│   ├── lib/                  # Utility libraries
│   ├── hooks/                # Custom React hooks
│   ├── public/               # Static assets
│   └── package.json          # Web app dependencies
└── server/                   # Backend Coordination Layer
    └── (Cross-chain coordination services)
```

## 🔧 **Smart Contract Layer**

### **Supported Networks**
- **Ethereum Sepolia** (Domain 0)
- **Avalanche Fuji** (Domain 1) 
- **Arbitrum Sepolia** (Domain 3)
- **Base Sepolia** (Domain 6)
- **Linea Sepolia**
- **OP Sepolia**
- **Polygon PoS Amoy**
- **Sei Testnet**
- **Sonic Testnet**
- **Unichain Sepolia**
- **WorldChain Sepolia**

### **Key Features**
- **USDC-Only Acceptance**: Smart wallets only accept USDC tokens
- **Auto-Burn Logic**: Immediate burn on USDC receipt
- **Event Emission**: Burn events for offchain monitoring
- **Domain Mapping**: Chain-specific identifiers
- **Destination Address**: Pre-configured recipient addresses

## 🌐 **Web Application Layer**

### **Frontend Technologies**
- **Next.js 15** with App Router
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **Radix UI** components
- **Google OAuth** integration
- **3D Model Viewer** (Three.js)

### **Key Features**
- **User Authentication**: Google OAuth integration
- **Wallet Creation**: Multi-chain smart wallet setup
- **Payment Requests**: 6-digit code generation
- **Real-time Updates**: Live transaction monitoring
- **Responsive Design**: Mobile-first approach

## 🔄 **Cross-Chain Payment Flow**

1. **User Onboarding**: Google OAuth → Smart Wallet Creation
2. **Payment Request**: Generate 6-digit payment code
3. **USDC Receipt**: Smart wallet receives USDC on source chain
4. **Auto-Burn**: USDC automatically burned with event emission
5. **Offchain Detection**: Server monitors burn events
6. **Cross-Chain Routing**: Determine destination chain
7. **Fund Minting**: Mint USDC on destination chain
8. **User Receipt**: Funds available on preferred chain

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js 18+ 
- npm or pnpm
- Git

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/cadalt0/Quirk-Payments.git
   cd Quirk-Payments
   ```

2. **Install contract dependencies**
   ```bash
   cd contracts
   npm install
   ```

3. **Install web application dependencies**
   ```bash
   cd ../website
   npm install
   ```

4. **Set up environment variables**
   ```bash
   # Copy and configure environment files
   cp .env.example .env
   ```

### **Development**

1. **Start smart contract development**
   ```bash
   cd contracts
   npm run compile
   npm run test
   ```

2. **Start web application**
   ```bash
   cd website
   npm run dev
   ```

3. **Deploy contracts**
   ```bash
   cd contracts
   npx hardhat ignition deploy --network sepolia
   ```

## 🧪 **Testing**

### **Smart Contracts**
```bash
cd contracts
npm run test
npm run test:coverage
```

### **Web Application**
```bash
cd website
npm run lint
npm run build
```

## 📚 **Documentation**

- [Smart Contract Architecture](./contracts/README.md)
- [Web Application Setup](./website/README.md)
- [Cross-Chain Workflow](./website/QUIRK_WORKFLOW_DIAGRAM.md)
- [Google Auth Setup](./website/GOOGLE_AUTH_SETUP.md)

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 **Links**

- **Repository**: https://github.com/cadalt0/Quirk-Payments
- **Smart Contracts**: [Hardhat Documentation](https://hardhat.org/docs)
- **Web Framework**: [Next.js Documentation](https://nextjs.org/docs)
- **Blockchain**: [Ethereum Documentation](https://ethereum.org/developers)

## 🆘 **Support**

For support and questions:
- Open an [issue](../../issues) on GitHub
- Check the [documentation](./docs) folder
- Review the [workflow diagram](./website/QUIRK_WORKFLOW_DIAGRAM.md)

---

**Built with ❤️ for the decentralized future**
