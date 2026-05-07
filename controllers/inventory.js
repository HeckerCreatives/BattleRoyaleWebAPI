const { default: mongoose } = require('mongoose');
const Inventory = require('../models/Inventory');
const Users = require('../models/Users');
const NFTActivity = require('../models/NFTActivity');
const NFTMarketplace = require('../models/NFTMarketplace');
const { ethers, JsonRpcProvider } = require('ethers');



exports.getMyInventory = async (req, res) => {
    try {
        const { username, id } = req.user;
        const { 
            page = 0, 
            limit = 20, 
            rarity,           // Filter by rarity: common, uncommon, rare, epic, legendary, mythic
            type,             // Filter by type: POTION, ENERGY, TITLE, etc.
            includeNFTs,      // true/false - include minted NFTs
            includeListed,    // true/false - include listed items on marketplace
            sort = 'newest'   // Sort options: newest, oldest, lowestId, highestId, a-z, z-a
        } = req.query;

        const pageOptions = {
            page: parseInt(page) || 0,
            limit: parseInt(limit) || 20,
        };

        // Build match condition
        const matchCondition = { owner: id };
        
        // // Filter: Exclude listed items by default
        // if (includeListed !== 'true') {
        //     matchCondition.isListed = false;
        // }
        
        // // Filter: Exclude minted NFTs by default
        // if (includeNFTs === 'true') {
        //     matchCondition.isMinted = true;
        // } 

        // Filter: By type (POTION, ENERGY, TITLE, etc.)
        if (type) {
            matchCondition.type = type.toUpperCase();
        }

        // Build sort condition
        let sortCondition = {};
        switch (sort) {
            case 'oldest':
                sortCondition = { createdAt: 1 };
                break;
            case 'lowestId':
                sortCondition = { tokenId: 1 };
                break;
            case 'highestId':
                sortCondition = { tokenId: -1 };
                break;
            case 'a-z':
                sortCondition = { itemname: -1 };
                break;
            case 'z-a':
                sortCondition = { itemname: 1 };
                break;
            case 'newest':
            default:
                sortCondition = { createdAt: -1 };
                break;
        }

        console.log(matchCondition)
        // Get total count for pagination
        const totalCount = await Inventory.countDocuments(matchCondition);

        // Fetch inventory with filters, sorting, and pagination
        let inventory = await Inventory.find(matchCondition)
            .populate('item', 'itemname description amount currency type rarity canBeMintedAsNFT ipfsImage')
            .sort(sortCondition)
            .skip(pageOptions.page * pageOptions.limit)
            .limit(pageOptions.limit)
            .lean();

        // Apply rarity filter post-populate (since rarity is in Marketplace, not Inventory)
        if (rarity) {
            inventory = inventory.filter(inv => 
                inv.item && inv.item.rarity === rarity.toLowerCase()
            );
        }

        return res.json({
            message: "success",
            data: {
                inventory,
                pagination: {
                    currentPage: pageOptions.page,
                    totalPages: Math.ceil(totalCount / pageOptions.limit),
                    totalItems: totalCount,
                    itemsPerPage: pageOptions.limit
                },
                summary: {
                    totalQuantity: inventory.reduce((sum, item) => sum + (item.quantity || 0), 0),
                    displayedItems: inventory.length
                }
            }
        });

    } catch (err) {
        console.error('Get inventory error:', err);
        return res.status(500).json({ 
            message: "error", 
            data: "Failed to retrieve inventory." 
        });
    }
};

exports.mintItem = async (req, res) => {
    const { id, username } = req.user;
    try {
        const { inventoryId, metadataUri, targetWallet } = req.body;

        if (!inventoryId) {
            return res.status(400).json({ message: "bad-request", data: "Inventory ID is required!" });
        }

        const inventoryItem = await Inventory.findOne({ _id: new mongoose.Types.ObjectId(inventoryId), owner: id }).populate('item');

        if (!inventoryItem) {
            return res.status(404).json({ message: "failed", data: "Item not found in your inventory!" });
        }

        if (!inventoryItem.isMintable) {
            return res.status(400).json({ message: "failed", data: "This item is not mintable." });
        }

        if (inventoryItem.isMinted) {
            return res.status(400).json({ message: "failed", data: "Item is already minted." });
        }

        if (inventoryItem.quantity < 1) {
            return res.status(400).json({ message: "failed", data: "No quantity available to mint." });
        }

        const ownerWallet = (targetWallet && String(targetWallet).toLowerCase()) || "unknown";

        const newItem = {
            tokenId: inventoryItem.tokenId,
            owner: id,
            item: inventoryItem.item ? inventoryItem.item._id : undefined,
            itemid: inventoryItem.itemid,
            itemname: inventoryItem.itemname,
            type: inventoryItem.type,
            quantity: 1,
            isEquipped: false,
            ipfsImage: inventoryItem.ipfsImage || metadataUri || (inventoryItem.item && inventoryItem.item.ipfsImage) || null,
            isMintable: true,
            isMinted: true,
            nftData: {
                tokenId: inventoryItem.tokenId,
                nftContractAddress: process.env.NFT_CONTRACT_ADDRESS || null,
                marketplaceContractAddress: process.env.MARKETPLACE_CONTRACT_ADDRESS || null,
                tokenStandard: "ERC721",
                chainId: process.env.DEFAULT_CHAIN_ID ? parseInt(process.env.DEFAULT_CHAIN_ID, 10) : null,
                mintTransactionHash: null,
                mintedAt: null,
                metadataUri: metadataUri || inventoryItem.ipfsImage || (inventoryItem.item && inventoryItem.item.ipfsImage) || null
            },
            isListed: false,
            isTransferable: inventoryItem.isTransferable !== undefined ? inventoryItem.isTransferable : true,
            transferHistory: [{
                from: "system",
                to: ownerWallet,
                txHash: null,
                action: "reserved-for-mint",
                timestamp: new Date()
            }]
        };

        
        inventoryItem.quantity -= 1;
        let remaining = inventoryItem.quantity;
        if (inventoryItem.quantity <= 0) {
            await Inventory.findByIdAndDelete(inventoryItem._id);
            remaining = 0;
        } else {
            await inventoryItem.save();
        }
        const mintedItem = await Inventory.create(newItem);

        // Record mint activity
        await NFTActivity.create({
            tokenId: mintedItem.tokenId,
            inventoryItem: mintedItem._id,
            activityType: 'mint',
            from: null,
            fromWallet: 'system',
            to: id,
            toWallet: ownerWallet,
            itemname: mintedItem.itemname,
            type: mintedItem.type,
            metadata: {
                itemId: mintedItem.itemid,
                ipfsImage: mintedItem.ipfsImage,
                metadataUri: newItem.nftData.metadataUri
            }
        });

        return res.json({
            message: "success",
            data: {
                mintedItem: mintedItem,
                remainingQuantity: remaining
            }
        });

    } catch (err) {
        console.log(`Error minting item for ${username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem minting item." });
    }
};

exports.cancelmint = async (req, res) => {
    try {
        const { id, username } = req.user;
        const { mintedItemId } = req.body;

        if (!mintedItemId) {
            return res.status(400).json({ message: "failed", data: "Minted item ID is required." });
        }

        const mintedItem = await Inventory.findOne({ 
            _id: mintedItemId, 
            owner: id,
            isMinted: true,
            'nftData.mintTransactionHash': null
        });

        if (!mintedItem) {
            return res.status(404).json({ message: "failed", data: "No valid minted item found to cancel." });
        }

        const itemid = mintedItem.itemid;
        const tokenId = mintedItem.tokenId;
        const itemname = mintedItem.itemname;
        const type = mintedItem.type;

        await Inventory.findByIdAndDelete(mintedItem._id);

        const existingUnminted = await Inventory.findOne({
            owner: id,
            itemid: itemid,
            isMinted: false
        });

        if (existingUnminted) {
            existingUnminted.quantity += 1;
            await existingUnminted.save();
        } else {
            await Inventory.createWithTokenId({
                owner: id,
                item: mintedItem.item,
                itemid: itemid,
                itemname: mintedItem.itemname,
                type: mintedItem.type,
                quantity: 1,
                isEquipped: false,
                ipfsImage: mintedItem.ipfsImage,
                isMintable: true,
                isMinted: false,
                isTransferable: mintedItem.isTransferable
            });
        }

        // Record cancel mint activity
        await NFTActivity.create({
            tokenId: tokenId,
            inventoryItem: null,
            activityType: 'cancel_mint',
            from: id,
            fromWallet: req.user.walletAddress || 'unknown',
            to: null,
            toWallet: null,
            itemname: itemname,
            type: type,
            metadata: {
                itemId: itemid,
                reason: 'User cancelled mint'
            }
        });

        return res.json({
            message: "success",
            data: "Mint cancelled and item restored."
        });

    } catch (err) {
        console.log(`Error cancelling mint for ${req.user.username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem cancelling mint." });
    }
};

exports.giftNFT = async (req, res) => {
    try {
        const { id: senderId, username: senderUsername } = req.user;
        const { inventoryId, recipientWalletAddress } = req.body;

        // Validate input
        if (!inventoryId) {
            return res.status(400).json({ 
                message: "failed", 
                data: "Inventory ID is required." 
            });
        }

        if (!recipientWalletAddress) {
            return res.status(400).json({ 
                message: "failed", 
                data: "Recipient wallet address is required." 
            });
        }

        // Normalize wallet address
        const normalizedRecipientWallet = recipientWalletAddress.toLowerCase().trim();

        // Check if recipient wallet exists in the system
        const recipientUser = await Users.findOne({ 
            walletAddress: normalizedRecipientWallet 
        });

        if (!recipientUser) {
            return res.status(404).json({ 
                message: "failed", 
                data: "Recipient wallet address does not exist in the system." 
            });
        }

        // Prevent gifting to yourself
        if (recipientUser._id.toString() === senderId.toString()) {
            return res.status(400).json({ 
                message: "failed", 
                data: "You cannot gift an NFT to yourself." 
            });
        }

        // Find the NFT in sender's inventory
        const nftItem = await Inventory.findOne({ 
            _id: new mongoose.Types.ObjectId(inventoryId), 
            owner: senderId,
            isMinted: true
        }).populate('item');

        if (!nftItem) {
            return res.status(404).json({ 
                message: "failed", 
                data: "NFT not found in your inventory or item is not minted." 
            });
        }

        // Check if item is transferable
        if (nftItem.isTransferable === false) {
            return res.status(400).json({ 
                message: "failed", 
                data: "This NFT is not transferable." 
            });
        }

        // Check if item is listed on marketplace
        if (nftItem.isListed) {
            return res.status(400).json({ 
                message: "failed", 
                data: "Cannot gift an NFT that is currently listed on the marketplace." 
            });
        }

        // Get sender's wallet address for transfer history
        const senderWallet = req.user.walletAddress || "unknown";

        // Transfer the NFT to recipient
        nftItem.owner = recipientUser._id;
        
        // Add transfer history
        if (!nftItem.transferHistory) {
            nftItem.transferHistory = [];
        }
        
        nftItem.transferHistory.push({
            from: senderWallet,
            to: normalizedRecipientWallet,
            txHash: null, // Off-chain gift, no blockchain transaction
            action: "gift",
            timestamp: new Date()
        });

        await nftItem.save();

        // Record activity in NFTActivity
        await NFTActivity.create({
            tokenId: nftItem.tokenId,
            inventoryItem: nftItem._id,
            activityType: 'gift',
            from: senderId,
            fromWallet: senderWallet,
            to: recipientUser._id,
            toWallet: normalizedRecipientWallet,
            itemname: nftItem.itemname,
            type: nftItem.type,
            metadata: {
                itemId: nftItem.itemid,
                ipfsImage: nftItem.ipfsImage
            }
        });

        return res.json({
            message: "success",
            data: {
                message: `NFT successfully gifted to ${recipientUser.username || normalizedRecipientWallet}`,
                nftItem: {
                    tokenId: nftItem.tokenId,
                    itemname: nftItem.itemname,
                    type: nftItem.type,
                    recipient: recipientUser.username,
                    recipientWallet: normalizedRecipientWallet
                }
            }
        });

    } catch (err) {
        console.error(`Error gifting NFT for ${req.user?.username}:`, err);
        return res.status(500).json({ 
            message: "error", 
            data: "There's a problem gifting the NFT." 
        });
    }
};

exports.getNFTActivity = async (req, res) => {
    try {
        const { id } = req.user;
        const { 
            page = 0, 
            limit = 20, 
            tokenId, 
            activityType 
        } = req.query;

        const pageOptions = {
            page: parseInt(page) || 0,
            limit: parseInt(limit) || 20,
        };

        // Build query - get activities where user is sender or receiver
        const query = {
            $or: [
                { from: id },
                { to: id }
            ]
        };

        if (tokenId) {
            query.tokenId = parseInt(tokenId);
        }

        if (activityType) {
            query.activityType = activityType;
        }

        const totalCount = await NFTActivity.countDocuments(query);

        const activities = await NFTActivity.find(query)
            .populate('from', 'username walletAddress')
            .populate('to', 'username walletAddress')
            .populate('inventoryItem', 'itemname type ipfsImage')
            .sort({ createdAt: -1 })
            .skip(pageOptions.page * pageOptions.limit)
            .limit(pageOptions.limit)
            .lean();

        // Add human-readable descriptions to activities
        const activitiesWithDescription = activities.map(activity => {
            let description = '';
            const itemName = activity.itemname || `NFT #${activity.tokenId}`;
            const fromUser = activity.from?.username || activity.fromWallet || 'Unknown';
            const toUser = activity.to?.username || activity.toWallet || 'Unknown';
            const isCurrentUserFrom = activity.from?._id?.toString() === id.toString();
            const isCurrentUserTo = activity.to?._id?.toString() === id.toString();

            switch (activity.activityType) {
                case 'mint':
                    description = `${itemName} was minted and reserved for on-chain minting`;
                    break;
                case 'bridge':
                    if (isCurrentUserTo) {
                        description = `You bridged ${itemName} from external wallet to your account`;
                    } else {
                        description = `${itemName} was bridged from ${fromUser} to ${toUser}`;
                    }
                    break;
                case 'gift':
                    if (isCurrentUserFrom) {
                        description = `You gifted ${itemName} to ${toUser}`;
                    } else if (isCurrentUserTo) {
                        description = `You received ${itemName} as a gift from ${fromUser}`;
                    } else {
                        description = `${itemName} was gifted from ${fromUser} to ${toUser}`;
                    }
                    break;
                case 'transfer':
                    if (isCurrentUserFrom) {
                        description = `You transferred ${itemName} to ${toUser}`;
                    } else if (isCurrentUserTo) {
                        description = `You received ${itemName} from ${fromUser}`;
                    } else {
                        description = `${itemName} was transferred from ${fromUser} to ${toUser}`;
                    }
                    break;
                case 'list':
                    if (isCurrentUserFrom) {
                        description = `You listed ${itemName} on the marketplace for ${activity.price} credits`;
                    } else {
                        description = `${fromUser} listed ${itemName} on the marketplace for ${activity.price} credits`;
                    }
                    break;
                case 'delist':
                    if (isCurrentUserFrom) {
                        description = `You removed ${itemName} from the marketplace`;
                    } else {
                        description = `${fromUser} removed ${itemName} from the marketplace`;
                    }
                    break;
                case 'sale':
                    if (isCurrentUserFrom) {
                        description = `You sold ${itemName} to ${toUser} for ${activity.price} credits`;
                    } else if (isCurrentUserTo) {
                        description = `You purchased ${itemName} from ${fromUser} for ${activity.price} credits`;
                    } else {
                        description = `${itemName} was sold from ${fromUser} to ${toUser} for ${activity.price} credits`;
                    }
                    break;
                case 'burn':
                    if (isCurrentUserFrom) {
                        description = `You burned ${itemName}`;
                    } else {
                        description = `${fromUser} burned ${itemName}`;
                    }
                    break;
                case 'cancel_mint':
                    if (isCurrentUserFrom) {
                        description = `You cancelled the mint for ${itemName} and restored it to your inventory`;
                    } else {
                        description = `${fromUser} cancelled the mint for ${itemName}`;
                    }
                    break;
                default:
                    description = `Activity on ${itemName}`;
            }

            return {
                ...activity,
                description
            };
        });

        return res.json({
            message: "success",
            data: activitiesWithDescription,
            pagination: {
                currentPage: pageOptions.page,
                totalPages: Math.ceil(totalCount / pageOptions.limit),
                totalItems: totalCount,
                itemsPerPage: pageOptions.limit
            }
        });

    } catch (err) {
        console.error(`Error getting NFT activity for ${req.user?.username}:`, err);
        return res.status(500).json({ 
            message: "error", 
            data: "Failed to retrieve NFT activity." 
        });
    }
};

exports.listNFT = async (req, res) => {
    try {
        const { id: sellerId } = req.user;
        const { inventoryId, price } = req.body;

        // Validate input
        if (!inventoryId) {
            return res.status(400).json({ 
                message: "failed", 
                data: "Inventory ID is required." 
            });
        }

        if (!price || price <= 0) {
            return res.status(400).json({ 
                message: "failed", 
                data: "Valid price is required." 
            });
        }

        // Find the NFT in seller's inventory
        const nftItem = await Inventory.findOne({ 
            _id: new mongoose.Types.ObjectId(inventoryId), 
            owner: sellerId,
            isMinted: true
        }).populate('item');

        if (!nftItem) {
            return res.status(404).json({ 
                message: "failed", 
                data: "NFT not found in your inventory or item is not minted." 
            });
        }

        // Check if item is transferable
        if (nftItem.isTransferable === false) {
            return res.status(400).json({ 
                message: "failed", 
                data: "This NFT is not transferable and cannot be listed." 
            });
        }

        // Check if already listed
        if (nftItem.isListed) {
            return res.status(400).json({ 
                message: "failed", 
                data: "This NFT is already listed on the marketplace." 
            });
        }

        // Get seller's wallet address
        const sellerWallet = req.user.walletAddress || "unknown";

        // Create marketplace listing
        const listing = await NFTMarketplace.create({
            inventoryItem: nftItem._id,
            seller: sellerId,
            selleraddress: sellerWallet,
            price: price,
            tokenid: nftItem.tokenId,
            itemname: nftItem.itemname,
            type: nftItem.type,
            ipfsImage: nftItem.ipfsImage,
            status: 'active'
        });

        // Update inventory item
        nftItem.isListed = true;
        nftItem.listingData = {
            price: price.toString(),
            listedAt: new Date(),
            listTransactionHash: null,
            seller: sellerWallet
        };

        // Add to transfer history
        if (!nftItem.transferHistory) {
            nftItem.transferHistory = [];
        }
        
        nftItem.transferHistory.push({
            from: sellerWallet,
            to: "marketplace",
            txHash: null,
            action: "list",
            timestamp: new Date()
        });

        await nftItem.save();

        // Record activity
        await NFTActivity.create({
            tokenId: nftItem.tokenId,
            inventoryItem: nftItem._id,
            activityType: 'list',
            from: sellerId,
            fromWallet: sellerWallet,
            to: null,
            toWallet: 'marketplace',
            price: price,
            itemname: nftItem.itemname,
            type: nftItem.type,
            metadata: {
                itemId: nftItem.itemid,
                ipfsImage: nftItem.ipfsImage,
                listingId: listing._id
            }
        });

        return res.json({
            message: "success",
            data: {
                message: "NFT successfully listed on marketplace",
                listing: {
                    listingId: listing._id,
                    tokenId: nftItem.tokenId,
                    itemname: nftItem.itemname,
                    type: nftItem.type,
                    price: price,
                    seller: req.user.username,
                    sellerWallet: sellerWallet
                }
            }
        });

    } catch (err) {
        console.error(`Error listing NFT for ${req.user?.username}:`, err);
        return res.status(500).json({ 
            message: "error", 
            data: "There's a problem listing the NFT." 
        });
    }
};

exports.checkOwnedTokens = async (req, res) => {
    try {
        const { id } = req.user;
        const { tokenIds } = req.body;

        // Validate input
        if (!tokenIds || !Array.isArray(tokenIds) || tokenIds.length === 0) {
            return res.status(400).json({ 
                message: "failed", 
                data: "tokenIds array is required." 
            });
        }

        // Convert tokenIds to numbers and filter duplicates
        const uniqueTokenIds = [...new Set(tokenIds.map(id => parseInt(id)))].filter(id => !isNaN(id));

        // Find all inventory items owned by this user with matching tokenIds
        const ownedItems = await Inventory.find({
            owner: id,
            tokenId: { $in: uniqueTokenIds }
        }).select('tokenId').lean();

        // Extract the tokenIds that are owned
        const owned = ownedItems.map(item => item.tokenId);

        return res.json({
            message: "success",
            data: {
                owned: owned
            }
        });

    } catch (err) {
        console.error(`Error checking owned tokens for ${req.user?.username}:`, err);
        return res.status(500).json({ 
            message: "error", 
            data: "Failed to check owned tokens." 
        });
    }
};

exports.claimNFT = async (req, res) => {
    try {
        const { id: userId, username } = req.user;
        const { tokenId, walletAddress } = req.body;

        // Validate input
        if (!tokenId) {
            return res.status(400).json({ 
                message: "failed", 
                data: "tokenId is required." 
            });
        }

        if (!walletAddress) {
            return res.status(400).json({ 
                message: "failed", 
                data: "walletAddress is required." 
            });
        }

        const normalizedWallet = walletAddress.toLowerCase().trim();
        const tokenIdNum = parseInt(tokenId);

        if (isNaN(tokenIdNum)) {
            return res.status(400).json({ 
                message: "failed", 
                data: "Invalid tokenId." 
            });
        }

        // Check if this tokenId is already owned by this user
        const alreadyOwned = await Inventory.findOne({
            owner: userId,
            tokenId: tokenIdNum
        });

        if (alreadyOwned) {
            return res.status(400).json({ 
                message: "failed", 
                data: "This NFT is already in your account." 
            });
        }

        // Find the existing NFT in the system (should exist from another owner)
        const existingNFT = await Inventory.findOne({
            tokenId: tokenIdNum
        }).populate('item');

        if (!existingNFT) {
            return res.status(404).json({ 
                message: "failed", 
                data: "This NFT does not exist in our system." 
            });
        }

        // Verify on-chain ownership
        const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS;
        const RPC_URL = process.env.RPC_URL;

        if (!NFT_CONTRACT_ADDRESS || !RPC_URL) {
            console.error('Missing NFT_CONTRACT_ADDRESS or RPC_URL in environment variables');
            return res.status(500).json({ 
                message: "error", 
                data: "Blockchain verification not configured." 
            });
        }

        try {
            // Connect to blockchain (compatible with ethers v5 and v6)
            const provider = ethers.providers 
                ? new ethers.providers.JsonRpcProvider(RPC_URL)  // ethers v5
                : new ethers.JsonRpcProvider(RPC_URL);            // ethers v6
            
            // ERC721 ownerOf ABI
            const nftAbi = [
                "function ownerOf(uint256 tokenId) view returns (address)"
            ];
            
            const nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, nftAbi, provider);
            
            // Get the owner of the token from blockchain
            const onChainOwner = await nftContract.ownerOf(tokenIdNum);
            
            // Compare with provided wallet address
            if (onChainOwner.toLowerCase() !== normalizedWallet) {
                return res.status(403).json({ 
                    message: "failed", 
                    data: "Wallet address does not own this NFT on-chain." 
                });
            }

        } catch (blockchainErr) {
            console.error(`Blockchain verification error for tokenId ${tokenIdNum}:`, blockchainErr);
            
            // Check if token doesn't exist
            if (blockchainErr.message && blockchainErr.message.includes('nonexistent token')) {
                return res.status(404).json({ 
                    message: "failed", 
                    data: "This NFT does not exist on-chain." 
                });
            }
            
            return res.status(500).json({ 
                message: "error", 
                data: "Failed to verify NFT ownership on blockchain." 
            });
        }

        // Get previous owner info for transfer history
        const previousOwner = await Users.findById(existingNFT.owner);
        const previousWallet = previousOwner?.walletAddress || "unknown";

        // Update the NFT owner to the new user
        existingNFT.owner = userId;
        
        // Add transfer history
        if (!existingNFT.transferHistory) {
            existingNFT.transferHistory = [];
        }
        
        existingNFT.transferHistory.push({
            from: previousWallet,
            to: normalizedWallet,
            txHash: null,
            action: "bridge",
            timestamp: new Date()
        });

        // If it was listed, unlist it
        if (existingNFT.isListed) {
            existingNFT.isListed = false;
            existingNFT.listingData = null;
            
            // Remove from marketplace
            await NFTMarketplace.updateMany(
                { inventoryItem: existingNFT._id, status: 'active' },
                { status: 'cancelled' }
            );
        }

        await existingNFT.save();

        // Record bridge activity
        await NFTActivity.create({
            tokenId: tokenIdNum,
            inventoryItem: existingNFT._id,
            activityType: 'bridge',
            from: existingNFT.owner !== userId ? existingNFT.owner : null,
            fromWallet: previousWallet,
            to: userId,
            toWallet: normalizedWallet,
            itemname: existingNFT.itemname,
            type: existingNFT.type,
            metadata: {
                bridged: true,
                walletAddress: normalizedWallet,
                previousOwner: previousOwner?._id || null
            }
        });

        return res.json({
            message: "success",
            data: {
                success: true,
                inventory: existingNFT
            }
        });

    } catch (err) {
        console.error(`Error claiming NFT for ${req.user?.username}:`, err);
        return res.status(500).json({ 
            message: "error", 
            data: "Failed to claim NFT." 
        });
    }
};

exports.getTokenDetails = async (req, res) => {
    try {
        const { tokenId } = req.query;

        // Validate tokenId
        if (!tokenId) {
            return res.status(400).json({ 
                message: "failed", 
                data: "tokenId is required." 
            });
        }

        const tokenIdNum = parseInt(tokenId);

        if (isNaN(tokenIdNum)) {
            return res.status(400).json({ 
                message: "failed", 
                data: "Invalid tokenId format." 
            });
        }

        // Find the token in inventory
        const tokenItem = await Inventory.findOne({ tokenId: tokenIdNum })
            .populate('item', 'itemname description amount currency type rarity canBeMintedAsNFT ipfsImage')
            .populate('owner', 'username walletAddress email')
            .lean();

        if (!tokenItem) {
            return res.status(404).json({ 
                message: "failed", 
                data: "Token not found in the system." 
            });
        }

        // Check if token is listed on marketplace
        let marketplaceListing = null;
        if (tokenItem.isListed) {
            marketplaceListing = await NFTMarketplace.findOne({
                inventoryItem: tokenItem._id,
                status: 'active'
            }).populate('seller', 'username walletAddress').lean();
        }

        // Get activity history for this token
        const activityHistory = await NFTActivity.find({ tokenId: tokenIdNum })
            .populate('from', 'username walletAddress')
            .populate('to', 'username walletAddress')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        // Build comprehensive token details response
        const tokenDetails = {
            id: tokenItem._id,
            tokenId: tokenItem.tokenId,
            itemname: tokenItem.itemname,
            type: tokenItem.type,
            quantity: tokenItem.quantity,
            ipfsImage: tokenItem.ipfsImage,
            
            // Owner information
            owner: {
                userId: tokenItem.owner?._id,
                username: tokenItem.owner?.username,
                walletAddress: tokenItem.owner?.walletAddress,
                email: tokenItem.owner?.email
            },
            
            // Item details (from Marketplace model)
            itemDetails: tokenItem.item ? {
                itemname: tokenItem.item.itemname,
                description: tokenItem.item.description,
                type: tokenItem.item.type,
                rarity: tokenItem.item.rarity,
                canBeMintedAsNFT: tokenItem.item.canBeMintedAsNFT,
                ipfsImage: tokenItem.item.ipfsImage
            } : null,
            
            // Status flags
            status: {
                isEquipped: tokenItem.isEquipped,
                isMintable: tokenItem.isMintable,
                isMinted: tokenItem.isMinted,
                isListed: tokenItem.isListed,
                isTransferable: tokenItem.isTransferable
            },
            
            // NFT blockchain data
            nftData: tokenItem.nftData ? {
                tokenId: tokenItem.nftData.tokenId,
                nftContractAddress: tokenItem.nftData.nftContractAddress,
                marketplaceContractAddress: tokenItem.nftData.marketplaceContractAddress,
                tokenStandard: tokenItem.nftData.tokenStandard,
                chainId: tokenItem.nftData.chainId,
                mintTransactionHash: tokenItem.nftData.mintTransactionHash,
                mintedAt: tokenItem.nftData.mintedAt,
                metadataUri: tokenItem.nftData.metadataUri
            } : null,
            
            // Marketplace listing data
            marketplaceListing: marketplaceListing ? {
                listingId: marketplaceListing._id,
                price: marketplaceListing.price,
                seller: {
                    userId: marketplaceListing.seller?._id,
                    username: marketplaceListing.seller?.username,
                    walletAddress: marketplaceListing.seller?.walletAddress
                },
                status: marketplaceListing.status,
                listedAt: marketplaceListing.createdAt
            } : null,
            
            // Listing data from inventory
            listingData: tokenItem.listingData,
            
            // Transfer history
            transferHistory: tokenItem.transferHistory || [],
            
            // Recent activity
            recentActivity: activityHistory.map(activity => ({
                activityType: activity.activityType,
                from: {
                    userId: activity.from?._id,
                    username: activity.from?.username,
                    walletAddress: activity.fromWallet
                },
                to: {
                    userId: activity.to?._id,
                    username: activity.to?.username,
                    walletAddress: activity.toWallet
                },
                price: activity.price,
                timestamp: activity.createdAt,
                metadata: activity.metadata
            })),
            
            // Timestamps
            createdAt: tokenItem.createdAt,
            updatedAt: tokenItem.updatedAt
        };

        return res.json({
            message: "success",
            data: tokenDetails
        });

    } catch (err) {
        console.error(`Error getting token details for tokenId ${req.params.tokenId}:`, err);
        return res.status(500).json({ 
            message: "error", 
            data: "Failed to retrieve token details." 
        });
    }
};

// 