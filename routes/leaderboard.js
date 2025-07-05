const router = require("express").Router()
const { getleaderboard, updateuserleaderboard, resetleaderboard, getleaderboardhistory, getleaderboardhistoryoptions } = require("../controllers/leaderboard")
const { protectplayer, protectsuperadmin } = require("../middleware/middleware")

router
    .get("/getleaderboard", protectplayer, getleaderboard)
    .post("/updateuserleaderboard", protectplayer, updateuserleaderboard)
    .get("/getleaderboardsa", protectsuperadmin, getleaderboard)
    .post("/resetleaderboard", protectsuperadmin, resetleaderboard)
    .get("/getleaderboardhistory", protectsuperadmin, getleaderboardhistory)
    .get("/getleaderboardhistoryoptions", protectsuperadmin, getleaderboardhistoryoptions)
    
module.exports = router;
