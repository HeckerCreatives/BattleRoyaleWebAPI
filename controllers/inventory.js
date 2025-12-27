const { default: mongoose } = require('mongoose');
const Inventory = require('../models/Inventory');
const Users = require('../models/Users');
const NFTActivity = require('../models/NFTActivity');
const NFTMarketplace = require('../models/NFTMarketplace');



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
        
        // Filter: Exclude listed items by default
        if (includeListed !== 'true') {
            matchCondition.isListed = false;
        }
        
        // Filter: Exclude minted NFTs by default
        if (includeNFTs !== 'true') {
            matchCondition.isMinted = false;
        }

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
                sortCondition = { itemname: 1 };
                break;
            case 'z-a':
                sortCondition = { itemname: -1 };
                break;
            case 'newest':
            default:
                sortCondition = { createdAt: -1 };
                break;
        }

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
    const user = req.user;
    try {
        const { inventoryId, metadataUri, targetWallet } = req.body;

        if (!inventoryId) {
            return res.status(400).json({ message: "bad-request", data: "Inventory ID is required!" });
        }

        const inventoryItem = await Inventory.findOne({ _id: new mongoose.Types.ObjectId(inventoryId), owner: user.id }).populate('item');

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

        const ownerWallet = (user.walletAddress && user.walletAddress.toLowerCase()) || (targetWallet && String(targetWallet).toLowerCase()) || "unknown";

        const newItem = {
            tokenId: inventoryItem.tokenId,
            owner: user._id,
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
            to: user._id,
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
        console.log(`Error minting item for ${user?.username}: ${err}`);
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

        return res.json({
            message: "success",
            data: {
                activities,
                pagination: {
                    currentPage: pageOptions.page,
                    totalPages: Math.ceil(totalCount / pageOptions.limit),
                    totalItems: totalCount,
                    itemsPerPage: pageOptions.limit
                }
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

// 