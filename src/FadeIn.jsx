import React from 'react'
import { secondsToPixels } from './utils/converter'
import { FADEIN, FADEOUT, SCURVE, LINEAR, EXPONENTIAL, LOGARITHMIC } from './lib/fade-maker'
import { sCurve, logarithmic, linear, exponential } from './lib/fade-curves'

export default class FadeIn extends React.Component {

  createCurve = (shape, type, width) => {
    let reflection
    let curve

    switch (type) {
    case FADEIN:
      reflection = 1
      break
    case FADEOUT:
      reflection = -1
      break
    default:
      throw new Error('Unsupported fade type.')
    }

    switch (shape) {
    case SCURVE:
      curve = sCurve(width, reflection)
      break
    case LINEAR:
      curve = linear(width, reflection)
      break
    case EXPONENTIAL:
      curve = exponential(width, reflection)
      break
    case LOGARITHMIC:
      curve = logarithmic(width, 10, reflection)
      break
    default:
      throw new Error('Unsupported fade shape')
    }

    return curve
  }

  componentDidUpdate (prevProps) {
    const { fadeIn, resolution } = this.props
    const prevDuration = prevProps.fadeIn.end - prevProps.fadeIn.start
    const duration = fadeIn.end - fadeIn.start

    // node is up to date.
    if (prevProps.fadeIn.shape === fadeIn.shape &&
      prevProps.fadeIn.type === fadeIn.type &&
      prevDuration === duration &&
      prevProps.resolution === resolution) {
      return
    }

    const ctx = this.canvas.getContext('2d')
    const width = this.canvas.width
    const height = this.canvas.height
    const curve = this.createCurve(fadeIn.shape, fadeIn.type, width)
    const len = curve.length
    let y = height - (curve[0] * height)

    ctx.strokeStyle = 'black'
    ctx.beginPath()
    ctx.moveTo(0, y)

    for (let i = 1; i < len; i += 1) {
      y = height - (curve[i] * height)
      ctx.lineTo(i, y)
    }
    ctx.stroke()
  }

  render () {
    const { fadeIn, resolution, sampleRate, height } = this.props

    const fadeWidth = secondsToPixels(
      fadeIn.end - fadeIn.start,
      resolution,
      sampleRate,
    )

    const styles = {
      root: {
        position: 'absolute',
        height,
        width: fadeWidth,
        top: 0,
        right: 0,
        zIndex: 4,
      },
    }

    return (
      <div style={styles.root}>
        <canvas ref={canvas => this.canvas = canvas} width={fadeWidth} height={height} />
      </div>
    )
  }
}