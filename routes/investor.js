const { getinvestorlist, subscribeinvestor, deleteinvestor, getinvestors, deletemultipleinvestors } = require('../controllers/investor');
const { protectsuperadmin } = require('../middleware/middleware');

const router = require('express').Router();

router
.get("/getinvestorlist", protectsuperadmin, getinvestorlist)
.get("/getinvestors", protectsuperadmin, getinvestors)
.post("/subscribeinvestor", subscribeinvestor)
 .get("/deleteinvestor", protectsuperadmin, deleteinvestor)
 .post("/deletemultipleinvestors", protectsuperadmin, deletemultipleinvestors)

module.exports = router;