import { pixelsToSeconds } from '../../utils/converter'

export default class CursorState {

  constructor(track) {
    this.track = track
  }

  setup(samplesPerPixel, sampleRate) {
    this.samplesPerPixel = samplesPerPixel
    this.sampleRate = sampleRate
  }

  onClick(e) {
    e.preventDefault()

    const startX = e.offsetX
    const startTime = pixelsToSeconds(startX, this.samplesPerPixel, this.sampleRate)

    this.track.ee.emit('select', startTime, startTime, this.track)
  }

  static getClass() {
    return '.state-cursor'
  }

  static getEvents() {
    return ['onClick']
  }
}
