const { log } = require('cozy-konnector-libs')

// Convert a string to a stream
async function use_stream(text, force_mime) {
  return new Promise((resolve, reject) => {
    const stream = require('stream');
    const bufferStream = new stream.PassThrough();

    if (force_mime) {
      bufferStream.mime = force_mime;
    }

    bufferStream.end(Buffer.from(text));
    resolve(bufferStream);
  });
}

async function create_file(data) {
  return {
    ...data,
    date: new Date(),
    vendor: 'Pronote',
    shouldReplaceFile: true
  }
}


module.exports = {
  use_stream,
  create_file
}