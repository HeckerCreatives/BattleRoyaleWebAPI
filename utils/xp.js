const { default: mongoose } = require("mongoose");
const Usergamedetails = require("../models/Usergamedetails");

exports.addXP = async (userId, amount) => {
    try {
        const ownerId = mongoose.Types.ObjectId.isValid(userId)
            ? new mongoose.Types.ObjectId(userId)
            : userId;

        const user = await Usergamedetails.findOne({ owner: ownerId });

        if (!user) {
            throw new Error(`Usergamedetails not found for user ${userId}`);
        }

        let newxp = user.xp + amount;
        let newlevel = user.level;
        const expneeded = 80 * user.level;

        if (newxp >= expneeded) {
            newlevel = user.level + 1;
            newxp = newxp - expneeded;
        }

        const result = await Usergamedetails.findOneAndUpdate(
            { owner: ownerId },
            { $set: { xp: parseInt(newxp), level: parseInt(newlevel) } },
            { new: true }
        );

        return result.xp;
    } catch (err) {
        console.error(`Error adding XP for user ${userId}: ${err}`);
        throw err;
    }
};
