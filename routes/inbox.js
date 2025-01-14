const router = require("express").Router();
const { viewPlayerMessage, messagePlayers } = require('../controllers/inbox');
const { protectsuperadmin } = require("../middleware/middleware");

router
 .get("/viewplayermessage", protectsuperadmin, viewPlayerMessage)
 .post("/newsmessage", protectsuperadmin, messagePlayers)
 
module.exports = router;
