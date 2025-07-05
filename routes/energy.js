const router = require("express").Router()
const { resetenergy, resetuserenergy, getuserenergy } = require("../controllers/energy")
const { protectplayer, protectsuperadmin } = require("../middleware/middleware")

router
    .post("/resetenergy", protectsuperadmin, resetenergy)
    .post("/resetuserenergy", protectplayer, resetuserenergy)
    .get("/getuserenergy", protectplayer, getuserenergy)
    
module.exports = router;
