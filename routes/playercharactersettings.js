const router = require("express").Router()
const { getcharactersetting } = require("../controllers/Playercharactersettings")
const { protectplayer, protectsuperadmin } = require("../middleware/middleware")

router
    .get("/getcharactersetting", protectplayer, getcharactersetting)
    
module.exports = router;
