

const router = require("express").Router();
const { createtitle, gettitles, edittitle, deletetitle } = require("../controllers/title");
const { protectsuperadmin } = require("../middleware/middleware");

router
 .post("/create", protectsuperadmin, createtitle)
 .get("/list", protectsuperadmin, gettitles)
 .post("/edit", protectsuperadmin, edittitle)
 .post("/delete", protectsuperadmin, deletetitle);

module.exports = router;
