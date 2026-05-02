const router = require("express").Router();
const marketplaceController = require("../controllers/marketplace");
const { protectplayer, protectsuperadmin, protectallusers } = require("../middleware/middleware");

// ==================== PLAYER ROUTES ====================
router
	.get("/items", protectallusers, marketplaceController.getmarketplaceitems)
	.post("/buy", protectplayer, marketplaceController.buymarketplaceitem)
	.get("/inventory", protectplayer, marketplaceController.getuserinventory)
	.post("/use", protectplayer, marketplaceController.useitem)
	.post("/equip-title", protectplayer, marketplaceController.equiptitle)
	.get("/getequippedtitle", protectplayer, marketplaceController.getequippedtitle)
	.get("/wallets", protectplayer, marketplaceController.getuserwallets)
	.get("/effects", protectplayer, marketplaceController.getactiveeffects)
	.get("/transactions", protectplayer, marketplaceController.gettransactionhistory)
	.post("/wallet/add", protectplayer, marketplaceController.addwallet)
	.post("/points/add", protectplayer, marketplaceController.addpoints)

// ==================== SUPERADMIN ROUTES ====================
router
	.post("/admin/create", protectsuperadmin, marketplaceController.createmarketplaceitem)
	.post("/admin/update", protectsuperadmin, marketplaceController.updatemarketplaceitem)
	.post("/admin/delete", protectsuperadmin, marketplaceController.deletemarketplaceitem)
	.get("/admin/items", protectsuperadmin, marketplaceController.getallmarketplaceitems)
	.get("/admin/player/inventory", protectsuperadmin, marketplaceController.getplayerinventory)
	.post("/admin/player/add", protectsuperadmin, marketplaceController.additemtoplayer)
	.post("/admin/player/remove", protectsuperadmin, marketplaceController.removeitemfromplayer)
	.get("/admin/player/wallets", protectsuperadmin, marketplaceController.getplayerwallets)
	.post("/admin/player/wallet", protectsuperadmin, marketplaceController.updateplayerwallet)
	.get("/admin/player/transactions", protectsuperadmin, marketplaceController.getplayertransactions);

module.exports = router;
