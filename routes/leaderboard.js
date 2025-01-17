const router = require("express").Router()
const { getleaderboard, updateuserleaderboard } = require("../controllers/leaderboard")
const { protectplayer } = require("../middleware/middleware")

router
    .get("/getleaderboard", protectplayer, getleaderboard)
    .post("/updateuserleaderboard", protectplayer, updateuserleaderboard)
    
module.exports = router;
