import React from 'react'
import Playlist from './Playlist'

export default class WaveFormEditor extends React.Component {

  static defaultProps = {
    audioContext: null,
  }

  constructor(props) {
    super(props)
    this.state = { audioContext: null }
  }

  componentDidMount() {
    this.initAudioContext()
    document.addEventListener('click', this.initAudioContext)
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.initAudioContext)
  }

  initAudioContext = () => {
    // already initialized
    if (this.audioContext) return

    // set from props
    if (this.props.audioContext) {
      this.setState({audioContext: this.props.audioContext})
      return
    }

    // create by self
    window.OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext
    window.AudioContext = window.AudioContext || window.webkitAudioContext
    const audioContext = new window.AudioContext()
    // play silent
    const buf = audioContext.createBuffer(1, 1, 22050)
    const src = audioContext.createBufferSource()
    src.buffer = buf
    src.connect(audioContext.destination)
    src.start(0)
    this.setState({audioContext})
  }

  render () {
    const { audioContext } = this.state

    return (
      <Playlist
        audioContext={audioContext}
      />
    )
  }
}