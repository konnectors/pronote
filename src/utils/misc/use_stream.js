const stream = require('stream');

async function use_stream(text, force_mime) {
  return new Promise((resolve, reject) => {
    const bufferStream = new stream.PassThrough();

    if (force_mime) {
      bufferStream.mime = force_mime;
    }

    bufferStream.end(Buffer.from(text));
    resolve(bufferStream);
  });
}

module.exports = use_stream;