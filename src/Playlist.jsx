import React from 'react'
import TimeScale from './TimeScale.jsx'
import LoaderFactory from './track/loader/LoaderFactory'
import TrackAudio from './TrackAudio'
import Track from './Track.jsx'
import { pixelsToSeconds } from './utils/converter'

export default class Playlist extends React.Component {

  static defaultProps = {
    audioContext: null,
    samplesPerPixel: 4096,
    sampleRate: null,
    mono: true,
    waveHeight: 128,
    showTimescale: true,
    controlsShow: false,
    controlsWidth: 150,
    waveOutlineColor: 'white',
    isAutomaticScroll: false,
    // event handler
    onSelect: () => {},
    onAudioRequestStateChange: () => {},
    onLoadProgress: () => {},
    onAudioSourcesLoaded: () => {},
    onAudioSourcesRendered: () => {},
    onTimeUpdate: () => {},
    onFinished: () => {},
  }

  constructor(props) {
    super(props)
    // tracks
    this.tracks = []
    this.soloedTracks = []
    this.mutedTracks = []
    this.playoutPromises = []
    // player
    this.cursor = 0

    this.scrollTimer = undefined
    // whether a user is scrolling the waveform
    this.isScrolling = false
    this.fadeType = 'logarithmic'
    this.masterGain = 1
    this.resetDrawTimer = undefined

    this.state = {
      duration: 0,
      playbackSeconds: 0,
      timeSelection: {
        start: 0,
        end: 0,
      },
      scrollLeft: 0,
    }
  }

  //////////////// event handler ////////////////////

  onSelect = (start, end, track) => {
    const { onSelect, onTimeUpdate } = this.props

    if (this.isPlaying()) {
      this.lastSeeked = start
      this.pausedAt = undefined
      this.restartPlayFrom(start)
    } else {
      // reset if it was paused.
      this.seek(start, end, track)
      onTimeUpdate(start)
    }
    onSelect(start, end, track)
  }

  onAudioRequestStateChange = (audioRequestState, src) => {
    const { onAudioRequestStateChange } = this.props
    onAudioRequestStateChange(audioRequestState, src)
  }

  onLoadProgress = (percentComplete, src) => {
    const { onLoadProgress } = this.props
    onLoadProgress(percentComplete, src)
  }


  ///////////////////////////////////////////////////

  componentDidMount() {
    const { controlsWidth } = this.props

    // use for fast forwarding.
    this.viewDuration = pixelsToSeconds(
      this.rootNode.clientWidth - controlsWidth,
      this.samplesPerPixel,
      this.sampleRate,
    )
  }

  setEventEmitter = () => {
    const ee = this.prop.ee

    ee.on('statechange', (trackState) => {
      this.setTrackState(trackState)
    })

    ee.on('shift', (deltaTime, track) => {
      track.setStartTime(track.getStartTime() + deltaTime)
      this.adjustDuration()
    })

    ee.on('play', (start, end) => {
      this.play(start, end)
    })

    ee.on('pause', () => {
      this.pause()
    })

    ee.on('stop', () => {
      this.stop()
    })

    ee.on('rewind', () => {
      this.rewind()
    })

    ee.on('fastforward', () => {
      this.fastForward()
    })

    ee.on('clear', () => {
      this.clear()
    })

    ee.on('solo', (track) => {
      this.soloTrack(track)
      this.adjustTrackPlayout()
    })

    ee.on('mute', (track) => {
      this.muteTrack(track)
      this.adjustTrackPlayout()
    })

    ee.on('volumechange', (volume, track) => {
      track.setGainLevel(volume / 100)
    })

    ee.on('mastervolumechange', (volume) => {
      this.masterGain = volume / 100
      this.tracks.forEach((track) => {
        track.setMasterGainLevel(this.masterGain)
      })
    })

    ee.on('fadein', (duration, track) => {
      track.setFadeIn(duration, this.fadeType)
    })

    ee.on('fadeout', (duration, track) => {
      track.setFadeOut(duration, this.fadeType)
    })

    ee.on('fadetype', (type) => {
      this.fadeType = type
    })

    ee.on('newtrack', (file) => {
      this.load([{
        src: file,
        name: file.name,
      }])
    })

    ee.on('trim', () => {
      const track = this.activeTrack
      const timeSelection = this.timeSelection

      track.trim(timeSelection.start, timeSelection.end)
      track.calculatePeaks(this.samplesPerPixel, this.sampleRate)

      this.setTimeSelection(0, 0)
    })
  }

  load = (trackList) => {
    const { audioContext, mono, onAudioSourcesLoaded, onAudioSourcesRendered } = this.props

    const loadPromises = trackList.map((trackInfo) => {
      const loader = LoaderFactory.createLoader(trackInfo.src, audioContext, this.onAudioRequestStateChange, this.onLoadProgress)
      return loader.load()
    })

    return Promise.all(loadPromises).then((audioBuffers) => {
      onAudioSourcesLoaded()

      const tracks = audioBuffers.map((audioBuffer, index) => {
        const info = trackList[index]
        const start = info.start || 0
        const states = info.states || {}
        const fadeIn = info.fadeIn
        const fadeOut = info.fadeOut
        const cueIn = info.cuein || 0
        const cueOut = info.cueout || audioBuffer.duration
        const gain = info.gain || 1
        const muted = info.muted || false
        const soloed = info.soloed || false
        const selection = info.selected
        const peaks = info.peaks || { type: 'WebAudio', mono }

        const track = new TrackAudio()
        track.src = info.src
        track.setBuffer(audioBuffer)
        track.setEnabledStates(states)
        track.setCues(cueIn, cueOut)

        if (fadeIn !== undefined) {
          track.setFadeIn(fadeIn.duration, fadeIn.shape)
        }

        if (fadeOut !== undefined) {
          track.setFadeOut(fadeOut.duration, fadeOut.shape)
        }

        if (selection !== undefined) {
          this.activeTrack = track
          this.setTimeSelection(selection.start, selection.end)
        }

        if (peaks !== undefined) {
          track.setPeakData(peaks)
        }

        track.setTrackState(this.trackState)
        track.setStartTime(start)
        track.setPlayout(audioContext)

        track.setGainLevel(gain)

        if (muted) {
          this.muteTrack(track)
        }

        if (soloed) {
          this.soloTrack(track)
        }

        // extract peaks with AudioContext for now.
        track.calculatePeaks(this.samplesPerPixel, this.sampleRate)

        return track
      })

      this.tracks = this.tracks.concat(tracks)
      this.adjustDuration()
      this.setState({})
      onAudioSourcesRendered()
    })
  }

  clear = () => {

    return this.stop().then(() => {
      // tracks
      this.tracks = []
      this.soloedTracks = []
      this.mutedTracks = []
      this.playoutPromises = []
      // player
      this.cursor = 0

      this.seek(0, 0, undefined)
      this.setState({
        duration: 0,
        playbackSeconds: 0,
        timeSelection: {
          start: 0,
          end: 0,
        },
        scrollLeft: 0,
      })
    })
  }

  setTrackState = (trackState) => {
    this.trackState = trackState

    this.tracks.forEach((track) => {
      track.setState(trackState)
    })
  }

  restartPlayFrom = (start, end) => {
    this.stopAnimation()

    this.tracks.forEach((editor) => {
      editor.scheduleStop()
    })

    return Promise.all(this.playoutPromises).then(this.play.bind(this, start, end))
  }

  setTimeSelection = (start = 0, end) => {
    const timeSelection = {
      start,
      end: (end === undefined) ? start : end,
    }

    this.cursor = start
    this.setState({timeSelection})
  }

  isSegmentSelection = () => {
    const { timeSelection } = this.state
    return timeSelection.start !== timeSelection.end
  }

  // adjust duration to last time track
  adjustDuration = () => {
    const duration = this.tracks.reduce((duration, track) => Math.max(duration, track.getEndTime()), 0)
    this.setState({duration})
  }

  // if some track is playing deal with true
  isPlaying = () => this.tracks.reduce((isPlaying, track) => isPlaying || track.isPlaying(), false)

  /*
  *  returns the current point of time in the playlist in seconds.
  */
  getCurrentTime = () => {
    const { audioContext } = this.props
    const cursorPos = this.lastSeeked || this.pausedAt || this.cursor

    const elapsed = audioContext.currentTime - this.lastPlay
    return cursorPos + elapsed
  }

  play = (startTime, endTime) => {
    const { audioContext } = this.props
    const { timeSelection } = this.state
    clearTimeout(this.resetDrawTimer)

    const currentTime = audioContext.currentTime
    const selected = timeSelection
    const playoutPromises = []

    const start = startTime || this.pausedAt || this.cursor
    let end = endTime

    if (!end && selected.end !== selected.start && selected.end > start) {
      end = selected.end
    }

    if (this.isPlaying()) {
      return this.restartPlayFrom(start, end)
    }

    this.tracks.forEach((track) => {
      track.setState('cursor')
      playoutPromises.push(track.schedulePlay(currentTime, start, end, {
        shouldPlay: this.shouldTrackPlay(track),
        masterGain: this.masterGain,
      }))
    })

    this.lastPlay = currentTime
    // use these to track when the playlist has fully stopped.
    this.playoutPromises = playoutPromises
    this.startAnimation(start)

    return Promise.all(this.playoutPromises)
  }

  pause = () => {
    if (!this.isPlaying()) {
      return Promise.all(this.playoutPromises)
    }

    this.pausedAt = this.getCurrentTime()
    return this.playbackReset()
  }

  stop = () => {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop()
    }

    this.pausedAt = undefined
    this.playbackSeconds = 0
    return this.playbackReset()
  }

  seek = (start, end, track) => {
    if (this.isPlaying()) {
      this.lastSeeked = start
      this.pausedAt = undefined
      this.restartPlayFrom(start)
    } else {
      // reset if it was paused.
      this.activeTrack = track || this.tracks[0]
      this.pausedAt = start
      this.setTimeSelection(start, end)
    }
  }

  playbackReset = () => {
    this.lastSeeked = undefined
    this.stopAnimation()

    this.tracks.forEach((track) => {
      track.scheduleStop()
      track.setState(this.trackState)
    })

    this.drawRequest()
    return Promise.all(this.playoutPromises)
  }

  // go to start of track
  rewind = () => {
    return this.stop().then(() => {
      this.onSelect(0, 0)
      this.setState({scrollLeft: 0})
    })
  }

  // go to end of track
  fastForward = () => {
    const { duration } = this.state

    return this.stop().then(() => {
      let scrollLeft = 0
      if (this.viewDuration < duration) {
        scrollLeft = duration - this.viewDuration
      }

      this.onSelect(duration, duration)
      this.setState({scrollLeft})
    })
  }

  muteTrack = (track) => {
    const index = this.mutedTracks.indexOf(track)

    if (index > -1) {
      this.mutedTracks.splice(index, 1)
    } else {
      this.mutedTracks.push(track)
    }
  }

  // mute all without selected track
  soloTrack = (track) => {
    const index = this.soloedTracks.indexOf(track)

    if (index > -1) {
      this.soloedTracks.splice(index, 1)
    } else if (this.exclSolo) {
      this.soloedTracks = [track]
    } else {
      this.soloedTracks.push(track)
    }
  }

  startAnimation = (startTime) => {
    const { audioContext } = this.props
    this.lastDraw = audioContext.currentTime
    this.animationRequest = window.requestAnimationFrame(() => {
      this.updateEditor(startTime)
    })
  }

  stopAnimation = () => {
    window.cancelAnimationFrame(this.animationRequest)
    this.lastDraw = undefined
  }

  /*
  * Animation function for the playlist.
  * Keep under 16.7 milliseconds based on a typical screen refresh rate of 60fps.
  */
  updateEditor = (cursor) => {
    const { audioContext, onTimeUpdate, onFinished } = this.props
    const { duration, timeSelection } = this.state

    const currentTime = audioContext.currentTime
    const selection = timeSelection
    const cursorPos = cursor
    const elapsed = currentTime - this.lastDraw

    if (this.isPlaying()) {
      const playbackSeconds = cursorPos + elapsed
      onTimeUpdate(playbackSeconds)
      this.animationRequest = window.requestAnimationFrame(() => {
        this.updateEditor(playbackSeconds)
      })

      this.setState({playbackSeconds})
      this.lastDraw = currentTime
    } else {
      if ((cursorPos + elapsed) >= (this.isSegmentSelection() ? selection.end : duration)) {
        onFinished()
      }

      this.stopAnimation()

      this.resetDrawTimer = setTimeout(() => {
        this.pausedAt = undefined
        this.lastSeeked = undefined
        this.setTrackState(this.trackState)

        this.setState({playbackSeconds: 0})
      }, 0)
    }
  }

  // check selectable track
  isActiveTrack = (track) => {

    if (this.isSegmentSelection()) {
      return this.activeTrack === track
    }

    return true
  }

  adjustTrackPlayout = () => {
    this.tracks.forEach((track) => {
      let shouldPlay
      // if there are solo tracks, only they should play.
      if (this.soloedTracks.length > 0) {
        shouldPlay = false
        if (this.soloedTracks.indexOf(track) > -1) {
          shouldPlay = true
        }
      } else {
        // play all tracks except any muted tracks.
        shouldPlay = true
        if (this.mutedTracks.indexOf(track) > -1) {
          shouldPlay = false
        }
      }

      track.setShouldPlay(shouldPlay)
    })
  }

  onScroll = (e) => {
    const { samplesPerPixel, sampleRate } = this.props
    const scrollLeft = pixelsToSeconds(
      e.target.scrollLeft,
      samplesPerPixel,
      sampleRate,
    )

    this.isScrolling = true
    clearTimeout(this.scrollTimer)
    this.scrollTimer = setTimeout(() => {
      this.isScrolling = false
    }, 200)

    this.setState({scrollLeft})
  }

  render () {
    const { showTimescale, waveHeight, controlsShow, controlsWidth, samplesPerPixel, sampleRate, waveOutlineColor, isAutomaticScroll } = this.props
    const { duration, playbackSeconds, timeSelection, scrollLeft } = this.state

    const styles = {
      root: {
        margin: '2em 0',
        overflow: 'hidden',
        position: 'relative',
      },
      tracks: {
        background: '#e0eff1',
        overflow: 'auto',
      },
    }

    return (
      <div style={styles.root} ref={rootNode => this.rootNode = rootNode}>
        {showTimescale &&
          <TimeScale
            duration={duration}
            scrollLeft={scrollLeft}
            samplesPerPixel={samplesPerPixel}
            sampleRate={sampleRate}
            controlWidth={controlsShow ? controlsWidth : 0}
          />
        }
        <div style={styles.tracks} onScroll={this.onScroll}>
          {this.tracks.map((track, idx) => {
            const trackProps = {
              height: waveHeight,
              controlsShow,
              controlsWidth,
              waveOutlineColor,
              resolution: samplesPerPixel,
              sampleRate: sampleRate,
              timeSelection,
              duration,
              playbackSeconds,
              shouldPlay: this.shouldTrackPlay(track),
              muted: this.mutedTracks.indexOf(track) > -1,
              soloed: this.soloedTracks.indexOf(track) > -1,
              isActive: this.isActiveTrack(track),
              isAutomaticScroll,
            }

            return <Track key={`track_${idx}`} {...trackProps} />
          })}
        </div>
      </div>
    )
  }

  // debug
  getInfo = () => {
    const info = []

    this.tracks.forEach((track) => {
      info.push(track.getTrackDetails())
    })

    return info
  }

}