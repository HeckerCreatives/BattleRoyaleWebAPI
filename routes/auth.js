const router = require("express").Router()

const {  register, authlogin, logout, registerstaffs } = require("../controllers/auth")

const { protectsuperadmin } = require("../middleware/middleware")


router
    .get("/login", authlogin)
    .get("/logout", logout)
    .post("/register", register)
    .post("/registerstaff", protectsuperadmin, registerstaffs)

module.exports = router;
