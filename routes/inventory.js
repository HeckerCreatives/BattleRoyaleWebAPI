const { protectplayer } = require("../middleware/middleware");
const inventoryController = require("../controllers/inventory");

const router = require("express").Router();


router
 .get("/getmyinventory", protectplayer, inventoryController.getMyInventory)
 .post("/mintitem", protectplayer, inventoryController.mintItem)
 .post("/cancelmint", protectplayer, inventoryController.cancelmint);


module.exports = router;