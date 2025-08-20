const mongoose = require("mongoose")

const inventorySchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users"
        },
        // reference to marketplace item (optional)
        item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Marketplace",
            required: false
        },
        // denormalized fields for easier reads (keeps compatibility)
        itemid: {
            type: String,
            required: false
        },
        itemname: {
            type: String,
            required: false
        },
        type: {
            type: String,
            required: false
        },
        quantity: {
            type: Number,
            default: 1
        },
        isEquipped: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true,
    }
)

const Inventory = mongoose.model("Inventory", inventorySchema)

module.exports = Inventory