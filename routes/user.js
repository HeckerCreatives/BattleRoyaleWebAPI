const router = require("express").Router()
const { getuserdetails, changepassworduser, getplayerlist, updateuserprofile, banunbanuser, getplayercount, getplayersbystatus, searchplayerbyemail, searchplayerbyusername } = require("../controllers/user")
const { protectplayer, protectsuperadmin } = require("../middleware/middleware")

router
    .get("/getuserdetails", protectplayer, getuserdetails)
    .post("/changepassworduser", protectplayer, changepassworduser)
    .get("/getplayerlist", protectsuperadmin, getplayerlist)
    .post("/updateuserprofile", protectplayer, updateuserprofile)
    .post("/banunbanuser", protectsuperadmin, banunbanuser)
    .get("/getplayercount", protectsuperadmin, getplayercount)
    .get("/getplayerbystatus", protectsuperadmin, getplayersbystatus)
    .post("/searchbyusername", protectsuperadmin, searchplayerbyusername)
    .post("/searchbyemail", protectsuperadmin, searchplayerbyemail)
module.exports = router;
