import { defineBasicExtension } from 'prosekit/basic'
import { union } from 'prosekit/core'

export function defineExtension() {
  return union(defineBasicExtension());
}
