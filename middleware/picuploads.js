const path = require('path')
const multer = require('multer')

var storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, 'picuploads/')
    },
    filename: function(req, file, cb){
        let ext = path.extname(file.originalname)
        cb(null, Date.now() + ext)
    }
})

var pictureupload = multer({
    storage: storage,
    fileFilter: function(req, file, callback){
        if (file.mimetype == "image/png" || file.mimetype == "image/jpg"
            || file.mimetype == "image/jpeg"){
            callback(null, true);
        }else{
            console.log(file.mimetype)
            console.log('only jpg & png files supported')
            callback(new Error('Invalid file type'))
        }
    }
})

module.exports = pictureupload