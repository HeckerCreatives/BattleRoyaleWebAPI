const mongoose = require("mongoose");

const adsSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            required: true
        },
        itemid: {
            type: String,
            required: true  // ENG-001, XPPOT-001, etc.
        },
        itemname: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true  // POTION, ENERGY, TITLE
        },
        isClaimed: {
            type: Boolean,
            default: false
        },
        questProgressId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "QuestProgresses",
            sparse: true
        }
    },
    {
        timestamps: true,
    }
);

const Ads = mongoose.model("Ads", adsSchema);

module.exports = Ads;
