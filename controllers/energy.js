const { default: mongoose } = require("mongoose");
const { Energy } = require("../models/Energy");
const {pushnotificationsend} = require("../utils/onesignal")

exports.resetenergy = async (req, res) => {
    try {
        // Reset all users' energy to 10 (static limit)
        const resetResult = await Energy.updateMany({}, { $set: { energy: 20 } });

        pushnotificationsend(process.env.ONE_SIGNAL_ENERGY_TEMPLATE_ID)

        console.log(`Energy reset completed. ${resetResult.modifiedCount} users affected.`);

        return res.json({ 
            message: "success",
            data: {
                usersAffected: resetResult.modifiedCount,
                energyLimit: 10
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

        // Reset specific user's energy to 10 (static limit)
        const updateResult = await Energy.findOneAndUpdate(
            { owner: new mongoose.Types.ObjectId(id) },
            { $set: { energy: 20 } },
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
                energyLimit: 10
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

        return res.json({ 
            message: "success",
            data: {
                energy: userEnergy.energy,
                energyLimit: 10
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
