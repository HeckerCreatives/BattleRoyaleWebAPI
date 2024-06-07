const { default: mongoose } = require("mongoose");
const Staffusers = require("../models/Staffusers")
const bcrypt = require('bcrypt');

exports.changepassword = async (req, res) => {
    const {id, username} = req.user
    const {oldpw, newpw} = req.body

    await Staffusers.findOne({_id: new mongoose.Types.ObjectId(id)})
    .then(async user => {
        if (user && (await user.matchPassword(oldpw))){
            await Staffusers.findOneAndUpdate({_id: new mongoose.Types.ObjectId(id)}, {password: newpw})
            .catch(err => {
    
                console.log(`There's a problem getting users list for ${username} Error: ${err}`)
        
                return res.status(400).json({ message: "bad-request", data: "There's a problem with the server! Please contact customer support." })
            })
    
            return res.json({message: "success"})
        }
        else{
            return res.status(400).json({message: "failed", data: "Old password does not match!"})
        }
    })
    .catch(err => {

        console.log(`There's a problem getting users list for ${username} Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server! Please contact customer support." })
    })
}