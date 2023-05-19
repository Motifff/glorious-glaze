import { extend } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'
import glsl from 'babel-plugin-glsl/macro'
import vert from './vert'
import frag from './frag'

const CustomMaterial = shaderMaterial(
  {
    time: 0,
    viewAngle: null,
  },
  glsl`
  ${vert}
      `,
  glsl`
  ${frag}
  `
)

extend({ CustomMaterial })

export { CustomMaterial }
