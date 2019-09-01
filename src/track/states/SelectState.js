import { pixelsToSeconds } from '../../utils/converter'

export default class SelectState {

  constructor(track) {
    this.track = track
    this.active = false
  }

  setup(samplesPerPixel, sampleRate) {
    this.samplesPerPixel = samplesPerPixel
    this.sampleRate = sampleRate
  }

  emitSelection(x) {
    const minX = Math.min(x, this.startX)
    const maxX = Math.max(x, this.startX)
    const startTime = pixelsToSeconds(minX, this.samplesPerPixel, this.sampleRate)
    const endTime = pixelsToSeconds(maxX, this.samplesPerPixel, this.sampleRate)

    this.track.ee.emit('select', startTime, endTime, this.track)
  }

  complete(x) {
    this.emitSelection(x)
    this.active = false
  }

  onMouseDown(e) {
    e.preventDefault()
    this.active = true

    this.startX = e.offsetX
    const startTime = pixelsToSeconds(this.startX, this.samplesPerPixel, this.sampleRate)

    this.track.ee.emit('select', startTime, startTime, this.track)
  }

  onMouseMove(e) {
    if (this.active) {
      e.preventDefault()
      this.emitSelection(e.offsetX)
    }
  }

  onMouseUp(e) {
    if (this.active) {
      e.preventDefault()
      this.complete(e.offsetX)
    }
  }

  onMouseLeave(e) {
    if (this.active) {
      e.preventDefault()
      this.complete(e.offsetX)
    }
  }

  static getClass() {
    return '.state-select'
  }

  static getEvents() {
    return ['onMouseDown', 'onMouseMove', 'onMouseUp', 'onMouseLeave']
  }
}
