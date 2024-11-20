const { default: mongoose } = require("mongoose");
const Content = require("../models/Content")


exports.createContent = async (req, res) => {
    const { id } = req.user

    const { title, description, type } = req.body
    const link = req.file?.path || "";

    if(!title || !description || !type) {
        return res.status(400).json({ message: "failed", data: "Please input all data."})
    }

    await Content.create({ owner: id, title: title, description: description, type: type, link: link})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while creating Content. Error: ${err}.`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    return res.status(200).json({ message: "success"})
}
exports.massMapContent = async (req, res) => {
    const { id } = req.user

    const mapcontentt = req.body.mapObjectArray

    let index = 0
    let mapContentData = []

    mapcontentt.forEach(item => {
        const parsedItem = JSON.parse(item);
        
        mapContentData.push({
            owner: id,
            title: parsedItem.title,
            description: parsedItem.description,
            type: parsedItem.type,
            link: req.files[index].path
        })

    })


    const mapBulkWrite = mapContentData.map(data => ({
        insertOne: {
            document: { owner: id, title: data.title, description: data.description, link: data.link, type: data.type }
        }
    }))


    await Content.bulkWrite(mapBulkWrite)
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while creating multiple Content. Error: ${err}.`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    return res.status(200).json({ message: "success"})
}

exports.editContent = async (req, res) => {

    const { id, title, description, type } = req.body

    const link = req.file?.path || ""
    if(!title || !description || !type) {
        return res.status(400).json({ message: "failed", data: "Please input all data."})
    }

    await Content.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(id)},{ title: title, description: description, type: type, link: link})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while creating Content. Error: ${err}.`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    return res.status(200).json({ message: "success"})
}

exports.deleteContent = async (req, res) => {

    const { id } = req.query

    if(!id){
        return res.status(400).json({ message: "failed", data: "Please input ID field."})
    }

    await Content.findOneAndDelete({ _id: new mongoose.Types.ObjectId(id)})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered when deleting content. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." })
    })
    
    return res.status(200).json({ message: "success"})
}
exports.getContent = async (req, res) => {
    const { type, limit } = req.query

    const limitNumber = parseInt(limit) || 10;

    const contentData = await Content.aggregate([
        {
            $match: {
                type: { $regex: `^${type}$`, $options: 'i' }
            }
        },
        {
            $sort: { createdAt: -1}
        },
        {
            $limit: limitNumber
        },
    ])    
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem while fetching content data. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    const finalData = []

    contentData.forEach(temp => {
        const { _id, title, description, link } = temp
        finalData.push({
            id: _id,
            title: title,
            description: description,
            link: link,
        })
    })

    return res.status(200).json({ message: "success", data: finalData})
}