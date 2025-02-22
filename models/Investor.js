const { default: mongoose } = require("mongoose");



const InvestorSchema = new mongoose.Schema(
    {
        name: {
            type: String,
        },
        email: {
            type: String,
        },  
    },
    {
        timestamps: true
    }
)

const Investor = mongoose.model("Investor", InvestorSchema)
module.exports = Investor