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