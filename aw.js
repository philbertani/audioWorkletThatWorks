const context = new AudioContext({
  latencyHint: "interactive",
  sampleRate: 16000
});

function aw() {
  this.started = true;
  console.log("startup");
}

aw.prototype.record = async function () {
  console.log("xxxxxxxxxx");

  const microphone = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });

  const source = context.createMediaStreamSource(microphone);

  console.log('zzzzzzz, mic', source)

  // NEW A: Loading the worklet processor
  await context.audioWorklet.addModule("/recorder.worklet.js");
  // Create the recorder worklet
  const recorder = new AudioWorkletNode(context, "recorder.worklet");

  context.resume();

  console.log(context);
  source.connect(recorder).connect(context.destination);

  let count = 0;
  let saveBuffers = [];

  recorder.port.onmessage = (e) => {
    saveBuffers.push(e.data);
    if (count > 10) {
      console.log(e);
      console.log('zzzzzzzz data len',e.data.length)
      console.log("disonnecting");
      source.disconnect();
      processData(saveBuffers);
    }
    count++;
  };


  function Float32Concat(first, second) {
    var firstLength = first.length;
    result = new Float32Array(firstLength + second.length);
    result.set(first);
    result.set(second, firstLength);

    return result;
  }

  function processData(saveBuffers) {
    let buffer = Float32Concat(saveBuffers[0], saveBuffers[1]);

    for (let i = 2; i < saveBuffers.length; i++) {
      buffer = Float32Concat(buffer, saveBuffers[i]);
    }

    context.resume();
    const rb = context.createBuffer(1, buffer.length, context.sampleRate);
    rb.copyToChannel(buffer, 0, 0);
    
    // Try to create WAV file from data:
    blob = bufferToWave(rb, buffer.length);

    // Download the wav file to see if it worked:
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.href = url;
    a.download = "abc.wav";
    a.click();

 
    let result2 = context.createBufferSource();
    result2.buffer = rb;
    result2.connect(context.destination);
    result2.start();
    console.log(result2);
  }
};

// Convert an AudioBuffer to a Blob using WAVE representation
function bufferToWave(abuffer, len) {
  var numOfChan = 1, //abuffer.numberOfChannels,
    length = len * numOfChan * 2 + 44,
    buffer = new ArrayBuffer(length),
    view = new DataView(buffer),
    channels = [],
    i,
    sample,
    offset = 0,
    pos = 0;

    console.log('wav file',abuffer, len, length)
  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded in this demo)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  //for (i = 0; i < abuffer.numberOfChannels; i++)
  //  channels.push(abuffer.getChannelData(i));

  const ch = abuffer.getChannelData(0)

  //console.log(channels)

  let sum = 0
  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      // interleave channels
      //sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
  
      sample = Math.max(-1, Math.min(1, ch[offset])); 
      sum += ch[offset]
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
      
      view.setInt16(pos, sample, true); // write 16-bit sample
      pos += 2;
    }
    offset++; // next source sample
  }
  
  console.log('sum',sum)

  // create Blob
  return new Blob([buffer], { type: "audio/wav" });

  function setUint16(data) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}
