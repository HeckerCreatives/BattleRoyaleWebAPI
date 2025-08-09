const { default: mongoose } = require("mongoose");
const Energy = require("../models/Energy");


exports.addEnergy = async (userId, amount) => {
    try {
        const ownerId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId) 
            : userId;
            
        const energy = await Energy.findOne({ owner: ownerId });
        if (energy) {
            // Update existing energy
            energy.energy += amount;
            // Cap at 20
            if (energy.energy > 20) {
                energy.energy = 20;
            }
            await energy.save();
            return energy.energy;
        } else {
            // Create new energy (cap at 20)
            const energyAmount = Math.min(amount, 20);
            const newEnergy = await Energy.create({ owner: ownerId, energy: energyAmount });
            return newEnergy.energy;
        }
    } catch (err) {
        console.error(`Error adding energy for user ${userId}: ${err}`);
        throw err;
    }
};

exports.reduceEnergy = async (userId, amount) => {
    try {
        const ownerId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId) 
            : userId;
            
        const energy = await Energy.findOne({ owner: ownerId });
        if (energy) {
            // Update existing energy
            energy.energy -= amount;
            // Don't go below 0
            if (energy.energy < 0) {
                energy.energy = 0;
            }
            await energy.save();
            return energy.energy;
        } else {
            throw new Error(`Energy record not found for user ${userId}`);
        }
    } catch (err) {
        console.error(`Error reducing energy for user ${userId}: ${err}`);
        throw err;
    }
};

exports.checkEnergy = async (userId) => {
    try {
        const ownerId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId) 
            : userId;
            
        const energy = await Energy.findOne({ owner: ownerId });
        return energy ? energy.energy : 0;
    } catch (err) {
        console.error(`Error checking energy for user ${userId}: ${err}`);
        throw err;
    }
};

// Universal energy operation with session support for transactions
exports.updateEnergy = async (userId, amount, session = null) => {
    try {
        const ownerId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId) 
            : userId;

        const options = session ? { session } : {};
        
        // Get current energy or create if doesn't exist
        let energy = await Energy.findOne({ owner: ownerId }).session(session);
        
        if (!energy) {
            energy = await Energy.create([{ owner: ownerId, energy: 0 }], options);
            energy = energy[0]; // create returns array when using session
        }

        // Calculate new energy amount
        let newAmount = energy.energy + amount;
        
        // Cap between 0 and 20
        newAmount = Math.max(0, Math.min(20, newAmount));
        
        return await Energy.findOneAndUpdate(
            { owner: ownerId },
            { energy: newAmount },
            { ...options, new: true }
        );
    } catch (err) {
        console.error(`Error updating energy for user ${userId}: ${err}`);
        throw err;
    }
};