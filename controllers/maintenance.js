const Maintenance = require("../models/Maintenance")

exports.getmaintenance = async (req, res) => {
    const {id, username} = req.user

    const mainte = await Maintenance.find()
    .then(data => data)
    .catch(err => {

        console.log(`There's a problem getting maintenance data for ${username} Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem getting your user details. Please contact customer support." })
    })

    const data = {
        maintenancelist: []
    }

    mainte.forEach(valuedata => {
        const {type, value} = valuedata

        data.maintenancelist.push(
            {
                type: type,
                value: value
            }
        )
    })

    return res.json({message: "success", data: data})
}

exports.changemaintenance = async (req, res) => {
    const {id, username} = req.user
    const {type, value} = req.body

    await Maintenance.findOneAndUpdate({type: type}, {value: value})
    .catch(err => {

        console.log(`There's a problem updating maintenance data for ${username} Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem getting your user details. Please contact customer support." })
    })

    return res.json({message: "success"})
}