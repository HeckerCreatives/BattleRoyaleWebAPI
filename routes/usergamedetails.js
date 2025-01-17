const router = require("express").Router()
const { getusergamedetails, updateusergamedetails } = require("../controllers/usergamedetails")
const { protectplayer } = require("../middleware/middleware")

router
    .get("/getusergamedetails", protectplayer, getusergamedetails)
    .post("/updateusergamedetails", protectplayer, updateusergamedetails)
    
module.exports = router;
