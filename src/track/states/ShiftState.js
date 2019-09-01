import { pixelsToSeconds } from '../../utils/converter'

export default class ShiftState {

  constructor(track) {
    this.track = track
    this.active = false
  }

  setup(samplesPerPixel, sampleRate) {
    this.samplesPerPixel = samplesPerPixel
    this.sampleRate = sampleRate
  }

  emitShift(x) {
    const deltaX = x - this.prevX
    const deltaTime = pixelsToSeconds(deltaX, this.samplesPerPixel, this.sampleRate)
    this.prevX = x
    this.track.ee.emit('shift', deltaTime, this.track)
  }

  complete(x) {
    this.emitShift(x)
    this.active = false
  }

  onMouseDown(e) {
    e.preventDefault()

    this.active = true
    this.el = e.target
    this.prevX = e.offsetX
  }

  onMouseMove(e) {
    if (this.active) {
      e.preventDefault()
      this.emitShift(e.offsetX)
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
    return '.state-shift'
  }

  static getEvents() {
    return ['onMouseDown', 'onMouseMove', 'onMouseUp', 'onMouseLeave']
  }
}
