const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize database with quirk table
async function initDatabase() {
  try {
    const client = await pool.connect();
    
    // Create quirk table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quirk (
        id SERIAL PRIMARY KEY,
        mail VARCHAR(255) NOT NULL,
        account BOOLEAN DEFAULT false,
        chains TEXT,
        yeschain TEXT,
        yesaddress TEXT,
        smartwallets JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create quirk-pay table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quirk_pay (
        payid SERIAL PRIMARY KEY,
        amount DECIMAL(18,8) NOT NULL,
        mail VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        hash VARCHAR(255),
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_quirk_mail ON quirk(mail)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_quirk_pay_payid ON quirk_pay(payid)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_quirk_pay_mail ON quirk_pay(mail)
    `);

    client.release();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'quirk-server-env' });
});

// Add/Update quirk data
app.post('/api/quirk', async (req, res) => {
  try {
    const { mail, account, chains, yeschain, yesaddress, smartwallets } = req.body;
    
    if (!mail) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if record exists
    const existingRecord = await pool.query(
      'SELECT * FROM quirk WHERE mail = $1',
      [mail]
    );

    if (existingRecord.rows.length > 0) {
      // Update existing record
      const result = await pool.query(`
        UPDATE quirk 
        SET 
          account = COALESCE($2, account),
          chains = COALESCE($3, chains),
          yeschain = COALESCE($4, yeschain),
          yesaddress = COALESCE($5, yesaddress),
          smartwallets = COALESCE($6, smartwallets),
          updated_at = CURRENT_TIMESTAMP
        WHERE mail = $1
        RETURNING *
      `, [mail, account, chains, yeschain, yesaddress, smartwallets]);

      res.json({
        message: 'Quirk data updated successfully',
        quirk: result.rows[0]
      });
    } else {
      // Create new record
      const result = await pool.query(`
        INSERT INTO quirk (mail, account, chains, yeschain, yesaddress, smartwallets)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [mail, account, chains, yeschain, yesaddress, smartwallets]);

      res.status(201).json({
        message: 'Quirk data created successfully',
        quirk: result.rows[0]
      });
    }
  } catch (error) {
    console.error('Error in POST /api/quirk:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get quirk data by email
app.get('/api/quirk/:mail', async (req, res) => {
  try {
    const { mail } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM quirk WHERE mail = $1',
      [mail]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quirk data not found for this email' });
    }

    res.json({
      quirk: result.rows[0]
    });
  } catch (error) {
    console.error('Error in GET /api/quirk/:mail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all quirk data
app.get('/api/quirk', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM quirk ORDER BY created_at DESC');
    
    res.json({
      count: result.rows.length,
      quirk: result.rows
    });
  } catch (error) {
    console.error('Error in GET /api/quirk:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Partial update quirk data
app.patch('/api/quirk/:mail', async (req, res) => {
  try {
    const { mail } = req.params;
    const { account, chains, yeschain, yesaddress, smartwallets } = req.body;
    
    // Check if record exists
    const existingRecord = await pool.query(
      'SELECT * FROM quirk WHERE mail = $1',
      [mail]
    );

    if (existingRecord.rows.length === 0) {
      return res.status(404).json({ error: 'Quirk data not found for this email' });
    }

    // Build dynamic update query
    const updateFields = [];
    const values = [mail];
    let paramCount = 1;

    if (account !== undefined) {
      updateFields.push(`account = $${++paramCount}`);
      values.push(account);
    }
    if (chains !== undefined) {
      updateFields.push(`chains = $${++paramCount}`);
      values.push(chains);
    }
    if (yeschain !== undefined) {
      updateFields.push(`yeschain = $${++paramCount}`);
      values.push(yeschain);
    }
    if (yesaddress !== undefined) {
      updateFields.push(`yesaddress = $${++paramCount}`);
      values.push(yesaddress);
    }
    if (smartwallets !== undefined) {
      updateFields.push(`smartwallets = $${++paramCount}`);
      values.push(smartwallets);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const result = await pool.query(`
      UPDATE quirk 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE mail = $1
      RETURNING *
    `, values);

    res.json({
      message: 'Quirk data updated successfully',
      quirk: result.rows[0]
    });
  } catch (error) {
    console.error('Error in PATCH /api/quirk/:mail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete quirk data
app.delete('/api/quirk/:mail', async (req, res) => {
  try {
    const { mail } = req.params;
    
    const result = await pool.query(
      'DELETE FROM quirk WHERE mail = $1 RETURNING *',
      [mail]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quirk data not found for this email' });
    }

    res.json({
      message: 'Quirk data deleted successfully',
      quirk: result.rows[0]
    });
  } catch (error) {
    console.error('Error in DELETE /api/quirk/:mail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create multi-chain wallets
app.post('/api/create-wallet/:chain', async (req, res) => {
  try {
    const { chain } = req.params;
    const { destinationDomain, mintRecipient } = req.body;
    
    if (!destinationDomain || !mintRecipient) {
      return res.status(400).json({ 
        error: 'Both destinationDomain and mintRecipient are required' 
      });
    }

    console.log(`🔧 Creating ${chain.toUpperCase()} wallet for domain: ${destinationDomain}, recipient: ${mintRecipient}`);
    
    let walletAddress;
    
    if (chain.toLowerCase() === 'eth') {
      // ETH Configuration
      const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY;
      const RPC_URL = process.env.ETH_RPC_URL;
      const FACTORY_ADDRESS = process.env.ETH_FACTORY_ADDRESS;
      
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      
      const factoryABI = [
        "function owner() external view returns (address)",
        "function createSingleWallet(uint32 destinationDomain, bytes32 mintRecipient) external returns (address walletAddress)",
        "event WalletCreated(address indexed wallet, uint32 destinationDomain, bytes32 mintRecipient)"
      ];
      
      const factory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, wallet);
      
      // Check ownership
      const factoryOwner = await factory.owner();
      if (factoryOwner.toLowerCase() !== wallet.address.toLowerCase()) {
        throw new Error("Not factory owner");
      }
      
      // Try to create wallet with retry logic
      let attempts = 0;
      const maxAttempts = 2;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`🔄 Attempt ${attempts} to create ETH wallet...`);
          
          // Create wallet
          const tx = await factory.createSingleWallet(destinationDomain, mintRecipient);
          const receipt = await tx.wait();
          
          // Get wallet address from event
          const event = receipt.logs.find(log => {
            try {
              const parsed = factory.interface.parseLog(log);
              return parsed.name === "WalletCreated";
            } catch {
              return false;
            }
          });
          
          if (event) {
            const parsed = factory.interface.parseLog(event);
            walletAddress = parsed.args.wallet;
            console.log(`✅ ETH wallet created successfully on attempt ${attempts}: ${walletAddress}`);
            break;
          } else {
            throw new Error("Wallet creation failed - no event found");
          }
          
        } catch (error) {
          console.error(`❌ ETH attempt ${attempts} failed:`, error.message);
          
          if (attempts >= maxAttempts) {
            throw new Error(`ETH wallet creation failed after ${maxAttempts} attempts: ${error.message}`);
          }
          
          // Wait a bit before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
          } else if (chain.toLowerCase() === 'arbitrum') {
        // Arbitrum Configuration
        const PRIVATE_KEY = process.env.ARBITRUM_PRIVATE_KEY;
        const RPC_URL = process.env.ARBITRUM_RPC_URL;
        const FACTORY_ADDRESS = process.env.ARBITRUM_FACTORY_ADDRESS;
        
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        const factoryABI = [
          "function owner() external view returns (address)",
          "function createSingleWallet(uint32 destinationDomain, bytes32 mintRecipient) external returns (address walletAddress)",
          "event WalletCreated(address indexed wallet, uint32 destinationDomain, bytes32 mintRecipient)"
        ];
        
        const factory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, wallet);
        
        // Check ownership
        const factoryOwner = await factory.owner();
        if (factoryOwner.toLowerCase() !== wallet.address.toLowerCase()) {
          throw new Error("Not factory owner");
        }
        
        // Try to create wallet with retry logic
        let attempts = 0;
        const maxAttempts = 2;
        
        while (attempts < maxAttempts) {
          try {
            attempts++;
            console.log(`🔄 Attempt ${attempts} to create Arbitrum wallet...`);
            
            // Create wallet
            const tx = await factory.createSingleWallet(destinationDomain, mintRecipient);
            const receipt = await tx.wait();
            
            // Get wallet address from event
            const event = receipt.logs.find(log => {
              try {
                const parsed = factory.interface.parseLog(log);
                return parsed.name === "WalletCreated";
              } catch {
                return false;
            }
          });
          
          if (event) {
            const parsed = factory.interface.parseLog(event);
            walletAddress = parsed.args.wallet;
            console.log(`✅ Arbitrum wallet created successfully on attempt ${attempts}: ${walletAddress}`);
            break;
          } else {
            throw new Error("Wallet creation failed - no event found");
          }
          
        } catch (error) {
          console.error(`❌ Arbitrum attempt ${attempts} failed:`, error.message);
          
          if (attempts >= maxAttempts) {
            throw new Error(`Arbitrum wallet creation failed after ${maxAttempts} attempts: ${error.message}`);
          }
          
          // Wait a bit before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      } else if (chain.toLowerCase() === 'base') {
        // Base Configuration
        const PRIVATE_KEY = process.env.BASE_PRIVATE_KEY;
        const RPC_URL = process.env.BASE_RPC_URL;
        const FACTORY_ADDRESS = process.env.BASE_FACTORY_ADDRESS;
        
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        const factoryABI = [
          "function owner() external view returns (address)",
          "function createSingleWallet(uint32 destinationDomain, bytes32 mintRecipient) external returns (address walletAddress)",
          "event WalletCreated(address indexed wallet, uint32 destinationDomain, bytes32 mintRecipient)"
        ];
        
        const factory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, wallet);
        
        // Check ownership
        const factoryOwner = await factory.owner();
        if (factoryOwner.toLowerCase() !== wallet.address.toLowerCase()) {
          throw new Error("Not factory owner");
        }
        
        // Try to create wallet with retry logic
        let attempts = 0;
        const maxAttempts = 2;
        
        while (attempts < maxAttempts) {
          try {
            attempts++;
            console.log(`🔄 Attempt ${attempts} to create Base wallet...`);
            
            // Create wallet
            const tx = await factory.createSingleWallet(destinationDomain, mintRecipient);
            const receipt = await tx.wait();
            
            // Get wallet address from event
            const event = receipt.logs.find(log => {
              try {
                const parsed = factory.interface.parseLog(log);
                return parsed.name === "WalletCreated";
              } catch {
                return false;
              }
            });
            
            if (event) {
              const parsed = factory.interface.parseLog(event);
              walletAddress = parsed.args.wallet;
              console.log(`✅ Base wallet created successfully on attempt ${attempts}: ${walletAddress}`);
              break;
            } else {
              throw new Error("Wallet creation failed - no event found");
            }
            
          } catch (error) {
            console.error(`❌ Base attempt ${attempts} failed:`, error.message);
            
            if (attempts >= maxAttempts) {
              throw new Error(`Base wallet creation failed after ${maxAttempts} attempts: ${error.message}`);
            }
            
            // Wait a bit before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        
      } else if (chain.toLowerCase() === 'avalanche') {
        // Avalanche Configuration
        const PRIVATE_KEY = process.env.AVALANCHE_PRIVATE_KEY;
        const RPC_URL = process.env.AVALANCHE_RPC_URL;
        const FACTORY_ADDRESS = process.env.AVALANCHE_FACTORY_ADDRESS;
        
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        const factoryABI = [
          "function owner() external view returns (address)",
          "function createSingleWallet(uint32 destinationDomain, bytes32 mintRecipient) external returns (address walletAddress)",
          "event WalletCreated(address indexed wallet, uint32 destinationDomain, bytes32 mintRecipient)"
        ];
        
        const factory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, wallet);
        
        // Check ownership
        const factoryOwner = await factory.owner();
        if (factoryOwner.toLowerCase() !== wallet.address.toLowerCase()) {
          throw new Error("Not factory owner");
        }
        
        // Try to create wallet with retry logic
        let attempts = 0;
        const maxAttempts = 2;
        
        while (attempts < maxAttempts) {
          try {
            attempts++;
            console.log(`🔄 Attempt ${attempts} to create Avalanche wallet...`);
            
            // Create wallet
            const tx = await factory.createSingleWallet(destinationDomain, mintRecipient);
            const receipt = await tx.wait();
            
            // Get wallet address from event
            const event = receipt.logs.find(log => {
              try {
                const parsed = factory.interface.parseLog(log);
                return parsed.name === "WalletCreated";
              } catch {
                return false;
              }
            });
            
            if (event) {
              const parsed = factory.interface.parseLog(event);
              walletAddress = parsed.args.wallet;
              console.log(`✅ Avalanche wallet created successfully on attempt ${attempts}: ${walletAddress}`);
              break;
            } else {
              throw new Error("Wallet creation failed - no event found");
            }
            
          } catch (error) {
            console.error(`❌ Avalanche attempt ${attempts} failed:`, error.message);
            
            if (attempts >= maxAttempts) {
              throw new Error(`Avalanche wallet creation failed after ${maxAttempts} attempts: ${error.message}`);
            }
            
            // Wait a bit before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        
      } else {
        throw new Error(`Chain ${chain} not supported yet. Supported chains: eth, arbitrum, base, avalanche`);
      }
      
      if (!walletAddress) {
        throw new Error("Failed to create wallet after all attempts");
      }
      
      // On success only - return wallet address
      res.json({
        walletAddress: walletAddress
      });
      
    } catch (error) {
      console.error(`Error in POST /api/create-wallet/${req.params.chain}:`, error);
      // On failure only - return nothing else
      res.status(500).end();
    }
  });

// Master endpoint for creating wallets on multiple chains (one by one response)
app.post('/api/create-wallet-master', async (req, res) => {
  try {
    const { chains, destinationDomain, mintRecipient } = req.body;
    
    if (!chains || !Array.isArray(chains) || chains.length === 0) {
      return res.status(400).json({ 
        error: 'Chains array is required and must not be empty' 
      });
    }
    
    if (!destinationDomain || !mintRecipient) {
      return res.status(400).json({ 
        error: 'Both destinationDomain and mintRecipient are required' 
      });
    }

    console.log(`🔧 Creating wallets on ${chains.length} chains: ${chains.join(', ')}`);
    console.log(`📋 Domain: ${destinationDomain}, Recipient: ${mintRecipient}`);
    
    // Set headers for streaming response
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    const results = {};
    const errors = {};
    
    // Process each chain sequentially and send response immediately
    for (const chain of chains) {
      try {
        console.log(`\n🔄 Processing chain: ${chain.toUpperCase()}`);
        
        let walletAddress;
        
        if (chain.toLowerCase() === 'eth') {
          // ETH Configuration
          const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY;
          const RPC_URL = process.env.ETH_RPC_URL;
          const FACTORY_ADDRESS = process.env.ETH_FACTORY_ADDRESS;
          
          // Try to create wallet with retry logic for entire ETH process
          let attempts = 0;
          const maxAttempts = 2;
          
          while (attempts < maxAttempts) {
            try {
              attempts++;
              console.log(`🔄 ETH Attempt ${attempts} to setup and create wallet...`);
              
              // Create provider and wallet
              const provider = new ethers.JsonRpcProvider(RPC_URL);
              const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
              
              const factoryABI = [
                "function owner() external view returns (address)",
                "function createSingleWallet(uint32 destinationDomain, bytes32 mintRecipient) external returns (address walletAddress)",
                "event WalletCreated(address indexed wallet, uint32 destinationDomain, bytes32 mintRecipient)"
              ];
              
              const factory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, wallet);
              
              // Check ownership
              const factoryOwner = await factory.owner();
              if (factoryOwner.toLowerCase() !== wallet.address.toLowerCase()) {
                throw new Error("Not factory owner");
              }
              
              // Create wallet
              const tx = await factory.createSingleWallet(destinationDomain, mintRecipient);
              const receipt = await tx.wait();
              
              // Get wallet address from event
              const event = receipt.logs.find(log => {
                try {
                  const parsed = factory.interface.parseLog(log);
                  return parsed.name === "WalletCreated";
                } catch {
                  return false;
                }
              });
              
              if (event) {
                const parsed = factory.interface.parseLog(event);
                walletAddress = parsed.args.wallet;
                console.log(`✅ ETH wallet created successfully on attempt ${attempts}: ${walletAddress}`);
                res.write(`ETH: ${walletAddress}\n`);
                break;
              } else {
                throw new Error("Wallet creation failed - no event found");
              }
              
            } catch (error) {
              console.error(`❌ ETH attempt ${attempts} failed:`, error.message);
              
              if (attempts >= maxAttempts) {
                throw new Error(`ETH wallet creation failed after ${maxAttempts} attempts: ${error.message}`);
              }
              
              // Wait a bit before retry
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
          
        } else if (chain.toLowerCase() === 'arbitrum') {
          // Arbitrum Configuration
          const PRIVATE_KEY = process.env.ARBITRUM_PRIVATE_KEY;
          const RPC_URL = process.env.ARBITRUM_RPC_URL;
          const FACTORY_ADDRESS = process.env.ARBITRUM_FACTORY_ADDRESS;
          
          // Try to create wallet with retry logic for entire Arbitrum process
          let attempts = 0;
          const maxAttempts = 2;
          
          while (attempts < maxAttempts) {
            try {
              attempts++;
              console.log(`🔄 Arbitrum Attempt ${attempts} to setup and create wallet...`);
              
              // Create provider and wallet
              const provider = new ethers.JsonRpcProvider(RPC_URL);
              const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
              
              const factoryABI = [
                "function owner() external view returns (address)",
                "function createSingleWallet(uint32 destinationDomain, bytes32 mintRecipient) external returns (address walletAddress)",
                "event WalletCreated(address indexed wallet, uint32 destinationDomain, bytes32 mintRecipient)"
              ];
              
              const factory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, wallet);
              
              // Check ownership
              const factoryOwner = await factory.owner();
              if (factoryOwner.toLowerCase() !== wallet.address.toLowerCase()) {
                throw new Error("Not factory owner");
              }
              
              // Create wallet
              const tx = await factory.createSingleWallet(destinationDomain, mintRecipient);
              const receipt = await tx.wait();
              
              // Get wallet address from event
              const event = receipt.logs.find(log => {
                try {
                  const parsed = factory.interface.parseLog(log);
                  return parsed.name === "WalletCreated";
                } catch {
                  return false;
                }
              });
              
              if (event) {
                const parsed = factory.interface.parseLog(event);
                walletAddress = parsed.args.wallet;
                console.log(`✅ Arbitrum wallet created successfully on attempt ${attempts}: ${walletAddress}`);
                res.write(`ARBITRUM: ${walletAddress}\n`);
                break;
              } else {
                throw new Error("Wallet creation failed - no event found");
              }
              
            } catch (error) {
              console.error(`❌ Arbitrum attempt ${attempts} failed:`, error.message);
              
              if (attempts >= maxAttempts) {
                throw new Error(`Arbitrum wallet creation failed after ${maxAttempts} attempts: ${error.message}`);
              }
              
              // Wait a bit before retry
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
          
        } else if (chain.toLowerCase() === 'base') {
          // Base Configuration
          const PRIVATE_KEY = process.env.BASE_PRIVATE_KEY;
          const RPC_URL = process.env.BASE_RPC_URL;
          const FACTORY_ADDRESS = process.env.BASE_FACTORY_ADDRESS;
          
          // Try to create wallet with retry logic for entire Base process
          let attempts = 0;
          const maxAttempts = 2;
          
          while (attempts < maxAttempts) {
            try {
              attempts++;
              console.log(`🔄 Base Attempt ${attempts} to setup and create wallet...`);
              
              // Create provider and wallet
              const provider = new ethers.JsonRpcProvider(RPC_URL);
              const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
              
              const factoryABI = [
                "function owner() external view returns (address)",
                "function createSingleWallet(uint32 destinationDomain, bytes32 mintRecipient) external returns (address walletAddress)",
                "event WalletCreated(address indexed wallet, uint32 destinationDomain, bytes32 mintRecipient)"
              ];
              
              const factory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, wallet);
              
              // Check ownership
              const factoryOwner = await factory.owner();
              if (factoryOwner.toLowerCase() !== wallet.address.toLowerCase()) {
                throw new Error("Not factory owner");
              }
              
              // Create wallet
              const tx = await factory.createSingleWallet(destinationDomain, mintRecipient);
              const receipt = await tx.wait();
              
              // Get wallet address from event
              const event = receipt.logs.find(log => {
                try {
                  const parsed = factory.interface.parseLog(log);
                  return parsed.name === "WalletCreated";
                } catch {
                  return false;
                }
              });
              
              if (event) {
                const parsed = factory.interface.parseLog(event);
                walletAddress = parsed.args.wallet;
                console.log(`✅ Base wallet created successfully on attempt ${attempts}: ${walletAddress}`);
                res.write(`BASE: ${walletAddress}\n`);
                break;
              } else {
                throw new Error("Wallet creation failed - no event found");
              }
              
            } catch (error) {
              console.error(`❌ Base attempt ${attempts} failed:`, error.message);
              
              if (attempts >= maxAttempts) {
                throw new Error(`Base wallet creation failed after ${maxAttempts} attempts: ${error.message}`);
              }
              
              // Wait a bit before retry
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
          
        } else if (chain.toLowerCase() === 'avalanche') {
          // Avalanche Configuration
          const PRIVATE_KEY = process.env.AVALANCHE_PRIVATE_KEY;
          const RPC_URL = process.env.AVALANCHE_RPC_URL;
          const FACTORY_ADDRESS = process.env.AVALANCHE_FACTORY_ADDRESS;
          
          // Try to create wallet with retry logic for entire Avalanche process
          let attempts = 0;
          const maxAttempts = 2;
          
          while (attempts < maxAttempts) {
            try {
              attempts++;
              console.log(`🔄 Avalanche Attempt ${attempts} to setup and create wallet...`);
              
              // Create provider and wallet
              const provider = new ethers.JsonRpcProvider(RPC_URL);
              const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
              const factoryABI = [
                "function owner() external view returns (address)",
                "function createSingleWallet(uint32 destinationDomain, bytes32 mintRecipient) external returns (address walletAddress)",
                "event WalletCreated(address indexed wallet, uint32 destinationDomain, bytes32 mintRecipient)"
              ];
              
              const factory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, wallet);
              
              // Check ownership
              const factoryOwner = await factory.owner();
              if (factoryOwner.toLowerCase() !== wallet.address.toLowerCase()) {
                throw new Error("Not factory owner");
              }
              
              // Create wallet
              const tx = await factory.createSingleWallet(destinationDomain, mintRecipient);
              const receipt = await tx.wait();
              
              // Get wallet address from event
              const event = receipt.logs.find(log => {
                try {
                  const parsed = factory.interface.parseLog(log);
                  return parsed.name === "WalletCreated";
                } catch {
                  return false;
                }
              });
              
              if (event) {
                const parsed = factory.interface.parseLog(event);
                walletAddress = parsed.args.wallet;
                console.log(`✅ Avalanche wallet created successfully on attempt ${attempts}: ${walletAddress}`);
                res.write(`AVALANCHE: ${walletAddress}\n`);
                break;
              } else {
                throw new Error("Wallet creation failed - no event found");
              }
              
            } catch (error) {
              console.error(`❌ Avalanche attempt ${attempts} failed:`, error.message);
              
              if (attempts >= maxAttempts) {
                throw new Error(`Avalanche wallet creation failed after ${maxAttempts} attempts: ${error.message}`);
              }
              
              // Wait a bit before retry
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
          
        } else {
          throw new Error(`Chain ${chain} not supported yet. Supported chains: eth, arbitrum, base, avalanche`);
        }
        
        if (walletAddress) {
          results[chain.toLowerCase()] = walletAddress;
          console.log(`✅ ${chain.toUpperCase()}: ${walletAddress}`);
        } else {
          throw new Error("Failed to create wallet after all attempts");
        }
        
      } catch (error) {
        console.error(`❌ Failed to create ${chain} wallet:`, error.message);
        errors[chain.toLowerCase()] = error.message;
      }
    }
    
    res.end();
    
  } catch (error) {
    console.error('Error in POST /api/create-wallet-master:', error);
    res.write(`❌ MASTER ERROR: ${error.message}\n`);
    res.end();
  }
});

// ===== QUIRK-PAY API ENDPOINTS =====

// Create new payment record
app.post('/api/quirk-pay', async (req, res) => {
  try {
    const { amount, mail, status, hash } = req.body;
    
    if (!amount || !mail) {
      return res.status(400).json({ error: 'Amount and mail are required' });
    }

    const result = await pool.query(`
      INSERT INTO quirk_pay (amount, mail, status, hash)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [amount, mail, status || 'pending', hash]);

    res.status(201).json({
      message: 'Payment record created successfully',
      payment: result.rows[0]
    });
  } catch (error) {
    console.error('Error in POST /api/quirk-pay:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payment by payid
app.get('/api/quirk-pay/:payid', async (req, res) => {
  try {
    const { payid } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM quirk_pay WHERE payid = $1',
      [payid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    res.json({
      payment: result.rows[0]
    });
  } catch (error) {
    console.error('Error in GET /api/quirk-pay/:payid:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all payment records
app.get('/api/quirk-pay', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM quirk_pay ORDER BY created_at DESC');
    
    res.json({
      count: result.rows.length,
      payments: result.rows
    });
  } catch (error) {
    console.error('Error in GET /api/quirk-pay:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payments by mail
app.get('/api/quirk-pay/mail/:mail', async (req, res) => {
  try {
    const { mail } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM quirk_pay WHERE mail = $1 ORDER BY created_at DESC',
      [mail]
    );

    res.json({
      count: result.rows.length,
      payments: result.rows
    });
  } catch (error) {
    console.error('Error in GET /api/quirk-pay/mail/:mail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update payment record
app.patch('/api/quirk-pay/:payid', async (req, res) => {
  try {
    const { payid } = req.params;
    const { amount, mail, status, hash } = req.body;
    
    // Check if record exists
    const existingRecord = await pool.query(
      'SELECT * FROM quirk_pay WHERE payid = $1',
      [payid]
    );

    if (existingRecord.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    // Build dynamic update query
    const updateFields = [];
    const values = [payid];
    let paramCount = 1;

    if (amount !== undefined) {
      updateFields.push(`amount = $${++paramCount}`);
      values.push(amount);
    }
    if (mail !== undefined) {
      updateFields.push(`mail = $${++paramCount}`);
      values.push(mail);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${++paramCount}`);
      values.push(status);
    }
    if (hash !== undefined) {
      updateFields.push(`hash = $${++paramCount}`);
      values.push(hash);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const result = await pool.query(`
      UPDATE quirk_pay 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE payid = $1
      RETURNING *
    `, values);

    res.json({
      message: 'Payment record updated successfully',
      payment: result.rows[0]
    });
  } catch (error) {
    console.error('Error in PATCH /api/quirk-pay/:payid:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete payment record
app.delete('/api/quirk-pay/:payid', async (req, res) => {
  try {
    const { payid } = req.params;
    
    const result = await pool.query(
      'DELETE FROM quirk_pay WHERE payid = $1 RETURNING *',
      [payid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    res.json({
      message: 'Payment record deleted successfully',
      payment: result.rows[0]
    });
  } catch (error) {
    console.error('Error in DELETE /api/quirk-pay/:payid:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
async function startServer() {
  await initDatabase();
  
  app.listen(PORT, () => {
    console.log(`🚀 Quirk server (ENV) running on port ${PORT}`);
    console.log('📋 Available endpoints:');
    console.log('  GET    /health');
    console.log('  POST   /api/quirk');
    console.log('  GET    /api/quirk');
    console.log('  GET    /api/quirk/:mail');
    console.log('  PATCH  /api/quirk/:mail');
    console.log('  DELETE /api/quirk/:mail');
    console.log('  POST   /api/quirk-pay');
    console.log('  GET    /api/quirk-pay');
    console.log('  GET    /api/quirk-pay/:payid');
    console.log('  GET    /api/quirk-pay/mail/:mail');
    console.log('  PATCH  /api/quirk-pay/:payid');
    console.log('  DELETE /api/quirk-pay/:payid');
    console.log('  POST   /api/create-wallet/:chain');
    console.log('  POST   /api/create-wallet-master');
  });
}

startServer().catch(console.error);
