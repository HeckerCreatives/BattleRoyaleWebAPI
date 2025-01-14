const { default: mongoose } = require("mongoose")
const Staffusers = require("../models/Staffusers")

exports.initialize = async (req, res) => {


    const staff = await Staffusers.find()
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem getting staff user data ${err}`)
        return
    })

    if (staff.length <= 0){
        await Staffusers.create({username: "battleroyaleadmin", password: "fxFWO2gY31R7", webtoken: "", status: "active", auth: "superadmin"})
        .catch(err => {
            console.log(`There's a problem creating staff user data ${err}`)
            return
        })
    }

    console.log("Server Initialization Success")
}