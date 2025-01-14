const Maintenance = require("../models/Maintenance")

const { default: mongoose } = require("mongoose")

exports.getmaintenance = async (req, res) => {
    // maintenance list
    const maintenanceList = await Maintenance.find()
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching maintenance list. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })

    return res.status(200).json({ message: "success", data: maintenanceList})

}

exports.changemaintenance = async (req, res) => {

    const { type, value } = req.body

    if(!type || !value){
        return res.status(400).json({ message: "failed", data: "Incomplete input fields."})
    }

    await Maintenance.findOneAndUpdate({ type: type }, { $set: { value: value }})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem while changing maintenance value. Error ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })

    return res.status(200).json({ message: "success" })
}