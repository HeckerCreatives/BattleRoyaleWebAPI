
const Inbox = require("../models/Inbox")
const Users = require("../models/Users")

const { default: mongoose } = require("mongoose");
const {pushcustomnotificationsend} = require("../utils/onesignal")


exports.viewPlayerMessage = async (req, res) => {
    const { userid } = req.query


    if(!userid){
    return res.status(400).json({ message: "Failed", data: "Please input userid" })
    }

    const inboxData = await Inbox.find({ owner: new mongoose.Types.ObjectId(userid)})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem fetching inbox data for user: ${userid} Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again." })
    })

    const totalInbox = await Inbox.countDocuments({ owner: new mongoose.Types.ObjectId(userid)})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching user inbox. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details"})
    });



    const data = {
        inbox: inboxData,
        totalInbox: totalInbox
    }


    return res.json({message:"success", data: data})
}


exports.messagePlayers = async (req, res) => {
    const { type, title, description } = req.body

    if(!type || !title || !description) {
        return res.status(400).json({ message:"Failed", data: "Incomplete input fields"})
    }
   
    const users = await Users.find({}, '_id')
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching all users for mass news. Error ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    }) 

    const bulkOperations = users.map(user => ({
        insertOne: {
            document: {
                owner: user._id,
                type: type,
                title: title,
                description: description,
                rewards: [],
                status: "unopen"
            }
        }
    }))
    
    await Inbox.bulkWrite(bulkOperations)
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while creating inbox message. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    pushcustomnotificationsend(process.env.ONE_SIGNAL_IN_GAME_MESSAGE_TEMPLATE_ID, title, truncateByWord(description, 100))
    
    return res.json({ message: "success" });
}

function truncateByWord(text, maxLength) {
  if (text.length <= maxLength) return text;

  let truncated = text.substring(0, maxLength);
  return truncated.substring(0, truncated.lastIndexOf(" ")) + "...";
}