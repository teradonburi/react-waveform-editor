'use strict'

import { sCurve, logarithmic } from './fade-curves'

export const SCURVE = 'sCurve'
export const LINEAR = 'linear'
export const EXPONENTIAL = 'exponential'
export const LOGARITHMIC = 'logarithmic'

export const FADEIN = 'FadeIn'
export const FADEOUT = 'FadeOut'

export function createFadeIn(gain, shape, start, duration) {
  switch (shape) {
  case SCURVE:
    sCurveFadeIn(gain, start, duration)
    break
  case LINEAR:
    linearFadeIn(gain, start, duration)
    break
  case EXPONENTIAL:
    exponentialFadeIn(gain, start, duration)
    break
  case LOGARITHMIC:
    logarithmicFadeIn(gain, start, duration)
    break
  default:
    throw new Error('Unsupported Fade type')
  }
}

export function createFadeOut(gain, shape, start, duration) {
  switch (shape) {
  case SCURVE:
    sCurveFadeOut(gain, start, duration)
    break
  case LINEAR:
    linearFadeOut(gain, start, duration)
    break
  case EXPONENTIAL:
    exponentialFadeOut(gain, start, duration)
    break
  case LOGARITHMIC:
    logarithmicFadeOut(gain, start, duration)
    break
  default:
    throw new Error('Unsupported Fade type')
  }
}


function sCurveFadeIn(gain, start, duration) {
  const curve = sCurve(10000, 1)
  gain.setValueCurveAtTime(curve, start, duration)
}

function sCurveFadeOut(gain, start, duration) {
  var curve = sCurve(10000, -1)
  gain.setValueCurveAtTime(curve, start, duration)
}

function linearFadeIn(gain, start, duration) {
  gain.linearRampToValueAtTime(0, start)
  gain.linearRampToValueAtTime(1, start + duration)
}

function linearFadeOut(gain, start, duration) {
  gain.linearRampToValueAtTime(1, start)
  gain.linearRampToValueAtTime(0, start + duration)
}

function exponentialFadeIn(gain, start, duration) {
  gain.exponentialRampToValueAtTime(0.01, start)
  gain.exponentialRampToValueAtTime(1, start + duration)
}

function exponentialFadeOut(gain, start, duration) {
  gain.exponentialRampToValueAtTime(1, start)
  gain.exponentialRampToValueAtTime(0.01, start + duration)
}

function logarithmicFadeIn(gain, start, duration) {
  const curve = logarithmic(10000, 10, 1)
  gain.setValueCurveAtTime(curve, start, duration)
}

function logarithmicFadeOut(gain, start, duration) {
  const curve = logarithmic(10000, 10, -1)
  gain.setValueCurveAtTime(curve, start, duration)
}