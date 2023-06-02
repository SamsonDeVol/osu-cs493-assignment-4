const express = require('express')
const morgan = require('morgan')
const api = require('./api')
const fs = require('fs')
const Jimp = require("jimp");
const sharp = require('sharp');
const { connectToDb } = require('./lib/mongo')
const { connectToRabbitMQ, getChannel } = require('./lib/rabbitmq')
const { saveThumbFile, createThumbnail, getDownloadStreamById, updatePhotoSizeById } = require("./models/photo")
const sizeOf = require('image-size');
const tf = require("@tensorflow/tfjs-node")
const mobilenet = require("@tensorflow-models/mobilenet")

const app = express()
const port = process.env.PORT || 8000

/*
 * Morgan is a popular logger.
 */
app.use(morgan('dev'))

app.use(express.json())
app.use(express.static('public'))



/*
 * All routes for the API are written in modules in the api/ directory.  The
 * top-level router lives in api/index.js.  That's what we include here, and
 * it provides all of the routes.
 */
app.use('/', api)

app.use('*', function (req, res, next) {
  res.status(404).json({
    error: "Requested resource " + req.originalUrl + " does not exist"
  })
})


async function run () {
    const classifier = await mobilenet.load()
    await connectToRabbitMQ("photos")
    const channel = getChannel()

    channel.consume("photos", async msg => {
        if (msg) {
            const id = msg.content.toString()
            console.log("--finding id", id)
            const downloadStream = getDownloadStreamById(id)
            
            downloadStream.on("data", function (data) {
                fs.appendFileSync(`${__dirname}/uploads/${id}`, data)
            })

            // photoFile.contentType('image/jpeg')

            downloadStream.on('end', async () => {
              // const dimensions = sizeOf(Buffer.concat(photoData));
              // await updatePhotoSizeById(id, dimensions);
              await sharp(`${__dirname}/uploads/${id}`).resize(100,100).toFile(`${__dirname}/uploads/${id}_resized`)
              // await createThumbnail(id, Buffer.concat(photoData));
              // console.log(" -- results", result)
              const thumb = {
                filename: id,
                path: `${__dirname}/uploads/${id}_resized`,
                // userId: body.
              }
              const thumbId = await saveThumbFile(thumb)
              console.log("thumb id", thumbId)

            });
           
            // await saveThumbFile(thumb)
        }
        channel.ack(msg)
    })
}
run()


connectToDb(async function () {
  await connectToRabbitMQ("photos")
  // await run()
  app.listen(port, function () {
    console.log("== Server is running on port", port)
  })
})
