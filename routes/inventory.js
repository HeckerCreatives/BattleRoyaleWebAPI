const { protectplayer } = require("../middleware/middleware");
const inventoryController = require("../controllers/inventory");

const router = require("express").Router();


router
 .get("/getmyinventory", protectplayer, inventoryController.getMyInventory)
 .get("/nftactivity", protectplayer, inventoryController.getNFTActivity)
 .get("/token", protectplayer, inventoryController.getTokenDetails)
 .post("/mintitem", protectplayer, inventoryController.mintItem)
 .post("/cancelmint", protectplayer, inventoryController.cancelmint)
 .post("/giftnft", protectplayer, inventoryController.giftNFT)
 .post("/listnft", protectplayer, inventoryController.listNFT)
 .post("/check-owned", protectplayer, inventoryController.checkOwnedTokens)
 .post("/claim", protectplayer, inventoryController.claimNFT);


module.exports = router;