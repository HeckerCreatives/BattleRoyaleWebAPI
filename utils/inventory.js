const Inventory = require("../models/Inventory");


exports.removeItem = async (userId, itemId, quantity) => {
    try {
        const item = await Inventory.findOne({
            owner: new mongoose.Types.ObjectId(userId),
            itemid: itemId
        });

        if (!item) {
            throw new Error("Item not found in inventory.");
        }

        if (item.quantity < quantity) {
            throw new Error("Insufficient item quantity.");
        }

        // Remove item or reduce quantity
        if (item.quantity === quantity) {
            await Inventory.deleteOne({ _id: item._id });
        } else {
            await Inventory.findOneAndUpdate(
                { _id: item._id },
                { $inc: { quantity: -quantity } }
            );
        }

        return true;
    } catch (err) {
        console.error(`Error removing item from inventory: ${err}`);
        throw err;
    }
};
