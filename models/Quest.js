

const mongoose = require('mongoose');

const QuestSchema = new mongoose.Schema(
    {
        questid: {
            type: String,
            required: true,
            unique: true
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String
        },
        type: {
            type: String,
            enum: ["MATCH", "WIN", "KILL", "USE_ITEM", "WATCH_ADS"],
            required: true
        },
        target: {
            type: Number,
            required: true
        },
        rewards: [
            {
                type: { type: String, required: true },  // "exp" | "leaderboard" | "energy" | "item" | ...
                amount: { type: Number, default: 0 },
                itemid: { type: String }                 // optional, used when type is "item"
            }
        ],
        isSkippable: {
            type: Boolean,
            default: true
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
)

const QuestProgressesSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            required: true
        },
        quest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Quest",
            required: true
        },
        progress: {
            type: Number,
            default: 0
        },
        isCompleted: {
            type: Boolean,
            default: false
        },
        isClaimed: {
            type: Boolean,
            default: false
        },
        isSkipped: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
)

const Quest = mongoose.model("Quest", QuestSchema)
const QuestProgresses = mongoose.model("QuestProgresses", QuestProgressesSchema)

module.exports = { Quest, QuestProgresses }