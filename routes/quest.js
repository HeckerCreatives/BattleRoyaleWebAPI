const router = require("express").Router();
const { protectsuperadmin } = require("../middleware/middleware");
const {
    getallquests,
    getquest,
    createquest,
    updatequest,
    deletequest,
    addreward,
    updatereward,
    deletereward,
    resetallquestprogress,
    resetplayerads,
    resetallwatchads,
} = require("../controllers/quest");

router
    .get("/getallquests", protectsuperadmin, getallquests)
    .get("/getquest", protectsuperadmin, getquest)
    .post("/createquest", protectsuperadmin, createquest)
    .post("/updatequest", protectsuperadmin, updatequest)
    .post("/deletequest", protectsuperadmin, deletequest)
    .post("/addreward", protectsuperadmin, addreward)
    .post("/updatereward", protectsuperadmin, updatereward)
    .post("/deletereward", protectsuperadmin, deletereward)
    .post("/resetallquestprogress", protectsuperadmin, resetallquestprogress)
    .post("/resetplayerads", protectsuperadmin, resetplayerads)
    .post("/resetallwatchads", protectsuperadmin, resetallwatchads);
module.exports = router;
