const { default: mongoose } = require("mongoose")
const News = require("../models/News")

const fs = require("fs")

//  #region ADMIN

exports.createnews = async (req, res) => {
    const {id, username} = req.user
    const {title, description} = req.body
    let banner = ""

    if (!title || !description){
        fs.unlinkSync(req.file.path)
        return res.status(400).json({message: "failed", data: "Please complete the form first before saving and try again!"})
    }

    if (req.file){
        banner = req.file.path
    }
    else{
        return res.status(400).json({message: "failed", data: "Please upload a banner first and try again"})
    }

    await News.create({owner: new mongoose.Types.ObjectId(id), title: title, description: description, banner: banner})
    .catch(err => {
        fs.unlinkSync(banner)
        console.log(`Server error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server please try again later"})
    });

    return res.json({message: "success"})
}

exports.editnews = async (req, res) => {
    const {id, username} = req.user
    const {newsid, title, description} = req.body
    let banner = ""

    if (!title || !description){
        fs.unlinkSync(req.file.path)
        return res.status(400).json({message: "failed", data: "Please complete the form first before saving and try again!"})
    }

    if (req.file){
        banner = req.file.path
    }

    const newsolddata = await News.findOne({_id: newsid})
    .then(data => data)
    .catch(err => {
        fs.unlinkSync(banner)
        console.log(`Server error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server please try again later"})
    });

    if (!newsolddata){
        if (req.file){
            fs.unlinkSync(banner)
        }

        return res.status(400).json({message: "failed", data: "News id does not exist! Please select a valid news to edit and try again."})
    }

    if (banner != ""){

        if (newsolddata.banner != ""){
            fs.unlinkSync(newsolddata.banner)
        }
    }

    await News.findOneAndUpdate({_id: newsid}, {owner: new mongoose.Types.ObjectId(id), title: title, description: description, banner: banner != "" ? banner : newsolddata.banner})
    .catch(err => {
        fs.unlinkSync(banner)
        console.log(`Server error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server please try again later"})
    });

    return res.json({message: "success"})
}

exports.deletenews = async (req, res) => {
    const {id, username} = req.user
    const {newsid} = req.query

    const newsdata = await News.findOneAndDelete({_id: newsid})
    .then(data => data)
    .catch(err => {
        console.log(`Server error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server please try again later"})
    });

    if (!newsdata){
        return res.status(400).json({ message: "failed", data: "News data not exist!"})
    }

    if (newsdata.banner != ''){
        try {
            fs.unlinkSync(newsdata.banner)
        } catch (error) {
            console.log(`image banner not exist on server storage: ${error}`)
        }
    }

    return res.json({message: "success"})
}

//  #endregion

exports.getnewslist = async (req, res) => {
    const pageOptions = {
        page: parseInt(req.query.page) || 0,
        limit: parseInt(req.query.limit) || 10
    }
    
    const newshistory = await News.find()
    .skip(pageOptions.page * pageOptions.limit)
    .limit(pageOptions.limit)
    .sort({'createdAt': -1})    
    .then(data => data)
    .catch(err => {
        console.log(`Server error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server please try again later"})
    });

    if (newshistory.length <= 0){
        return res.json({message: "success", data: { totalpage: 0, news: []}})
    }

    const counthistory = await News.countDocuments()
    .then(data => data)
    .catch(err => {
        console.log(`Server error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server please try again later"})
    })

    const totalpages = Math.ceil(counthistory / pageOptions.limit)

    const newsdata = []

    newshistory.forEach(data => {
        const {_id, title, description, banner} = data
        newsdata.push({
            newsid: _id,
            title: title,
            description: description,
            banner: banner
        })
    })

    return res.json({message: "success", data: {totalpages: totalpages, news: newsdata}})
}