/*
 * API sub-router for businesses collection endpoints.
 */

const { Router } = require('express')
const { getChannel } = require('../lib/rabbitmq')
const { validateAgainstSchema } = require('../lib/validation')
const {
  PhotoSchema,
  photoTypes,
  getPhotoInfoById,
  savePhotoFile,
  removeUploadedFile,
} = require('../models/photo')

const router = Router()
const crypto = require("node:crypto")
const multer = require('multer');

const upload = multer({
  storage: multer.diskStorage({
    destination: `${__dirname}/../uploads`,
    filename: (req, file, callback) => {
        const filename = crypto.pseudoRandomBytes(16).toString("hex")
        const extension = photoTypes[file.mimetype]
        callback(null, `${filename}.${extension}`)
    }
  }),
  fileFilter: (req, file, callback) => {
    callback(null, !!photoTypes[file.mimetype]);
  }
});


/*
 * POST /photos - Route to create a new photo.
 */
router.post('/', upload.single('photo'), async (req, res, next) => {
  console.log("  -- req.file:", req.file)
  const body = JSON.parse(req.body.data)
  console.log("  -- req.body:", body)

  if (validateAgainstSchema(body, PhotoSchema) && req.file) {
    try {
      const photo = {
        contentType: req.file.mimetype,
        filename: req.file.filename,
        path: req.file.path,
        userId: body.userId
      }

      const id = await savePhotoFile(photo)
      const channel = getChannel();
      channel.sendToQueue('photos', Buffer.from(id.toString()));
      await removeUploadedFile(photo)
      res.status(200).send({
        id: id,
        links: {
          photo: `/photos/${id}`,
          business: `/businesses/${body.businessId}`
        }
      })
    } catch (err) {
      console.error(err)
      res.status(500).send({
        error: "Error inserting photo into DB.  Please try again later."
      })
    }
  } else {
    res.status(400).send({
      error: "Request body is not a valid photo object, must include a userId, and businessId as well as be valid jpg or png file."
    })
  }
})

/*
 * GET /photos/{id} - Route to fetch info about a specific photo.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const photo = await getPhotoInfoById(req.params.id)
    console.log(" -- photo:", photo)
    if (photo) {
      delete photo.path;
      const resBody = {
        _id: photo._id,
        url: `/media/photos/${photo._id}.${photoTypes[photo.metadata.contentType]}`,
        contentType: photo.metadata.contentType,
        userId: photo.metadata.userId,
        thumbId: photo.metadata.thumbId,
        thumbUrl: `/media/thumbs/${photo._id}.jpg`
      }
      res.status(200).send(resBody)
    } else {
      next()
    }
  } catch (err) {
    console.error(err)
    res.status(500).send({
      error: "Unable to fetch photo.  Please try again later."
    })
  }
})


module.exports = router
