const Users = require("../models/Users")
const Userdetails = require("../models/Userdetails")
const Staffusers = require("../models/Staffusers")
const fs = require('fs')

const bcrypt = require('bcrypt');
const jsonwebtokenPromisified = require('jsonwebtoken-promisified');
const path = require("path");

const privateKey = fs.readFileSync(path.resolve(__dirname, "../keys/private-key.pem"), 'utf-8');
const { default: mongoose } = require("mongoose");

const encrypt = async password => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
}

exports.register = async (req, res) => {
    const { username, password, email, country } = req.body

    const user = await Users.findOne({username: { $regex: new RegExp('^' + username + '$', 'i') }})
    .then(data => data)
    .catch(err => {

        console.log(`There's a problem searching user for ${username} Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem registering your account. Please try again." })
    })

    if (user){
        return res.status(400).json({message: "failed", data: "You already registered this account! Please login if this is yours."})
    }

    const player = await Users.create({username: username, password: password, gametoken: "", webtoken: "", bandate: "none", banreason: "", status: "active"})
    .then(data => data)
    .catch(err => {

        console.log(`There's a problem creating user for ${username} Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem registering your account. Please try again." })
    })

    await Userdetails.create({owner: new mongoose.Types.ObjectId(player._id), email: email, country: country, profilepicture: ""})
    .catch(async err => {

        await Users.findOneAndDelete({_id: new mongoose.Types.ObjectId(player._id)})

        console.log(`There's a problem creating user details for ${player._id} Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem registering your account. Please try again." })
    })

    return res.json({message: "success"})
}

exports.authlogin = async(req, res) => {
    const { username, password } = req.query;

    Users.findOne({ username: { $regex: new RegExp('^' + username + '$', 'i') } })
    .then(async user => {
        if (user && (await user.matchPassword(password))){
            if (user.status != "active"){
                return res.status(401).json({ message: 'failed', data: `Your account had been ${user.status}! Please contact support for more details.` });
            }

            const token = await encrypt(privateKey)

            await Users.findByIdAndUpdate({_id: user._id}, {$set: {webtoken: token}}, { new: true })
            .then(async () => {
                const payload = { id: user._id, username: user.username, status: user.status, token: token, auth: "player" }

                let jwtoken = ""

                try {
                    jwtoken = await jsonwebtokenPromisified.sign(payload, privateKey, { algorithm: 'RS256' });
                } catch (error) {
                    console.error('Error signing token:', error.message);
                    return res.status(500).json({ error: 'Internal Server Error', data: "There's a problem signing in! Please contact customer support for more details! Error 004" });
                }

                res.cookie('sessionToken', jwtoken, { secure: true, sameSite: 'None' } )
                return res.json({message: "success", data: {
                    auth: "player"
                }})
            })
            .catch(err => res.status(400).json({ message: "bad-request2", data: "There's a problem with your account! There's a problem with your account! Please contact customer support for more details."  + err }))
        }
        else{

            await Staffusers.findOne({ username: { $regex: new RegExp('^' + username + '$', 'i') } })
            .then(async staffuser => {
                
                if (staffuser && (await staffuser.matchPassword(password))){
                    if (staffuser.status != "active"){
                        return res.status(401).json({ message: 'failed', data: `Your account had been ${staffuser.status}! Please contact support for more details.` });
                    }

                    const token = await encrypt(privateKey)

                    await Staffusers.findByIdAndUpdate({_id: staffuser._id}, {$set: {webtoken: token}}, { new: true })
                    .then(async () => {
                        const payload = { id: staffuser._id, username: staffuser.username, status: staffuser.status, token: token, auth: staffuser.auth }

                        let jwtoken = ""

                        try {
                            jwtoken = await jsonwebtokenPromisified.sign(payload, privateKey, { algorithm: 'RS256' });
                        } catch (error) {
                            console.error('Error signing token:', error.message);
                            return res.status(500).json({ error: 'Internal Server Error', data: "There's a problem signing in! Please contact customer support for more details! Error 004" });
                        }

                        res.cookie('sessionToken', jwtoken, { secure: true, sameSite: 'None' } )
                        return res.json({message: "success", data: {
                                auth: staffuser.auth
                            }
                        })
                    })
                    .catch(err => res.status(400).json({ message: "bad-request2", data: "There's a problem with your account! There's a problem with your account! Please contact customer support for more details."  + err }))
                }
                else{
                    return res.json({message: "failed", data: "Username/Password does not match! Please try again using the correct credentials!"})
                }
            })
            .catch(err => res.status(400).json({ message: "bad-request1", data: "There's a problem with your account! There's a problem with your account! Please contact customer support for more details." }))
        }
    })
    .catch(err => res.status(400).json({ message: "bad-request1", data: "There's a problem with your account! There's a problem with your account! Please contact customer support for more details." }))
}

exports.registerstaffs = async(req, res) => {
    const {username, password} = req.body

    if (username == "" || password == ""){
        return res.status(400).json({ message: "bad-request", data: "Please complete the form first before saving." })
    }

    const staff = await Staffusers.findOne({username: { $regex: new RegExp('^' + username + '$', 'i') }})
    .then(data => data)
    .catch(err => {

        console.log(`There's a problem searching staff user for ${username} Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem registering your account. Please try again." })
    })

    if (staff){
        return res.status(400).json({message: "failed", data: "You already registered this account! Please login if this is yours."})
    }

    await Staffusers.create({username: username, password: password, webtoken: "", status: "active", auth: "admin"})
    .catch(err => {

        console.log(`There's a problem creating staff user for ${username} Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem registering your account. Please try again." })
    })

    return res.json({message: "success"})
}

exports.logout = async (req, res) => {
    res.clearCookie('sessionToken', { path: '/' })
    return res.json({message: "success"})
}