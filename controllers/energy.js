const { default: mongoose } = require("mongoose");
const { Energy, EnergyLimit } = require("../models/Energy");

exports.resetenergy = async (req, res) => {
    try {
        // Get the current energy limit (default value if not set)
        const energyLimit = await EnergyLimit.findOne()
            .then(data => data ? data.limit : 100) // Default to 100 if no limit is set
            .catch(err => {
                console.log(`Error getting energy limit: ${err}`);
                return 100; // Default fallback
            });

        // Reset all users' energy to the limit
        const resetResult = await Energy.updateMany({}, { $set: { energy: energyLimit } });

        console.log(`Energy reset completed. ${resetResult.modifiedCount} users affected.`);

        return res.json({ 
            message: "success",
            data: {
                usersAffected: resetResult.modifiedCount,
                energyLimit: energyLimit
            }
        });

    } catch (error) {
        console.log(`Error resetting energy: ${error}`);
        return res.status(500).json({ 
            message: "error", 
            data: "There was a problem resetting energy. Please contact customer support." 
        });
    }
}

exports.resetuserenergy = async (req, res) => {
    try {
        const { id, username } = req.user;

        // Get the current energy limit
        const energyLimit = await EnergyLimit.findOne()
            .then(data => data ? data.limit : 100)
            .catch(err => {
                console.log(`Error getting energy limit: ${err}`);
                return 100;
            });

        // Reset specific user's energy
        const updateResult = await Energy.findOneAndUpdate(
            { owner: new mongoose.Types.ObjectId(id) },
            { $set: { energy: energyLimit } },
            { new: true }
        );

        if (!updateResult) {
            return res.status(404).json({
                message: "not-found",
                data: "User energy record not found."
            });
        }

        console.log(`Energy reset for user: ${username}`);

        return res.json({ 
            message: "success",
            data: {
                energy: updateResult.energy,
                energyLimit: energyLimit
            }
        });

    } catch (error) {
        console.log(`Error resetting user energy: ${error}`);
        return res.status(500).json({ 
            message: "error", 
            data: "There was a problem resetting your energy. Please contact customer support." 
        });
    }
}

exports.getuserenergy = async (req, res) => {
    try {
        const { id, username } = req.user;

        const userEnergy = await Energy.findOne({ owner: new mongoose.Types.ObjectId(id) })
            .then(data => data)
            .catch(err => {
                console.log(`Error getting user energy for ${username}: ${err}`);
                return null;
            });

        if (!userEnergy) {
            return res.status(404).json({
                message: "not-found",
                data: "User energy record not found."
            });
        }

        // Get energy limit
        const energyLimit = await EnergyLimit.findOne()
            .then(data => data ? data.limit : 100)
            .catch(err => 100);

        return res.json({ 
            message: "success",
            data: {
                energy: userEnergy.energy,
                energyLimit: energyLimit
            }
        });

    } catch (error) {
        console.log(`Error getting user energy: ${error}`);
        return res.status(500).json({ 
            message: "error", 
            data: "There was a problem getting your energy. Please contact customer support." 
        });
    }
}

exports.updateenergylimit = async (req, res) => {
    try {
        const { limit } = req.body;

        if (!limit || typeof limit !== 'number' || limit <= 0) {
            return res.status(400).json({
                message: "bad-request",
                data: "Please provide a valid energy limit (positive number)."
            });
        }

        // Update or create energy limit
        const energyLimit = await EnergyLimit.findOneAndUpdate(
            {},
            { $set: { limit: limit } },
            { new: true, upsert: true }
        );

        console.log(`Energy limit updated to: ${limit}`);

        return res.json({ 
            message: "success",
            data: {
                energyLimit: energyLimit.limit
            }
        });

    } catch (error) {
        console.log(`Error updating energy limit: ${error}`);
        return res.status(500).json({ 
            message: "error", 
            data: "There was a problem updating energy limit. Please contact customer support." 
        });
    }
}
