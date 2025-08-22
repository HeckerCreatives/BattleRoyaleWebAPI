const { default: mongoose } = require("mongoose");
const Marketplace = require("../models/Marketplace");
const Inventory = require("../models/Inventory");
const Wallets = require("../models/Wallets");
const Energy = require("../models/Energy");
const { Leaderboard } = require("../models/Leaderboard");
const Transaction = require("../models/Transaction");
const ActiveEffects = require("../models/ActiveEffects");
const walletUtils = require("../utils/wallet");
const energyUtils = require("../utils/energy");
const leaderboardUtils = require("../utils/leaderboard");
const inventoryUtils = require("../utils/inventory");
const { Titles } = require("../models/Titles");

// ==================== PLAYER FUNCTIONS ====================
exports.getequippedtitle = async (req, res) => {
    const { id, username } = req.user
    
    const equippedTitle = await Inventory.findOne({
        owner: id,
        type: "title",
        isEquipped: true,
    })

    const equippedTitleDetails = await Titles.findOne({ index: equippedTitle.itemid })
    if (!equippedTitle) {
        return res.json({ message: "success", data: null });
    }

    const finaldata = {
        itemid: equippedTitle.itemid,
        itemname: equippedTitleDetails ? equippedTitleDetails.name : null,
        description:  equippedTitleDetails ? equippedTitleDetails.index : null,
        rarity:  equippedTitleDetails ? equippedTitleDetails.rarity : null,
        category:  equippedTitleDetails ? equippedTitleDetails.category : null,
        quantity: equippedTitle ? equippedTitle.quantity : 0,
        isEquipped: equippedTitle ? equippedTitle.isEquipped : false,
    }

    return res.json({ message: "success", data: finaldata });
}
exports.getmarketplaceitems = async (req, res) => {
    const { id, username } = req.user;

    try {
        const items = await Marketplace.find({})
            .sort({ type: 1, itemid: 1 })
            .then(data => data)
            .catch(err => {
                console.log(`Error getting marketplace items: ${err}`);
                throw err;
            });

        if (!items || items.length === 0) {
            return res.json({ message: "success", data: [] });
        }

        // Get user wallets to show affordable items
        const walletMap = await walletUtils.getAllWallets(id);

        const formattedItems = items.map(item => ({
            itemid: item.itemid,
            itemname: item.itemname,
            description: item.description,
            amount: parseInt(item.amount),
            currency: item.currency,
            type: item.type,
            consumable: item.consumable === "1",
            canAfford: (walletMap[item.currency] || 0) >= parseInt(item.amount)
        }));

        return res.json({ message: "success", data: formattedItems });
    } catch (err) {
        console.log(`Error getting marketplace items for ${username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem getting marketplace items." });
    }
};

// Buy marketplace item
exports.buymarketplaceitem = async (req, res) => {
    const { id, username } = req.user;
    const { itemid, quantity = 1 } = req.body;

    if (!itemid) {
        return res.status(400).json({ message: "failed", data: "Item ID is required." });
    }

    if (quantity < 1) {
        return res.status(400).json({ message: "failed", data: "Quantity must be at least 1." });
    }

    try {
        // Get item details
        const item = await Marketplace.findOne({ itemid });
        if (!item) {
            return res.status(404).json({ message: "failed", data: "Item not found." });
        }

        const totalCost = parseInt(item.amount) * quantity;

        // Check user wallet
        let currentWalletAmount = 0;

        if (item.currency === "coins") {
            currentWalletAmount = await walletUtils.checkWallet(id, "coins");
        } else if (item.currency === "points") {
            currentWalletAmount = await leaderboardUtils.checkPoints(id);
        } else {
            return res.status(400).json({ message: "failed", data: "Invalid currency type." });
        }

        if (currentWalletAmount < totalCost) {
            return res.status(400).json({ message: "failed", data: `Insufficient ${item.currency.toLowerCase()}. You need ${totalCost} ${item.currency.toLowerCase()}.` });
        }

        // For titles, check if already owned
        const itemType = item.type.toLowerCase();
        const itemCurrency = item.currency.toLowerCase();

        if (itemType === "title") {
            const existingTitle = await Inventory.findOne({
                owner: new mongoose.Types.ObjectId(id),
                itemid: item.itemid
            });
            if (existingTitle) {
                return res.status(400).json({ message: "failed", data: "You already own this title." });
            }
        }

        // Start transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Deduct from wallet
            if (itemCurrency === "coins") {
                await walletUtils.updateWallet(id, itemCurrency, -totalCost, session);
            } else if (itemCurrency === "points") {
                await leaderboardUtils.addPoints(id, -totalCost, session);
            } else {
                return res.status(400).json({ message: "failed", data: "Invalid currency type." });
            }

            // Add to inventory
            if (itemType === "title") {
                // Titles are not stackable
                await Inventory.create([{
                    owner: new mongoose.Types.ObjectId(id),
                    itemid: item.itemid,
                    itemname: item.itemname,
                    type: itemType,
                    quantity: 1,
                    isEquipped: false
                }], { session });
            } else {
                // Check if item already exists in inventory
                const existingItem = await Inventory.findOne({
                    owner: new mongoose.Types.ObjectId(id),
                    itemid: item.itemid
                }).session(session);

                if (existingItem) {
                    // Update quantity
                    await Inventory.findOneAndUpdate(
                        { owner: new mongoose.Types.ObjectId(id), itemid: item.itemid },
                        { $inc: { quantity: quantity } },
                        { session }
                    );
                } else {
                    // Create new inventory item
                    await Inventory.create([{
                        owner: new mongoose.Types.ObjectId(id),
                        itemid: item.itemid,
                        itemname: item.itemname,
                        type: itemType,
                        quantity: quantity,
                        isEquipped: false
                    }], { session });
                }
            }

            // Create transaction record
            await Transaction.create([{
                owner: new mongoose.Types.ObjectId(id),
                type: "purchase",
                action: "buy",
                itemid: item.itemid,
                itemname: item.itemname,
                amount: totalCost,
                currency: itemCurrency,
                description: `Purchased ${quantity}x ${item.itemname}`
            }], { session });

            await session.commitTransaction();
            session.endSession();

            return res.json({ 
                message: "success", 
                data: `Successfully purchased ${quantity}x ${item.itemname} for ${totalCost} ${itemCurrency}!` 
            });

        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw err;
        }

    } catch (err) {
        console.log(`Error buying item ${itemid} for ${username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem purchasing the item." });
    }
};

// Get user inventory
exports.getuserinventory = async (req, res) => {
    const { id, username } = req.user;
    const { page, limit, type } = req.query;
    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    }
    let matchCondition = {
        owner: new mongoose.Types.ObjectId(id)
    }

    if (type) {
        if (type === "usable"){
            matchCondition.type = {
                $in: ["potion", "energy"]
            };
        } else {
            matchCondition.type = type;
        }
    }

    try {
        const inventory = await Inventory.find(matchCondition)
            .populate({ path: "owner", select: "username" })
            .populate({ path: "item" })
            .sort({ type: 1, itemname: 1 })
            .skip(pageOptions.page * pageOptions.limit)
            .limit(pageOptions.limit);
        const totalCount = await Inventory.countDocuments(matchCondition);
        const totalPages = Math.ceil(totalCount / pageOptions.limit);

        const playerUsername = inventory.length > 0 ? inventory[0].owner.username : "Unknown";

        const formattedInventory = inventory.map(inv => {
            // if populated marketplace item exists, prefer its fields
            const marketplaceItem = inv.item || {};
            return {
                _id: inv._id,
                itemid: marketplaceItem.itemid || inv.itemid || null,
                itemname: marketplaceItem.itemname || inv.itemname || null,
                description: marketplaceItem.description || undefined,
                amount: marketplaceItem.amount ? parseInt(marketplaceItem.amount) : undefined,
                currency: marketplaceItem.currency || undefined,
                type: marketplaceItem.type || inv.type || undefined,
                consumable: marketplaceItem.consumable || undefined,
                quantity: inv.quantity || 0,
                isEquipped: !!inv.isEquipped,
                createdAt: inv.createdAt,
                updatedAt: inv.updatedAt
            };
        });

        return res.json({ message: "success", data: formattedInventory, playerId: id, player: playerUsername, pagination: { totalCount, totalPages, currentPage: pageOptions.page + 1 } });
    } catch (err) {
        console.log(`Error getting inventory for ${username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem getting your inventory." });
    }
};

// Use item (for consumables like energy and potions)
exports.useitem = async (req, res) => {
    const { id, username } = req.user;
    const { itemid, quantity = 1 } = req.body;

    if (!itemid) {
        return res.status(400).json({ message: "failed", data: "Item ID is required." });
    }

    if (quantity < 1) {
        return res.status(400).json({ message: "failed", data: "Quantity must be at least 1." });
    }

    try {
        // Get item from inventory
        const inventoryItem = await Inventory.findOne({
            owner: new mongoose.Types.ObjectId(id),
            itemid: itemid
        });

        if (!inventoryItem) {
            return res.status(404).json({ message: "failed", data: "Item not found in your inventory." });
        }

        if (inventoryItem.quantity < quantity) {
            return res.status(400).json({ message: "failed", data: `You don't have enough ${inventoryItem.itemname}. You have ${inventoryItem.quantity}.` });
        }

        if (inventoryItem.type === "title") {
            return res.status(400).json({ message: "failed", data: "Titles cannot be used. Use equip/unequip instead." });
        }

        // Start transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Get marketplace item data to determine consumable value
            const marketItem = await Marketplace.findOne({ itemid: itemid });
            if (!marketItem) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: "failed", data: "Item configuration not found." });
            }

            // Apply item effects
            const invType = inventoryItem.type.toLowerCase();
            if (invType === "energy") {
                // Add energy based on consumable value from marketplace data
                const energyToAdd = parseInt(marketItem.consumable) * quantity;
                // Update energy using utility function (automatically caps at 20)
                await energyUtils.updateEnergy(id, energyToAdd, session);
            } else if (invType === "potion") {
                // Check if user already has an active XP potion
                const existingEffect = await ActiveEffects.findOne({
                    owner: new mongoose.Types.ObjectId(id),
                    type: "potion",
                    isActive: true,
                    expiresAt: { $gt: new Date() }
                }).session(session);
                if (existingEffect) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(400).json({ message: "failed", data: "You already have an active XP potion effect." });
                }
                // Use multiplier from marketplace data consumable field
                const multiplier = parseInt(marketItem.consumable);
                const expiresAt = new Date();
                expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now
                await ActiveEffects.create([{
                    owner: new mongoose.Types.ObjectId(id),
                    itemid: itemid,
                    itemname: inventoryItem.itemname,
                    type: "potion",
                    multiplier: multiplier,
                    expiresAt: expiresAt,
                    isActive: true
                }], { session });
            }

            // Reduce quantity in inventory
            if (inventoryItem.quantity === quantity) {
                // Remove item completely if quantity reaches 0
                await Inventory.findOneAndDelete({
                    owner: new mongoose.Types.ObjectId(id),
                    itemid: itemid
                }, { session });
            } else {
                // Reduce quantity
                await Inventory.findOneAndUpdate(
                    { owner: new mongoose.Types.ObjectId(id), itemid: itemid },
                    { $inc: { quantity: -quantity } },
                    { session }
                );
            }

            // Create transaction record
            await Transaction.create([{
                owner: new mongoose.Types.ObjectId(id),
                type: "use",
                action: "use",
                itemid: itemid,
                itemname: inventoryItem.itemname,
                amount: 0,
                currency: "none",
                description: `Used ${quantity}x ${inventoryItem.itemname}`
            }], { session });

            await session.commitTransaction();
            session.endSession();

            return res.json({ 
                message: "success", 
                data: `Successfully used ${quantity}x ${inventoryItem.itemname}!` 
            });

        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw err;
        }

    } catch (err) {
        console.log(`Error using item ${itemid} for ${username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem using the item." });
    }
};

// Equip/Unequip title
exports.equiptitle = async (req, res) => {
    const { id, username } = req.user;
    const { itemid, equip = true } = req.body;

    if (!itemid) {
        return res.status(400).json({ message: "failed", data: "Item ID is required." });
    }

    try {
        // Get title from inventory
        const titleItem = await Inventory.findOne({
            owner: new mongoose.Types.ObjectId(id),
            itemid: itemid,
            type: "title"
        });

        if (!titleItem) {
            return res.status(404).json({ message: "failed", data: "Title not found in your inventory." });
        }

        // Start transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (equip) {
                // Unequip all other titles first
                await Inventory.updateMany(
                    { owner: new mongoose.Types.ObjectId(id), type: "title" },
                    { isEquipped: false },
                    { session }
                );
                // Equip this title
                await Inventory.findOneAndUpdate(
                    { owner: new mongoose.Types.ObjectId(id), itemid: itemid },
                    { isEquipped: true },
                    { session }
                );
            } else {
                // Unequip title
                await Inventory.findOneAndUpdate(
                    { owner: new mongoose.Types.ObjectId(id), itemid: itemid },
                    { isEquipped: false },
                    { session }
                );
            }
            // Create transaction record
            await Transaction.create([{
                owner: new mongoose.Types.ObjectId(id),
                type: "use",
                action: equip ? "equip" : "unequip",
                itemid: itemid,
                itemname: titleItem.itemname,
                amount: 0,
                currency: "none",
                description: `${equip ? "Equipped" : "Unequipped"} ${titleItem.itemname}`
            }], { session });

            await session.commitTransaction();
            session.endSession();

            return res.json({ 
                message: "success", 
                data: `Successfully ${equip ? "equipped" : "unequipped"} ${titleItem.itemname}!` 
            });

        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw err;
        }

    } catch (err) {
        console.log(`Error ${equip ? "equipping" : "unequipping"} title ${itemid} for ${username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the title action." });
    }
};

// Get user wallets
exports.getuserwallets = async (req, res) => {
    const { id, username } = req.user;

    try {
        // Get all wallets using utility
        const walletData = await walletUtils.getAllWallets(id);

        // Get leaderboard points using utility
        const userPoints = await leaderboardUtils.checkPoints(id);
        
        // Ensure we have both points and coins
        const response = {
            points: userPoints,
            coins: walletData.coins || 0
        };

        return res.json({ message: "success", data: response });
    } catch (err) {
        console.log(`Error getting wallets for ${username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem getting your wallet information." });
    }
};

// Get active effects
exports.getactiveeffects = async (req, res) => {
    const { id, username } = req.user;

    try {
        // Clean up expired effects first
        await ActiveEffects.updateMany(
            { 
                owner: new mongoose.Types.ObjectId(id),
                expiresAt: { $lt: new Date() },
                isActive: true
            },
            { isActive: false }
        );

        const activeEffects = await ActiveEffects.find({
            owner: new mongoose.Types.ObjectId(id),
            isActive: true,
            expiresAt: { $gt: new Date() }
        }).sort({ expiresAt: 1 });

        const formattedEffects = activeEffects.map(effect => ({
            itemid: effect.itemid,
            itemname: effect.itemname,
            type: effect.type,
            multiplier: effect.multiplier,
            expiresAt: effect.expiresAt,
            timeRemaining: Math.max(0, Math.floor((effect.expiresAt - new Date()) / 1000))
        }));

        return res.json({ message: "success", data: formattedEffects });
    } catch (err) {
        console.log(`Error getting active effects for ${username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem getting your active effects." });
    }
};

// Get transaction history
exports.gettransactionhistory = async (req, res) => {
    const { id, username } = req.user;
    const { page, limit, type, action } = req.query;

    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    };

    let matchCondition = {
        owner: new mongoose.Types.ObjectId(id)
    };

    if (type) {
        matchCondition.type = type;
    }

    if (action) {
        matchCondition.action = action;
    }
    try {
        const transactions = await Transaction.find(matchCondition)
            .sort({ createdAt: -1 })
            .skip(pageOptions.page * pageOptions.limit)
            .limit(pageOptions.limit)
            .then(data => data)
            .catch(err => {
                console.log(`Error getting transaction history for ${username}: ${err}`);
                throw err;
            });

        const totalCount = await Transaction.countDocuments(matchCondition);
        const totalPages = Math.ceil(totalCount / pageOptions.limit);

        const playerUsername = transactions.length > 0 ? transactions[0].owner.username : "Unknown";

        const formattedTransactions = transactions.map(transaction => ({
            id: transaction._id,
            type: transaction.type,
            action: transaction.action,
            itemname: transaction.itemname,
            amount: transaction.amount,
            currency: transaction.currency,
            description: transaction.description,
            date: transaction.createdAt
        }));

        return res.json({ 
            message: "success", 
            data: {
                player: playerUsername,
                playerId: id,
                transactions: formattedTransactions,
                pagination: {
                    totalCount,
                    totalPages,
                    currentPage: pageOptions.page
                }
            }
        });

        return res.json({ message: "success", data: formattedTransactions });
    } catch (err) {
        console.log(`Error getting transaction history for ${username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem getting your transaction history." });
    }
};

exports.addwallet = async (req, res) => {
    const { id, username } = req.user;
    const { amount, currency } = req.body;

    try {
        const currencyLower = currency.toLowerCase();
        await walletUtils.updateWallet(id, currencyLower, amount);

        return res.json({ message: "success", data: { [currencyLower]: amount } });
    } catch (err) {
        console.log(`Error adding wallet for ${username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem adding to your wallet." });
    }
}

exports.addpoints = async (req, res) => {
    const { id, username } = req.user
    const { amount } = req.body;

    try {
        await leaderboardUtils.addPoints(id, amount);
        return res.json({ message: "success", data: { points: amount } });
    } catch (err) {
        console.log(`Error adding points for ${username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem adding points to your wallet." });
    }
}

// ==================== SUPERADMIN FUNCTIONS ====================

// Create new marketplace item
exports.createmarketplaceitem = async (req, res) => {
    const { id, username } = req.user;
    const { itemid, itemname, description, amount, currency, type, consumable } = req.body;

    if (!itemid || !itemname || !amount || !currency || !type) {
        return res.status(400).json({ message: "failed", data: "Required fields: itemid, itemname, amount, currency, type" });
    }

    try {
        // Check if item already exists
        const existingItem = await Marketplace.findOne({ itemid });
        if (existingItem) {
            return res.status(400).json({ message: "failed", data: "Item with this ID already exists." });
        }

        const newItem = new Marketplace({
            itemid,
            itemname,
            description: description || "",
            amount: amount.toString(),
            currency: currency.toUpperCase(),
            type: type.toUpperCase(),
            consumable: consumable || "0"
        });

        await newItem.save();

        return res.json({ 
            message: "success", 
            data: `Successfully created marketplace item: ${itemname}` 
        });

    } catch (err) {
        console.log(`Error creating marketplace item by ${username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem creating the marketplace item." });
    }
};

// Update marketplace item
exports.updatemarketplaceitem = async (req, res) => {
    const { id, username } = req.user;
    const { itemid, itemname, description, amount, currency, type, consumable } = req.body;

    if (!itemid) {
        return res.status(400).json({ message: "failed", data: "Item ID is required." });
    }

    try {
        const updateData = {};
        if (itemname) updateData.itemname = itemname;
        if (description !== undefined) updateData.description = description;
        if (amount) updateData.amount = amount.toString();
        if (currency) updateData.currency = currency.toUpperCase();
        if (type) updateData.type = type.toUpperCase();
        if (consumable !== undefined) updateData.consumable = consumable;

        const updatedItem = await Marketplace.findOneAndUpdate(
            { itemid },
            updateData,
            { new: true }
        );

        if (!updatedItem) {
            return res.status(404).json({ message: "failed", data: "Item not found." });
        }

        return res.json({ 
            message: "success", 
            data: `Successfully updated marketplace item: ${updatedItem.itemname}` 
        });

    } catch (err) {
        console.log(`Error updating marketplace item by ${username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem updating the marketplace item." });
    }
};

// Delete marketplace item
exports.deletemarketplaceitem = async (req, res) => {
    const { id, username } = req.user;
    const { itemid } = req.body;

    if (!itemid) {
        return res.status(400).json({ message: "failed", data: "Item ID is required." });
    }

    try {
        const deletedItem = await Marketplace.findOneAndDelete({ itemid });

        if (!deletedItem) {
            return res.status(404).json({ message: "failed", data: "Item not found." });
        }

        return res.json({ 
            message: "success", 
            data: `Successfully deleted marketplace item: ${deletedItem.itemname}` 
        });

    } catch (err) {
        console.log(`Error deleting marketplace item by ${username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem deleting the marketplace item." });
    }
};

// Get all marketplace items (admin view)
exports.getallmarketplaceitems = async (req, res) => {
    const { id, username } = req.user;
    const { page, limit, search } = req.query;

    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    };

    let matchCondition = {}

    if (search){
        matchCondition = {
            $or: [
                { itemname: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { currency: { $regex: search, $options: "i" } },
                { type: { $regex: search, $options: "i" } }
            ]
        };
    }

    try {
        const items = await Marketplace.find(matchCondition)
            .sort({ type: 1, itemid: 1 })
            .skip(pageOptions.page * pageOptions.limit)
            .limit(pageOptions.limit)

        const totalCount = await Marketplace.countDocuments(matchCondition);
        const totalPages = Math.ceil(totalCount / pageOptions.limit);

        const formattedItems = items.map(item => ({
            _id: item._id,
            itemid: item.itemid,
            itemname: item.itemname,
            description: item.description,
            amount: parseInt(item.amount),
            currency: item.currency,
            type: item.type,
            consumable: item.consumable,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
        }));

        return res.json({ message: "success", data: formattedItems, pagination: { totalCount, totalPages, currentPage: pageOptions.page, pageSize: pageOptions.limit } });
    } catch (err) {
        console.log(`Error getting all marketplace items for admin ${username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem getting marketplace items." });
    }
};

// Get player inventory by user ID
exports.getplayerinventory = async (req, res) => {
    const { id, username } = req.user;
    const { userId, page, limit, type } = req.query;
    
    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    }
    if (!userId) {
        return res.status(400).json({ message: "failed", data: "User ID is required." });
    }
    let matchCondition = {
        owner: new mongoose.Types.ObjectId(userId)
    };
    if (type) {
        if (type === "usable"){
            matchCondition.type = {
                $in: ["potion", "energy"]
            };
        } else {
            matchCondition.type = type;
        }
    }


    try {
        const inventory = await Inventory.find(matchCondition)
            .populate({ path: "owner", select: "username" })
            .populate({ path: "item" })
            .sort({ type: 1, itemname: 1 })
            .skip(pageOptions.page * pageOptions.limit)
            .limit(pageOptions.limit);

        const totalCount = await Inventory.countDocuments(matchCondition);
        const totalPages = Math.ceil(totalCount / pageOptions.limit);

        const playerUsername = inventory.length > 0 ? inventory[0].owner.username : "Unknown";

        const formattedInventory = inventory.map(inv => {
            // if populated marketplace item exists, prefer its fields
            const marketplaceItem = inv.item || {};
            return {
                _id: inv._id,
                itemid: marketplaceItem.itemid || inv.itemid || null,
                itemname: marketplaceItem.itemname || inv.itemname || null,
                description: marketplaceItem.description || undefined,
                amount: marketplaceItem.amount ? parseInt(marketplaceItem.amount) : undefined,
                currency: marketplaceItem.currency || undefined,
                type: marketplaceItem.type || inv.type || undefined,
                consumable: marketplaceItem.consumable || undefined,
                quantity: inv.quantity || 0,
                isEquipped: !!inv.isEquipped,
                createdAt: inv.createdAt,
                updatedAt: inv.updatedAt
            };
        });

        return res.json({ 
            message: "success", 
            data: {
                player: playerUsername,
                playerId: userId,
                inventory: formattedInventory,
                pagination: {
                    totalCount,
                    totalPages,
                    currentPage: pageOptions.page,
                    pageSize: pageOptions.limit
                }
            }
        });
    } catch (err) {
        console.log(`Error getting player inventory for admin ${username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem getting player inventory." });
    }
};

// Add item to player inventory
exports.additemtoplayer = async (req, res) => {
    const { id, username } = req.user;
    const { userId, itemid, quantity = 1 } = req.body;

    if (!userId || !itemid) {
        return res.status(400).json({ message: "failed", data: "User ID and Item ID are required." });
    }

    try {
        // Get marketplace item
        const marketItem = await Marketplace.findOne({ itemid });
        if (!marketItem) {
            return res.status(404).json({ message: "failed", data: "Marketplace item not found." });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const itemType = marketItem.type.toLowerCase();

            if (itemType === "title") {
                // Check if player already has this title
                const existingTitle = await Inventory.findOne({
                    owner: new mongoose.Types.ObjectId(userId),
                    itemid: itemid
                }).session(session);

                if (existingTitle) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(400).json({ message: "failed", data: "Player already owns this title." });
                }

                // Add title
                await Inventory.create([{
                    owner: new mongoose.Types.ObjectId(userId),
                    itemid: itemid,
                    itemname: marketItem.itemname,
                    type: itemType,
                    quantity: 1,
                    isEquipped: false
                }], { session });
            } else {
                // Check if item exists in inventory
                const existingItem = await Inventory.findOne({
                    owner: new mongoose.Types.ObjectId(userId),
                    itemid: itemid
                }).session(session);

                if (existingItem) {
                    // Update quantity
                    await Inventory.findOneAndUpdate(
                        { owner: new mongoose.Types.ObjectId(userId), itemid: itemid },
                        { $inc: { quantity: quantity } },
                        { session }
                    );
                } else {
                    // Create new item
                    await Inventory.create([{
                        owner: new mongoose.Types.ObjectId(userId),
                        itemid: itemid,
                        itemname: marketItem.itemname,
                        type: itemType,
                        quantity: quantity,
                        isEquipped: false
                    }], { session });
                }
            };

            // Create transaction record
            await Transaction.create([{
                owner: new mongoose.Types.ObjectId(userId),
                type: "admin_gift",
                action: "add",
                itemid: itemid,
                itemname: marketItem.itemname,
                amount: 0,
                currency: "none",
                description: `Admin ${username} added ${quantity}x ${marketItem.itemname}`
            }], { session });

            await session.commitTransaction();
            session.endSession();

            return res.json({ 
                message: "success", 
                data: `Successfully added ${quantity}x ${marketItem.itemname} to player inventory.` 
            });

        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw err;
        }

    } catch (err) {
        console.log(`Error adding item to player by admin ${username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem adding item to player." });
    }
};

// Remove item from player inventory
exports.removeitemfromplayer = async (req, res) => {
    const { id, username } = req.user;
    const { userId, itemid, quantity = 1 } = req.body;

    if (!userId || !itemid) {
        return res.status(400).json({ message: "failed", data: "User ID and Item ID are required." });
    }

    try {
        const inventoryItem = await Inventory.findOne({
            owner: new mongoose.Types.ObjectId(userId),
            itemid: itemid
        });

        if (!inventoryItem) {
            return res.status(404).json({ message: "failed", data: "Item not found in player inventory." });
        }

        if (inventoryItem.quantity < quantity) {
            return res.status(400).json({ 
                message: "failed", 
                data: `Player only has ${inventoryItem.quantity} of this item.` 
            });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (inventoryItem.quantity === quantity) {
                // Remove item completely
                await Inventory.findOneAndDelete({
                    owner: new mongoose.Types.ObjectId(userId),
                    itemid: itemid
                }, { session });
            } else {
                // Reduce quantity
                await Inventory.findOneAndUpdate(
                    { owner: new mongoose.Types.ObjectId(userId), itemid: itemid },
                    { $inc: { quantity: -quantity } },
                    { session }
                );
            }

            // Create transaction record
            await Transaction.create([{
                owner: new mongoose.Types.ObjectId(userId),
                type: "admin_remove",
                action: "remove",
                itemid: itemid,
                itemname: inventoryItem.itemname,
                amount: 0,
                currency: "none",
                description: `Admin ${username} removed ${quantity}x ${inventoryItem.itemname}`
            }], { session });

            await session.commitTransaction();
            session.endSession();

            return res.json({ 
                message: "success", 
                data: `Successfully removed ${quantity}x ${inventoryItem.itemname} from player inventory.` 
            });

        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw err;
        }

    } catch (err) {
        console.log(`Error removing item from player by admin ${username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem removing item from player." });
    }
};

// Get player wallets
exports.getplayerwallets = async (req, res) => {
    const { id, username } = req.user;
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ message: "failed", data: "User ID is required." });
    }

    try {
        // Get wallet data
        const walletData = await walletUtils.getAllWallets(userId);
        const userPoints = await leaderboardUtils.checkPoints(userId);

        // Get player username
        const Users = require("../models/Users");
        const player = await Users.findById(userId).select("username");

        const response = {
            player: player ? player.username : "Unknown",
            playerId: userId,
            wallets: {
                points: userPoints,
                coins: walletData.coins || 0
            }
        };

        return res.json({ message: "success", data: response });
    } catch (err) {
        console.log(`Error getting player wallets for admin ${username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem getting player wallets." });
    }
};

// Update player wallet
exports.updateplayerwallet = async (req, res) => {
    const { id, username } = req.user;
    const { userId, currency, amount } = req.body;

    if (!userId || !currency || amount === undefined) {
        return res.status(400).json({ message: "failed", data: "User ID, currency, and amount are required." });
    }

    try {
        const currencyLower = currency.toLowerCase();
        
        if (currencyLower === "points") {
            await leaderboardUtils.addPoints(userId, amount);
        } else if (currencyLower === "coins") {
            await walletUtils.updateWallet(userId, currencyLower, amount);
        } else {
            return res.status(400).json({ message: "failed", data: "Invalid currency. Use 'points' or 'coins'." });
        }

        // Create transaction record
        await Transaction.create({
            owner: new mongoose.Types.ObjectId(userId),
            type: "admin_wallet",
            action: amount > 0 ? "add" : "remove",
            itemid: "wallet",
            itemname: `${currency.toUpperCase()} Adjustment`,
            amount: Math.abs(amount),
            currency: currencyLower,
            description: `Admin ${username} ${amount > 0 ? 'added' : 'removed'} ${Math.abs(amount)} ${currency}`
        });

        return res.json({ 
            message: "success", 
            data: `Successfully ${amount > 0 ? 'added' : 'removed'} ${Math.abs(amount)} ${currency} ${amount > 0 ? 'to' : 'from'} player wallet.` 
        });

    } catch (err) {
        console.log(`Error updating player wallet by admin ${username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem updating player wallet." });
    }
};

// Get player transaction history
exports.getplayertransactions = async (req, res) => {
    const { id, username } = req.user;
    const { userId, page, limit, type, action } = req.query;

    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    };
    if (!userId) {
        return res.status(400).json({ message: "failed", data: "User ID is required." });
    }

    let matchCondition = {
        owner: new mongoose.Types.ObjectId(userId)
    };

    if (type) {
        matchCondition.type = type;
    }

    if (action) {
        matchCondition.action = action;
    }

    try {
        const transactions = await Transaction.find(matchCondition)
            .sort({ createdAt: -1 })
            .populate({ path: "owner", select: "username" })
            .skip(pageOptions.page * pageOptions.limit)
            .limit(pageOptions.limit);

        const totalCount = await Transaction.countDocuments(matchCondition);
        const totalPages = Math.ceil(totalCount / pageOptions.limit);

        const playerUsername = transactions.length > 0 ? transactions[0].owner.username : "Unknown";

        const formattedTransactions = transactions.map(transaction => ({
            id: transaction._id,
            type: transaction.type,
            action: transaction.action,
            itemname: transaction.itemname,
            amount: transaction.amount,
            currency: transaction.currency,
            description: transaction.description,
            date: transaction.createdAt
        }));

        return res.json({ 
            message: "success", 
            data: {
                player: playerUsername,
                playerId: userId,
                transactions: formattedTransactions,
                pagination: {
                    totalCount,
                    totalPages,
                    currentPage: pageOptions.page
                }
            }
        });
    } catch (err) {
        console.log(`Error getting player transactions for admin ${username}: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem getting player transactions." });
    }
};
