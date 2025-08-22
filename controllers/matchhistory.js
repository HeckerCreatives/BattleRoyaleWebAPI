const Matchhistory = require("../models/Matchhistory")
const { default: mongoose } = require("mongoose");

exports.getmatchhistory = async (req, res) => {
    const { id, username } = req.user
    const { page, limit } = req.query
    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    }
    try {
        const matchHistory = await Matchhistory.find({ owner: id })
            .populate('owner', 'username')
            .skip(pageOptions.page * pageOptions.limit)
            .limit(pageOptions.limit)
            .sort({ createdAt: -1 })
        const totalCount = await Matchhistory.countDocuments({ owner: id })
        const totalPages = Math.ceil(totalCount / pageOptions.limit)
        const formattedData = matchHistory.map(match => ({
            id: match._id,
            player: match.owner.username,
            kills: match.kill,
            placement: match.placement,
            createdAt: match.createdAt,
        }))
        return res.json({ message: "success", data: formattedData, pagination: { totalCount, totalPages } })
    } catch (err) {
        console.log(`Error getting match history for ${username}: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem getting match history." })
    }
}

exports.getplayermatchhistory = async (req, res) => {
    const { id, username } = req.user
    const { playerid, page, limit } = req.query
    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    }
    try {
        const matchHistory = await Matchhistory.find({  owner: new mongoose.Types.ObjectId(playerid) })
            .populate('owner', 'username')
            .skip((pageOptions.page - 1) * pageOptions.limit)
            .limit(pageOptions.limit)
            .sort({ createdAt: -1 })
        const totalCount = await Matchhistory.countDocuments({ owner: new mongoose.Types.ObjectId(playerid) })
        const totalPages = Math.ceil(totalCount / pageOptions.limit)
        const formattedData = matchHistory.map(match => ({
            id: match._id,
            player: match.owner.username,
            kills: match.kill,
            placement: match.placement,
            createdAt: match.createdAt,
        }))
        return res.json({ message: "success", data: formattedData, pagination: { totalCount, totalPages } })
    } catch (err) {
        console.log(`Error getting match history for ${username}: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem getting match history." })
    }
}