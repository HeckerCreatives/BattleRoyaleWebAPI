// Utility functions for marketplace management

const mongoose = require("mongoose");
const Wallets = require("../models/Wallets");
const Marketplace = require("../models/Marketplace");
const Inventory = require("../models/Inventory");
const ActiveEffects = require("../models/ActiveEffects");
const marketdata = require("../data/marketdata");

// Add coins to a user (for testing purposes)
exports.addCoinsToUser = async (userId, amount) => {
    try {
        const wallet = await Wallets.findOneAndUpdate(
            { owner: new mongoose.Types.ObjectId(userId), type: "COINS" },
            { $inc: { amount: amount } },
            { upsert: true, new: true }
        );
        return wallet;
    } catch (err) {
        console.log(`Error adding coins to user ${userId}: ${err}`);
        throw err;
    }
};

// Clean up expired effects
exports.cleanupExpiredEffects = async () => {
    try {
        const result = await ActiveEffects.updateMany(
            { 
                expiresAt: { $lt: new Date() },
                isActive: true
            },
            { isActive: false }
        );
        console.log(`Cleaned up ${result.modifiedCount} expired effects`);
        return result;
    } catch (err) {
        console.log(`Error cleaning up expired effects: ${err}`);
        throw err;
    }
};


// Get marketplace item by itemid
exports.getMarketplaceItem = (itemid) => {
    return marketdata.find(item => item.itemid === itemid);
};

// Calculate XP with active effects
exports.calculateXPWithEffects = async (userId, baseXP) => {
    try {
        // Clean up expired effects first
        await ActiveEffects.updateMany(
            { 
                owner: new mongoose.Types.ObjectId(userId),
                expiresAt: { $lt: new Date() },
                isActive: true
            },
            { isActive: false }
        );

        // Get active XP effects
        const activeEffect = await ActiveEffects.findOne({
            owner: new mongoose.Types.ObjectId(userId),
            type: "POTION",
            isActive: true,
            expiresAt: { $gt: new Date() }
        });

        if (activeEffect) {
            return {
                finalXP: Math.floor(baseXP * activeEffect.multiplier),
                multiplier: activeEffect.multiplier,
                effectName: activeEffect.itemname
            };
        }

        return {
            finalXP: baseXP,
            multiplier: 1,
            effectName: null
        };
    } catch (err) {
        console.log(`Error calculating XP with effects for user ${userId}: ${err}`);
        return {
            finalXP: baseXP,
            multiplier: 1,
            effectName: null
        };
    }
};

module.exports = {
    addCoinsToUser: exports.addCoinsToUser,
    cleanupExpiredEffects: exports.cleanupExpiredEffects,
    initializeMarketplaceItems: exports.initializeMarketplaceItems,
    getMarketplaceItem: exports.getMarketplaceItem,
    calculateXPWithEffects: exports.calculateXPWithEffects
};
