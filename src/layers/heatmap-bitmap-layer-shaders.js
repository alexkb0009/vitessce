import glsl from 'glslify';

/**
 * No change to the vertex shader from the base BitmapLayer.
 * Reference: https://github.com/visgl/deck.gl/blob/8.2-release/modules/layers/src/bitmap-layer/bitmap-layer-vertex.js
 */
export const vertexShader = glsl`
#define SHADER_NAME heatmap-bitmap-layer-vertex-shader

attribute vec2 texCoords;
attribute vec3 positions;
attribute vec3 positions64Low;

varying vec2 vTexCoord;

const vec3 pickingColor = vec3(1.0, 0.0, 0.0);

void main(void) {
  geometry.worldPosition = positions;
  geometry.uv = texCoords;
  geometry.pickingColor = pickingColor;

  gl_Position = project_position_to_clipspace(positions, positions64Low, vec3(0.0), geometry.position);
  DECKGL_FILTER_GL_POSITION(gl_Position, geometry);

  vTexCoord = texCoords;

  vec4 color = vec4(0.0);
  DECKGL_FILTER_COLOR(color, geometry);
}
`;

/**
 * Fragment shader adapted to perform aggregation and
 * take color scale functions + sliders into account.
 * Reference: https://github.com/visgl/deck.gl/blob/8.2-release/modules/layers/src/bitmap-layer/bitmap-layer-fragment.js
 * Reference: https://github.com/hms-dbmi/viv/blob/06231ae02cac1ff57ba458c71e9bc59ed2fc4f8b/src/layers/XRLayer/xr-layer-fragment-colormap.webgl1.glsl
 */
export const fragmentShader = glsl`
#define SHADER_NAME heatmap-bitmap-layer-fragment-shader

#ifdef GL_ES
precision mediump float;
#endif

#pragma glslify: rdbu = require("glsl-colormap/rdbu")
#pragma glslify: plasma = require("glsl-colormap/plasma")
#pragma glslify: viridis = require("glsl-colormap/viridis")
#pragma glslify: greys = require("glsl-colormap/greys")
#pragma glslify: magma = require("glsl-colormap/magma")
#pragma glslify: jet = require("glsl-colormap/jet")
#pragma glslify: bone = require("glsl-colormap/bone")
#pragma glslify: copper = require("glsl-colormap/copper")
#pragma glslify: density = require("glsl-colormap/density")
#pragma glslify: inferno = require("glsl-colormap/inferno")
#pragma glslify: cool = require("glsl-colormap/cool")
#pragma glslify: hot = require("glsl-colormap/hot")
#pragma glslify: spring = require("glsl-colormap/spring")
#pragma glslify: summer = require("glsl-colormap/summer")
#pragma glslify: autumn = require("glsl-colormap/autumn")
#pragma glslify: winter = require("glsl-colormap/winter")

// The texture (GL.LUMINANCE & Uint8Array).
uniform sampler2D uBitmapTexture;

uniform vec2 uOrigDataSize;
uniform vec2 uReshapedDataSize;

uniform vec2 tileIJ;
uniform vec2 dataIJ;
uniform vec2 numTiles;
uniform vec2 tileStretching;

// What are the dimensions of the texture (width, height)?
uniform vec2 uTextureSize;

// How many consecutive pixels should be aggregated together along each axis?
uniform vec2 uAggSize;

// What are the values of the color scale sliders?
uniform vec2 uColorScaleRange;

// The texture coordinate, varying (interpolated between values set by the vertex shader).
varying vec2 vTexCoord;

vec2 transformCoordinate(vec2 coord) {
  // True pixel coordinate on scale of uOrigDataSize
  vec2 viewCoord = vec2(floor(coord.x * uOrigDataSize.x), floor(coord.y * uOrigDataSize.y));
  // Compute single value index into data array
  float index = viewCoord.y * uOrigDataSize.x + viewCoord.x;
  float textureX = (floor( index / uReshapedDataSize.x )) / uReshapedDataSize.x;
  float textureY = (index - (floor( index / uReshapedDataSize.x ) * uReshapedDataSize.x)) / uReshapedDataSize.y;
  vec2 texturedCoord = vec2(textureX, textureY);
  return texturedCoord;
}

void main(void) {
  // Compute 1 pixel in texture coordinates
  vec2 onePixel = vec2(1.0, 1.0) / uTextureSize;

  // vTexCoord values are between 0 and 1.
  // viewCoord is between 0 and TILE_SIZE.
  vec2 tileViewCoord = vec2(
    floor(vTexCoord.x * uTextureSize.x),
    floor(vTexCoord.y * uTextureSize.y)
  );
  vec2 absoluteViewCoord = vec2(
    tileIJ.x * uTextureSize.x + tileViewCoord.x,
    tileIJ.y * uTextureSize.y + tileViewCoord.y
  );

  vec2 vTexCoordAbsolute = vec2(
    absoluteViewCoord.x / (uTextureSize.x * numTiles.x),
    absoluteViewCoord.y / (uTextureSize.y * numTiles.y)
  );

  
  float xOffset = (tileIJ.x / numTiles.x);
  float yOffset = (tileIJ.y / numTiles.y);
  vec2 vTexCoordOffset = vec2(
    xOffset + (vTexCoord.x * uTextureSize.x / uOrigDataSize.x),
    yOffset + ((1. - vTexCoord.y) * uTextureSize.y / uOrigDataSize.y)
  );

  //vTexCoordAbsolute = vec2(0.1, 0.5);

  vec2 vTexCoordTransformed = transformCoordinate(vTexCoordOffset);

  //gl_FragColor = vec4(vTexCoord.x, 0., 0., 1.);

  

  //float intensitySum = texture2D(uBitmapTexture, vTexCoord).r;
  float intensitySum = texture2D(uBitmapTexture, vec2(vTexCoordTransformed.y, vTexCoordTransformed.x)).r;
  float intensityMean = intensitySum;

  // Re-scale using the color scale slider values.
  float scaledIntensityMean = (intensityMean - uColorScaleRange[0]) / max(0.005, (uColorScaleRange[1] - uColorScaleRange[0]));
  
  gl_FragColor = COLORMAP_FUNC(clamp(scaledIntensityMean, 0.0, 1.0));

  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(gl_FragColor, geometry);
}
`;
