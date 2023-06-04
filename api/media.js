const { Router } = require('express')
const {
    getPhotoInfoById,
    getPhotoDownloadStreamById,
    getThumbDownloadStreamById,
} = require('../models/photo')

const router = Router()

router.get('/photos/:id', async (req, res, next) => {
    console.log("id", req.params.id)
    const id = req.params.id.split('.')
    getPhotoDownloadStreamById(id[0])
    .on('file', (file) => {
        console.log("file", file)
        res.status(200).type(file.metadata.contentType);
        console.log(file)
    }).on('error', (err) => {
        if (err.code === 'ENOENT') {
        next();
        } else {
        next(err);
        }
    }).pipe(res);
})
  
router.get('/thumbs/:id', async (req, res, next) => {
    const id = req.params.id.split('.')
    const photo = await getPhotoInfoById(id[0])
    getThumbDownloadStreamById(photo.metadata.thumbId)
    .on('file', (file) => {
        console.log("cont", file)
        res.status(200).type(file.metadata.contentType);
    }).on('error', (err) => {
        if (err.code === 'ENOENT') {
        next();
        } else {
        next(err);
        }
    }).pipe(res);
})
  
module.exports = router