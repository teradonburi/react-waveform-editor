'use strict'

//http://jsperf.com/typed-array-min-max/2
//plain for loop for finding min/max is way faster than anything else.
/**
* @param {TypedArray} array - Subarray of audio to calculate peaks from.
*/
function findMinMax(array) {
  let min = Infinity
  let max = -Infinity

  for (let i = 0; i < array.length; i++) {
    let curr = array[i]
    if (min > curr) {
      min = curr
    }
    if (max < curr) {
      max = curr
    }
  }

  return {
    min: min,
    max: max,
  }
}

/**
* @param {Number} n - peak to convert from float to Int8, Int16 etc.
* @param {Number} bits - convert to #bits two's complement signed integer
*/
function convert(n, bits) {
  const max = Math.pow(2, bits-1)
  const  v = n < 0 ? n * max : n * max - 1
  return Math.max(-max, Math.min(max - 1, v))
}

/**
* @param {TypedArray} channel - Audio track frames to calculate peaks from.
* @param {Number} samplesPerPixel - Audio frames per peak
*/
function extractPeaks(channel, samplesPerPixel, bits) {
  const chanLength = channel.length
  const numPeaks = Math.ceil(chanLength / samplesPerPixel)

  // create interleaved array of min,max
  const peaks = new (eval('Int'+bits+'Array'))(numPeaks*2)

  for (let i = 0; i < numPeaks; i++) {

    const start = i * samplesPerPixel
    const end = (i + 1) * samplesPerPixel > chanLength ? chanLength : (i + 1) * samplesPerPixel

    const segment = channel.subarray(start, end)
    const extrema = findMinMax(segment)
    const min = convert(extrema.min, bits)
    const max = convert(extrema.max, bits)

    peaks[i*2] = min
    peaks[i*2+1] = max
  }

  return peaks
}

function makeMono(channelPeaks, bits) {
  const weight = 1 / channelPeaks.length
  const numPeaks = channelPeaks[0].length / 2
  const peaks = new (eval('Int'+bits+'Array'))(numPeaks*2)

  for (let i = 0; i < numPeaks; i++) {
    let min = 0
    let max = 0

    for (let c = 0; c < channelPeaks.length; c++) {
      min += weight * channelPeaks[c][i*2]
      max += weight * channelPeaks[c][i*2+1]
    }

    peaks[i*2] = min
    peaks[i*2+1] = max
  }

  //return in array so channel number counts still work.
  return [peaks]
}

/**
* @param {AudioBuffer,TypedArray} source - Source of audio samples for peak calculations.
* @param {Number} samplesPerPixel - Number of audio samples per peak.
* @param {Number} cueIn - index in channel to start peak calculations from.
* @param {Number} cueOut - index in channel to end peak calculations from (non-inclusive).
*/
export default function(source, samplesPerPixel, isMono, cueIn, cueOut, bits) {
  samplesPerPixel = samplesPerPixel || 10000
  bits = bits || 8

  if (isMono === null || isMono === undefined) {
    isMono = true
  }

  if ([8, 16, 32].indexOf(bits) < 0) {
    throw new Error('Invalid number of bits specified for peaks.')
  }

  let peaks = []

  if (typeof source.subarray === 'undefined') {
    for (let c = 0; c < source.numberOfChannels; c++) {
      const channel = source.getChannelData(c)
      cueIn = cueIn || 0
      cueOut = cueOut || channel.length
      const slice = channel.subarray(cueIn, cueOut)
      peaks.push(extractPeaks(slice, samplesPerPixel, bits))
    }
  } else {
    cueIn = cueIn || 0
    cueOut = cueOut || source.length
    peaks.push(extractPeaks(source.subarray(cueIn, cueOut), samplesPerPixel, bits))
  }

  if (isMono && peaks.length > 1) {
    peaks = makeMono(peaks, bits)
  }

  const numPeaks = peaks[0].length / 2

  return {
    length: numPeaks,
    data: peaks,
    bits: bits,
  }
}