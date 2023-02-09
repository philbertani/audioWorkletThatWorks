const context = new AudioContext();

function aw() {
  this.started = true
  console.log('startup')
}

aw.prototype.record = async function () {

    console.log('xxxxxxxxxx')
    
    const microphone = await navigator.mediaDevices
      .getUserMedia({
        audio: true
      })
  
    const source = context.createMediaStreamSource(microphone);
  
    // NEW A: Loading the worklet processor
    await context.audioWorklet.addModule("/recorder.worklet.js")
    // Create the recorder worklet
    const recorder = new AudioWorkletNode(
      context,
      "recorder.worklet"
    )
  
    context.resume()
    
    console.log(context)
    source
      .connect(recorder)
      .connect(context.destination);
  
    let count = 0
    let saveBuffers = []

    recorder.port.onmessage = (e) => {
      saveBuffers.push(e.data)
      if (count > 100) { console.log(e); console.log('disonnecting'); source.disconnect(); processData(saveBuffers) }
      count++;     
    }

    function Float32Concat(first, second) {

      var firstLength = first.length;
      result = new Float32Array(firstLength + second.length);
      result.set(first);
      result.set(second, firstLength);

      return result;

    }

    function processData(saveBuffers) {

        let buffer = Float32Concat(saveBuffers[0],saveBuffers[1])

        for (let i=2; i<saveBuffers.length; i++) {

          buffer = Float32Concat(buffer,saveBuffers[i])
        }

        context.resume()
        const rb = context.createBuffer(1,buffer.length,context.sampleRate)
        rb.copyToChannel(buffer,0,0)
        let result2 = context.createBufferSource()
        result2.buffer = rb
        result2.connect(context.destination)
        result2.start()
        console.log(result2)

    }

  }