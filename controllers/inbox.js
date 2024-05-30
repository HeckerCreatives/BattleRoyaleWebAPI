const { default: mongoose } = require("mongoose")
const Inbox = require("../models/Inbox")
const Users = require("../models/Users")

//  #region ADMIN

exports.newsmessage = async (req, res) => {
    const {id, username} = req.user
    const {title, description} = req.body

    const userdata = await Users.find()
    .then(data => data)
    .catch(err => {
        console.log(`Server error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server please try again later"})
    });

    if (userdata.length <= 0){
        return res.json({message: "success"})
    }

    const messages = []

    userdata.forEach(users => {
        const {_id} = users

        messages.push({
            insertOne: {
                document: {
                    owner: new mongoose.Types.ObjectId(_id),
                    type: "news",
                    rewards: [],
                    title: title,
                    description: description,
                    status: "unopen"
                }
            }
        })
    })

    await Inbox.bulkWrite(messages)

    return res.json({message: "success"})
}

exports.viewplayermessage = async (req, res) => {
    const {id, username} = req.user
    const {userid} = req.query
    const pageOptions = {
        page: parseInt(req.query.page) || 0,
        limit: parseInt(req.query.limit) || 10
    }

    const messages = await Inbox.find({owner: new mongoose.Types.ObjectId(userid)})
    .skip(pageOptions.page * pageOptions.limit)
    .limit(pageOptions.limit)
    .sort({'createdAt': -1})    
    .then(data => data)
    .catch(err => {
        console.log(`Server error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server please try again later"})
    });

    if (messages.length <= 0){
        return res.json({message: "success", data: {totalpages: 0, inbox: []}})
    }

    const counthistory = await Inbox.countDocuments({owner: new mongoose.Types.ObjectId(userid)})
    .then(data => data)
    .catch(err => {
        console.log(`Server error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server please try again later"})
    })

    const totalpages = Math.ceil(counthistory / pageOptions.limit)

    const inboxdata = []

    messages.forEach(data => {
        const {type, rewards, title, description} = data
        inboxdata.push({
            type: type,
            rewards: rewards,
            title: title,
            description: description
        })
    })

    return res.json({message: "success", data: {totalpages: totalpages, inbox: inboxdata}})
}

//  #endregion