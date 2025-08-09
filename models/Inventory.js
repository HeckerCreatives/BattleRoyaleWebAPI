const mongoose = require("mongoose")

const inventorySchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users"
        },
        item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Marketplace"
        }
    },
    {
        timestamps: true,
    }
)

const Inventory = mongoose.model("Inventory", inventorySchema)

module.exports = Inventory