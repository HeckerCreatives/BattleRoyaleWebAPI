
//  Import all mandatory schemas and delete this if necessary
const Users = require("../models/Users")
const Userdetails = require("../models/Userdetails")
const Staffusers = require("../models/Staffusers")
const PlayerCharacterSetting = require("../models/Playercharactersettings")
const Wallets = require("../models/Wallets")
const Usergamedetails = require("../models/Usergamedetails")
const Leaderboard = require("../models/Leaderboard")

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
    
    const { username, password, email, country } = req.body;

    if(!email || !username || !password || !country){
        return res.status(400).json({ message: "failed", data: "Please enter all user details."})
    }
    if(username.length < 6 || username.length > 15){
        return res.status(400).json({ message: "failed", data: "Minimum of 5 and maximum of 20 characters only for password! Please try again."})
    }
    if(password.length < 5 || password.length > 20){
        return res.status(400).json({ message: "failed", data: "Minimum of 5 and maximum of 20 characters only for password! Please try again."})
    }
    
    const usernameExists = await Users.findOne({ username: { $regex: `^${username}$`, $options: 'i' } })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while searching for user: ${username} Error: ${err}`)
    })
    const usernameRegex = /^[a-zA-Z0-9]+$/;

    const passwordRegex = /^[a-zA-Z0-9@\[\]]+$/;

    if(!passwordRegex.test(password)){
        return res.status(400).json({ message: "failed", data: "Special characters in the password are not allowed. Only @, [, and ] are permitted." })
    }
    if(!usernameRegex.test(username)){
        return res.status(400).json({ message: "failed", data: "Special characters in username are not allowed."})
    }


    if(usernameExists){
        return res.status(400).json({ message: "bad-request", data: "Username has already been used."})
    }
    const emailExists = await Userdetails.findOne({
        email: { $regex: `^${email}$`, $options: 'i' } })
        .then(data => data)
        .catch(err => {
            console.log(`There's a problem encountered while searching for email: ${email} Error: ${err}`);
        });

    if(emailExists){
        return res.status(400).json({ message: "bad-request", data: "Email has already been used."})
    }

    const user = await Users.create({ username: username, password: password, gametoken: "", webtoken: "", bandate: "", banreason: "", status: "active" })
    .then(data => data)
    .catch(err => {
        console.log(`Uh oh... there's a problem encountered while creating user login for ${username} Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem in registering account. Please try again." })
    })
    await Userdetails.create({ owner: new mongoose.Types.ObjectId(user._id), email: email, country: country, profilepicture: "" })
    .catch(async (err)=> {
        console.log(`There's a problem creating user details for ${username} Error: ${err}`)
        
        await Users.findOneAndDelete({ username: username})

        return res.status(400).json({ message: "bad-request", data: "There's a problem in registering account. Please try again."})
    })

    await Usergamedetails.create({ owner: new mongoose.Types.ObjectId(user._id), kill: 0, death: 0, level: 1, xp: 0})
    .catch(async (err)=> {
        console.log(`There's a problem creating user details for ${username} Error: ${err}`)
        
        await Users.findOneAndDelete({ username: username})

        return res.status(400).json({ message: "bad-request", data: "There's a problem in registering account. Please try again."})
    })

    await Leaderboard.create({ owner: new mongoose.Types.ObjectId(user._id), amount: 0})
    .catch(async (err)=> {
        console.log(`There's a problem creating user details for ${username} Error: ${err}`)
        
        await Users.findOneAndDelete({ username: username})

        return res.status(400).json({ message: "bad-request", data: "There's a problem in registering account. Please try again."})
    })

    await PlayerCharacterSetting.create({ owner: new mongoose.Types.ObjectId(user._id), hairstyle: 0, haircolor: 0, clothingcolor: 0, skincolor: 0})
    .catch(async (err)=> {
        console.log(`There's a problem creating user details for ${username} Error: ${err}`)
        
        await Users.findOneAndDelete({ username: username})

        return res.status(400).json({ message: "bad-request", data: "There's a problem in registering account. Please try again."})
    })

    const walletListData = ["credits", "token"]
    const walletBulkWrite = walletListData.map(walletData => ({
        insertOne: {
            document: { owner: user._id, type: walletData, value: "0" }
        }
    }));

    await Wallets.bulkWrite(walletBulkWrite)


    return res.json({ message: "success" })

}

exports.registerstaffs = async (req, res) => {
    const { staffUsername, password, auth } = req.body

    if(!staffUsername || !password || !auth ){
        return res.status(400).json({ message: "failed", data: "Please enter all user details."})
    }
    if(staffUsername.length < 5 || staffUsername.length > 12){
        return res.status(400).json({ message: "failed", data: "Minimum of 5 and maximum of 12 characters only for password! Please try again."})
    }
    if(password.length < 5 || password.length > 20){
        return res.status(400).json({ message: "failed", data: "Minimum of 5 and maximum of 20 characters only for password! Please try again."})
    }

    const staffUsernameExists = await Staffusers.findOne({ username: { $regex: `^${staffUsername}$`, $options: "i" }})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while searching staff username. Error: ${err}`)
    })

    if(staffUsernameExists){
        return res.status(400).json({ message: "bad-request", data: "Staff Username has already been used."})
    }

    await Staffusers.create({ username: staffUsername, password: password,  webtoken: "", status: "active", auth: auth})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while registering staff. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem in registering staff account. Please try again later." })
    })

    return res.status(200).json({ message: "Success"})

}

exports.authlogin = async(req, res) => {
    const { username, password } = req.query;
    const io = req.io;
    

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
                io.emit("login", { userId: user._id, username: user.username });

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

exports.logout = async (req, res) => {
    res.clearCookie('sessionToken', { path: '/' })
    return res.json({message: "success"})
}