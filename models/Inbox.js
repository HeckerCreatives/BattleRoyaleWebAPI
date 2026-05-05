const mongoose = require("mongoose");

const inboxSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users"
        },
        type: {
            type: String
        },
        rewards: [
            {
                type: { type: String, required: true },  // "exp" | "leaderboard" | "energy" | "item" | ...
                amount: { type: Number, default: 0 },
                itemid: { type: String }                 // optional, used when type is "item"
            }
        ],
        title: {
            type: String
        },
        description: {
            type: String
        },
        status: {
            type: String
        }
    },
    {
        timestamps: true
    }
)

const Inbox = mongoose.model("Inbox", inboxSchema)
module.exports = Inbox