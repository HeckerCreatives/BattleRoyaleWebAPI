const Staffuser = require("../models/Staffusers")

const { default: mongoose } = require("mongoose")
const { comparePassword, encrypt } = require("../utils/password-utils")

exports.changepassword = async (req, res) => {

    const { id } = req.user

    const { oldpw, newpw } = req.body

    if(!id || !oldpw || !newpw) {
        return res.status(400).json({ message: "failed", data: "Please enter all the details."})
    }

    const user = await Staffuser.findOne({ _id: new mongoose.Types.ObjectId(id)})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching user ${id}. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details"})
    })
    

    const isPasswordvalid = await comparePassword(user.password, oldpw)

    if(!isPasswordvalid){
        return res.status(400).json({ message: "failed", data: "Incorrect password" });
    }
    if(newpw.length < 5 || newpw.length > 20){
        return res.status(400).json({ message: "failed", data: "Minimum of 5 and maximum of 20 characters only for password! Please try again."})
    }
    if(newpw === oldpw){
        return res.status(400).json({ message: "failed", data: "Please use another password" });
    }

    const encrypted = await encrypt(newpw)

    await Staffuser.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(id)}, { $set: { password: encrypted }})
    .catch(err => {
        console.log(`There's a problem encountered while updating user ${id}. Error: ${err}`)
        
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details"})
    })
    return res.json({ message: "success"})
}
