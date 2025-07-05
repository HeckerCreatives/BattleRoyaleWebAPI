const mongoose = require("mongoose");

const leaderboardSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users"
        },
        amount: {
            type: Number
        }
    },
    {
        timestamps: true
    }
)

const leaderboardHistorySchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users"
        },
        eventname: {
            type: String,
            required: true
        },
        index: {
            type: Number,
            required: true
        },
        amount: {
            type: Number
        },
        date: {
            type: String,
        }
    },
    {
        timestamps: true
    }
)

const LeaderboardHistory = mongoose.model("LeaderboardHistory", leaderboardHistorySchema)
const Leaderboard = mongoose.model("Leaderboard", leaderboardSchema)

module.exports = { Leaderboard, LeaderboardHistory }