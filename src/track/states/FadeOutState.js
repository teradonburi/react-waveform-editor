import { pixelsToSeconds } from '../../utils/converter'

export default class FadeOutState {

  constructor(track) {
    this.track = track
  }

  setup(samplesPerPixel, sampleRate) {
    this.samplesPerPixel = samplesPerPixel
    this.sampleRate = sampleRate
  }

  onClick(e) {
    const startX = e.offsetX
    const time = pixelsToSeconds(startX, this.samplesPerPixel, this.sampleRate)

    if (time > this.track.getStartTime() && time < this.track.getEndTime()) {
      this.track.ee.emit('fadeout', this.track.getEndTime() - time, this.track)
    }
  }

  static getClass() {
    return '.state-fadeout'
  }

  static getEvents() {
    return ['onClick']
  }
}
