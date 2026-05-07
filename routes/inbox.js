const router = require("express").Router();
const { viewPlayerMessage, messagePlayers, claimInboxReward } = require('../controllers/inbox');
const { protectsuperadmin, protectplayer } = require("../middleware/middleware");

router
 .get("/viewplayermessage", protectsuperadmin, viewPlayerMessage)
 .post("/newsmessage", protectsuperadmin, messagePlayers)
 .post("/claim/:id", protectplayer, claimInboxReward)
 
module.exports = router;
