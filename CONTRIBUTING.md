# 🤝 Contributing to Quirk-Payments

Thank you for your interest in contributing to Quirk-Payments! This document provides guidelines and information for contributors.

## 🌟 **Getting Started**

### **Prerequisites**
- Node.js 18+ 
- npm or pnpm
- Git
- Basic knowledge of Solidity, React, and TypeScript

### **Fork and Clone**
1. Fork the [Quirk-Payments repository](https://github.com/cadalt0/Quirk-Payments)
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Quirk-Payments.git
   cd Quirk-Payments
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/cadalt0/Quirk-Payments.git
   ```

### **Install Dependencies**
```bash
npm run install:all
```

## 🔧 **Development Setup**

### **Smart Contracts (Hardhat)**
```bash
cd contracts
npm run compile
npm run test
```

### **Web Application (Next.js)**
```bash
cd website
npm run dev
```

### **Running Both Simultaneously**
```bash
# From root directory
npm run dev
```

## 📝 **Making Changes**

### **1. Create a Feature Branch**
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### **2. Make Your Changes**
- Follow the coding standards below
- Write tests for new functionality
- Update documentation as needed

### **3. Test Your Changes**
```bash
# Test smart contracts
npm run test:contracts

# Test web application
npm run test:website

# Test everything
npm run test
```

### **4. Commit Your Changes**
```bash
git add .
git commit -m "feat: add new payment validation logic

- Implement USDC amount validation
- Add transaction fee calculation
- Update error handling for invalid amounts"
```

### **5. Push and Create Pull Request**
```bash
git push origin feature/your-feature-name
```

## 📋 **Coding Standards**

### **Smart Contracts (Solidity)**
- Use Solidity 0.8.28+
- Follow [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- Use NatSpec comments for public functions
- Implement comprehensive error handling
- Write unit tests for all functions

```solidity
// Good example
/**
 * @notice Creates a new smart wallet for the specified user
 * @param user The address of the user
 * @param domain The chain domain identifier
 * @return walletAddress The address of the created wallet
 */
function createWallet(address user, uint256 domain) 
    external 
    returns (address walletAddress) 
{
    require(user != address(0), "Invalid user address");
    require(domain < MAX_DOMAINS, "Invalid domain");
    
    // Implementation...
}
```

### **Web Application (TypeScript/React)**
- Use TypeScript strict mode
- Follow [React Best Practices](https://react.dev/learn)
- Use functional components with hooks
- Implement proper error boundaries
- Write component tests

```typescript
// Good example
interface WalletProps {
  address: string;
  chain: string;
  balance: string;
}

export const Wallet: React.FC<WalletProps> = ({ 
  address, 
  chain, 
  balance 
}) => {
  const { toast } = useToast();
  
  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast({
        title: "Address copied!",
        description: "Wallet address copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy address",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="wallet-container">
      {/* Component JSX */}
    </div>
  );
};
```

### **General Guidelines**
- Use meaningful variable and function names
- Write self-documenting code
- Add comments for complex logic
- Keep functions small and focused
- Use consistent formatting

## 🧪 **Testing**

### **Smart Contract Testing**
- Test all public and external functions
- Test edge cases and error conditions
- Test gas optimization
- Achieve >90% test coverage

```typescript
// Test example
describe("WalletFactory", () => {
  it("should create wallet with correct parameters", async () => {
    const user = accounts[0];
    const domain = 1;
    
    const tx = await factory.createWallet(user.address, domain);
    const receipt = await tx.wait();
    
    expect(receipt.status).to.equal(1);
    // More assertions...
  });
});
```

### **Web Application Testing**
- Test component rendering
- Test user interactions
- Test API integrations
- Test responsive design

## 📚 **Documentation**

### **Code Documentation**
- Document all public APIs
- Include usage examples
- Explain complex algorithms
- Keep documentation up-to-date

### **Project Documentation**
- Update README.md for new features
- Document breaking changes
- Add diagrams for complex flows
- Include setup instructions

## 🔍 **Pull Request Process**

### **1. PR Title and Description**
- Use conventional commit format for title
- Provide clear description of changes
- Include related issue numbers
- Add screenshots for UI changes

### **2. PR Checklist**
- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Self-review completed

### **3. Review Process**
- Address review comments promptly
- Request reviews from relevant team members
- Respond to feedback constructively
- Update PR based on feedback

## 🐛 **Reporting Issues**

### **Bug Reports**
- Use the issue template
- Provide reproduction steps
- Include error messages and logs
- Specify environment details

### **Feature Requests**
- Describe the desired functionality
- Explain use cases and benefits
- Suggest implementation approach
- Consider impact on existing features

## 🚀 **Release Process**

### **Versioning**
- Follow [Semantic Versioning](https://semver.org/)
- Update CHANGELOG.md
- Tag releases in GitHub
- Update package.json versions

### **Deployment**
- Test on staging environment
- Verify all functionality works
- Monitor for issues post-deployment
- Rollback plan ready

## 📞 **Getting Help**

### **Communication Channels**
- GitHub Issues for bugs and features
- GitHub Discussions for questions
- Pull Request comments for code reviews

### **Resources**
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)

## 🎯 **Areas for Contribution**

### **High Priority**
- Smart contract security improvements
- Gas optimization
- Test coverage improvements
- Documentation updates

### **Medium Priority**
- UI/UX enhancements
- Performance optimizations
- Additional blockchain support
- Mobile responsiveness

### **Low Priority**
- Code refactoring
- Style improvements
- Additional test cases
- Tooling improvements

## 🙏 **Acknowledgments**

Thank you to all contributors who help make Quirk-Payments better! Your contributions are valuable and appreciated.

---

**Happy coding! 🚀**
