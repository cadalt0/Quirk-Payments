// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// CCTP v2 Interface
interface ITokenMessenger {
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken,
        bytes32 destinationCaller,
        uint256 maxFee,
        uint32 minFinalityThreshold
    ) external;
}

/**
 * @title PolygonPoSAmoyWalletFactory
 * @notice Factory contract to create multiple burn-only smart wallets with hardcoded CCTP v2 details
 * @dev Each wallet is ERC-4337 compatible and can only burn USDC to hardcoded destinations
 */
contract PolygonPoSAmoyWalletFactory is Ownable {
    using SafeERC20 for IERC20;
    
    // HARDCODED CCTP v2 CONTRACTS (from 0xJuicy codebase)
    address public constant TOKEN_MESSENGER = 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA;
    address public constant USDC = 0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582; // Polygon PoS Amoy
    
    // HARDCODED CCTP PARAMETERS
    uint256 public constant MAX_FEE = 500;
    uint32 public constant MIN_FINALITY_THRESHOLD = 1000;
    
    // Wallet tracking
    mapping(address => bool) public isDeployedWallet;
    address[] public deployedWallets;
    
    // Events
    event WalletCreated(address indexed wallet, uint32 destinationDomain, bytes32 mintRecipient);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @notice Create a new burn-only wallet with hardcoded CCTP details
     * @param destinationDomain Target chain domain ID (e.g., Base = 6, Arbitrum = 3)
     * @param mintRecipient Recipient address on destination chain (as bytes32)
     * @return walletAddress Address of the newly created wallet
     */
    function createBurnWallet(
        uint32 destinationDomain,
        bytes32 mintRecipient
    ) internal returns (address walletAddress) {
        require(destinationDomain > 0, "Invalid destination domain");
        require(mintRecipient != bytes32(0), "Invalid mint recipient");
        
        // Create new wallet contract
        BurnOnlyWallet wallet = new BurnOnlyWallet(
            destinationDomain,
            mintRecipient,
            address(this) // factory reference
        );
        
        walletAddress = address(wallet);
        
        // Track the deployed wallet
        isDeployedWallet[walletAddress] = true;
        deployedWallets.push(walletAddress);
        
        emit WalletCreated(walletAddress, destinationDomain, mintRecipient);
        
        return walletAddress;
    }
    
    /**
     * @notice Create a single burn-only wallet (public interface)
     * @param destinationDomain Target chain domain ID (e.g., Base = 6, Arbitrum = 3)
     * @param mintRecipient Recipient address on destination chain (as bytes32)
     * @return walletAddress Address of the newly created wallet
     */
    function createSingleWallet(
        uint32 destinationDomain,
        bytes32 mintRecipient
    ) external onlyOwner returns (address walletAddress) {
        return createBurnWallet(destinationDomain, mintRecipient);
    }
    
    /**
     * @notice Create multiple wallets in batch
     * @param domains Array of destination domain IDs
     * @param recipients Array of recipient addresses on destination chains
     * @return walletAddresses Array of created wallet addresses
     */
    function createMultipleWallets(
        uint32[] calldata domains,
        bytes32[] calldata recipients
    ) external onlyOwner returns (address[] memory walletAddresses) {
        require(domains.length == recipients.length, "Arrays length mismatch");
        require(domains.length > 0, "Empty arrays");
        
        walletAddresses = new address[](domains.length);
        
        for (uint256 i = 0; i < domains.length; i++) {
            walletAddresses[i] = createBurnWallet(domains[i], recipients[i]);
        }
        return walletAddresses;
    }
    
    /**
     * @notice Get all deployed wallets
     * @return Array of all deployed wallet addresses
     */
    function getAllDeployedWallets() external view returns (address[] memory) {
        return deployedWallets;
    }
    
    /**
     * @notice Get wallet count
     * @return Total number of deployed wallets
     */
    function getWalletCount() external view returns (uint256) {
        return deployedWallets.length;
    }
    
    /**
     * @notice Check if an address is a deployed wallet
     * @param wallet Address to check
     * @return True if it's a deployed wallet
     */
    function isWallet(address wallet) external view returns (bool) {
        return isDeployedWallet[wallet];
    }
    
    /**
     * @notice Emergency function to burn all USDC from a specific wallet
     * @param walletAddress Address of the wallet to burn from
     */
    function emergencyBurnFromWallet(address walletAddress) external onlyOwner {
        require(isDeployedWallet[walletAddress], "Not a deployed wallet");
        BurnOnlyWallet wallet = BurnOnlyWallet(walletAddress);
        wallet.emergencyBurnAll();
    }
    
    /**
     * @notice Emergency function to burn all USDC from all wallets
     */
    function emergencyBurnFromAllWallets() external onlyOwner {
        for (uint256 i = 0; i < deployedWallets.length; i++) {
            BurnOnlyWallet wallet = BurnOnlyWallet(deployedWallets[i]);
            wallet.emergencyBurnAll();
        }
    }
    
    /**
     * @notice Withdraw any ETH stuck in the factory (emergency only)
     */
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "ETH withdrawal failed");
    }
    
    /**
     * @notice Withdraw any ERC-20 tokens stuck in the factory (emergency only)
     * @param token ERC-20 token address
     */
    function withdrawERC20(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        
        IERC20(token).safeTransfer(owner(), balance);
    }
}

/**
 * @title BurnOnlyWallet
 * @notice Individual burn-only wallet with hardcoded CCTP v2 details
 * @dev ERC-4337 compatible, no private key control
 */
contract BurnOnlyWallet {
    using SafeERC20 for IERC20;
    
    // Factory reference
    address public immutable factory;
    
    // HARDCODED CCTP v2 CONTRACTS
    address public constant TOKEN_MESSENGER = 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA;
    address public constant USDC = 0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582;
    
    // HARDCODED DESTINATION DETAILS (immutable after deployment)
    uint32 public immutable DESTINATION_DOMAIN;
    bytes32 public immutable MINT_RECIPIENT;
    uint256 public constant MAX_FEE = 500;
    uint32 public constant MIN_FINALITY_THRESHOLD = 1000;
    
    // Events
    event USDCBurned(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient);
    event USDCReceived(address from, uint256 amount);
    
    // Modifiers
    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory can call");
        _;
    }
    
    constructor(
        uint32 _destinationDomain,
        bytes32 _mintRecipient,
        address _factory
    ) {
        DESTINATION_DOMAIN = _destinationDomain;
        MINT_RECIPIENT = _mintRecipient;
        factory = _factory;
        
        // Pre-approve TokenMessenger to spend USDC
        IERC20(USDC).approve(TOKEN_MESSENGER, type(uint256).max);
    }
    
    /**
     * @notice Burn specific amount of USDC to hardcoded destination
     * @param amount Amount of USDC to burn
     */
    function burnUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(IERC20(USDC).balanceOf(address(this)) >= amount, "Insufficient USDC balance");
        
        // Call CCTP v2 depositForBurn with hardcoded parameters
        ITokenMessenger(TOKEN_MESSENGER).depositForBurn(
            amount,
            DESTINATION_DOMAIN,
            MINT_RECIPIENT,
            USDC,
            bytes32(0), // destinationCaller (0x0)
            MAX_FEE,
            MIN_FINALITY_THRESHOLD
        );
        
        emit USDCBurned(amount, DESTINATION_DOMAIN, MINT_RECIPIENT);
    }
    
    /**
     * @notice Burn all available USDC
     */
    function burnAllUSDC() external {
        uint256 balance = IERC20(USDC).balanceOf(address(this));
        require(balance > 0, "No USDC to burn");
        
        ITokenMessenger(TOKEN_MESSENGER).depositForBurn(
            balance,
            DESTINATION_DOMAIN,
            MINT_RECIPIENT,
            USDC,
            bytes32(0),
            MAX_FEE,
            MIN_FINALITY_THRESHOLD
        );
        
        emit USDCBurned(balance, DESTINATION_DOMAIN, MINT_RECIPIENT);
    }
    
    /**
     * @notice Auto-burn when USDC arrives (ERC-20 receive hook)
     * @param token ERC-20 token address
     * @param amount Amount received
     * @param data Additional data
     * @return Function selector
     */
    function onERC20Received(
        address token,
        uint256 amount,
        bytes calldata data
    ) external returns (bytes4) {
        require(token == USDC, "Only USDC allowed");
        require(amount > 0, "Amount must be greater than 0");
        
        emit USDCReceived(msg.sender, amount);
        
        // Automatically burn to hardcoded destination
        ITokenMessenger(TOKEN_MESSENGER).depositForBurn(
            amount,
            DESTINATION_DOMAIN,
            MINT_RECIPIENT,
            USDC,
            bytes32(0),
            MAX_FEE,
            MIN_FINALITY_THRESHOLD
        );
        
        emit USDCBurned(amount, DESTINATION_DOMAIN, MINT_RECIPIENT);
        
        return this.onERC20Received.selector;
    }
    
    /**
     * @notice Emergency burn all USDC (only factory can call)
     */
    function emergencyBurnAll() external onlyFactory {
        uint256 balance = IERC20(USDC).balanceOf(address(this));
        if (balance > 0) {
            ITokenMessenger(TOKEN_MESSENGER).depositForBurn(
                balance,
                DESTINATION_DOMAIN,
                MINT_RECIPIENT,
                USDC,
                bytes32(0),
                MAX_FEE,
                MIN_FINALITY_THRESHOLD
            );
            
            emit USDCBurned(balance, DESTINATION_DOMAIN, MINT_RECIPIENT);
        }
    }
    
    /**
     * @notice Get wallet configuration
     * @return domain Destination domain
     * @return recipient Mint recipient address
     * @return factoryAddr Factory address
     */
    function getConfig() external view returns (
        uint32 domain,
        bytes32 recipient,
        address factoryAddr
    ) {
        return (DESTINATION_DOMAIN, MINT_RECIPIENT, factory);
    }
    
    /**
     * @notice Get USDC balance
     * @return Current USDC balance
     */
    function getUSDCBalance() external view returns (uint256) {
        return IERC20(USDC).balanceOf(address(this));
    }
    
    // NO transfer functions - USDC can only be burned
    // NO admin functions - cannot be changed after deployment
    // NO upgrade mechanism - completely immutable
    // NO fallback or receive functions - cannot receive ETH
}
