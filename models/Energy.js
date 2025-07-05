const mongoose = require("mongoose");

const energySchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users"
        },
        energy: {
            type: Number
        }
    },
    {
        timestamps: true
    }
)

const EnergyLimitSchema = new mongoose.Schema(
    {
        limit: {
            type: Number,
            default: 100
        }
    },
    {
        timestamps: true
    }
)
const EnergyLimit = mongoose.model("EnergyLimit", EnergyLimitSchema)
const Energy = mongoose.model("Energy", energySchema)

module.exports = { Energy, EnergyLimit }