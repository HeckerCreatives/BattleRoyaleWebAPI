const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users"
        },
        type: {
            type: String
        },
        amount: {
            type: Number
        }
    },
    {
        timestamps: true
    }
)

const Wallets = mongoose.model("Wallets", walletSchema)
module.exports = Wallets