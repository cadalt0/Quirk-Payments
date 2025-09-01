// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {BurnWalletFactory} from "../BurnWalletFactory.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BurnWalletFactoryTest is Test {
    BurnWalletFactory factory;
    address owner;
    address user;
    
    // Test addresses
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant TOKEN_MESSENGER = 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA;
    
    // Test parameters
    uint32 constant TEST_DOMAIN = 6; // Base Sepolia
    bytes32 constant TEST_RECIPIENT = 0x123456789012345678901234567890123456789000000000000000000000000000;
    
    function setUp() public {
        owner = address(this);
        user = address(0x123);
        
        // Deploy factory
        factory = new BurnWalletFactory();
        
        // Mock USDC balance for testing
        vm.mockCall(
            USDC,
            abi.encodeWithSelector(IERC20.balanceOf.selector, address(0)),
            abi.encode(uint256(1000000)) // 1 USDC
        );
    }
    
    function test_DeployFactory() public {
        assertEq(factory.owner(), owner);
        assertEq(factory.TOKEN_MESSENGER(), TOKEN_MESSENGER);
        assertEq(factory.USDC(), USDC);
        assertEq(factory.MAX_FEE(), 500);
        assertEq(factory.MIN_FINALITY_THRESHOLD(), 1000);
    }
    
    function test_CreateBurnWallet() public {
        address wallet = factory.createBurnWallet(TEST_DOMAIN, TEST_RECIPIENT);
        
        assertTrue(wallet != address(0));
        assertTrue(factory.isWallet(wallet));
        assertEq(factory.getWalletCount(), 1);
        
        address[] memory wallets = factory.getAllDeployedWallets();
        assertEq(wallets.length, 1);
        assertEq(wallets[0], wallet);
    }
    
    function test_CreateMultipleWallets() public {
        uint32[] memory domains = new uint32[](2);
        domains[0] = 6;  // Base
        domains[1] = 3;  // Arbitrum
        
        bytes32[] memory recipients = new bytes32[](2);
        recipients[0] = TEST_RECIPIENT;
        recipients[1] = 0x456789012345678901234567890123456789000000000000000000000000000000;
        
        address[] memory wallets = factory.createMultipleWallets(domains, recipients);
        
        assertEq(wallets.length, 2);
        assertEq(factory.getWalletCount(), 2);
        
        for (uint256 i = 0; i < wallets.length; i++) {
            assertTrue(factory.isWallet(wallets[i]));
        }
    }
    
    function test_CreateWalletInvalidDomain() public {
        vm.expectRevert("Invalid destination domain");
        factory.createBurnWallet(0, TEST_RECIPIENT);
    }
    
    function test_CreateWalletInvalidRecipient() public {
        vm.expectRevert("Invalid mint recipient");
        factory.createBurnWallet(TEST_DOMAIN, bytes32(0));
    }
    
    function test_OnlyOwnerCanCreateWallet() public {
        vm.prank(user);
        vm.expectRevert("Ownable: caller is not the owner");
        factory.createBurnWallet(TEST_DOMAIN, TEST_RECIPIENT);
    }
    
    function test_WalletConfiguration() public {
        address wallet = factory.createBurnWallet(TEST_DOMAIN, TEST_RECIPIENT);
        
        // Get wallet contract instance
        BurnOnlyWallet walletContract = BurnOnlyWallet(wallet);
        
        (uint32 domain, bytes32 recipient, address factoryAddr) = walletContract.getConfig();
        assertEq(domain, TEST_DOMAIN);
        assertEq(recipient, TEST_RECIPIENT);
        assertEq(factoryAddr, address(factory));
        
        assertEq(walletContract.TOKEN_MESSENGER(), TOKEN_MESSENGER);
        assertEq(walletContract.USDC(), USDC);
        assertEq(walletContract.MAX_FEE(), 500);
        assertEq(walletContract.MIN_FINALITY_THRESHOLD(), 1000);
    }
    
    function test_EmergencyBurnFromWallet() public {
        address wallet = factory.createBurnWallet(TEST_DOMAIN, TEST_RECIPIENT);
        
        // Mock USDC balance
        vm.mockCall(
            USDC,
            abi.encodeWithSelector(IERC20.balanceOf.selector, wallet),
            abi.encode(uint256(1000000)) // 1 USDC
        );
        
        // Mock CCTP call
        vm.mockCall(
            TOKEN_MESSENGER,
            abi.encodeWithSelector(
                ITokenMessenger(TOKEN_MESSENGER).depositForBurn.selector,
                1000000,
                TEST_DOMAIN,
                TEST_RECIPIENT,
                USDC,
                bytes32(0),
                500,
                1000
            ),
            abi.encode()
        );
        
        factory.emergencyBurnFromWallet(wallet);
    }
    
    function test_EmergencyBurnFromAllWallets() public {
        // Create multiple wallets
        uint32[] memory domains = new uint32[](2);
        domains[0] = 6;
        domains[1] = 3;
        
        bytes32[] memory recipients = new bytes32[](2);
        recipients[0] = TEST_RECIPIENT;
        recipients[1] = TEST_RECIPIENT;
        
        factory.createMultipleWallets(domains, recipients);
        
        // Mock USDC balance for all wallets
        address[] memory wallets = factory.getAllDeployedWallets();
        for (uint256 i = 0; i < wallets.length; i++) {
            vm.mockCall(
                USDC,
                abi.encodeWithSelector(IERC20.balanceOf.selector, wallets[i]),
                abi.encode(uint256(1000000))
            );
            
            // Mock CCTP call
            vm.mockCall(
                TOKEN_MESSENGER,
                abi.encodeWithSelector(
                    ITokenMessenger(TOKEN_MESSENGER).depositForBurn.selector,
                    1000000,
                    domains[i],
                    recipients[i],
                    USDC,
                    bytes32(0),
                    500,
                    1000
                ),
                abi.encode()
            );
        }
        
        factory.emergencyBurnFromAllWallets();
    }
    
    function test_OnlyOwnerEmergencyFunctions() public {
        address wallet = factory.createBurnWallet(TEST_DOMAIN, TEST_RECIPIENT);
        
        vm.prank(user);
        vm.expectRevert("Ownable: caller is not the owner");
        factory.emergencyBurnFromWallet(wallet);
        
        vm.prank(user);
        vm.expectRevert("Ownable: caller is not the owner");
        factory.emergencyBurnFromAllWallets();
    }
    
    function test_WithdrawFunctions() public {
        // Mock ETH balance
        vm.deal(address(factory), 1 ether);
        
        uint256 balanceBefore = address(this).balance;
        factory.withdrawETH();
        uint256 balanceAfter = address(this).balance;
        
        assertEq(balanceAfter, balanceBefore + 1 ether);
        
        // Mock ERC-20 balance
        vm.mockCall(
            USDC,
            abi.encodeWithSelector(IERC20.balanceOf.selector, address(factory)),
            abi.encode(uint256(1000000))
        );
        
        vm.mockCall(
            USDC,
            abi.encodeWithSelector(IERC20.transfer.selector, owner, 1000000),
            abi.encode(true)
        );
        
        factory.withdrawERC20(USDC);
    }
    
    function test_OnlyOwnerWithdrawFunctions() public {
        vm.prank(user);
        vm.expectRevert("Ownable: caller is not the owner");
        factory.withdrawETH();
        
        vm.prank(user);
        vm.expectRevert("Ownable: caller is not the owner");
        factory.withdrawERC20(USDC);
    }
}

// Interface for testing
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

// Interface for BurnOnlyWallet
interface BurnOnlyWallet {
    function getConfig() external view returns (uint32, bytes32, address);
    function TOKEN_MESSENGER() external view returns (address);
    function USDC() external view returns (address);
    function MAX_FEE() external view returns (uint256);
    function MIN_FINALITY_THRESHOLD() external view returns (uint32);
}

