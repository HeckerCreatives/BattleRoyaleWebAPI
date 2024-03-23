const router = require("express").Router()
const { authlogin, register, registerstaffs, logout } = require("../controllers/auth")
const { protectsuperadmin } = require("../middleware/middleware")

router
    .get("/login", authlogin)
    .post("/register", register)
    .post("/registerstaffs", protectsuperadmin, registerstaffs)
    .get("/logout", logout)
module.exports = router;
