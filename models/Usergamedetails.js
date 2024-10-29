const mongoose = require("mongoose");

const userGameDetailsSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users"
        },
        kill: {
            type: Number
        },
        death: {
            type: Number
        },
        level: {
            type: Number
        },
        xp: {
            type: Number
        }
    },
    {
        timestamps: true
    }
)

const Usergamedetails = mongoose.model("Usergamedetails", userGameDetailsSchema)
module.exports = Usergamedetails