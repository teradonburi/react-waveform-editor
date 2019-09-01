'use strict'

export function linear(length, rotation) {
  const curve = new Float32Array(length)
  const scale = length - 1

  for (let i = 0; i < length; i++) {
    let x = i / scale

    if (rotation > 0) {
      curve[i] = x
    } else {
      curve[i] = 1 - x
    }
  }

  return curve
}

export function exponential(length, rotation) {
  const curve = new Float32Array(length)
  const scale = length - 1

  for (let i = 0; i < length; i++) {
    const x = i / scale
    const index = rotation > 0 ? i : length - 1 - i

    curve[index] = Math.exp(2 * x - 1) / Math.exp(1)
  }

  return curve
}

// creating a curve to simulate an S-curve with setValueCurveAtTime.
export function sCurve(length, rotation) {
  const curve = new Float32Array(length)
  const phase = rotation > 0 ? Math.PI / 2 : -(Math.PI / 2)

  for (let i = 0; i < length; ++i) {
    curve[i] = Math.sin(Math.PI * i / length - phase) / 2 + 0.5
  }

  return curve
}

// creating a curve to simulate a logarithmic curve with setValueCurveAtTime.
export function logarithmic(length, base, rotation) {
  const curve = new Float32Array(length)

  for (let i = 0; i < length; i++) {
    // index for the curve array.
    const index = rotation > 0 ? i : length - 1 - i

    const x = i / length
    curve[index] = Math.log(1 + base * x) / Math.log(1 + base)
  }

  return curve
}