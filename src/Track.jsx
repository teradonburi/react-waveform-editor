import React from 'react'

import { secondsToPixels } from './utils/converter'
import stateClasses from './track/trackStates'
import WaveForm from './WaveForm'
import FadeIn from './FadeIn.jsx'
import FadeOut from './FadeOut.jsx'

const MAX_CANVAS_WIDTH = 1000

export default class Treck extends React.Component {

  static defaultProps = {
    name: 'Untitled',
    waveOutlineColor: 'white',
  }

  setTrackState = (trackState) => {
    this.trackState = trackState

    if (this.trackState && this.enabledStates[this.trackState]) {
      const StateClass = stateClasses[this.trackState]
      this.stateObj = new StateClass(this)
    } else {
      this.stateObj = undefined
    }
  }

  setEnabledStates = (enabledStates = {}) => {
    const defaultStatesEnabled = {
      cursor: true,
      fadein: true,
      fadeout: true,
      select: true,
      shift: true,
    }

    this.enabledStates = {...defaultStatesEnabled, ...enabledStates}
  }

  componentDidUpdate() {

    // scroll
    /*
    const playlist = this.playlist
    if (!playlist.isScrolling) {
      const el = document.querySelector('.waveform')

      if (playlist.isAutomaticScroll) {
        const rect = el.getBoundingClientRect()
        const cursorRect = el.querySelector('.cursor').getBoundingClientRect()

        if (cursorRect.right > rect.right || cursorRect.right < 0) {
          playlist.scrollLeft = playlist.playbackSeconds
        }
      }

      const left = secondsToPixels(
        playlist.scrollLeft,
        playlist.samplesPerPixel,
        playlist.sampleRate,
      )

      el.scrollLeft = left
    }
    */
  }

  render() {
    const {
      name,
      height,
      controlsShow,
      controlsWidth,
      waveOutlineColor,
      resolution,
      sampleRate,
      timeSelection,
      duration,
      playbackSeconds,
      shouldPlay,
      muted,
      soloed,
      isActive,
    } = this.props

    const width = this.peaks.length
    const playbackX = secondsToPixels(playbackSeconds, resolution, sampleRate)
    const startX = secondsToPixels(this.startTime, resolution, sampleRate)
    const endX = secondsToPixels(this.endTime, resolution, sampleRate)
    const numChan = this.peaks.data.length

    let progressWidth = 0
    if (playbackX > 0 && playbackX > startX) {
      if (playbackX < endX) {
        progressWidth = playbackX - startX
      } else {
        progressWidth = width
      }
    }

    // TODO: event handling
    const onEvents = {}
    if (this.stateObj) {
      this.stateObj.setup(resolution, sampleRate)
      const StateClass = stateClasses[this.trackState]
      const events = StateClass.getEvents()

      events.forEach((event) => {
        onEvents[`${event}`] = this.stateObj[event].bind(this.stateObj)
      })
    }

    const styles = {
      root: {
        marginLeft: controlsShow ? controlsWidth : 0,
        height: height * numChan,
        opacity: shouldPlay ? 1 : 0.3,
      },
      waveform: {
        position: 'relative',
        height: numChan * height,
      },
      channel: {
        height,
        width,
        left: startX,
        position: 'absolute',
        margin: 0,
        padding: 0,
        zIndex: 1,
      },
    }

    return (
      <div style={styles.root}>
        <TrackControl name={name} muted={muted} soloed={soloed} />

        <div style={styles.waveform}>
          <TrackCursor playbackX={playbackX} />
          {Object.keys(this.peaks.data).map((channelNum) => {
            let offset = 0
            let totalWidth = width
            const peaks = this.peaks.data[channelNum]
            const canvasColor = waveOutlineColor
            const waveNum = Math.round(totalWidth / MAX_CANVAS_WIDTH)

            return (
              <div key={channelNum} style={{...styles.channel, top: channelNum * height}}>
                <ChannelProgress progressWidth={progressWidth} height={height} />
                {[...new Array(waveNum)].map((_, idx) => {

                  const currentWidth = Math.min(totalWidth, MAX_CANVAS_WIDTH)
                  totalWidth -= currentWidth
                  offset += MAX_CANVAS_WIDTH

                  return <WaveForm
                    key={`wave_${idx}`}
                    peaks={peaks}
                    offset={offset}
                    bits={this.peaks.bits}
                    color={canvasColor}
                    currentWidth={currentWidth}
                    height={height}
                  />
                })}
                {this.fadeIn &&
                  <FadeIn
                    fadeIn={this.fades[this.fadeIn]}
                    resolution={resolution}
                    sampleRate={sampleRate}
                    height={height}
                  />
                }
                {this.fadeOut &&
                  <FadeOut
                    fadeOut={this.fades[this.fadeOut]}
                    resolution={resolution}
                    sampleRate={sampleRate}
                    height={height}
                  />
                }
              </div>
            )
          })}
          <TrackBackground duration={duration} resolution={resolution} sampleRate={sampleRate} />
          {isActive &&
            <TrackSelector
              resolution={resolution}
              sampleRate={sampleRate}
              timeSelection={timeSelection}
              {...onEvents}
            />
          }
        </div>
      </div>
    )

  }
}

const TrackControl = ({
  name,
  width, height, numChan,
  muted, soloed,
  gain,
  muteLabel = 'Mute', soloLabel = 'Solo',
  onMute, onSolo, onChangeVolume,
  mutedHoverStyle = {background: '#eeeeee'},
  soloedHoverStyle = {background: '#eeeeee'},
  mutedActiveStyle = {color: 'white', background: '#808080'},
  soloedActiveStyle = {color: 'white', background: '#808080'},
}) => {

  const styles = {
    root: {
      width,
      height: numChan * height,
      position: 'absolute',
      left: 0,
      zIndex: 10,
    },
    mute: {
      padding: 5,
      color: 'black',
      border: '1px solid black',
      borderRadius: 5,
      margin: 5,
      '&:hover': {
        ...mutedHoverStyle,
      },
    },
    solo: {
      padding: 5,
      color: 'black',
      border: '1px solid black',
      borderRadius: 5,
      margin: 5,
      '&:hover': {
        ...soloedHoverStyle,
      },
    },
  }

  if (muted) {
    styles.mute = {...styles.mute, ...mutedActiveStyle}
  }
  if (soloed) {
    styles.mute = {...styles.mute, ...soloedActiveStyle}
  }

  return (
    <div style={styles.root}>
      <header>{name}</header>
      <div>
        <span style={styles.muted} onClick={onMute}>{muteLabel}</span>
        <span style={styles.soloed} onClick={onSolo}>{soloLabel}</span>
      </div>
      <label>
        <input type='range' min={0} max={100} value={gain * 100} defaultValue={100} onChange={onChangeVolume} />
      </label>
    </div>
  )
}

const TrackCursor = ({playbackX}) => (
  <div style={{position: 'absolute', width: 2, margin: 0, padding: 0, top: 0, left: playbackX, bottom: 0, zIndex: 5}} />
)

const ChannelProgress = ({progressWidth, height}) => {

  const styles = {
    root: {
      position: 'absolute',
      background: 'orange',
      width: progressWidth,
      height,
      zIndex: 2,
    },
  }

  return (
    <div style={styles.root} />
  )
}

const TrackBackground = ({duration, resolution, sampleRate}) => {
  const channelPixels = secondsToPixels(duration, resolution, sampleRate)

  return <div style={{position: 'absolute', width: channelPixels, top: 0, right: 0, bottom: 0, left: 0, zIndex: 9}}/>
}

const TrackSelector = ({resolution, sampleRate, timeSelection, ...onEvents}) => {

  const startX = secondsToPixels(timeSelection.start, resolution, sampleRate)
  const endX = secondsToPixels(timeSelection.end, resolution, sampleRate)
  const width = (endX - startX) + 1

  const styles = {
    root: {
      position: 'absolute',
      width,
      bottom: 0,
      top: 0,
      left: startX,
      zIndex: 4,
    },
    selectionPoint: {
      '-webkit-transform': 'scale(2)',
      transform: 'scale(2)',
      background: 'red',
    },
    selectionSegment: {
      background: 'rgba(0, 0, 0, 0.1)',
    },
  }

  if (width > 1) {
    styles.root = {...styles.root, ...styles.selectionSegment}
  } else {
    styles.root = {...styles.root, ...styles.selectionPoint}
  }

  return (
    <div
      style={styles.root}
      {...onEvents}
    />
  )
}