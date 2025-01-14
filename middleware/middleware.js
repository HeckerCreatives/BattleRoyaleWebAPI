//  Import here your User schema for checking of accounts
const Users = require("../models/Users")
const Staffusers = require("../models/Staffusers")

const fs = require('fs');
const path = require("path");
const publicKey = fs.readFileSync(path.resolve(__dirname, "../keys/public-key.pem"), 'utf-8');
const jsonwebtokenPromisified = require('jsonwebtoken-promisified');

const verifyJWT = async (token) => {
    try {
        const decoded = await jsonwebtokenPromisified.verify(token, publicKey, { algorithms: ['RS256'] });
        return decoded;
    } catch (error) {
        console.error('Invalid token:', error.message);
        throw new Error('Invalid token');
    }
};

exports.protectsuperadmin = async (req, res, next) => {
    const token = req.headers.cookie?.split('; ').find(row => row.startsWith('sessionToken='))?.split('=')[1]

    if (!token){
        return res.status(401).json({ message: 'Unauthorized', data: "You are not authorized to view this page. Please login the right account to view the page." });
    }

    try{
        const decodedToken = await verifyJWT(token);

        if (decodedToken.auth != "superadmin"){
            return res.status(401).json({ message: 'Unauthorized', data: "You are not authorized to view this page. Please login the right account to view the page." });
        }

        const user = await Staffusers.findOne({username: decodedToken.username})
        .then(data => data)

        if (!user){
            res.clearCookie('sessionToken', { path: '/' })
            return res.status(401).json({ message: 'Unauthorized', data: "You are not authorized to view this page. Please login the right account to view the page." });
        }

        if (user.status != "active"){
            res.clearCookie('sessionToken', { path: '/' })
            return res.status(401).json({ message: 'failed', data: `Your account had been ${user.status}! Please contact support for more details.` });
        }

        if (decodedToken.token != user.webtoken){
            res.clearCookie('sessionToken', { path: '/' })
            return res.status(401).json({ message: 'duallogin', data: `Your account had been opened on another device! You will now be logged out.` });
        }

        req.user = decodedToken;
        next();
    }
    catch(ex){
        return res.status(401).json({ message: 'Unauthorized', data: "You are not authorized to view this page. Please login the right account to view the page." });
    }
}

exports.protectplayer = async (req, res, next) => {
    const token = req.headers.cookie?.split('; ').find(row => row.startsWith('sessionToken='))?.split('=')[1]

    if (!token){
        return res.status(401).json({ message: 'Unauthorized', data: "You are not authorized to view this page. Please login the right account to view the page." });
    }

    try{
        const decodedToken = await verifyJWT(token);

        if (decodedToken.auth != "player"){
            return res.status(401).json({ message: 'Unauthorized', data: "You are not authorized to view this page. Please login the right account to view the page." });
        }

        const user = await Users.findOne({username: decodedToken.username})
        .then(data => data)

        if (!user){
            res.clearCookie('sessionToken', { path: '/' })
            return res.status(401).json({ message: 'Unauthorized', data: "You are not authorized to view this page. Please login the right account to view the page." });
        }

        if (user.status != "active"){
            res.clearCookie('sessionToken', { path: '/' })
            return res.status(401).json({ message: 'failed', data: `Your account had been ${user.status}! Please contact support for more details.` });
        }

        if (decodedToken.token != user.webtoken){
            res.clearCookie('sessionToken', { path: '/' })
            return res.status(401).json({ message: 'duallogin', data: `Your account had been opened on another device! You will now be logged out.` });
        }

        req.user = decodedToken;
        next();
    }
    catch(ex){
        return res.status(401).json({ message: 'Unauthorized', data: "You are not authorized to view this page. Please login the right account to view the page." });
    }
}

exports.preventDualAccountLogin = async (req, res, next) => {
    const token = req.headers.cookie?.split('; ').find(row => row.startsWith('sessionToken='))?.split('=')[1];

    if (!token) {
        return res.status(401).json({ 
            message: 'Unauthorized', 
            data: "You are not authorized to view this page. Please log in to continue." 
        });
    }

    try {
        const decodedToken = await verifyJWT(token);

        const userSchema = decodedToken.auth === "superadmin" ? Staffusers : Users;

        const user = await userSchema.findOne({ username: decodedToken.username });

        if (!user) {
            res.clearCookie('sessionToken', { path: '/' });
            return res.status(401).json({ 
                message: 'Unauthorized', 
                data: "Your session is invalid. Please log in again." 
            });
        }

        if (user.status !== "active") {
            res.clearCookie('sessionToken', { path: '/' });
            return res.status(401).json({ 
                message: 'Unauthorized', 
                data: `Your account is ${user.status}. Please contact support for more details.` 
            });
        }

        if (user.webtoken && decodedToken.token !== user.webtoken) {
            res.clearCookie('sessionToken', { path: '/' });
            return res.status(401).json({ 
                message: 'Dual Login Detected', 
                data: "You have logged in from another account or device. This session has been terminated." 
            });
        }

        req.user = decodedToken;
        next();
    } catch (error) {
        console.error("Authentication Error:", error.message);
        return res.status(401).json({ 
            message: 'Unauthorized', 
            data: "An error occurred during authentication. Please log in again." 
        });
    }
};
