const router = require("express").Router()
const { getleaderboard, updateuserleaderboard, resetLeaderboard, getkillleaderboard, getdeathleaderboard, getlevelleaderboard, getleaderboardhistory, getleaderboardhistoryoptions } = require("../controllers/leaderboard")
const { protectplayer, protectsuperadmin } = require("../middleware/middleware")

router
    .get("/getleaderboard", protectplayer, getleaderboard)
    .get("/getkillleaderboard", protectplayer, getkillleaderboard)
    .get("/getdeathleaderboard", protectplayer, getdeathleaderboard)
    .get("/getlevelleaderboard", protectplayer, getlevelleaderboard)
    .post("/updateuserleaderboard", protectplayer, updateuserleaderboard)
    
    .get("/getleaderboardsa", protectsuperadmin, getleaderboard)
    .get("/getkillleaderboardsa", protectsuperadmin, getkillleaderboard)
    .get("/getdeathleaderboardsa", protectsuperadmin, getdeathleaderboard)
    .get("/getlevelleaderboardsa", protectsuperadmin, getlevelleaderboard)
    .post("/resetleaderboard", protectsuperadmin, resetLeaderboard)
    .get("/getleaderboardhistory", protectsuperadmin, getleaderboardhistory)
    .get("/getleaderboardhistoryoptions", protectsuperadmin, getleaderboardhistoryoptions)
    
module.exports = router;
