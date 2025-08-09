const { default: mongoose } = require("mongoose");
const Leaderboard = require("../models/Leaderboard");

exports.addPoints = async (userId, amount, session = null) => {
    try {
        const ownerId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId) 
            : userId;

        const leaderboard = await Leaderboard.findOne({ owner: ownerId }).session(session);
        if (leaderboard) {
            // Update existing points
            leaderboard.amount += amount;
            await leaderboard.save({ session });
            return leaderboard.amount;
        } else {
            // Create new leaderboard entry
            const newEntry = await Leaderboard.create([{ owner: ownerId, amount }], { session });
            return newEntry.amount;
        }
    } catch (err) {
        console.error(`Error adding points for user ${userId}: ${err}`);
        throw err;
    }
};

exports.reducePoints = async (userId, amount, session = null) => {
    try {
        const ownerId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId) 
            : userId;

        const leaderboard = await Leaderboard.findOne({ owner: ownerId }).session(session);
        if (leaderboard) {
            // Update existing points
            leaderboard.amount -= amount;
            // Don't go below 0
            if (leaderboard.amount < 0) {
                leaderboard.amount = 0;
            }
            await leaderboard.save({ session });
            return leaderboard.amount;
        } else {
            throw new Error(`Leaderboard entry not found for user ${userId}`);
        }
    } catch (err) {
        console.error(`Error reducing points for user ${userId}: ${err}`);
        throw err;
    }
};

exports.checkPoints = async (userId, session = null) => {
    try {
        const ownerId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId) 
            : userId;

        const leaderboard = await Leaderboard.findOne({ owner: ownerId }).session(session);
        return leaderboard ? leaderboard.amount : 0;
    } catch (err) {
        console.error(`Error checking points for user ${userId}: ${err}`);
        throw err;
    }
};

// Universal points operation with session support for transactions
exports.updatePoints = async (userId, amount, session = null) => {
    try {
        const ownerId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId) 
            : userId;

        const options = session ? { session } : {};
        
        if (amount > 0) {
            // Add points
            const leaderboard = await Leaderboard.findOne({ owner: ownerId }).session(session);
            if (leaderboard) {
                return await Leaderboard.findOneAndUpdate(
                    { owner: ownerId },
                    { $inc: { amount: amount } },
                    { ...options, new: true }
                );
            } else {
                return await Leaderboard.create([{ owner: ownerId, amount }], options);
            }
        } else {
            // Reduce points
            const leaderboard = await Leaderboard.findOne({ owner: ownerId }).session(session);
            if (leaderboard) {
                const newAmount = Math.max(0, leaderboard.amount + amount);
                return await Leaderboard.findOneAndUpdate(
                    { owner: ownerId },
                    { amount: newAmount },
                    { ...options, new: true }
                );
            } else {
                // Can't reduce from non-existent entry
                throw new Error(`Cannot reduce points: Leaderboard entry not found for user ${userId}`);
            }
        }
    } catch (err) {
        console.error(`Error updating points for user ${userId}: ${err}`);
        throw err;
    }
};
