const router = require("express").Router();

const { getPlayerList, changeplayerpassword, banunbanuser, getUserDetails, changeUserPassword, updateUserProfile, registrationGraph, getRegistrationCount } = require("../controllers/user")
const { protectsuperadmin, protectplayer } = require("../middleware/middleware")


router
 .get("/getplayerlist", protectsuperadmin, getPlayerList)
 .get("/getuserdetails", protectplayer, getUserDetails)
 .post("/changeplayerpassword", protectsuperadmin, changeplayerpassword)
 .post("/banunbanuser", protectsuperadmin, banunbanuser)
 .post("/changeuserpassword", protectplayer, changeUserPassword)
 .post("/updateuserprofile", protectplayer, updateUserProfile)
 .get("/getuserregistrationchart", protectsuperadmin, registrationGraph)
 .get("/getregistrationcount", protectsuperadmin, getRegistrationCount)



module.exports = router;
