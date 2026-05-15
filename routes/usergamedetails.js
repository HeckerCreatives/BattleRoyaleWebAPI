const router = require("express").Router()
const { updateusergamedetails, getusergamedetailssuperadmin, getusergamedetails } = require("../controllers/usergamedetails")
const { protectplayer, protectsuperadmin } = require("../middleware/middleware")

router
    .get("/getusergamedetails", protectplayer, getusergamedetails)
    .post("/updateusergamedetails", protectplayer, updateusergamedetails)
    .get("/getusergamedetailssuperadmin", protectsuperadmin, getusergamedetailssuperadmin)
    
module.exports = router;
