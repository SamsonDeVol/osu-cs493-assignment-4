const fs = require('fs')
const sharp = require('sharp');

const { connectToRabbitMQ, getChannel } = require('../lib/rabbitmq')
const { 
    getPhotoDownloadStreamById, 
    saveThumbFile, 
    removeUploadedFileByPath, 
    addThumbIdToPhoto 
} = require("../models/photo")

async function runWorker() {
    await connectToRabbitMQ("photos")
    const channel = getChannel()

    channel.consume("photos", async msg => {
        if (msg) {
            const id = msg.content.toString()
            const downloadStream = getPhotoDownloadStreamById(id)
           
            downloadStream.on("data", function (data) {
                fs.appendFileSync(`${__dirname}/../uploads/${id}`, data)
            })

            downloadStream.on('end', async () => {
              await sharp(`${__dirname}/../uploads/${id}`).resize(100,100).toFile(`${__dirname}/../uploads/${id}_resized`)
              const thumb = {
                filename: id,
                path: `${__dirname}/../uploads/${id}_resized`,
              }
             
              const thumbId = await saveThumbFile(thumb)
             
              await removeUploadedFileByPath(`${__dirname}/../uploads/${id}`)
              await removeUploadedFileByPath(`${__dirname}/../uploads/${id}_resized`)
              await addThumbIdToPhoto(id, thumbId)
              
            });
        }
        channel.ack(msg)
    })
}

exports.runWorker = runWorker

