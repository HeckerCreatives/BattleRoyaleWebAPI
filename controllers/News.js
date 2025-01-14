const News = require("../models/News")
const Users = require("../models/Users")


exports.deleteNews = async (req, res) => {

    const { newsid } = req.query

    if(!newsid) {
        return res.status(400).json({ message: "failed", data: "Please input news id field."})
    }

    await News.findOneAndDelete({ _id: newsid })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered when deleting news ${newsid}. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })

    return res.status(200).json({ message: "success"})
}

exports.editNews = async (req, res) => {

    const { newsid, title, description } = req.body

    if(!title || !description || !newsid){
        return res.status(400).json({ message: "failed", data: "Incomplete input fields."})
    }
    let bannerimg = req.file?.path;

    await News.findOneAndUpdate({ _id: newsid }, { $set: { title: title, description: description, banner: bannerimg }})
         .then(data => data)
         .catch(err => {
            console.log(`There's a problem encountered while updating news ${newsid}. Error: ${err}`)

            return res.status(200).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
         })

    return res.status(200).json({ message: "success" })
}


exports.messageNews = async (req, res) => {
    const { id } = req.user

    const { title, description } = req.body

    let bannerimg = req.file.path || null;


    if(!title || !description) {
        return res.status(400).json({ message: "failed", data: "Incomplete input fields."})
    }

    await News.create({ owner: id, title: title, description: description, banner: bannerimg })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while creating mass news. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details"})
    })
    return res.status(200).json({ message: "success"})
}

exports.getnewslist = async (req, res) => {
    const { page, limit } = req.query

    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10,
    }

    const newsListPipeline = [
        { $match: {} }, 
        { $sort: { createdAt: -1 } }, 
        { $skip: pageOptions.page * pageOptions.limit },
        { $limit: pageOptions.limit }
    ]

   const news = await News.aggregate(newsListPipeline)
   const totalCount = await News.countDocuments()
   .then(data => data)
   .catch(err => {
       console.log(`There's a problem encountered while fetching total count of news. Error: ${err}`)

       return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
   });

   const finalpages = Math.ceil(totalCount / pageOptions.limit)
   const data = {
    totalpages: finalpages,
    news: []
   }

   news.forEach(tempdata => {
    const { _id, description, title, banner } = tempdata
        data.news.push({
            newsid: _id,
            description: description,
            title: title,
            banner: banner
        })
   })
   return res.status(200).json({ message: "success", data: data})
}

exports.createNews = async (req, res) => {    
    const { id } = req.user;

    const { title, description } = req.body;

    if(!title || !description){
        return res.status(400).json({ message: "failed", data: "Incomplete input fields."})
    }
    let bannerimg = "";

    if(req.file) {
        bannerimg = req.file.path
    } else {
        return res.json({message: "failed", data: "Please select an image first!"})
    }

     await News.create({ owner: id, title: title, description: description, banner: bannerimg})
     .then(data => data)
     .catch(err => {
        console.log(`There's a problem encourted while creating news. Error: ${err}`)
        return res.status(400).json({ message: "Bad-request", data: "There's a problem with the server. Please contact support for more details."})
     })

     return res.status(200).json({ message: "success" })
}
