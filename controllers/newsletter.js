const Newsletter = require("../models/Newsletter")
const Users = require("../models/Users")


exports.deletenewsletter = async (req, res) => {

    const { newsletterid } = req.query

    if(!newsletterid) {
        return res.status(400).json({ message: "failed", data: "Please input newsletter id field."})
    }

    await Newsletter.findOneAndDelete({ _id: newsletterid })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered when deleting newsletter ${newsletterid}. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })

    return res.status(200).json({ message: "success"})
}

exports.editnewsletter = async (req, res) => {

    const { newsletterid, title, description } = req.body

    if(!title || !description || !newsletterid){
        return res.status(400).json({ message: "failed", data: "Incomplete input fields."})
    }
    let bannerimg = req.file?.path;

    await Newsletter.findOneAndUpdate({ _id: newsletterid }, { $set: { title: title, description: description, banner: bannerimg }})
         .then(data => data)
         .catch(err => {
            console.log(`There's a problem encountered while updating newsletter ${newsletterid}. Error: ${err}`)

            return res.status(200).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
         })

    return res.status(200).json({ message: "success" })
}


exports.createnewsletter = async (req, res) => {    
    const { id } = req.user;

    const { title, description, type } = req.body;

    if(!title || !description || !type) {
        return res.status(400).json({ message: "failed", data: "Incomplete input fields."})
    }
    let bannerimg = "";

    if(req.file) {
        bannerimg = req.file.path
    } else {
        return res.json({message: "failed", data: "Please select an image first!"})
    }

     const data = await Newsletter.create({ owner: id, title: title, description: description, banner: bannerimg, type: type})
     .then(data => data)
     .catch(err => {
        console.log(`There's a problem encourted while creating newsletter. Error: ${err}`)
        return res.status(400).json({ message: "Bad-request", data: "There's a problem with the server. Please contact support for more details."})
     })

     return res.status(200).json({ message: "success", data: data.banner })
}


exports.getnewsletterlist = async (req, res) => {
    const { page, limit, filter } = req.query

    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10,
    }

    let filterstage = {}

    if(filter) {
        filterstage = { type: filter }
    }

    const newsListPipeline = [
        ...(filter ? [ { $match: filterstage }] : []),
        { $sort: { createdAt: -1 } }, 
        { $skip: pageOptions.page * pageOptions.limit },
        { $limit: pageOptions.limit }
    ]

   const news = await Newsletter.aggregate(newsListPipeline)
   const totalCount = await Newsletter.countDocuments()
   .then(data => data)
   .catch(err => {
       console.log(`There's a problem encountered while fetching total count of newsletter. Error: ${err}`)

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

