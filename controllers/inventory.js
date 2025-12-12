const { default: mongoose } = require('mongoose');
const Inventory = require('../models/Inventory');



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

        return res.json({
            message: "success",
            data: "Mint cancelled and item restored."
        });

    } catch (err) {
        console.log(`Error cancelling mint for ${req.user.username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem cancelling mint." });
    }
};
