const { Titles } = require("../models/Titles");



exports.findtitle = async (title) => {
    return await Titles.findOne({ index: { $regex: new RegExp('^' + title + '$', 'i') } });
}