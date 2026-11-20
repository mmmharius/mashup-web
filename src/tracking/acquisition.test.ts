import { expect, test } from 'vitest'
import { readAcquisition } from './acquisition'

test('utm parameters are kept and the source comes from utm_source', () => {
  expect(readAcquisition('?utm_source=tiktok&utm_medium=video&utm_campaign=launch&other=1', '')).toEqual({
    utm_source: 'tiktok',
    utm_medium: 'video',
    utm_campaign: 'launch',
    source: 'tiktok',
  })
})

test('without utm, the source is the referrer', () => {
  expect(readAcquisition('', 'https://www.linkedin.com/feed/')).toEqual({ source: 'www.linkedin.com' })
})

test('without utm or referrer, the source is direct', () => {
  expect(readAcquisition('?utm_source=', '')).toEqual({ source: 'direct' })
})
