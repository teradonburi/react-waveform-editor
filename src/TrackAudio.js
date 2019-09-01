import uuid from 'uuid'
import extractPeaks from './lib/webaudio-peaks'
import { FADEIN, FADEOUT } from './lib/fade-maker'
import { secondsToSamples } from './utils/converter'

import Playout from './Playout'

export default class TrackAudio {

  constructor () {
    this.buffer = null
    this.startTime = 0
    this.endTime = 0
    this.cueIn = 0
    this.cueOut = 0
    this.duration = 0
    this.peakData = {
      type: 'WebAudio',
      mono: false,
    }
    this.gain = 1
    this.fades = {}
    this.fadeIn = undefined
    this.fadeOut = undefined
  }

  // audio buffer
  setBuffer = (audioBuffer) => {
    this.buffer = audioBuffer
  }

  setPeakData = (data) => {
    this.peakData = data
  }

  calculatePeaks = (samplesPerPixel, sampleRate) => {
    const cueIn = secondsToSamples(this.cueIn, sampleRate)
    const cueOut = secondsToSamples(this.cueOut, sampleRate)

    // extract peaks data from audio buffer
    this.peaks = extractPeaks(this.buffer, samplesPerPixel, this.peakData.mono, cueIn, cueOut)
  }

  setPlayout = (audioContext) => {
    this.playout = new Playout(audioContext, this.buffer)
  }

  setOfflinePlayout = (offlineAudioContext) => {
    this.offlinePlayout = new Playout(offlineAudioContext, this.buffer)
  }

  setStartTime = (start) => {
    this.startTime = start
    this.endTime = start + this.duration
  }

  setCues = (cueIn, cueOut) => {
    if (cueOut < cueIn) {
      throw new Error('cue out cannot be less than cue in')
    }

    this.cueIn = cueIn
    this.cueOut = cueOut
    this.duration = this.cueOut - this.cueIn
    this.endTime = this.startTime + this.duration
  }

  /*
  *   start, end in seconds relative to the entire playlist.
  */
  trim = (start, end) => {
    const trackStart = this.startTime
    const trackEnd = this.endTime
    const offset = this.cueIn - trackStart

    if ((trackStart <= start && trackEnd >= start) ||
      (trackStart <= end && trackEnd >= end)) {
      const cueIn = (start < trackStart) ? trackStart : start
      const cueOut = (end > trackEnd) ? trackEnd : end

      this.setCues(cueIn + offset, cueOut + offset)
      if (start > trackStart) {
        this.setStartTime(start)
      }
    }
  }

  // volume
  setGainLevel = (level) => {
    this.gain = level
    this.playout.setVolumeGainLevel(level)
  }

  setMasterGainLevel = (level) => {
    this.playout.setMasterGainLevel(level)
  }

  getStartTime = () => this.startTime
  getEndTime = () => this.endTime
  getDuration = () => this.duration

  // playing state
  setShouldPlay = (bool) => {
    this.playout.setShouldPlay(bool)
  }

  isPlaying = () => this.playout.isPlaying()

  /*
    startTime, endTime in seconds (float).
    segment is for a highlighted section in the UI.

    returns a Promise that will resolve when the AudioBufferSource
    is either stopped or plays out naturally.
  */
  schedulePlay = (now, startTime, endTime, config) => {
    let start
    let duration
    let when = now
    let segment = (endTime) ? (endTime - startTime) : undefined

    const defaultOptions = {
      shouldPlay: true,
      masterGain: 1,
      isOffline: false,
    }

    const options = {...defaultOptions, ...config}
    const playoutSystem = options.isOffline ? this.offlinePlayout : this.playout

    // 1) track has no content to play.
    // 2) track does not play in this selection.
    if ((this.endTime <= startTime) || (segment && (startTime + segment) < this.startTime)) {
      // return a resolved promise since this track is technically "stopped".
      return Promise.resolve()
    }

    // track should have something to play if it gets here.
    // the track starts in the future or on the cursor position
    if (this.startTime >= startTime) {
      start = 0
      // schedule additional delay for this audio node.
      when += (this.startTime - startTime)

      if (endTime) {
        segment -= (this.startTime - startTime)
        duration = Math.min(segment, this.duration)
      } else {
        duration = this.duration
      }
    } else {
      start = startTime - this.startTime

      if (endTime) {
        duration = Math.min(segment, this.duration - start)
      } else {
        duration = this.duration - start
      }
    }

    start += this.cueIn
    const relPos = startTime - this.startTime
    const sourcePromise = playoutSystem.setUpSource()

    // param relPos: cursor position in seconds relative to this track.
    // can be negative if the cursor is placed before the start of this track etc.
    Object(this.fades).values((fade) => {
      let fadeStart
      let fadeDuration

      // only apply fade if it's ahead of the cursor.
      if (relPos < fade.end) {
        if (relPos <= fade.start) {
          fadeStart = now + (fade.start - relPos)
          fadeDuration = fade.end - fade.start
        } else if (relPos > fade.start && relPos < fade.end) {
          fadeStart = now - (relPos - fade.start)
          fadeDuration = fade.end - fade.start
        }

        switch (fade.type) {
        case FADEIN:
          playoutSystem.applyFadeIn(fadeStart, fadeDuration, fade.shape)
          break

        case FADEOUT:
          playoutSystem.applyFadeOut(fadeStart, fadeDuration, fade.shape)
          break

        default:
          throw new Error('Invalid fade type saved on track.')
        }
      }
    })

    playoutSystem.setVolumeGainLevel(this.gain)
    playoutSystem.setShouldPlay(options.shouldPlay)
    playoutSystem.setMasterGainLevel(options.masterGain)
    playoutSystem.play(when, start, duration)

    return sourcePromise
  }

  scheduleStop = (when = 0) => {
    this.playout.stop(when)
  }

  /////////////////////// fade ///////////////////////

  setFadeIn = (duration, shape = 'logarithmic') => {
    if (duration > this.duration) {
      throw new Error('Invalid Fade In')
    }

    const fade = {
      shape,
      start: 0,
      end: duration,
    }

    if (this.fadeIn) {
      this.removeFade(this.fadeIn)
      this.fadeIn = undefined
    }

    this.fadeIn = this.saveFade(FADEIN, fade.shape, fade.start, fade.end)
  }

  setFadeOut = (duration, shape = 'logarithmic') => {
    if (duration > this.duration) {
      throw new Error('Invalid Fade Out')
    }

    const fade = {
      shape,
      start: this.duration - duration,
      end: this.duration,
    }

    if (this.fadeOut) {
      this.removeFade(this.fadeOut)
      this.fadeOut = undefined
    }

    this.fadeOut = this.saveFade(FADEOUT, fade.shape, fade.start, fade.end)
  }

  saveFade = (type, shape, start, end) => {
    const id = uuid.v4()

    this.fades[id] = {
      type,
      shape,
      start,
      end,
    }

    return id
  }

  removeFade = (id) => {
    delete this.fades[id]
  }

  ///////////////////////////////////////////////////

  // debug
  getTrackDetails = () => {
    const info = {
      src: this.src,
      start: this.startTime,
      end: this.endTime,
      cuein: this.cueIn,
      cueout: this.cueOut,
    }

    if (this.fadeIn) {
      const fadeIn = this.fades[this.fadeIn]

      info.fadeIn = {
        shape: fadeIn.shape,
        duration: fadeIn.end - fadeIn.start,
      }
    }

    if (this.fadeOut) {
      const fadeOut = this.fades[this.fadeOut]

      info.fadeOut = {
        shape: fadeOut.shape,
        duration: fadeOut.end - fadeOut.start,
      }
    }

    return info
  }
}
