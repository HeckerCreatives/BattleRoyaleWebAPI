const { default: mongoose } = require("mongoose");
const Wallets = require("../models/Wallets");

exports.addWallet = async (userId, type, amount, session = null) => {
    try {
        const ownerId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId) 
            : userId;
        const options = { session: session || null };

        const wallet = await Wallets.findOne({ owner: ownerId, type }).session(session || null);
        if (wallet) {
            wallet.amount += amount;
            await wallet.save(options);
            return wallet.amount;
        } else {
            const newWallet = await Wallets.create([{ owner: ownerId, type, amount }], options);
            return newWallet[0].amount;
        }
    } catch (err) {
        console.error(`Error adding wallet for user ${userId}: ${err}`);
        throw err;
    }
};

exports.reduceWallet = async (userId, type, amount, session = null) => {
    try {
        const ownerId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId) 
            : userId;
        const options = { session: session || null };

        const wallet = await Wallets.findOne({ owner: ownerId, type }).session(session || null);
        if (wallet) {
            wallet.amount -= amount;
            await wallet.save(options);
            return wallet.amount;
        } else {
            throw new Error(`Wallet of type ${type} not found for user ${userId}`);
        }
    } catch (err) {
        console.error(`Error reducing wallet for user ${userId}: ${err}`);
        throw err;
    }
};

exports.checkWallet = async (userId, type, session = null) => {
    try {
        const ownerId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId) 
            : userId;
        const wallet = await Wallets.findOne({ owner: ownerId, type }).session(session || null);
        return wallet ? wallet.amount : 0;
    } catch (err) {
        console.error(`Error checking wallet for user ${userId}: ${err}`);
        throw err;
    }
};

// Universal wallet operation with session support for transactions
exports.updateWallet = async (userId, type, amount, session = null) => {
    try {
        const ownerId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId) 
            : userId;
        const options = { session: session || null, new: true };

        if (amount > 0) {
            const wallet = await Wallets.findOne({ owner: ownerId, type }).session(session || null);
            if (wallet) {
                return await Wallets.findOneAndUpdate(
                    { owner: ownerId, type },
                    { $inc: { amount: amount } },
                    options
                );
            } else {
                const newWallet = await Wallets.create([{ owner: ownerId, type, amount }], { session: session || null });
                return newWallet[0];
            }
        } else {
            return await Wallets.findOneAndUpdate(
                { owner: ownerId, type },
                { $inc: { amount: amount } },
                options
            );
        }
    } catch (err) {
        console.error(`Error updating wallet for user ${userId}: ${err}`);
        throw err;
    }
};

// Get all wallets for a user
exports.getAllWallets = async (userId, session = null) => {
    try {
        const ownerId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId) 
            : userId;
        const wallets = await Wallets.find({ owner: ownerId }).session(session || null);
        const walletMap = {};
        wallets.forEach(wallet => {
            walletMap[wallet.type] = wallet.amount;
        });
        return walletMap;
    } catch (err) {
        console.error(`Error getting all wallets for user ${userId}: ${err}`);
        throw err;
    }
};
