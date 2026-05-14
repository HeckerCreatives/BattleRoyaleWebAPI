const router = require("express").Router()

const {  register, authlogin, logout, registerstaffs, requestNonce, walletLogin, linkWallet, unlinkWallet, checkSession, getUserList, autoLogin } = require("../controllers/auth")

const { protectsuperadmin, protectplayer } = require("../middleware/middleware")


router
    .get("/login", authlogin)
    .get("/logout", logout)
    .get("/checksession", checkSession)
    .get("/getuserlist", protectplayer, getUserList)
    
    .post("/register", register)
    .post("/registerstaff", protectsuperadmin, registerstaffs)

    .post("/wallet/request-nonce", requestNonce)
    .post("/wallet/login", walletLogin)
    .post("/wallet/link", protectplayer, linkWallet)
    .post("/wallet/unlink", protectplayer, unlinkWallet)

    // Auto login endpoint for login page
    .get("/auto-login", autoLogin)

module.exports = router;
