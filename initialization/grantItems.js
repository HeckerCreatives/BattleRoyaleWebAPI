const Users = require("../models/Users");
const Inventory = require("../models/Inventory");
const Marketplace = require("../models/Marketplace");

/**
 * Grant items to a player
 * @param {String} userId - User's MongoDB ObjectId or username
 * @param {Array} items - Array of items to grant: [{itemid: "ENG-001", quantity: 5}, ...]
 * @param {Object} options - Additional options
 * @returns {Object} - Result with granted items
 */
exports.grantItems = async (userId, items = [], options = {}) => {
    try {
        const {
            isMintable = false,  // Whether these items can be minted as NFTs
            reason = "admin_grant" // Reason for granting (for logging)
        } = options;

        // Find user by ID or username
        let user;
        if (userId.match(/^[0-9a-fA-F]{24}$/)) {
            user = await Users.findById(userId);
        } else {
            user = await Users.findOne({ username: userId });
        }

        if (!user) {
            return {
                success: false,
                message: "User not found",
                data: null
            };
        }

        const grantedItems = [];
        const errors = [];

        for (const itemRequest of items) {
            try {
                const { itemid, quantity = 1 } = itemRequest;

                // Find item in marketplace
                const marketItem = await Marketplace.findOne({ itemid });

                if (!marketItem) {
                    errors.push({
                        itemid,
                        error: `Item ${itemid} not found in marketplace`
                    });
                    continue;
                }

                // Check if item already exists in user's inventory
                let inventoryItem = await Inventory.findOne({
                    owner: user._id,
                    itemid: marketItem.itemid
                });

                if (inventoryItem) {
                    // Update existing item quantity
                    inventoryItem.quantity += quantity;
                    await inventoryItem.save();

                    grantedItems.push({
                        itemid: marketItem.itemid,
                        itemname: marketItem.itemname,
                        quantity,
                        totalQuantity: inventoryItem.quantity,
                        action: "updated"
                    });
                } else {
                    // Create new inventory entry with auto-incremented tokenId
                    inventoryItem = await Inventory.createWithTokenId({
                        owner: user._id,
                        item: marketItem._id,
                        itemid: marketItem.itemid,
                        itemname: marketItem.itemname,
                        type: marketItem.type,
                        quantity,
                        ipfsImage: marketItem.ipfsImage,
                        isMintable: isMintable || marketItem.canBeMintedAsNFT,
                        isEquipped: false
                    });

                    grantedItems.push({
                        itemid: marketItem.itemid,
                        itemname: marketItem.itemname,
                        quantity,
                        totalQuantity: quantity,
                        action: "created"
                    });
                }

                console.log(`✓ Granted ${quantity}x ${marketItem.itemname} to ${user.username}`);

            } catch (itemError) {
                errors.push({
                    itemid: itemRequest.itemid,
                    error: itemError.message
                });
            }
        }

        return {
            success: true,
            message: `Granted ${grantedItems.length} items to ${user.username}`,
            data: {
                user: {
                    id: user._id,
                    username: user.username
                },
                grantedItems,
                errors: errors.length > 0 ? errors : null,
                reason
            }
        };

    } catch (error) {
        console.error("Grant items error:", error);
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

/**
 * Grant all marketplace items to a player (for testing)
 * @param {String} userId - User's MongoDB ObjectId or username
 * @param {Number} quantityPerItem - Quantity of each item to grant
 */
exports.grantAllItems = async (userId, quantityPerItem = 1) => {
    try {
        const marketItems = await Marketplace.find();

        const items = marketItems.map(item => ({
            itemid: item.itemid,
            quantity: quantityPerItem
        }));

        return await exports.grantItems(userId, items, {
            reason: "grant_all_items"
        });

    } catch (error) {
        console.error("Grant all items error:", error);
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

/**
 * Grant items by type to a player
 * @param {String} userId - User's MongoDB ObjectId or username
 * @param {String} itemType - Item type: "energy", "potion", "title"
 * @param {Number} quantity - Quantity of each item
 */
exports.grantItemsByType = async (userId, itemType, quantity = 1) => {
    try {
        const marketItems = await Marketplace.find({ type: itemType });

        if (marketItems.length === 0) {
            return {
                success: false,
                message: `No items found with type: ${itemType}`,
                data: null
            };
        }

        const items = marketItems.map(item => ({
            itemid: item.itemid,
            quantity
        }));

        return await exports.grantItems(userId, items, {
            reason: `grant_${itemType}_items`
        });

    } catch (error) {
        console.error("Grant items by type error:", error);
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

/**
 * Remove items from player inventory
 * @param {String} userId - User's MongoDB ObjectId or username
 * @param {Array} items - Array of items to remove: [{itemid: "ENG-001", quantity: 5}, ...]
 */
exports.removeItems = async (userId, items = []) => {
    try {
        // Find user
        let user;
        if (userId.match(/^[0-9a-fA-F]{24}$/)) {
            user = await Users.findById(userId);
        } else {
            user = await Users.findOne({ username: userId });
        }

        if (!user) {
            return {
                success: false,
                message: "User not found",
                data: null
            };
        }

        const removedItems = [];
        const errors = [];

        for (const itemRequest of items) {
            try {
                const { itemid, quantity = 1 } = itemRequest;

                const inventoryItem = await Inventory.findOne({
                    owner: user._id,
                    itemid
                });

                if (!inventoryItem) {
                    errors.push({
                        itemid,
                        error: `Item ${itemid} not found in inventory`
                    });
                    continue;
                }

                if (inventoryItem.quantity < quantity) {
                    errors.push({
                        itemid,
                        error: `Not enough quantity. Has ${inventoryItem.quantity}, requested ${quantity}`
                    });
                    continue;
                }

                inventoryItem.quantity -= quantity;

                if (inventoryItem.quantity <= 0) {
                    // Delete if quantity reaches 0
                    await Inventory.findByIdAndDelete(inventoryItem._id);
                    removedItems.push({
                        itemid,
                        itemname: inventoryItem.itemname,
                        quantity,
                        action: "deleted"
                    });
                } else {
                    await inventoryItem.save();
                    removedItems.push({
                        itemid,
                        itemname: inventoryItem.itemname,
                        quantity,
                        remainingQuantity: inventoryItem.quantity,
                        action: "reduced"
                    });
                }

                console.log(`✓ Removed ${quantity}x ${inventoryItem.itemname} from ${user.username}`);

            } catch (itemError) {
                errors.push({
                    itemid: itemRequest.itemid,
                    error: itemError.message
                });
            }
        }

        return {
            success: true,
            message: `Removed ${removedItems.length} items from ${user.username}`,
            data: {
                user: {
                    id: user._id,
                    username: user.username
                },
                removedItems,
                errors: errors.length > 0 ? errors : null
            }
        };

    } catch (error) {
        console.error("Remove items error:", error);
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

/**
 * Clear all items from player inventory
 * @param {String} userId - User's MongoDB ObjectId or username
 */
exports.clearInventory = async (userId) => {
    try {
        // Find user
        let user;
        if (userId.match(/^[0-9a-fA-F]{24}$/)) {
            user = await Users.findById(userId);
        } else {
            user = await Users.findOne({ username: userId });
        }

        if (!user) {
            return {
                success: false,
                message: "User not found",
                data: null
            };
        }

        const result = await Inventory.deleteMany({ owner: user._id });

        console.log(`✓ Cleared inventory for ${user.username} (${result.deletedCount} items)`);

        return {
            success: true,
            message: `Cleared ${result.deletedCount} items from inventory`,
            data: {
                user: {
                    id: user._id,
                    username: user.username
                },
                deletedCount: result.deletedCount
            }
        };

    } catch (error) {
        console.error("Clear inventory error:", error);
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};

/**
 * Get player's inventory
 * @param {String} userId - User's MongoDB ObjectId or username
 */
exports.getInventory = async (userId) => {
    try {
        // Find user
        let user;
        if (userId.match(/^[0-9a-fA-F]{24}$/)) {
            user = await Users.findById(userId);
        } else {
            user = await Users.findOne({ username: userId });
        }

        if (!user) {
            return {
                success: false,
                message: "User not found",
                data: null
            };
        }

        const inventory = await Inventory.find({ owner: user._id })
            .populate('item', 'itemname description amount currency type rarity');

        return {
            success: true,
            message: `Found ${inventory.length} items`,
            data: {
                user: {
                    id: user._id,
                    username: user.username
                },
                inventory
            }
        };

    } catch (error) {
        console.error("Get inventory error:", error);
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
};
