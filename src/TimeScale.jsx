// import h from 'virtual-dom/h'
import React from 'react'

import { secondsToPixels } from './utils/converter'

export default class TimeScale extends React.Component {

  constructor(props) {
    super(props)

    this.timeinfo = {
      20000: {
        marker: 30000,
        bigStep: 10000,
        smallStep: 5000,
        secondStep: 5,
      },
      12000: {
        marker: 15000,
        bigStep: 5000,
        smallStep: 1000,
        secondStep: 1,
      },
      10000: {
        marker: 10000,
        bigStep: 5000,
        smallStep: 1000,
        secondStep: 1,
      },
      5000: {
        marker: 5000,
        bigStep: 1000,
        smallStep: 500,
        secondStep: 1 / 2,
      },
      2500: {
        marker: 2000,
        bigStep: 1000,
        smallStep: 500,
        secondStep: 1 / 2,
      },
      1500: {
        marker: 2000,
        bigStep: 1000,
        smallStep: 200,
        secondStep: 1 / 5,
      },
      700: {
        marker: 1000,
        bigStep: 500,
        smallStep: 100,
        secondStep: 1 / 10,
      },
    }
  }

  getScaleInfo(resolution) {
    let keys = Object.keys(this.timeinfo).map(item => parseInt(item, 10))

    // make sure keys are numerically sorted.
    keys = keys.sort((a, b) => a - b)

    for (let i = 0; i < keys.length; i += 1) {
      if (resolution <= keys[i]) {
        return this.timeinfo[keys[i]]
      }
    }

    return this.timeinfo[keys[0]]
  }

  /*
    Return time in format mm:ss
  */
  static formatTime(milliseconds) {
    const seconds = milliseconds / 1000
    let s = seconds % 60
    const m = (seconds - s) / 60

    if (s < 10) {
      s = `0${s}`
    }

    return `${m}:${s}`
  }

  componentDidUpdate(prevProp) {
    // canvas is up to date
    if (prevProp.offset === this.props.offset
      && (prevProp.duration === this.props.duration)
      && (prevProp.samplesPerPixel === this.props.samplesPerPixel)) {
      return
    }

    const width = this.canvas.width
    const height = this.canvas.height
    const ctx = this.canvas.getContext('2d')

    ctx.clearRect(0, 0, width, height)

    Object.keys(this.tickInfo).forEach((x) => {
      const scaleHeight = this.tickInfo[x]
      const scaleY = height - scaleHeight
      ctx.fillRect(x, scaleY, 1, scaleHeight)
    })

  }

  render() {
    const {duration, offset, samplesPerPixel, sampleRate, marginLeft = 0} = this.props

    const widthX = secondsToPixels(duration, samplesPerPixel, sampleRate)
    const pixPerSec = sampleRate / samplesPerPixel
    const pixOffset = secondsToPixels(offset, samplesPerPixel, sampleRate)
    const scaleInfo = this.getScaleInfo(samplesPerPixel)
    const canvasInfo = {}
    const timeMarkers = []
    const end = widthX + pixOffset
    let counter = 0

    for (let i = 0; i < end; i += (pixPerSec * scaleInfo.secondStep)) {
      const pixIndex = Math.floor(i)
      const pix = pixIndex - pixOffset

      if (pixIndex >= pixOffset) {
        // put a timestamp every 30 seconds.
        if (scaleInfo.marker && (counter % scaleInfo.marker === 0)) {
          timeMarkers.push(() =>
            <div className='time' style={{position: 'absolute', left: `${pix}px`}}>
              {TimeScale.formatTime(counter)}
            </div>
          )
          canvasInfo[pix] = 10
        } else if (scaleInfo.bigStep && (counter % scaleInfo.bigStep === 0)) {
          canvasInfo[pix] = 5
        } else if (scaleInfo.smallStep && (counter % scaleInfo.smallStep === 0)) {
          canvasInfo[pix] = 2
        }
      }

      counter += (1000 * scaleInfo.secondStep)
    }

    return (
      <div className='playlist-time-scale' style={{position: 'relative', left: 0, right: 0, marginLeft: `${marginLeft}px`}}>
        {timeMarkers}
        <canvas ref={canvas => this.canvas = canvas} width={widthX} height={30} style={{position: 'absolute', left: 0, right: 0, top: 0, bottom: 0}} />
      </div>
    )
  }
}

