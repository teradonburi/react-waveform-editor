import InlineWorker from './lib/inline-worker'
import ExportWavWorkerFunction from './utils/exportWavWorker'

export default class WavExpoter {

  constructor () {
    this.exportWorker = new InlineWorker(ExportWavWorkerFunction)
    this.isRendering = false
  }

  startOfflineRender = (type, duration, tracks, onAudioRenderingFinished) => {
    if (this.isRendering) {
      return
    }

    this.isRendering = true
    const offlineAudioContext = new OfflineAudioContext(2, 44100 * duration, 44100)

    const currentTime = offlineAudioContext.currentTime

    tracks.forEach((track) => {
      track.setOfflinePlayout(offlineAudioContext)
      track.schedulePlay(currentTime, 0, 0, {
        shouldPlay: this.shouldTrackPlay(track),
        masterGain: 1,
        isOffline: true,
      })
    })

    /*
      TODO cleanup of different audio playouts handling.
    */
    offlineAudioContext.startRendering().then((audioBuffer) => {
      if (type === 'buffer') {
        onAudioRenderingFinished(type, audioBuffer)
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
          onAudioRenderingFinished(type, e.data)
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
}