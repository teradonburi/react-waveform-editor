import BlobLoader from './BlobLoader'
import XHRLoader from './XHRLoader'

export default class LoaderFactory {

  static createLoader(src, audioContext, onAudioRequestStateChange, onLoadProgress) {
    if (src instanceof Blob) {
      return new BlobLoader(src, audioContext, onAudioRequestStateChange, onLoadProgress)
    } else if (typeof (src) === 'string') {
      return new XHRLoader(src, audioContext, onAudioRequestStateChange, onLoadProgress)
    }

    throw new Error('Unsupported src type')
  }
}
