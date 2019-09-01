import React from 'react'

export default class Peak extends React.Component {

  drawFrame = (cc, h2, x, minPeak, maxPeak) => {
    const min = Math.abs(minPeak * h2)
    const max = Math.abs(maxPeak * h2)

    // draw max
    cc.fillRect(x, 0, 1, h2 - max)
    // draw min
    cc.fillRect(x, h2 + min, 1, h2 - min)
  }

  componentDidUpdate(prevProps) {
    // http://stackoverflow.com/questions/6081483/maximum-size-of-a-canvas-element
    const {peaks, offset, bits, color} = this.props

    // canvas is up to date
    if (prevProps.peaks === peaks) return

    const len = this.canvas.width
    const cc = this.canvas.getContext('2d')
    const h2 = this.canvas.height / 2
    const maxValue = 2 ** (bits - 1)

    cc.clearRect(0, 0, this.canvas.width, this.canvas.height)
    cc.fillStyle = color

    for (let i = 0; i < len; i += 1) {
      const minPeak = peaks[(i + offset) * 2] / maxValue
      const maxPeak = peaks[((i + offset) * 2) + 1] / maxValue
      this.drawFrame(cc, h2, i, minPeak, maxPeak)
    }
  }

  render () {
    const { currentWidth, height } = this.props

    const styles = {
      root: {
        float: 'left',
        position: 'relative',
        margin: 0,
        padding: 0,
        zIndex: 3,
      },
    }

    return (
      <canvas
        ref={canvas => this.canvas = canvas}
        width={currentWidth} height={height}
        style={styles.root}
      />
    )
  }
}