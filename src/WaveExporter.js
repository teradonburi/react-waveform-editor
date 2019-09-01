import Playout from './Playout'

export function startOfflineRender(type) {
  if (this.isRendering) {
    return
  }

  this.isRendering = true
  this.offlineAudioContext = new OfflineAudioContext(2, 44100 * this.duration, 44100)

  const currentTime = this.offlineAudioContext.currentTime

  this.tracks.forEach((track) => {
    track.setOfflinePlayout(new Playout(this.offlineAudioContext, track.buffer))
    track.schedulePlay(currentTime, 0, 0, {
      shouldPlay: this.shouldTrackPlay(track),
      masterGain: 1,
      isOffline: true,
    })
  })

  /*
    TODO cleanup of different audio playouts handling.
  */
  this.offlineAudioContext.startRendering().then((audioBuffer) => {
    if (type === 'buffer') {
      this.ee.emit('audiorenderingfinished', type, audioBuffer)
      this.isRendering = false
      return
    }

    if (type === 'wav') {
      this.exportWorker.postMessage({
        command: 'init',
        config: {
          sampleRate: 44100,
        },
      })

      // callback for `exportWAV`
      this.exportWorker.onmessage = (e) => {
        this.ee.emit('audiorenderingfinished', type, e.data)
        this.isRendering = false

        // clear out the buffer for next renderings.
        this.exportWorker.postMessage({
          command: 'clear',
        })
      }

      // send the channel data from our buffer to the worker
      this.exportWorker.postMessage({
        command: 'record',
        buffer: [
          audioBuffer.getChannelData(0),
          audioBuffer.getChannelData(1),
        ],
      })

      // ask the worker for a WAV
      this.exportWorker.postMessage({
        command: 'exportWAV',
        type: 'audio/wav',
      })
    }
  }).catch((e) => {
    throw e
  })
}