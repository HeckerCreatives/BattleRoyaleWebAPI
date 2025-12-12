
//  Import all mandatory schemas and delete this if necessary
const Users = require("../models/Users")
const Userdetails = require("../models/Userdetails")
const Staffusers = require("../models/Staffusers")
const PlayerCharacterSetting = require("../models/Playercharactersettings")
const Wallets = require("../models/Wallets")
const Usergamedetails = require("../models/Usergamedetails")
const { Leaderboard } = require("../models/Leaderboard")
const { Titles, CharacterTitles } = require("../models/Titles");
const { ethers } = require("ethers");
const Inventory = require("../models/Inventory");
const crypto = require('crypto');

const fs = require('fs')

const bcrypt = require('bcrypt');
const jsonwebtokenPromisified = require('jsonwebtoken-promisified');
const path = require("path");

const privateKey = fs.readFileSync(path.resolve(__dirname, "../keys/private-key.pem"), 'utf-8');
const { default: mongoose } = require("mongoose");
const { Energy } = require("../models/Energy")
const { grantItems } = require("../initialization/grantItems")

const encrypt = async password => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
}

const generateNonce = () => {
    return crypto.randomBytes(32).toString('hex');
}

exports.register = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { username, password, email } = req.body;

        if(!email || !username || !password){
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "failed", data: "Please enter all user details."})
        }
        if(username.length < 6 || username.length > 15){
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "failed", data: "Minimum of 5 and maximum of 15 characters only for username! Please try again."})
        }
        if(password.length < 5 || password.length > 20){
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "failed", data: "Minimum of 5 and maximum of 20 characters only for password! Please try again."})
        }
        
        const usernameExists = await Users.findOne({ username: { $regex: `^${username}$`, $options: 'i' } }).session(session);
        
        const usernameRegex = /^[a-zA-Z0-9]+$/;

        if(!usernameRegex.test(username)){
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "failed", data: "Special characters or spaces in username are not allowed."})
        }
        if(usernameExists){
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "bad-request", data: "Username has already been used."})
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.(com|org|net|edu|gov|mil|co|io|me|info|biz)$/i;
        
        if(!emailRegex.test(email)){
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "failed", data: "Please enter a valid email address with a proper domain (.com, .org, .net, etc.)."})
        }
        
        const emailExists = await Userdetails.findOne({
            email: { $regex: `^${email}$`, $options: 'i' } 
        }).session(session);

        if(emailExists){
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "bad-request", data: "Email has already been used."})
        }

        // Create user and all related documents within transaction
        const [user] = await Users.create([{ 
            username: username, 
            password: password, 
            gametoken: "", 
            webtoken: "", 
            bandate: "", 
            banreason: "", 
            status: "active" 
        }], { session });

        await Userdetails.create([{ 
            owner: new mongoose.Types.ObjectId(user._id), 
            email: email, 
            profilepicture: "" 
        }], { session });

        await Usergamedetails.create([{ 
            owner: new mongoose.Types.ObjectId(user._id), 
            kill: 0, 
            death: 0, 
            level: 1, 
            xp: 0
        }], { session });

        await Leaderboard.create([{ 
            owner: new mongoose.Types.ObjectId(user._id), 
            amount: 0
        }], { session });

        await PlayerCharacterSetting.create([{ 
            owner: new mongoose.Types.ObjectId(user._id), 
            hairstyle: 0, 
            haircolor: 0, 
            clothingcolor: 0, 
            skincolor: 0
        }], { session });

        const walletListData = ["credits", "token"];
        const walletBulkWrite = walletListData.map(walletData => ({
            insertOne: {
                document: { owner: user._id, type: walletData, value: "0" }
            }
        }));

        await Wallets.bulkWrite(walletBulkWrite, { session });

        await Energy.create([{
            owner: new mongoose.Types.ObjectId(user._id), 
            energy: 20
        }], { session });

        const titlesdata = await Titles.findOne({ index: "TITLE-000" }).session(session);
        if (!titlesdata) {
            throw new Error("Default title data not found");
        }

        await CharacterTitles.create([{ 
            owner: user._id, 
            title: titlesdata._id 
        }], { session });
        
        await Inventory.create([{ 
            owner: user._id, 
            itemid: titlesdata.index, 
            itemname: titlesdata.name, 
            quantity: 1, 
            type: "title", 
            isEquipped: true
        }], { session });

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        return res.json({ message: "success" });

    } catch (err) {
        // Rollback transaction on error
        await session.abortTransaction();
        session.endSession();
        
        console.log(`There's a problem encountered while creating user. Error: ${err}`);
        return res.status(400).json({ message: "bad-request", data: "There's a problem in registering account. Please try again." });
    }
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

exports.checkSession = async (req, res) => {
    const token = req.headers.cookie?.split('; ').find(row => row.startsWith('sessionToken='))?.split('=')[1];

    if (!token) {
        return res.status(401).json({ 
            message: 'Unauthorized', 
            data: "No active session found!" 
        });
    }

    try {
        const publicKey = fs.readFileSync(path.resolve(__dirname, "../keys/public-key.pem"), 'utf-8');
        const decodedToken = await jsonwebtokenPromisified.verify(token, publicKey, { algorithms: ['RS256'] });

        // Check if it's a user or staff account
        if (decodedToken.auth === "player" || decodedToken.auth === "user") {
            const user = await Users.findById(decodedToken.id);

            if (!user) {
                return res.status(401).json({ 
                    message: 'Unauthorized', 
                    data: "User not found!" 
                });
            }

            if (user.status !== "active") {
                return res.status(401).json({ 
                    message: 'failed', 
                    data: `Your account has been ${user.status}! Please contact support for more details.` 
                });
            }

            if (decodedToken.token !== user.webtoken) {
                return res.status(401).json({ 
                    message: 'duallogin', 
                    data: "Your account has been opened on another device! You will now be logged out." 
                });
            }

            // Get user details
            const userDetails = await Userdetails.findOne({ owner: user._id });

            return res.json({
                message: "success",
                data: {
                    id: user._id,
                    username: user.username,
                    email: userDetails.email,
                    walletAddress: user.walletAddress,
                    status: user.status,
                    auth: "user",
                    firstname: userDetails?.firstname || "",
                    lastname: userDetails?.lastname || "",
                    profilepicture: userDetails?.profilepicture || ""
                }
            });

        } else {
            // Staff user
            const staffUser = await Staffusers.findById(decodedToken.id);

            if (!staffUser) {
                return res.status(401).json({ 
                    message: 'Unauthorized', 
                    data: "Staff user not found!" 
                });
            }

            if (staffUser.status !== "active") {
                return res.status(401).json({ 
                    message: 'failed', 
                    data: `Your account has been ${staffUser.status}! Please contact support for more details.` 
                });
            }

            if (decodedToken.token !== staffUser.webtoken) {
                return res.status(401).json({ 
                    message: 'duallogin', 
                    data: "Your account has been opened on another device! You will now be logged out." 
                });
            }

            return res.json({
                message: "success",
                data: {
                    id: staffUser._id,
                    username: staffUser.username,
                    status: staffUser.status,
                    auth: staffUser.auth
                }
            });
        }

    } catch (error) {
        console.error('Session verification error:', error);
        return res.status(401).json({ 
            message: 'Unauthorized', 
            data: "Invalid session!" 
        });
    }
}

/**
 * POST /auth/wallet/request-nonce
 * Request a nonce for wallet signature
 */
exports.requestNonce = async (req, res) => {
    try {
        const { walletAddress } = req.body;
        const token = req.headers.cookie?.split('; ').find(row => row.startsWith('sessionToken='))?.split('=')[1];

        if (!walletAddress) {
            return res.status(400).json({ 
                message: "bad-request", 
                data: "Wallet address is required!" 
            });
        }

        // Normalize wallet address to lowercase
        const normalizedAddress = walletAddress.toLowerCase();

        // Generate nonce with 5-minute expiry
        const nonce = generateNonce();
        const nonceExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        let user = null;

        // Check if user is logged in (for wallet linking scenario)
        if (token) {
            try {
                const publicKey = fs.readFileSync(path.resolve(__dirname, "../keys/public-key.pem"), 'utf-8');
                const decodedToken = await jsonwebtokenPromisified.verify(token, publicKey, { algorithms: ['RS256'] });
                
                // Get logged-in user
                user = await Users.findById(decodedToken.id);
                
                if (user) {
                    // Store nonce on the logged-in user's account for wallet linking
                    user.walletNonce = nonce;
                    user.walletNonceExpiry = nonceExpiry;
                    await user.save();
                }
            } catch (tokenError) {
                console.log('Token verification failed in requestNonce, treating as guest:', tokenError.message);
                // Continue as guest user
            }
        }

        user = user || await Users.findOne({ walletAddress: normalizedAddress });
        if (user) {
            // Store nonce on the found user's account for wallet login
            user.walletNonce = nonce;
            user.walletNonceExpiry = nonceExpiry;
            await user.save();
        }

        // If not logged in, find or create user with this wallet (for wallet login scenario)
        if (!user) {
            return res.status(400).json({
                message: "failed",
                data: "Register your account first before logging in with wallet!"
            });
        }

        return res.json({
            message: "success",
            data: {
                nonce,
                message: `Sign this message to authenticate with your wallet:\n\nNonce: ${nonce}\nWallet: ${normalizedAddress}`
            }
        });

    } catch (err) {
        console.error('Request nonce error:', err);
        return res.status(500).json({ 
            message: "error", 
            data: "Failed to generate nonce. Please try again." 
        });
    }
}

/**
 * POST /auth/wallet/login
 * Login or auto-register with wallet signature
 */
exports.walletLogin = async (req, res) => {
    try {
        const { walletAddress, signature } = req.body;

        if (!walletAddress || !signature) {
            return res.status(400).json({ 
                message: "bad-request", 
                data: "Wallet address and signature are required!" 
            });
        }

        const normalizedAddress = walletAddress.toLowerCase();

        // Find user by wallet address
        const user = await Users.findOne({ walletAddress: normalizedAddress });

        if (!user) {
            return res.status(400).json({
                message: "failed",
                data: "Register your wallet first before logging in!"
            });
        }

        if (!user || !user.walletNonce || !user.walletNonceExpiry) {
            return res.status(400).json({ 
                message: "failed", 
                data: "Please request a nonce first!" 
            });
        }

        // Check if nonce has expired
        if (new Date() > user.walletNonceExpiry) {
            return res.status(400).json({ 
                message: "failed", 
                data: "Nonce has expired. Please request a new one!" 
            });
        }

        // Verify signature
        const message = `Sign this message to authenticate with your wallet:\n\nNonce: ${user.walletNonce}\nWallet: ${normalizedAddress}`;
        
        try {
            const recoveredAddress = ethers.utils.verifyMessage(message, signature);
            
            if (recoveredAddress.toLowerCase() !== normalizedAddress) {
                return res.status(401).json({ 
                    message: "failed", 
                    data: "Invalid signature!" 
                });
            }
        } catch (verifyError) {
            console.error('Signature verification error:', verifyError);
            return res.status(401).json({ 
                message: "failed", 
                data: "Invalid signature format!" 
            });
        }

        // Clear nonce after successful verification
        user.walletNonce = null;
        user.walletNonceExpiry = null;

        // Auto-register: Complete user profile if this is first login
        if (user.status === "pending") {
            // Generate unique username from wallet address
            const shortAddress = walletAddress.substring(0, 10);
            let username = `wallet_${shortAddress}`;
            
            // Check for username uniqueness
            let counter = 1;
            while (await Users.findOne({ username })) {
                username = `wallet_${shortAddress}_${counter}`;
                counter++;
            }

            user.username = username;
            user.status = "active";
            user.webtoken = "";
            await user.save();

            // Create user details
            await Userdetails.create({
                owner: user._id,
                firstname: "Wallet",
                lastname: "User",
                profilepicture: ""
            });

            // Grant starter items to new wallet users
            try {
                await grantItems(user._id.toString(), [
                    { itemid: "ENG-001", quantity: 1 },   // 3x Energy Potion
                    { itemid: "XPPOT-001", quantity: 1 }  // 2x XP Booster
                ], {
                    isMintable: true,
                    reason: "welcome_bonus_wallet_signup"
                });
                console.log(`✓ Starter items granted to new wallet user: ${user.username}`);
            } catch (grantError) {
                console.error(`✗ Failed to grant starter items to ${user.username}:`, grantError);
                // Don't fail the login if granting items fails; log the error but let user proceed
            }
        }

        // Check account status
        if (user.status !== "active") {
            return res.status(401).json({ 
                message: 'failed', 
                data: `Your account has been ${user.status}! Please contact support for more details.` 
            });
        }

        // Generate web token
        const token = await encrypt(privateKey);
        user.webtoken = token;
        await user.save();

        // Create JWT payload
        const payload = { 
            id: user._id, 
            username: user.username, 
            walletAddress: user.walletAddress,
            status: user.status, 
            token: token, 
            auth: "player" 
        };

        let jwtoken = "";
        try {
            jwtoken = await jsonwebtokenPromisified.sign(payload, privateKey, { algorithm: 'RS256' });
        } catch (error) {
            console.error('Error signing token:', error.message);
            return res.status(500).json({ 
                error: 'Internal Server Error', 
                data: "There's a problem signing in! Please contact customer support. Error 004" 
            });
        }

        res.cookie('sessionToken', jwtoken, { secure: true, sameSite: 'None' });
        return res.json({
            message: "success", 
            data: {
                auth: "user",
                isNewUser: user.createdAt.getTime() === user.updatedAt.getTime()
            }
        });

    } catch (err) {
        console.error('Wallet login error:', err);
        return res.status(500).json({ 
            message: "error", 
            data: "Login failed. Please try again." 
        });
    }
}

/**
 * POST /auth/wallet/link
 * Link wallet to existing authenticated account
 */
exports.linkWallet = async (req, res) => {
    try {
        // Get token from cookie
        const token = req.headers.cookie?.split('; ').find(row => row.startsWith('sessionToken='))?.split('=')[1];

        if (!token) {
            return res.status(401).json({ 
                message: 'Unauthorized', 
                data: "You must be logged in to link a wallet!" 
            });
        }

        // Verify JWT
        const fs = require('fs');
        const publicKey = fs.readFileSync(path.resolve(__dirname, "../keys/public-key.pem"), 'utf-8');
        
        let decodedToken;
        try {
            decodedToken = await jsonwebtokenPromisified.verify(token, publicKey, { algorithms: ['RS256'] });
        } catch (error) {
            return res.status(401).json({ 
                message: 'Unauthorized', 
                data: "Invalid session!" 
            });
        }

        const { walletAddress, signature } = req.body;

        if (!walletAddress || !signature) {
            return res.status(400).json({ 
                message: "bad-request", 
                data: "Wallet address and signature are required!" 
            });
        }

        const normalizedAddress = walletAddress.toLowerCase();

        const userAccount = await Users.findById(decodedToken.id);

        console.log('User account for linking:', userAccount.walletAddress, normalizedAddress);
        if (userAccount.walletAddress === normalizedAddress) {
            return res.json({
                message: "success",
                data: "Wallet successfully logged in to your account!"
            });
        }

        // Check if wallet is already linked to another account
        const existingWallet = await Users.findOne({ 
            walletAddress: normalizedAddress,
            status : { $ne: "pending" },
            _id: { $ne: decodedToken.id }
        });


        if (existingWallet) {
            return res.status(400).json({ 
                message: "failed", 
                data: "This wallet is already linked to another account!" 
            });
        }

        // Find current user
        const user = await Users.findById(decodedToken.id);

        if (!user) {
            return res.status(404).json({ 
                message: "failed", 
                data: "User not found!" 
            });
        }

        if (user.walletAddress) {
            return res.status(400).json({ 
                message: "failed", 
                data: "An wallet is already linked to this account. Unlink it first!" 
            });
        }

        // Check if user has nonce (should be stored on their account from requestNonce)
        if (!user.walletNonce || !user.walletNonceExpiry) {
            return res.status(400).json({ 
                message: "failed", 
                data: "Please request a nonce first!" 
            });
        }

        // Check if nonce has expired
        if (new Date() > user.walletNonceExpiry) {
            return res.status(400).json({ 
                message: "failed", 
                data: "Nonce has expired. Please request a new one!" 
            });
        }

        // Verify signature
        const message = `Sign this message to authenticate with your wallet:\n\nNonce: ${user.walletNonce}\nWallet: ${normalizedAddress}`;
        
        try {
            const recoveredAddress = ethers.utils.verifyMessage(message, signature);
            
            if (recoveredAddress.toLowerCase() !== normalizedAddress) {
                return res.status(401).json({ 
                    message: "failed", 
                    data: "Invalid signature!" 
                });
            }
        } catch (verifyError) {
            console.error('Signature verification error:', verifyError);
            return res.status(401).json({ 
                message: "failed", 
                data: "Invalid signature format!" 
            });
        }

        // Link wallet to current user and clear nonce
        user.walletAddress = normalizedAddress;
        user.walletNonce = null;
        user.walletNonceExpiry = null;
        await user.save();

        return res.json({
            message: "success",
            data: "Wallet successfully linked to your account!"
        });

    } catch (err) {
        console.error('Link wallet error:', err);
        return res.status(500).json({ 
            message: "error", 
            data: "Failed to link wallet. Please try again." 
        });
    }
}

/**
 * POST /auth/wallet/unlink
 * Remove wallet from authenticated account
 */
exports.unlinkWallet = async (req, res) => {
    try {
        // Get token from cookie
        const token = req.headers.cookie?.split('; ').find(row => row.startsWith('sessionToken='))?.split('=')[1];

        if (!token) {
            return res.status(401).json({ 
                message: 'Unauthorized', 
                data: "You must be logged in to unlink a wallet!" 
            });
        }

        // Verify JWT
        const fs = require('fs');
        const publicKey = fs.readFileSync(path.resolve(__dirname, "../keys/public-key.pem"), 'utf-8');
        
        let decodedToken;
        try {
            decodedToken = await jsonwebtokenPromisified.verify(token, publicKey, { algorithms: ['RS256'] });
        } catch (error) {
            return res.status(401).json({ 
                message: 'Unauthorized', 
                data: "Invalid session!" 
            });
        }

        // Find current user
        const user = await Users.findById(decodedToken.id);

        if (!user) {
            return res.status(404).json({ 
                message: "failed", 
                data: "User not found!" 
            });
        }

        if (!user.walletAddress) {
            return res.status(400).json({ 
                message: "failed", 
                data: "No wallet is linked to this account!" 
            });
        }

        // Check if user has a password (to prevent account lockout)
        if (!user.password) {
            return res.status(400).json({ 
                message: "failed", 
                data: "Cannot unlink wallet: Please set a password first to avoid losing access to your account!" 
            });
        }

        // Unlink wallet
        user.walletAddress = null;
        user.walletNonce = null;
        user.walletNonceExpiry = null;
        await user.save();

        return res.json({
            message: "success",
            data: "Wallet successfully unlinked from your account!"
        });

    } catch (err) {
        console.error('Unlink wallet error:', err);
        return res.status(500).json({ 
            message: "error", 
            data: "Failed to unlink wallet. Please try again." 
        });
    }
}

exports.getUserList = async (req, res) => {
    try {
        const user = req.user;
        const { search = "", limit = 20, page = 1 } = req.query;

        const pageOptions = {
            page: parseInt(page) || 0,
            limit: parseInt(limit) || 20,
        }

        // Build match condition - exclude current user and apply search
        const matchCondition = {
            _id: { $ne: user.id }, // Exclude the authenticated user
            walletAddress: { $ne: null }, // Only users with linked wallets
            status: "active" // Only show active users
        };

        // Add search condition if provided
        if (search && search.trim()) {
            matchCondition.username = { $regex: search.trim(), $options: 'i' };
        }

        // Get total count for pagination
        const totalUsers = await Users.countDocuments(matchCondition);

        // Fetch users with userdetails
        const users = await Users.find(matchCondition)
            .select('username walletAddress status createdAt')
            .sort({ createdAt: -1 })
            .skip(pageOptions.page * pageOptions.limit)
            .limit(pageOptions.limit)
            .lean();

        // Get user details for each user
        const userIds = users.map(u => u._id);
        const userDetails = await Userdetails.find({ owner: { $in: userIds } })
            .select('owner firstname lastname profilepicture')
            .lean();

        // Create a map for quick lookup
        const detailsMap = userDetails.reduce((acc, detail) => {
            acc[detail.owner.toString()] = detail;
            return acc;
        }, {});

        // Combine users with their details
        const usersWithDetails = users.map(user => {
            const details = detailsMap[user._id.toString()] || {};
            return {
                id: user._id,
                username: user.username,
                walletAddress: user.walletAddress || null,
                status: user.status,
                createdAt: user.createdAt,
                firstname: details.firstname || "",
                lastname: details.lastname || "",
                profilepicture: details.profilepicture || ""
            };
        });

        return res.json({
            message: "success",
            data: {
                users: usersWithDetails,
                pagination: {
                    currentPage: pageOptions.page,
                    totalPages: Math.ceil(totalUsers / pageOptions.limit),
                    totalUsers: totalUsers,
                    limit: pageOptions.limit,
                    hasNextPage: pageOptions.page < Math.ceil(totalUsers / pageOptions.limit),
                    hasPrevPage: pageOptions.page > 0
                }
            }
        });

    } catch (err) {
        console.error('Get user list error:', err);
        return res.status(500).json({ 
            message: "error", 
            data: "Failed to retrieve user list." 
        });
    }
}
