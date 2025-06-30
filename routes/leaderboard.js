const router = require("express").Router()
const { getleaderboard, updateuserleaderboard, resetleaderboard } = require("../controllers/leaderboard")
const { protectplayer } = require("../middleware/middleware")

router
    .get("/getleaderboard", protectplayer, getleaderboard)
    .post("/updateuserleaderboard", protectplayer, updateuserleaderboard)
    .post("/resetleaderboard", resetleaderboard)
    
module.exports = router;
